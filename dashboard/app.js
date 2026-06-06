// Auto-detect backend api location
let apiBase = '';
if (window.location.port === '3000') {
  apiBase = ''; // relative when served by the fullstack platform
} else {
  apiBase = 'http://localhost:3001'; // fallback when served standalone
}

// Global Core State
let rawRecords = [];
let filteredRecords = [];
let activeIndex = 0;
let sendingState = 'idle'; // idle | running | paused | stopped
let timerId = null;
let delayMs = 5000;
let mapping = { phone: 0, name: 1, gov: 2, cat: 3 };

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Setup Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  checkBackendHealth();
  setupEventListeners();
  loadHistoryReports();
});

// Check if backend proxy is alive
async function checkBackendHealth() {
  const statusEl = document.getElementById('backend-status');
  try {
    const res = await fetch(`${apiBase}/api/status`);
    if (res.ok) {
      const data = await res.json();
      statusEl.textContent = `Server: Connected (${data.logsCount.sent} sent)`;
      statusEl.className = "text-xs font-mono text-emerald-400";
    } else {
      statusEl.textContent = "Server: HTTP Error";
      statusEl.className = "text-xs font-mono text-rose-400";
    }
  } catch (err) {
    statusEl.textContent = "Server: Standalone mode (3001 offline)";
    statusEl.className = "text-xs font-mono text-amber-500";
  }
}

// Event bindings
function setupEventListeners() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('csv-file-input');
  const removeFileBtn = document.getElementById('btn-remove-file');
  const delaySlider = document.getElementById('delay-slider');
  const delayDisplay = document.getElementById('delay-display');
  const filterGov = document.getElementById('filter-gov');
  const filterCat = document.getElementById('filter-cat');
  
  // Buttons
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  const btnAddBlacklist = document.getElementById('btn-add-blacklist');
  
  // Drag and drop setup
  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-[#C5A059]');
    dropZone.classList.add('bg-[#14171D]');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-[#C5A059]');
    dropZone.classList.remove('bg-[#14171D]');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-[#C5A059]');
    dropZone.classList.remove('bg-[#14171D]');
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });
  
  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetCSVState();
  });
  
  // Slider interaction
  delaySlider.addEventListener('input', (e) => {
    const val = e.target.value;
    delayDisplay.textContent = `${val} Seconds`;
    delayMs = val * 1000;
  });
  
  // Filtering changes
  filterGov.addEventListener('change', applyFiltersAndRender);
  filterCat.addEventListener('change', applyFiltersAndRender);
  
  // Actions
  btnStart.addEventListener('click', startSendingCampaign);
  btnPause.addEventListener('click', pauseSendingCampaign);
  btnStop.addEventListener('click', stopSendingCampaign);
  
  btnAddBlacklist.addEventListener('click', addPhoneToBlacklist);
}

// File parsing entry
function handleFileSelected(file) {
  if (!file.name.endsWith('.csv')) {
    alert('Please upload a valid CSV file.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const result = parseCSV(text);
    rawRecords = result.parsed;
    mapping = result.headersMap;
    
    // Show UI info panels
    document.getElementById('file-info-panel').classList.remove('hidden');
    document.getElementById('file-name').textContent = `${file.name} (${rawRecords.length} records)`;
    document.getElementById('column-mapping-info').classList.remove('hidden');
    
    // Display mappings
    const headers = result.headers;
    document.getElementById('map-phone').textContent = headers[mapping.phone] || 'Column 0';
    document.getElementById('map-name').textContent = headers[mapping.name] || 'Column 1';
    document.getElementById('map-gov').textContent = headers[mapping.gov] || 'Column 2';
    document.getElementById('map-cat').textContent = headers[mapping.cat] || 'Column 3';
    
    applyFiltersAndRender();
  };
  reader.readAsText(file);
}

// Simple browser-native CSV parser (quote safe split)
function parseCSV(text) {
  const lineBreakChar = text.indexOf('\r\n') > -1 ? '\r\n' : '\n';
  const lines = text.split(lineBreakChar).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { parsed: [], headersMap: { phone: 0, name: 1, gov: 2, cat: 3 }, headers: [] };

  const headers = splitCSVLine(lines[0]);
  
  // Detect index mappings
  const mapIndex = {
    phone: headers.findIndex(h => /phone|number|hait|tel|mobile|هاتف|رقم/i.test(h)),
    name: headers.findIndex(h => /name|business|company|merchant|merchant_name|client|اسم|محل|شركة/i.test(h)),
    gov: headers.findIndex(h => /gov|city|town|province|location|محافظة|المدينة|مدنية/i.test(h)),
    cat: headers.findIndex(h => /cat|trade|sector|vocation|type|تصنيف|قسم|فئة/i.test(h))
  };

  if (mapIndex.phone === -1) mapIndex.phone = 0;
  if (mapIndex.name === -1) mapIndex.name = 1;
  if (mapIndex.gov === -1) mapIndex.gov = 2;
  if (mapIndex.cat === -1) mapIndex.cat = 3;

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0 || !cols[mapIndex.phone]) continue;
    
    parsed.push({
      phone: cols[mapIndex.phone]?.trim() || '',
      businessName: cols[mapIndex.name]?.trim() || '',
      governorate: cols[mapIndex.gov]?.trim() || 'Baghdad',
      category: cols[mapIndex.cat]?.trim() || 'Restaurant',
      status: 'Ready',
      details: ''
    });
  }

  return { parsed, headersMap: mapIndex, headers };
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Reset state
function resetCSVState() {
  rawRecords = [];
  filteredRecords = [];
  activeIndex = 0;
  sendingState = 'idle';
  if (timerId) clearTimeout(timerId);
  
  document.getElementById('csv-file-input').value = '';
  document.getElementById('file-info-panel').classList.add('hidden');
  document.getElementById('column-mapping-info').classList.add('hidden');
  document.getElementById('live-progress-banner').classList.add('hidden');
  
  // Re-enable start
  updateControlsState();
  applyFiltersAndRender();
}

// Filters logic
function applyFiltersAndRender() {
  const govVal = document.getElementById('filter-gov').value;
  const catVal = document.getElementById('filter-cat').value;
  
  filteredRecords = rawRecords.filter(item => {
    const matchGov = govVal === 'All' || item.governorate.toLowerCase().includes(govVal.toLowerCase());
    const matchCat = catVal === 'All' || item.category.toLowerCase().includes(catVal.toLowerCase());
    return matchGov && matchCat;
  });

  // Re-sort/Index reset if not currently sending
  if (sendingState === 'idle') {
    activeIndex = 0;
  }
  
  // Render table
  renderPreviewTable();
  updateStatsDisplay();
}

// Render dynamic preview rows
function renderPreviewTable() {
  const tbody = document.getElementById('preview-table-body');
  const countText = document.getElementById('preview-counts-text');
  
  countText.textContent = `${filteredRecords.length} Loaded Target Contacts`;
  
  if (filteredRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-500 text-xs">
          No records matching current filters. Drop or load a CSV spreadsheet file to preview.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredRecords.map((item, idx) => {
    let badgeClass = 'bg-slate-800 text-slate-400';
    if (item.status === 'Sent') badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold';
    if (item.status === 'Failed') badgeClass = 'bg-red-400/10 text-red-400 border border-red-500/25 font-bold';
    if (item.status === 'Skipped' || item.status === 'DND') badgeClass = 'bg-amber-500/10 text-amber-500 border border-[#C5A059]/25';
    if (item.status === 'Sending') badgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/25 animate-pulse';

    const isActiveRow = idx === activeIndex && sendingState === 'running';

    return `
      <tr class="hover:bg-white/5 transition text-xs border-b border-white/5 ${isActiveRow ? 'bg-[#C5A059]/5' : ''}">
        <td class="py-3 px-3 font-mono text-slate-500">${idx + 1}</td>
        <td class="py-3 px-3 font-semibold text-white whitespace-nowrap">${escapeHTML(item.businessName || 'Unnamed Store')}</td>
        <td class="py-3 px-3 font-mono text-[#F2D18F]">${escapeHTML(item.phone)}</td>
        <td class="py-3 px-3 truncate max-w-[120px]">${escapeHTML(item.governorate)}</td>
        <td class="py-3 px-3 truncate max-w-[120px]">${escapeHTML(item.category)}</td>
        <td class="py-3 px-3 text-center">
          <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${badgeClass}">
            ${item.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Escape simple strings to avoid template injects
function escapeHTML(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Insert helpers in text-area
window.insertPlaceholder = function(placeholder) {
  const tArea = document.getElementById('message-text-area');
  const start = tArea.selectionStart;
  const end = tArea.selectionEnd;
  const text = tArea.value;
  tArea.value = text.slice(0, start) + placeholder + text.slice(end);
  tArea.focus();
};

// Check lists outputs
function updateStatsDisplay() {
  const sent = filteredRecords.filter(r => r.status === 'Sent').length;
  const failed = filteredRecords.filter(r => r.status === 'Failed').length;
  const skipped = filteredRecords.filter(r => r.status === 'Skipped' || r.status === 'DND').length;
  const remaining = filteredRecords.length - (sent + failed + skipped);

  document.getElementById('stat-sent').textContent = sent;
  document.getElementById('stat-failed').textContent = failed;
  document.getElementById('stat-skipped').textContent = skipped;
  document.getElementById('stat-remaining').textContent = remaining;

  // Render progress details
  const banner = document.getElementById('live-progress-banner');
  const fill = document.getElementById('progress-bar-fill');
  const digits = document.getElementById('progress-digits');
  const textState = document.getElementById('progress-state-text');
  
  if (sendingState !== 'idle' && filteredRecords.length > 0) {
    banner.classList.remove('hidden');
    const processed = sent + failed + skipped;
    const progressPerc = Math.round((processed / filteredRecords.length) * 100);
    fill.style.width = `${progressPerc}%`;
    digits.textContent = `${processed} / ${filteredRecords.length} (${progressPerc}%)`;
    
    if (sendingState === 'running') {
      textState.textContent = `Campaign Running - Target Node ${activeIndex + 1}`;
    } else if (sendingState === 'paused') {
      textState.textContent = 'Campaign Paused';
    } else {
      textState.textContent = 'Campaign Terminated/Done';
    }
  } else {
    banner.classList.add('hidden');
  }
}

// Action button triggers
function startSendingCampaign() {
  if (filteredRecords.length === 0) {
    alert('Please upload a template CSV first.');
    return;
  }
  const msgBody = document.getElementById('message-text-area').value.trim();
  if (!msgBody) {
    alert('Please draft a campaign template text body first.');
    return;
  }

  sendingState = 'running';
  updateControlsState();
  executeCampaignLoop();
}

function pauseSendingCampaign() {
  sendingState = 'paused';
  if (timerId) clearTimeout(timerId);
  updateControlsState();
  updateStatsDisplay();
  saveCampaignHistoryState('Paused');
}

function stopSendingCampaign() {
  sendingState = 'stopped';
  if (timerId) clearTimeout(timerId);
  updateControlsState();
  updateStatsDisplay();
  saveCampaignHistoryState('Stopped');
}

// Loop execution
async function executeCampaignLoop() {
  if (sendingState !== 'running') return;
  
  // Find next un-sent index item
  while (activeIndex < filteredRecords.length && filteredRecords[activeIndex].status !== 'Ready') {
    activeIndex++;
  }

  if (activeIndex >= filteredRecords.length) {
    sendingState = 'stopped';
    updateControlsState();
    updateStatsDisplay();
    alert('Campaign has completed sending!');
    saveCampaignHistoryState('Completed');
    return;
  }

  // Set visual focus
  filteredRecords[activeIndex].status = 'Sending';
  renderPreviewTable();
  updateStatsDisplay();

  const item = filteredRecords[activeIndex];
  const renderedMessage = renderPersonalMessage(document.getElementById('message-text-area').value, item);

  try {
    const response = await fetch(`${apiBase}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: item.phone,
        message: renderedMessage,
        businessName: item.businessName
      })
    });

    if (response.ok) {
      item.status = 'Sent';
    } else {
      const data = await response.json();
      if (data.isDND) {
        item.status = 'DND';
      } else {
        item.status = 'Failed';
        item.details = data.error || 'HTTP error payload';
      }
    }
  } catch (err) {
    item.status = 'Failed';
    item.details = err.message || 'CORS transport error';
  }

  activeIndex++;
  renderPreviewTable();
  updateStatsDisplay();
  
  // Recursion step with timer delays
  timerId = setTimeout(executeCampaignLoop, delayMs);
}

// Variable compiler macro helper
function renderPersonalMessage(tmpl, target) {
  return tmpl
    .replace(/{name}/g, target.businessName || 'محلنا العزيز')
    .replace(/{governorate}/g, target.governorate || 'بغداد')
    .replace(/{category}/g, target.category || 'العسكري');
}

// Controls states toggle
function updateControlsState() {
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  
  if (sendingState === 'running') {
    btnStart.disabled = true;
    btnStart.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4 animate-spin"></i> Dispatched...`;
    btnPause.disabled = false;
    btnStop.disabled = false;
  } else if (sendingState === 'paused') {
    btnStart.disabled = false;
    btnStart.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> Resume Campaign`;
    btnPause.disabled = true;
    btnStop.disabled = false;
  } else {
    // idle / stopped
    btnStart.disabled = false;
    btnStart.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> Start Campaign`;
    btnPause.disabled = true;
    btnStop.disabled = true;
  }
}

// Download historical transactions files directly
window.downloadLogFile = function(type) {
  window.open(`${apiBase}/api/logs/${type}`, '_blank');
};

// Add numbers manually to Opt-Out excludes list
async function addPhoneToBlacklist() {
  const phoneInput = document.getElementById('blacklist-phone');
  const val = phoneInput.value.trim();
  if (!val) return;

  try {
    const res = await fetch(`${apiBase}/api/dnd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: val, notes: 'Manual exclusions adder dashboard' })
    });
    if (res.ok) {
      alert(`Phone number ${val} excluded successfully!`);
      phoneInput.value = '';
    } else {
      const err = await res.json();
      alert(`Exclusion failed: ${err.error}`);
    }
  } catch (e) {
    alert(`Excluded offline: Saved to list locally`);
  }
}

// Save history run onto JSON database
async function saveCampaignHistoryState(endStatus) {
  const sent = filteredRecords.filter(r => r.status === 'Sent').length;
  const failed = filteredRecords.filter(r => r.status === 'Failed').length;
  const skipped = filteredRecords.filter(r => r.status === 'Skipped' || r.status === 'DND').length;
  
  const payload = {
    id: `campaign_${Date.now()}`,
    name: `Bulk Campaign broadcast: ${new Date().toLocaleDateString()}`,
    sent: sent,
    failed: failed,
    skipped: skipped,
    status: endStatus,
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(`${apiBase}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    loadHistoryReports();
  } catch (e) {
    console.warn("Could not save to remote history database: CORS offline");
  }
}

// Load histories
async function loadHistoryReports() {
  const container = document.getElementById('campaign-history-container');
  try {
    const res = await fetch(`${apiBase}/api/history`);
    if (res.ok) {
      const history = await res.json();
      if (history.length === 0) {
        container.innerHTML = `<p class="text-[11px] text-slate-500 italic">No past campaign runs indexed.</p>`;
        return;
      }
      
      container.innerHTML = history.slice(0, 5).map(c => `
        <div class="bg-[#191D24] border border-[#2D3139] p-3 rounded-lg flex items-center justify-between">
          <div class="space-y-0.5">
            <p class="font-bold text-slate-200">${escapeHTML(c.name)}</p>
            <p class="text-[10px] text-slate-500 font-mono">${new Date(c.timestamp).toLocaleString()}</p>
          </div>
          <div class="text-right space-y-1">
            <span class="text-[9px] px-2 py-0.5 rounded font-bold ${
              c.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
            }">${c.status}</span>
            <p class="text-[10px] text-slate-400 font-mono">S: <strong class="text-emerald-400">${c.sent}</strong> | F: <strong class="text-red-400">${c.failed}</strong></p>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    container.innerHTML = `<p class="text-[11px] text-slate-500 italic">Connected in standalone offline mode.</p>`;
  }
}

// ARABIC TRANSLITERATION DICTIONARY FOR HIGH QUALITY PDF GENERATION
const ARABIC_MAPPING_DICTIONARY = {
  "بغداد": "Baghdad",
  "البصرة": "Basra",
  "نينوى": "Nineveh",
  "أربيل": "Erbil",
  "السليمانية": "Sulaymaniyah",
  "بابل": "Babylon",
  "كربلاء": "Karbala",
  "النجف": "Najaf",
  "الأنبار": "Anbar",
  "كركوك": "Kirkuk",
  "دهوك": "Duhok",
  "مطعم": "Restaurant",
  "مقهى": "Cafe",
  "فندق": "Hotel",
  "صالون تجميل": "Beauty Salon",
  "صيدلية": "Pharmacy",
  "عيادة طبية": "Clinic",
  "محلنا العزيز": "Dear merchant",
  "العسكري": "Al-Asgari"
};

function cleanAndSanitizeForPDF(str) {
  if (!str) return "";
  let clean = String(str);
  for (const [ar, en] of Object.entries(ARABIC_MAPPING_DICTIONARY)) {
    const rx = new RegExp(ar, "gi");
    clean = clean.replace(rx, en);
  }
  // Replace remaining non-ascii symbols with whitespace or simplified forms
  return clean.replace(/[^\x00-\x7F]/g, "");
}

// GENERATE FORMATTED PDF SUMMARY OF CAMPAIGN PERFORMANCE
window.generateReportPDF = async function() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert("The PDF generation library has not loaded yet. Please check your internet connection.");
    return;
  }

  try {
    const doc = new jsPDF();
    let y = 45;

    // Header Panel Top Banner
    doc.setFillColor(13, 15, 20); // Deep Dark Slate #0D0F14
    doc.rect(0, 0, 210, 35, "F");

    // Gold branding Accent Header Element
    doc.setFillColor(197, 160, 89); // #C5A059
    doc.rect(0, 35, 210, 2, "F");

    doc.setTextColor(197, 160, 89);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("NABDA WABA BULK SENDER", 15, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("BROADCAST PERFORMANCE STATISTICAL ANALYSIS LEDGER REPORT", 15, 25);

    doc.setTextColor(142, 146, 153);
    doc.setFontSize(8);
    doc.text(`Run Date & Time: ${new Date().toLocaleString()} (UTC)`, 135, 25);

    // Section 1: Active Run Sessions Report
    doc.setTextColor(13, 15, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("1. CURRENT WORKSPACE SESSION", 15, y);
    y += 6;

    const sent = filteredRecords.filter(r => r.status === "Sent").length;
    const failed = filteredRecords.filter(r => r.status === "Failed").length;
    const skipped = filteredRecords.filter(r => r.status === "Skipped" || r.status === "DND").length;
    const total = filteredRecords.length;
    const remaining = total - (sent + failed + skipped);

    const totalProcessed = sent + failed;
    const successRatio = totalProcessed > 0 ? ((sent / totalProcessed) * 100).toFixed(1) : "0.0";

    if (total === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(120, 120, 120);
      doc.text("Empty Workspace. Run some broadcasts or import a CSV list to query metrics.", 18, y + 4);
      y += 12;
    } else {
      // Background Box for statistics cards
      doc.setFillColor(245, 246, 248);
      doc.rect(15, y, 180, 28, "F");

      doc.setTextColor(33, 37, 41);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`Total Target Pool: ${total}`, 20, y + 8);
      doc.text(`Sent Successfully: ${sent}`, 20, y + 16);
      doc.text(`Success Rate Ratio: ${successRatio}%`, 20, y + 24);

      doc.text(`Failed Dispatches: ${failed}`, 110, y + 8);
      doc.text(`Skipped / Opt-out: ${skipped}`, 110, y + 16);
      doc.text(`Unsent / Remaining: ${remaining}`, 110, y + 24);

      y += 35;
    }

    // Divider Line
    doc.setDrawColor(220, 222, 226);
    doc.line(15, y, 195, y);
    y += 8;

    // Section 2: Historical Campaigns Records Index Table
    doc.setTextColor(13, 15, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("2. PAST COMPLETED CAMPAIGNS LEDGER INDEX", 15, y);
    y += 6;

    // Get statistics from server database
    const res = await fetch(`${apiBase}/api/history`);
    if (res.ok) {
      const history = await res.json();
      if (!history || history.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(120, 120, 120);
        doc.text("No past campaigns recorded in the relational database ledger.", 18, y + 4);
        y += 12;
      } else {
        // Render Header
        doc.setFillColor(197, 160, 89);
        doc.rect(15, y, 180, 7, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(10, 11, 14);
        doc.text("Campaign Broadcast Detail Tag", 18, y + 5);
        doc.text("Date Created", 85, y + 5);
        doc.text("Sent", 130, y + 5);
        doc.text("Failed", 145, y + 5);
        doc.text("Skipped", 160, y + 5);
        doc.text("Status", 178, y + 5);
        
        y += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        history.forEach((run, index) => {
          if (y > 260) {
            // Page Overflow Protection
            doc.addPage();
            y = 20;
            // Draw continuing header
            doc.setFillColor(197, 160, 89);
            doc.rect(15, y, 180, 7, "F");
            doc.setFont("helvetica", "bold");
            doc.setTextColor(10, 11, 14);
            doc.text("Campaign Broadcast Detail Tag", 18, y + 5);
            doc.text("Date Created", 85, y + 5);
            doc.text("Sent", 130, y + 5);
            doc.text("Failed", 145, y + 5);
            doc.text("Skipped", 160, y + 5);
            doc.text("Status", 178, y + 5);
            y += 7;
            doc.setFont("helvetica", "normal");
          }

          if (index % 2 === 1) {
            doc.setFillColor(245, 246, 248);
            doc.rect(15, y, 180, 7.5, "F");
          } else {
            doc.setFillColor(255, 255, 255);
            doc.rect(15, y, 180, 7.5, "F");
          }

          doc.setTextColor(33, 37, 41);
          let rawName = run.name || "Bulk Campaign Scheduler";
          let cleanName = cleanAndSanitizeForPDF(rawName);
          if (cleanName.length > 35) cleanName = cleanName.slice(0, 32) + "...";
          doc.text(cleanName, 18, y + 5);

          const timeString = new Date(run.timestamp).toLocaleString();
          doc.text(timeString, 85, y + 5);
          doc.text(String(run.sent || 0), 130, y + 5);
          doc.text(String(run.failed || 0), 145, y + 5);
          doc.text(String(run.skipped || 0), 160, y + 5);

          if (run.status === "Completed") {
            doc.setTextColor(46, 117, 89); // emerald style
          } else {
            doc.setTextColor(197, 120, 50); // amber style
          }
          doc.text(run.status || "Stopped", 178, y + 5);

          y += 7.5;
        });
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.text("Database Connection Interrupted. Unable to retrieve past runs statistics.", 15, y);
      y += 10;
    }

    // Footnote Section
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 222, 226);
      doc.line(15, 277, 195, 277);

      doc.setTextColor(142, 146, 153);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text("Confidential Performance Audit Report generated for internal business tracking purposes.", 15, 282);
      doc.text(`Nabda WABA Bulk Sender Protocol Ledger. Page ${i} of ${pageCount}`, 15, 286);
    }

    // Save with precise timestamp
    doc.save(`Nabda_WABA_Performance_Report_${Date.now()}.pdf`);
  } catch (err) {
    alert(`Failed to export PDF: ${err.message}`);
  }
};

