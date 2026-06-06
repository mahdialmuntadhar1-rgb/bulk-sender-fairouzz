const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable JSON parser and CORS
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Resolve data directory (detect if running standalone or in full-stack workspace)
let dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Log file helper paths
const paths = {
  sent: path.join(dataDir, 'sent-log.csv'),
  failed: path.join(dataDir, 'failed-log.csv'),
  skipped: path.join(dataDir, 'skipped-log.csv'),
  dnd: path.join(dataDir, 'do-not-send.csv'),
  history: path.join(dataDir, 'campaign-history.json')
};

// Ensure all basic files exist with correct CSV headers
const initFiles = () => {
  if (!fs.existsSync(paths.sent)) {
    fs.writeFileSync(paths.sent, 'Timestamp,Phone,Business Name,Status,Details\n', 'utf8');
  }
  if (!fs.existsSync(paths.failed)) {
    fs.writeFileSync(paths.failed, 'Timestamp,Phone,Business Name,Error Details\n', 'utf8');
  }
  if (!fs.existsSync(paths.skipped)) {
    fs.writeFileSync(paths.skipped, 'Timestamp,Phone,Business Name,Reason\n', 'utf8');
  }
  if (!fs.existsSync(paths.dnd)) {
    fs.writeFileSync(paths.dnd, 'Phone,Category,Notes\n+9647700000000,DND,Requested exclusion\n', 'utf8');
  }
  if (!fs.existsSync(paths.history)) {
    fs.writeFileSync(paths.history, '[]', 'utf8');
  }
};

initFiles();

// Helper to normalize phone numbers
function normalizePhone(phoneStr) {
  if (!phoneStr) return '';
  let cleaned = phoneStr.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+964')) {
    return cleaned;
  }
  if (cleaned.startsWith('964')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('07') && cleaned.length === 11) {
    return '+964' + cleaned.substring(1);
  }
  if (cleaned.startsWith('7') && cleaned.length === 10) {
    return '+964' + cleaned;
  }
  return cleaned;
}

// Helper to check standard Iraqi format (+9647XXXXXXXXX)
function isValidIraqiPhone(phoneStr) {
  const norm = normalizePhone(phoneStr);
  return /^(\+9647\d{9})$/.test(norm);
}

// Read DND list directly
function getDNDList() {
  try {
    const content = fs.readFileSync(paths.dnd, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const dndSet = new Set();
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts[0]) {
        dndSet.add(normalizePhone(parts[0]));
      }
    }
    return dndSet;
  } catch (err) {
    console.error('Error reading DND list:', err);
    return new Set();
  }
}

// Append rows safely to csv files
function appendToCSV(filePath, rowArray) {
  try {
    const line = rowArray.map(cell => {
      const escaped = String(cell || '').replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') ? `"${escaped}"` : escaped;
    }).join(',') + '\n';
    fs.appendFileSync(filePath, line, 'utf8');
  } catch (err) {
    console.error(`Failed to append to CSV ${filePath}:`, err);
  }
}

// Check api health and config status
app.get('/api/status', (req, res) => {
  const apiKey = process.env.NABDA_API_KEY || '';
  res.json({
    status: 'online',
    secured: apiKey.length > 0,
    maskedKey: apiKey ? `${apiKey.slice(0, 4)}***${apiKey.slice(-4)}` : 'NOT_CONFIGURED',
    logsCount: {
      sent: fs.existsSync(paths.sent) ? fs.readFileSync(paths.sent, 'utf8').split('\n').length - 2 : 0,
      failed: fs.existsSync(paths.failed) ? fs.readFileSync(paths.failed, 'utf8').split('\n').length - 2 : 0,
      skipped: fs.existsSync(paths.skipped) ? fs.readFileSync(paths.skipped, 'utf8').split('\n').length - 2 : 0,
      dnd: fs.existsSync(paths.dnd) ? fs.readFileSync(paths.dnd, 'utf8').split('\n').length - 2 : 0
    }
  });
});

// Proxy route to send message via Nabda API
app.post('/api/send', (req, res) => {
  const { phone, message, businessName, campaignName } = req.body;
  const apiKey = process.env.NABDA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'NABDA_API_KEY is not configured in .env on proxy backend'
    });
  }

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone number and message fields are required' });
  }

  const rawPhone = String(phone);
  const normalized = normalizePhone(rawPhone);
  
  // Validation checks
  if (!isValidIraqiPhone(normalized)) {
    const errorMsg = 'Invalid Iraqi phone format. Must be +9647XXXXXXXXX';
    appendToCSV(paths.failed, [new Date().toISOString(), rawPhone, businessName, errorMsg]);
    return res.status(400).json({ error: errorMsg, isNormalized: false });
  }

  // Cross reference DND list
  const dndSet = getDNDList();
  if (dndSet.has(normalized)) {
    const skipReason = 'Number is registered under Do-Not-Send (DND) list.';
    appendToCSV(paths.skipped, [new Date().toISOString(), normalized, businessName, skipReason]);
    return res.status(403).json({ error: skipReason, isDND: true });
  }

  // Native https request to Nabda OTP endpoint
  const postData = JSON.stringify({
    phone: normalized,
    message: message
  });

  const options = {
    hostname: 'api.nabdaotp.com',
    port: 443,
    path: '/api/v1/messages/send',
    method: 'POST',
    headers: {
      'Authorization': apiKey, // No 'Bearer' requested
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const reqOut = https.request(options, (resIn) => {
    let responseData = '';

    resIn.on('data', (chunk) => {
      responseData += chunk;
    });

    resIn.on('end', () => {
      const isSuccess = resIn.statusCode >= 200 && resIn.statusCode < 300;
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseData);
      } catch (e) {
        parsedResponse = { raw: responseData };
      }

      if (isSuccess) {
        // Record successful dispatch
        appendToCSV(paths.sent, [
          new Date().toISOString(),
          normalized,
          businessName,
          'Success',
          `Response status ${resIn.statusCode}`
        ]);
        res.json({
          success: true,
          phone: normalized,
          response: parsedResponse
        });
      } else {
        // Record failure
        const errDetails = parsedResponse.message || parsedResponse.error || `HTTP Status ${resIn.statusCode}`;
        appendToCSV(paths.failed, [
          new Date().toISOString(),
          normalized,
          businessName,
          errDetails
        ]);
        res.status(resIn.statusCode || 500).json({
          error: errDetails,
          phone: normalized,
          response: parsedResponse
        });
      }
    });
  });

  reqOut.on('error', (err) => {
    console.error('Request transport error:', err);
    // Append server connection level failure
    appendToCSV(paths.failed, [
      new Date().toISOString(),
      normalized,
      businessName,
      `Network Connection Error: ${err.message}`
    ]);
    res.status(500).json({ error: `Backend proxy connection to Nabda failed: ${err.message}` });
  });

  reqOut.write(postData);
  reqOut.end();
});

// Logs fetch route
app.get('/api/logs/:type', (req, res) => {
  const logType = req.params.type;
  const pathFile = paths[logType];
  
  if (!pathFile) {
    return res.status(404).json({ error: 'Log type not found. Use sent, failed, skipped, or dnd' });
  }

  try {
    const rawContent = fs.readFileSync(pathFile, 'utf8');
    res.type('text/csv').send(rawContent);
  } catch (err) {
    res.status(500).json({ error: `Could not read requested records: ${err.message}` });
  }
});

// Write skipped / custom bypass events
app.post('/api/logs/skipped', (req, res) => {
  const { phone, businessName, reason } = req.body;
  const normalized = normalizePhone(phone);
  appendToCSV(paths.skipped, [new Date().toISOString(), normalized, businessName, reason]);
  res.json({ success: true });
});

// Retrieve campaign history
app.get('/api/history', (req, res) => {
  try {
    const content = fs.readFileSync(paths.history, 'utf8');
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch history JSON structure' });
  }
});

// Save / Append campaign history
app.post('/api/history', (req, res) => {
  const newCampaign = req.body;
  if (!newCampaign || !newCampaign.id) {
    return res.status(400).json({ error: 'Valid campaign schema with ID is required' });
  }

  try {
    let history = [];
    if (fs.existsSync(paths.history)) {
      history = JSON.parse(fs.readFileSync(paths.history, 'utf8'));
    }
    // Update or insert
    const idx = history.findIndex(c => c.id === newCampaign.id);
    if (idx >= 0) {
      history[idx] = newCampaign;
    } else {
      history.unshift(newCampaign); // Put latest on top
    }
    fs.writeFileSync(paths.history, JSON.stringify(history, null, 2), 'utf8');
    res.json({ success: true, historyLength: history.length });
  } catch (err) {
    res.status(500).json({ error: `Failed to commit history logs: ${err.message}` });
  }
});

// Do Not Send (DND) operations
app.get('/api/dnd', (req, res) => {
  try {
    const content = fs.readFileSync(paths.dnd, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts[0]) {
        result.push({
          phone: parts[0],
          category: parts[1] || 'DND',
          notes: parts[2] || 'User opt-out'
        });
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse DND records' });
  }
});

app.post('/api/dnd', (req, res) => {
  const { phone, notes } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  const normalized = normalizePhone(phone);
  try {
    appendToCSV(paths.dnd, [normalized, 'DND', notes || 'Manual DND add']);
    res.json({ success: true, phone: normalized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write opt-out number' });
  }
});

// Launch server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nabda Bulk Campaign proxy server booted securely on port ${PORT}`);
});
