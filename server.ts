import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the master server. Please assign it in environment variables or Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URLencoded parsers for file uploading/parsing
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Resolve DB / local logs file directory path safely
  let dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const paths = {
    sent: path.join(dataDir, "sent-log.csv"),
    failed: path.join(dataDir, "failed-log.csv"),
    skipped: path.join(dataDir, "skipped-log.csv"),
    dnd: path.join(dataDir, "do-not-send.csv"),
    history: path.join(dataDir, "campaign-history.json"),
  };

  // Helper: CSV Row appending
  function appendToCSV(filePath: string, rowArray: string[]) {
    try {
      if (!fs.existsSync(filePath)) {
        if (filePath.endsWith("sent-log.csv")) {
          fs.writeFileSync(filePath, "Timestamp,Phone,Business Name,Status,Details\n", "utf8");
        } else if (filePath.endsWith("failed-log.csv")) {
          fs.writeFileSync(filePath, "Timestamp,Phone,Business Name,Error Details\n", "utf8");
        } else if (filePath.endsWith("skipped-log.csv")) {
          fs.writeFileSync(filePath, "Timestamp,Phone,Business Name,Reason\n", "utf8");
        } else if (filePath.endsWith("do-not-send.csv")) {
          fs.writeFileSync(filePath, "Phone,Category,Notes\n", "utf8");
        }
      }
      const line = rowArray.map((cell) => {
        const escaped = String(cell || "").replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"') ? `"${escaped}"` : escaped;
      }).join(",") + "\n";
      fs.appendFileSync(filePath, line, "utf8");
    } catch (err: any) {
      console.error(`Failed to append to CSV: ${err.message}`);
    }
  }

  // Inner normalized helpers
  function normalizePhone(phoneStr: string): string {
    if (!phoneStr) return "";
    let cleaned = phoneStr.trim().replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+964")) {
      return cleaned;
    }
    if (cleaned.startsWith("964")) {
      return "+" + cleaned;
    }
    if (cleaned.startsWith("07") && cleaned.length === 11) {
      return "+964" + cleaned.substring(1);
    }
    if (cleaned.startsWith("7") && cleaned.length === 10) {
      return "+964" + cleaned;
    }
    return cleaned;
  }

  function isValidIraqiPhone(phoneStr: string): boolean {
    const norm = normalizePhone(phoneStr);
    return /^(\+9647\d{9})$/.test(norm);
  }

  function getDNDList(): Set<string> {
    try {
      if (!fs.existsSync(paths.dnd)) return new Set();
      const content = fs.readFileSync(paths.dnd, "utf8");
      const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
      const dndSet = new Set<string>();
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (parts[0]) {
          dndSet.add(normalizePhone(parts[0]));
        }
      }
      return dndSet;
    } catch (err) {
      return new Set();
    }
  }

  // --- API ROUTING INTERFACE ---

  // Check state of the configuration
  app.get("/api/status", (req, res) => {
    const apiKey = process.env.NABDA_API_KEY || "";
    const geminiKey = process.env.GEMINI_API_KEY || "";
    res.json({
      status: "online",
      secured: apiKey.length > 0,
      maskedKey: apiKey ? `${apiKey.slice(0, 4)}***${apiKey.slice(-4)}` : "NOT_CONFIGURED",
      geminiSecured: geminiKey.length > 0,
      geminiMaskedKey: geminiKey ? `${geminiKey.slice(0, 4)}***${geminiKey.slice(-4)}` : "NOT_CONFIGURED",
      logsCount: {
        sent: fs.existsSync(paths.sent) ? fs.readFileSync(paths.sent, "utf8").split("\n").length - 2 : 0,
        failed: fs.existsSync(paths.failed) ? fs.readFileSync(paths.failed, "utf8").split("\n").length - 2 : 0,
        skipped: fs.existsSync(paths.skipped) ? fs.readFileSync(paths.skipped, "utf8").split("\n").length - 2 : 0,
        dnd: fs.existsSync(paths.dnd) ? fs.readFileSync(paths.dnd, "utf8").split("\n").length - 2 : 0,
      },
    });
  });

  // Verify connection to Nabda server proxy
  app.get("/api/nabda/test", (req, res) => {
    const apiKey = process.env.NABDA_API_KEY || "";
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: "NABDA_API_KEY is not configured in the server environment variables." 
      });
    }

    const options = {
      hostname: "api.nabdaotp.com",
      port: 443,
      path: "/api/v1/messages/send",
      method: "GET",
      headers: {
        "Authorization": apiKey,
      },
    };

    const clientReq = https.request(options, (clientRes) => {
      let body = "";
      clientRes.on("data", (chunk) => { body += chunk; });
      clientRes.on("end", () => {
        // Any status code proves connection succeeded
        res.json({
          success: true,
          statusCode: clientRes.statusCode,
          secured: true,
          message: clientRes.statusCode === 401 || clientRes.statusCode === 403 
            ? "Connected to Nabda, but credentials / API key rejected." 
            : `Successfully pinged Nabda API (HTTP ${clientRes.statusCode})`
        });
      });
    });

    clientReq.on("error", (err) => {
      res.status(500).json({ 
        success: false, 
        error: `Could not connect to Nabda server: ${err.message}` 
      });
    });

    clientReq.on("timeout", () => {
      clientReq.destroy();
      res.status(504).json({ 
        success: false, 
        error: "Connection timed out connecting to the Nabda server." 
      });
    });

    clientReq.setTimeout(5000);
    clientReq.end();
  });

  // Gemini AI message optimization endpoint
  app.post("/api/gemini/optimize", async (req, res) => {
    const { text, tone, language } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text to optimize is required." });
    }

    try {
      const ai = getGeminiClient();
      
      const systemInstruction = `You are "Shaku Maku Sales Copilot", an expert copywriter specializing in short-form SMS and WhatsApp promotional broadcasting for Iraqi businesses and merchants in Baghdad, Basra, Erbil, Mosul, etc. Include appropriate local flavor if requested, or translate accurately.
      Your task is to transform outreach templates to sound highly authentic, trustworthy, polite, respectful, and custom-tailored to the chosen tone and language.
      Keep the final promotional message clear, engaging, and strictly under 255 characters.
      Only return the optimized plain text copy itself. Never prefix it, never wrap it in quotes, and never include markdown formatting tags like code blocks.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Please optimize the following outreach copy:
        - Input Copy: "${text}"
        - Target Tone: ${tone || "friendly & marketing value focused"}
        - Target Dialect/Language: ${language || "Iraqi Arabic"}`,
        config: {
          systemInstruction,
          temperature: 0.75,
        }
      });

      const optimizedText = response.text ? response.text.trim() : "";
      res.json({ success: true, optimizedText });
    } catch (err: any) {
      console.error("Gemini optimization endpoint error:", err);
      res.status(500).json({ error: `Gemini AI service error: ${err.message}` });
    }
  });

  // Main message proxy sender
  app.post("/api/send", (req, res) => {
    const { phone, message, businessName, campaignName } = req.body;
    const apiKey = process.env.NABDA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "NABDA_API_KEY is not configured on the master server. Please assign it in .env or Settings.",
      });
    }

    if (!phone || !message) {
      return res.status(400).json({ error: "Phone number and message text are required." });
    }

    const rawPhone = String(phone);
    const normalized = normalizePhone(rawPhone);

    // Filter Out Bad Formats
    if (!isValidIraqiPhone(normalized)) {
      const errDetails = "Invalid Iraqi phone format. Must be like +9647XXXXXXXXX or 07XXXXXXXXX";
      appendToCSV(paths.failed, [new Date().toISOString(), rawPhone, businessName || "", errDetails]);
      return res.status(400).json({ error: errDetails, isNormalized: false });
    }

    // Filter Out Do-Not-Send Entries
    const dndSet = getDNDList();
    if (dndSet.has(normalized)) {
      const skipReason = "Number resides inside local Do-Not-Send (DND) list registry.";
      appendToCSV(paths.skipped, [new Date().toISOString(), normalized, businessName || "", skipReason]);
      return res.status(403).json({ error: skipReason, isDND: true });
    }

    // Call external Nabda secure endpoints
    const postData = JSON.stringify({
      phone: normalized,
      message: message,
    });

    const options = {
      hostname: "api.nabdaotp.com",
      port: 443,
      path: "/api/v1/messages/send",
      method: "POST",
      headers: {
        "Authorization": apiKey, // Raw Authorization, no 'Bearer' prefix
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const reqOut = https.request(options, (resIn) => {
      let responseBody = "";

      resIn.on("data", (chunk) => {
        responseBody += chunk;
      });

      resIn.on("end", () => {
        const isSuccess = resIn.statusCode && resIn.statusCode >= 200 && resIn.statusCode < 300;
        let parsedResponse: any;
        try {
          parsedResponse = JSON.parse(responseBody);
        } catch (e) {
          parsedResponse = { raw: responseBody };
        }

        if (isSuccess) {
          appendToCSV(paths.sent, [
            new Date().toISOString(),
            normalized,
            businessName || "",
            "Success",
            `Status [${resIn.statusCode}] - Dispatched`,
          ]);
          res.json({
            success: true,
            phone: normalized,
            response: parsedResponse,
          });
        } else {
          const errReason = parsedResponse.message || parsedResponse.error || `HTTP Status Code ${resIn.statusCode}`;
          appendToCSV(paths.failed, [
            new Date().toISOString(),
            normalized,
            businessName || "",
            errReason,
          ]);
          res.status(resIn.statusCode || 500).json({
            error: errReason,
            phone: normalized,
            response: parsedResponse,
          });
        }
      });
    });

    reqOut.on("error", (err) => {
      appendToCSV(paths.failed, [
        new Date().toISOString(),
        normalized,
        businessName || "",
        `Proxy Transport Error: ${err.message}`,
      ]);
      res.status(500).json({ error: `Connection to Nabda API failed: ${err.message}` });
    });

    reqOut.write(postData);
    reqOut.end();
  });

  // Log Fetchers
  app.get("/api/logs/:type", (req, res) => {
    const logType = req.params.type as keyof typeof paths;
    const pathFile = paths[logType];

    if (!pathFile || !fs.existsSync(pathFile)) {
      return res.status(404).json({ error: `Log registry for type '${logType}' doesn't exist yet` });
    }

    try {
      const contents = fs.readFileSync(pathFile, "utf8");
      res.type("text/csv").send(contents);
    } catch (err: any) {
      res.status(500).json({ error: `Failed to load logs: ${err.message}` });
    }
  });

  // Skips Logger Helper
  app.post("/api/logs/skipped", (req, res) => {
    const { phone, businessName, reason } = req.body;
    const normalized = normalizePhone(phone);
    appendToCSV(paths.skipped, [new Date().toISOString(), normalized, businessName || "", reason || "Exclusion"]);
    res.json({ success: true });
  });

  // Campaign History Management
  app.get("/api/history", (req, res) => {
    try {
      if (!fs.existsSync(paths.history)) {
        fs.writeFileSync(paths.history, "[]", "utf8");
      }
      const raw = fs.readFileSync(paths.history, "utf8");
      res.json(JSON.parse(raw));
    } catch (err: any) {
      res.status(500).json({ error: `Failed to read campaign histories: ${err.message}` });
    }
  });

  app.post("/api/history", (req, res) => {
    const newCamp = req.body;
    if (!newCamp || !newCamp.id) {
      return res.status(400).json({ error: "Invalid campaign schema." });
    }

    try {
      let history: any[] = [];
      if (fs.existsSync(paths.history)) {
        history = JSON.parse(fs.readFileSync(paths.history, "utf8"));
      }

      const idx = history.findIndex((c) => c.id === newCamp.id);
      if (idx >= 0) {
        history[idx] = newCamp;
      } else {
        history.unshift(newCamp);
      }

      fs.writeFileSync(paths.history, JSON.stringify(history, null, 2), "utf8");
      res.json({ success: true, count: history.length });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to save campaign run: ${err.message}` });
    }
  });

  // Opt-out Do Not Send lists
  app.get("/api/dnd", (req, res) => {
    try {
      if (!fs.existsSync(paths.dnd)) {
        return res.json([]);
      }
      const raw = fs.readFileSync(paths.dnd, "utf8");
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      const resData = [];
      for (let i = 1; i < lines.length; i++) {
        const seg = lines[i].split(",");
        if (seg[0]) {
          resData.push({
            phone: seg[0],
            category: seg[1] || "DND",
            notes: seg[2] || "User Opt-out",
          });
        }
      }
      res.json(resData);
    } catch (err: any) {
      res.status(500).json({ error: `Failed to process DND list: ${err.message}` });
    }
  });

  app.post("/api/dnd", (req, res) => {
    const { phone, notes } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Valid phone is required." });
    }
    const normalized = normalizePhone(phone);
    try {
      appendToCSV(paths.dnd, [normalized, "DND", notes || "Manual list insertion"]);
      res.json({ success: true, phone: normalized });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to write manual exclusion: ${err.message}` });
    }
  });

  // --- VITE MIDDLEWARE INTERACTION LAYER ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express full-stack proxy server running at http://localhost:${PORT}`);
  });
}

startServer();
