import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  UploadCloud, 
  AlertCircle, 
  CheckCircle2, 
  Pause, 
  Play, 
  StopCircle, 
  Download, 
  Trash2, 
  Filter, 
  Search, 
  Building2, 
  User, 
  Plus, 
  Phone, 
  RefreshCw, 
  FileSpreadsheet, 
  PlayCircle,
  Clock,
  HelpCircle
} from "lucide-react";

// List of 18 governorates in Iraq
const IRAQ_GOVERNORATES = [
  "Baghdad", "Basra", "Erbil", "Sulaymaniyah", "Duhok", 
  "Nineveh", "Kirkuk", "Najaf", "Karbala", "Anbar", 
  "Diyala", "Wasit", "Babylon", "Diwaniyah", "Maysan", 
  "Dhi Qar", "Muthanna", "Salahaddin"
];

// Localized governorate Arabic mapping
const GOV_AR = {
  "Baghdad": "بغداد",
  "Basra": "البصرة",
  "Erbil": "أربيل",
  "Sulaymaniyah": "السليمانية",
  "Duhok": "دهوك",
  "Nineveh": "نينوى",
  "Kirkuk": "كركوك",
  "Najaf": "النجف",
  "Karbala": "كربلاء",
  "Anbar": "الأنبار",
  "Diyala": "ديالى",
  "Wasit": "واسط",
  "Babylon": "بابل",
  "Diwaniyah": "الديوانية",
  "Maysan": "ميسان",
  "Dhi Qar": "ذي قار",
  "Muthanna": "المثنى",
  "Salahaddin": "صلاح الدين"
};

// Queue item interface
interface QueueItem {
  id: string;
  businessName: string;
  originalPhone: string;
  normalizedPhone: string;
  governorate: string;
  category: string;
  source: "manual" | "governorate" | "csv";
  status: "ready" | "needs_review" | "sending" | "sent" | "failed" | "skipped";
  note: string;
}

// Stats interface for CSV uploading
interface CSVStats {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  alreadyInQueue: number;
}

interface BulkSenderViewProps {
  lang: "ar" | "en";
}

// Phone normalization helper
export function normalizeIraqPhone(phoneStr: string): { 
  isValid: boolean; 
  normalized: string; 
  needsReview: boolean; 
  reason: string; 
} {
  const cleaned = phoneStr.trim().replace(/[^\d+]/g, "");
  if (!cleaned) {
    return { isValid: false, normalized: "", needsReview: false, reason: "Empty cell or no digits" };
  }

  let finalNum = cleaned;
  
  if (cleaned.startsWith("+9647")) {
    finalNum = cleaned;
  } else if (cleaned.startsWith("+96407")) {
    finalNum = "+9647" + cleaned.slice(6);
  } else if (cleaned.startsWith("96407")) {
    finalNum = "+9647" + cleaned.slice(5);
  } else if (cleaned.startsWith("9647")) {
    finalNum = "+" + cleaned;
  } else if (cleaned.startsWith("07") && cleaned.length === 11) {
    finalNum = "+9647" + cleaned.slice(2);
  } else if (cleaned.startsWith("7") && cleaned.length === 10) {
    finalNum = "+9647" + cleaned.slice(1);
  } else if (cleaned.length === 10 && cleaned.startsWith("0")) {
    finalNum = "+9647" + cleaned.replace(/^07/, "").replace(/^7/, "");
  }

  // Valid Iraqi mobile formats must correspond strictly to +9647XXXXXXXXX (total length equal to 14)
  const pattern = /^\+9647\d{9}$/;
  const isValid = pattern.test(finalNum);

  if (!isValid) {
    return { 
      isValid: false, 
      normalized: phoneStr, 
      needsReview: false, 
      reason: "Does not represent a valid Iraq mobile prefix" 
    };
  }

  // Suspicious repeated numbers check
  const tailDigits = finalNum.slice(5); // digits after +9647
  const set = new Set(tailDigits.split(""));
  
  const allSame = set.size === 1;
  const isSuspicious = allSame || finalNum.includes("777777777") || finalNum.includes("888888888") || finalNum.includes("000000000");

  return {
    isValid: true,
    normalized: finalNum,
    needsReview: isSuspicious,
    reason: isSuspicious ? "Suspicious repeating cell digits" : ""
  };
}

export default function BulkSenderView({ lang }: BulkSenderViewProps) {
  // Main queue states fully synced with localStorage
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const saved = localStorage.getItem("fairouzz_bulk_queue");
    return saved ? JSON.parse(saved) : [];
  });

  const [invalidList, setInvalidList] = useState<Array<{ originalPhone: string; source: string; reason: string }>>(() => {
    const saved = localStorage.getItem("fairouzz_bulk_invalid");
    return saved ? JSON.parse(saved) : [];
  });

  const [duplicateList, setDuplicateList] = useState<Array<{ originalPhone: string; normalizedPhone: string; source: string }>>(() => {
    const saved = localStorage.getItem("fairouzz_bulk_duplicates");
    return saved ? JSON.parse(saved) : [];
  });

  // Message template
  const [messageText, setMessageText] = useState(() => {
    return localStorage.getItem("fairouzz_bulk_msg") || "أهلاً يا {name}، يسعدنا دعوتكم للانضمام لدليل شاكو ماكو التجاري كأفضل {category} في محافظة {governorate}!";
  });

  // Manual input state
  const [manualText, setManualText] = useState("");
  const [manualLog, setManualLog] = useState("");

  // Governorate specific textareas & classes
  const [govInputs, setGovInputs] = useState<Record<string, { text: string; category: string }>>(() => {
    const init: Record<string, { text: string; category: string }> = {};
    IRAQ_GOVERNORATES.forEach(gov => {
      init[gov] = { text: "", category: "Restaurant" };
    });
    return init;
  });

  // CSV States
  const [csvStats, setCSVStats] = useState<CSVStats | null>(null);
  const [uploadedRawRows, setUploadedRawRows] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [csvPhoneCol, setCsvPhoneCol] = useState<string>("");
  const [csvNameCol, setCsvNameCol] = useState<string>("");
  const [csvGovCol, setCsvGovCol] = useState<string>("");
  const [csvCatCol, setCsvCatCol] = useState<string>("");

  // Dynamic filter lists from queue
  const [filterGov, setFilterGov] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [filterSrc, setFilterSrc] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Sending mechanism states
  const [isSendingActive, setIsSendingActive] = useState(false);
  const [sendingPaused, setSendingPaused] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [includeNeedsReview, setIncludeNeedsReview] = useState(false);
  const [sendLogs, setSendLogs] = useState<string[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number | null>(null);

  // Gemini assistant within bulk helper
  const [aiTone, setAiTone] = useState("friendly_respectful");
  const [aiLangStyle, setAiLangStyle] = useState("Iraqi Arabic");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Active Ref to track sending state across timeouts
  const sendingRef = useRef({ isSendingActive, sendingPaused, queue, activeQueueIndex, includeNeedsReview, delaySeconds });

  useEffect(() => {
    sendingRef.current = { isSendingActive, sendingPaused, queue, activeQueueIndex, includeNeedsReview, delaySeconds };
  }, [isSendingActive, sendingPaused, queue, activeQueueIndex, includeNeedsReview, delaySeconds]);

  // Persist core queues
  useEffect(() => {
    localStorage.setItem("fairouzz_bulk_queue", JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem("fairouzz_bulk_invalid", JSON.stringify(invalidList));
  }, [invalidList]);

  useEffect(() => {
    localStorage.setItem("fairouzz_bulk_duplicates", JSON.stringify(duplicateList));
  }, [duplicateList]);

  useEffect(() => {
    localStorage.setItem("fairouzz_bulk_msg", messageText);
  }, [messageText]);

  // Clear log helpers
  const appendConsoleLog = (line: string) => {
    const time = new Date().toLocaleTimeString();
    setSendLogs(l => [`[${time}] ${line}`, ...l.slice(0, 199)]);
  };

  // Helper dictionary header detection
  const PHONE_HEADERS = ["phone", "phone_number", "phone number", "mobile", "whatsapp", "tel", "telephone", "contact", "phone_e164", "رقم", "هاتف", "موبايل", "واتساب"];
  const NAME_HEADERS = ["name", "business_name", "business name", "title", "company", "store", "place", "اسم", "اسم النشاط", "اسم الشركة", "اسم المحل"];
  const GOV_HEADERS = ["governorate", "governorate_en", "city", "province", "المحافظة", "المدينة"];
  const CAT_HEADERS = ["category", "category_en", "type", "business type", "التصنيف", "النوع"];

  // Normalize list string
  const extractAndNormalizePhones = (rawStr: string) => {
    // splits by newline, comma, space or semicolon
    return rawStr
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  // 1. ADD MANUAL NUMBERS PROCESSOR
  const handleAddManual = () => {
    const lines = extractAndNormalizePhones(manualText);
    if (lines.length === 0) {
      setManualLog(lang === "ar" ? "الرجاء كتابة أرقام هواتف لتثبيتها أولاً!" : "Please write phone numbers first!");
      return;
    }

    let validCount = 0;
    let dupCount = 0;
    let invCount = 0;

    const newValidEntries: QueueItem[] = [];
    const newInvalids: Array<{ originalPhone: string; source: string; reason: string }> = [];
    const newDuplicates: Array<{ originalPhone: string; normalizedPhone: string; source: string }> = [];

    lines.forEach(raw => {
      const res = normalizeIraqPhone(raw);
      if (!res.isValid) {
        invCount++;
        newInvalids.push({ originalPhone: raw, source: "Manual Box", reason: res.reason });
        return;
      }

      // Check duplicate in current local entries first
      const isDuplicateInMain = queue.some(q => q.normalizedPhone === res.normalized);
      const isDuplicateInBatch = newValidEntries.some(e => e.normalizedPhone === res.normalized);

      if (isDuplicateInMain || isDuplicateInBatch) {
        dupCount++;
        newDuplicates.push({ originalPhone: raw, normalizedPhone: res.normalized, source: "Manual Box" });
        return;
      }

      validCount++;
      newValidEntries.push({
        id: `bulk_man_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: "Valued Merchant",
        originalPhone: raw,
        normalizedPhone: res.normalized,
        governorate: "Baghdad",
        category: "General",
        source: "manual",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    if (newValidEntries.length > 0) {
      setQueue(prev => [...prev, ...newValidEntries]);
    }
    if (newInvalids.length > 0) {
      setInvalidList(prev => [...newInvalids, ...prev]);
    }
    if (newDuplicates.length > 0) {
      setDuplicateList(prev => [...newDuplicates, ...prev]);
    }

    setManualText("");
    const reportTextAr = `تمت العملية بنجاح! المقبولة والمضافة: ${validCount} | المرفوضة: ${invCount} | المكررة: ${dupCount}`;
    const reportTextEn = `Finished! Added Valid: ${validCount} | Invalid: ${invCount} | Duplicates: ${dupCount}`;
    setManualLog(lang === "ar" ? reportTextAr : reportTextEn);
  };

  // 2. GOVERNORATE HANDLERS
  const handleGovChange = (gov: string, field: "text" | "category", value: string) => {
    setGovInputs(prev => ({
      ...prev,
      [gov]: {
        ...prev[gov],
        [field]: value
      }
    }));
  };

  const processGovEntries = (gov: string) => {
    const govData = govInputs[gov];
    const lines = extractAndNormalizePhones(govData.text);
    const valid: QueueItem[] = [];
    const invalid: any[] = [];
    const duplicates: any[] = [];

    lines.forEach(raw => {
      const res = normalizeIraqPhone(raw);
      if (!res.isValid) {
        invalid.push({ originalPhone: raw, source: `Gov: ${gov}`, reason: res.reason });
        return;
      }

      const dupMain = queue.some(q => q.normalizedPhone === res.normalized);
      const dupBatch = valid.some(v => v.normalizedPhone === res.normalized);

      if (dupMain || dupBatch) {
        duplicates.push({ originalPhone: raw, normalizedPhone: res.normalized, source: `Gov: ${gov}` });
        return;
      }

      valid.push({
        id: `bulk_gov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: `${gov} Partner`,
        originalPhone: raw,
        normalizedPhone: res.normalized,
        governorate: gov,
        category: govData.category || "General",
        source: "governorate",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    return { valid, invalid, duplicates };
  };

  const handleGovPreview = (gov: string) => {
    const { valid, invalid, duplicates } = processGovEntries(gov);
    const textAr = `معاينة لـ (${gov}): الصالحة للإضافة: ${valid.length} | المرفوضة: ${invalid.length} | المكررة: ${duplicates.length}`;
    const textEn = `Preview for (${gov}): Valid to add: ${valid.length} | Invalid: ${invalid.length} | Duplicates: ${duplicates.length}`;
    alert(lang === "ar" ? textAr : textEn);
  };

  const handleGovAdd = (gov: string) => {
    const { valid, invalid, duplicates } = processGovEntries(gov);
    if (valid.length === 0 && invalid.length === 0 && duplicates.length === 0) {
      alert(lang === "ar" ? "يرجى كتابة أرقام أولاً داخل مربع هذه المحافظة!" : "No phone numbers found in this governorate's box!");
      return;
    }

    if (valid.length > 0) setQueue(prev => [...prev, ...valid]);
    if (invalid.length > 0) setInvalidList(prev => [...invalid, ...prev]);
    if (duplicates.length > 0) setDuplicateList(prev => [...duplicates, ...prev]);

    // Clear textarea
    setGovInputs(prev => ({
      ...prev,
      [gov]: { ...prev[gov], text: "" }
    }));

    const textAr = `تم إضافة أرقام محافظة (${gov}) للمسودة بنجاح! الصالحة المضافة: ${valid.length}`;
    const textEn = `Added numbers for (${gov}) successfully! Added Valid: ${valid.length}`;
    alert(lang === "ar" ? textAr : textEn);
  };

  const handleGovSendOnly = (gov: string) => {
    const { valid, invalid, duplicates } = processGovEntries(gov);
    if (valid.length === 0) {
      alert(lang === "ar" ? "لا توجد أرقام صحيحة لإرسالها لهذه المحافظة فورا!" : "No valid numbers found to initiate immediate broadcast!");
      return;
    }

    // Add them to the queue
    setQueue(prev => [...prev, ...valid]);
    if (invalid.length > 0) setInvalidList(prev => [...invalid, ...prev]);
    if (duplicates.length > 0) setDuplicateList(prev => [...duplicates, ...prev]);

    // Clear textarea
    setGovInputs(prev => ({
      ...prev,
      [gov]: { ...prev[gov], text: "" }
    }));

    // Start sending specifically for elements matching newly added
    setTimeout(() => {
      setFilterGov(gov);
      setFilterStatus("ready");
      startBroadcastWorker(gov);
    }, 200);
  };


  // 3. CSV PARSER & HANDLER
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      // Extract headers from first line
      const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
      
      // Auto detect columns index
      const findMatchIdx = (patternList: string[]) => {
        return headers.findIndex(h => {
          const cleanH = h.toLowerCase().trim().replace(/[_-\s]/g, "");
          return patternList.some(p => {
            const cleanP = p.toLowerCase().trim().replace(/[_-\s]/g, "");
            return cleanH === cleanP || cleanH.includes(cleanP) || cleanP.includes(cleanH);
          });
        });
      };

      const pIdx = findMatchIdx(PHONE_HEADERS);
      const nIdx = findMatchIdx(NAME_HEADERS);
      const gIdx = findMatchIdx(GOV_HEADERS);
      const cIdx = findMatchIdx(CAT_HEADERS);

      // Save found indexes for visual help
      setCsvPhoneCol(pIdx !== -1 ? headers[pIdx] : "Not Found");
      setCsvNameCol(nIdx !== -1 ? headers[nIdx] : "Not Found (Valued Partner)");
      setCsvGovCol(gIdx !== -1 ? headers[gIdx] : "Not Found (Baghdad)");
      setCsvCatCol(cIdx !== -1 ? headers[cIdx] : "Not Found (General)");

      const parsedRows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Custom parser to split by commas respecting quotes
        const cells: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim().replace(/^["']|["']$/g, ""));
            current = "";
          } else {
            current += char;
          }
        }
        cells.push(current.trim().replace(/^["']|["']$/g, ""));

        if (cells.length < headers.length && cells.join("").trim() === "") continue;

        const phoneVal = pIdx !== -1 && cells[pIdx] ? cells[pIdx] : "";
        const nameVal = nIdx !== -1 && cells[nIdx] ? cells[nIdx] : "Valued Merchant";
        const govVal = gIdx !== -1 && cells[gIdx] ? cells[gIdx] : "Baghdad";
        const catVal = cIdx !== -1 && cells[cIdx] ? cells[cIdx] : "General";

        parsedRows.push({
          rawPhone: phoneVal,
          businessName: nameVal,
          governorate: govVal,
          category: catVal
        });
      }

      setUploadedRawRows(parsedRows);

      // Instantly generate summary statistics
      let valid = 0;
      let invalid = 0;
      let duplicates = 0;
      let alreadyInQueue = 0;

      parsedRows.forEach(row => {
        if (!row.rawPhone) {
          invalid++;
          return;
        }
        const res = normalizeIraqPhone(row.rawPhone);
        if (!res.isValid) {
          invalid++;
        } else {
          const isDupInQueue = queue.some(q => q.normalizedPhone === res.normalized);
          if (isDupInQueue) {
            alreadyInQueue++;
          } else {
            valid++;
          }
        }
      });

      setCSVStats({
        total: parsedRows.length,
        valid,
        invalid,
        duplicates,
        alreadyInQueue
      });
    };

    reader.readAsText(file, "UTF-8");
  };

  const handleAddCSVToQueue = () => {
    if (uploadedRawRows.length === 0) return;

    let addedCount = 0;
    const newQueueItems: QueueItem[] = [];
    const newInvalids: any[] = [];
    const newDuplicates: any[] = [];

    uploadedRawRows.forEach(row => {
      if (!row.rawPhone) {
        newInvalids.push({ originalPhone: "[Empty Phone Cell]", source: "CSV Raw", reason: "Blank cell value" });
        return;
      }

      const res = normalizeIraqPhone(row.rawPhone);
      if (!res.isValid) {
        newInvalids.push({ originalPhone: row.rawPhone, source: "CSV Raw", reason: res.reason });
        return;
      }

      const isDupInQueue = queue.some(q => q.normalizedPhone === res.normalized);
      const isDupInBatch = newQueueItems.some(item => item.normalizedPhone === res.normalized);

      if (isDupInQueue || isDupInBatch) {
        newDuplicates.push({ originalPhone: row.rawPhone, normalizedPhone: res.normalized, source: "CSV Raw" });
        return;
      }

      addedCount++;
      newQueueItems.push({
        id: `bulk_csv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: row.businessName || "Valued Merchant",
        originalPhone: row.rawPhone,
        normalizedPhone: res.normalized,
        governorate: row.governorate || "Baghdad",
        category: row.category || "General",
        source: "csv",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    if (newQueueItems.length > 0) setQueue(prev => [...prev, ...newQueueItems]);
    if (newInvalids.length > 0) setInvalidList(prev => [...newInvalids, ...prev]);
    if (newDuplicates.length > 0) setDuplicateList(prev => [...newDuplicates, ...prev]);

    const succAr = `تم فك وتثبيت البيانات! المضافة للصفيحة: ${addedCount} | المرفوضة: ${newInvalids.length} | المكررة: ${newDuplicates.length}`;
    const succEn = `CSV parsed completely! Added: ${addedCount} | Invalid: ${newInvalids.length} | Duplicates: ${newDuplicates.length}`;
    alert(lang === "ar" ? succAr : succEn);

    // Clean states
    setUploadedRawRows([]);
    setCSVStats(null);
    setCsvFileName("");
  };

  const handlePreviewCSVSelected = () => {
    if (uploadedRawRows.length === 0) return;
    const sample = uploadedRawRows.slice(0, 10).map((r, i) => 
      `${i+1}. ${r.businessName || "No Name"} | Phone: ${r.rawPhone} | Gov: ${r.governorate} | Category: ${r.category}`
    ).join("\n");
    
    const count = uploadedRawRows.length;
    alert(`CSV Row Samples (Total: ${count}):\n\n${sample}\n${count > 10 ? "\n... (remaining rows skipped from preview dialog)" : ""}`);
  };


  // 4. MAIN WORKER BROADCAST DISPATCHER
  const startBroadcastWorker = async (forcedGov?: string) => {
    if (isSendingActive && !sendingPaused) return;

    if (!messageText.trim()) {
      alert(lang === "ar" ? "يرجى صياغة رسالة البث أولاً!" : "Please write a draft outreach message text first!");
      return;
    }

    setIsSendingActive(true);
    setSendingPaused(false);
    appendConsoleLog("Initiating high-throughput bulk sending scheduler engine...");

    // Worker Loop triggering
    dispatchNextRow(forcedGov);
  };

  const dispatchNextRow = async (forcedGov?: string) => {
    const state = sendingRef.current;
    if (!state.isSendingActive || state.sendingPaused) {
      appendConsoleLog("Broadcast transmission paused or stopped.");
      return;
    }

    // Filter queue to find eligible next targets
    const targetGov = forcedGov || filterGov;
    const targets = state.queue.map((item, idx) => ({ item, idx })).filter(({ item }) => {
      const matchGov = targetGov === "All" || item.governorate.toLowerCase() === targetGov.toLowerCase();
      const matchCat = filterCat === "All" || item.category === filterCat;
      const matchSrc = filterSrc === "All" || item.source === filterSrc;
      
      const isReadyState = item.status === "ready" || (state.includeNeedsReview && item.status === "needs_review");
      return matchGov && matchCat && matchSrc && isReadyState;
    });

    if (targets.length === 0) {
      setIsSendingActive(false);
      setActiveQueueIndex(null);
      appendConsoleLog("No further 'ready' status rows match active constraints. Finished list.");
      return;
    }

    // Process the first target
    const { item, idx } = targets[0];
    setActiveQueueIndex(idx);

    // Dynamic templating values replacement
    let customizedText = messageText
      .replace(/{name}/g, item.businessName || "صاحب المحل العراقي")
      .replace(/{governorate}/g, GOV_AR[item.governorate] || item.governorate)
      .replace(/{category}/g, item.category || "النشاط");

    // Start Sending State
    setQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: "sending" } : q));
    appendConsoleLog(`Broadcasting message payload to: ${item.normalizedPhone} (${item.governorate})...`);

    try {
      // Dispatch payload to Nabda endpoint proxy or fallback deployed endpoint
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: item.normalizedPhone,
          message: customizedText,
          businessName: item.businessName,
          campaignName: "Bulk Custom Broadcaster"
        })
      });

      const data = await response.json();

      if (response.ok) {
        setQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: "sent", note: `API Ref: ${data.messageId || "Success"}` } : q));
        appendConsoleLog(`✅ Dispatch SUCCESS to ${item.normalizedPhone}!`);
      } else {
        // If local API has issues or missing key, retry with fallback endpoints dynamically to prevent interruptions
        if (data.error && data.error.includes("NABDA_API_KEY")) {
          appendConsoleLog(`⚠️ Master server API configured missing. Forwarding downstream worker endpoint...`);
          
          const fallbackRes = await fetch("https://bulk-sender-fairouzz-api.mahdialmuntadhar1.workers.dev/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: item.normalizedPhone,
              message: customizedText,
              businessName: item.businessName,
              campaignName: "Bulk Custom Fallback Worker"
            })
          });

          if (fallbackRes.ok) {
            setQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: "sent", note: "Sent via fallback worker API" } : q));
            appendConsoleLog(`✅ Fallback SUCCESS dispatch to ${item.normalizedPhone}!`);
          } else {
            const fallbackErr = await fallbackRes.text();
            throw new Error(fallbackErr || "External worker rejected transaction");
          }
        } else {
          throw new Error(data.error || "Nabda rejected delivery");
        }
      }
    } catch (err: any) {
      setQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: "failed", note: err.message || "Network Timeout" } : q));
      appendConsoleLog(`❌ DISPATCH FAILED for ${item.normalizedPhone}: ${err.message || "Connection failure"}`);
    }

    // Schedule next iteration based on delay seconds
    setTimeout(() => {
      dispatchNextRow(forcedGov);
    }, state.delaySeconds * 1000);
  };

  const handlePause = () => {
    setSendingPaused(true);
    appendConsoleLog("Broadcast process requested PAUSED. Waiting for current dispatch step to complete.");
  };

  const handleResume = () => {
    setSendingPaused(false);
    appendConsoleLog("Resuming broadcast queue processor...");
    setTimeout(() => {
      dispatchNextRow();
    }, 100);
  };

  const handleStop = () => {
    setIsSendingActive(false);
    setSendingPaused(false);
    setActiveQueueIndex(null);
    appendConsoleLog("Sending process STOPPED. Operations queue cleared from scheduler loop.");
  };


  // 5. EXPORT AND CSV GENERATORS
  const downloadCSVFile = (filename: string, content: string) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFinalQueue = () => {
    let csv = "Business Name,Original Phone,Normalized Phone,Governorate,Category,Source,Status,Note\n";
    queue.forEach(item => {
      csv += `"${item.businessName.replace(/"/g, '""')}",` +
             `"${item.originalPhone}",` +
             `"${item.normalizedPhone}",` +
             `"${item.governorate}",` +
             `"${item.category}",` +
             `"${item.source}",` +
             `"${item.status}",` +
             `"${item.note.replace(/"/g, '""')}"\n`;
    });
    downloadCSVFile(`fairouzz_final_queue_${Date.now()}.csv`, csv);
  };

  const handleExportSent = () => {
    let csv = "Processed Time,Phone,Business Name,Status,Ref\n";
    queue.filter(q => q.status === "sent").forEach(item => {
      csv += `"${new Date().toISOString()}",` +
             `"${item.normalizedPhone}",` +
             `"${item.businessName.replace(/"/g, '""')}",` +
             `"Sent",` +
             `"${item.note.replace(/"/g, '""')}"\n`;
    });
    downloadCSVFile(`fairouzz_delivered_sent_${Date.now()}.csv`, csv);
  };

  const handleExportFailed = () => {
    let csv = "Failure Time,Phone,Business Name,Error Details\n";
    queue.filter(q => q.status === "failed").forEach(item => {
      csv += `"${new Date().toISOString()}",` +
             `"${item.normalizedPhone}",` +
             `"${item.businessName.replace(/"/g, '""')}",` +
             `"${item.note.replace(/"/g, '""')}"\n`;
    });
    downloadCSVFile(`fairouzz_failures_report_${Date.now()}.csv`, csv);
  };

  const handleExportInvalid = () => {
    let csv = "Timestamp,Raw Phone Input,Source Component,Reason Of Rejection\n";
    invalidList.forEach(item => {
      csv += `"${new Date().toISOString()}",` +
             `"${item.originalPhone}",` +
             `"${item.source}",` +
             `"${item.reason}"\n`;
    });
    downloadCSVFile(`fairouzz_invalid_phones_${Date.now()}.csv`, csv);
  };

  const handleExportDuplicates = () => {
    let csv = "Timestamp,Raw Phone,Normalized Form,Original Source\n";
    duplicateList.forEach(item => {
      csv += `"${new Date().toISOString()}",` +
             `"${item.originalPhone}",` +
             `"${item.normalizedPhone}",` +
             `"${item.source}"\n`;
    });
    downloadCSVFile(`fairouzz_duplicate_phones_${Date.now()}.csv`, csv);
  };


  // 6. GEMINI AI MESSAGE OPTIMIZER IN BULK TEXTAREA
  const handleAiOptimizeText = async () => {
    if (!messageText.trim()) {
      setAiError(lang === "ar" ? "يرجى كتابة نص الرسالة الأساسية لتتم صياغتها بالذكاء الاصطناعي." : "Please draft some initial message text first.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/gemini/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          tone: aiTone,
          language: aiLangStyle
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed contacting the Gemini Copilot Endpoint.");
      }
      if (data.optimizedText) {
        setMessageText(data.optimizedText);
      } else {
        throw new Error("Empty recommendation returned.");
      }
    } catch (err: any) {
      setAiError(err.message || "An issue occurred.");
    } finally {
      setAiLoading(false);
    }
  };


  // UI Computes & Helpers
  const queueFiltered = queue.filter(item => {
    const matchGov = filterGov === "All" || item.governorate.toLowerCase() === filterGov.toLowerCase();
    const matchCat = filterCat === "All" || item.category === filterCat;
    const matchSrc = filterSrc === "All" || item.source === filterSrc;
    const matchStatus = filterStatus === "All" || item.status === filterStatus;
    
    const textSearch = searchTerm.toLowerCase();
    const matchSearch = item.businessName.toLowerCase().includes(textSearch) || 
                        item.normalizedPhone.includes(textSearch) || 
                        item.originalPhone.includes(textSearch) || 
                        item.note.toLowerCase().includes(textSearch);

    return matchGov && matchCat && matchSrc && matchStatus && matchSearch;
  });

  // Calculate dynamic statistics
  const countSent = queue.filter(q => q.status === "sent").length;
  const countFailed = queue.filter(q => q.status === "failed").length;
  const countSkipped = queue.filter(q => q.status === "skipped").length;
  const countReady = queue.filter(q => q.status === "ready").length;
  const countNeedsReview = queue.filter(q => q.status === "needs_review").length;
  const totalInQueue = queue.length;

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right font-sans" : "ltr text-left font-sans"}`}>
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059] animate-pulse"></span>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {lang === "ar" ? "المرسل الجماعي الفائق ✨" : "Super Bulk Sender ✨"}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === "ar" 
              ? "مجموعة متطورة لإرسال رسائل الواتساب الجماعية بقسم ذكي للمحافظات العراقية ورفع ملفات Excel/CSV" 
              : "Advanced high-throughput segment broadcasting suite with 18 Governorate hubs & custom CSV uploading."}
          </p>
        </div>

        {/* Quick Clear controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm(lang === "ar" ? "هل أنت متأكد من مسح جميع سجلات طابور الانتظار؟" : "Clear entire queue spreadsheet?")) {
                setQueue([]);
                setInvalidList([]);
                setDuplicateList([]);
                appendConsoleLog("Cleared queue, invalid log and duplicate database sheets.");
              }
            }}
            className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 transition text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={13} />
            {lang === "ar" ? "تفريغ الطابور كلياً" : "Purge Entire Queue"}
          </button>
        </div>
      </div>

      {/* QUICK STATUS TICKER OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#14171D] border border-[#2D3139] rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === "ar" ? "الإجمالي في الطابور" : "Total Queue"}</p>
          <p className="text-xl font-bold text-white mt-1">{totalInQueue}</p>
        </div>
        <div className="bg-[#14171D] border border-[#2D3139] rounded-xl p-3 text-center">
          <p className="text-[10px] text-emerald-400 font-bold uppercase">{lang === "ar" ? "أرسلت بنجاح" : "Successfully Sent"}</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{countSent}</p>
        </div>
        <div className="bg-[#14171D] border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-[10px] text-red-400 font-bold uppercase">{lang === "ar" ? "الفاشلة" : "Failed Delivery"}</p>
          <p className="text-xl font-bold text-red-400 mt-1">{countFailed}</p>
        </div>
        <div className="bg-[#14171D] border border-amber-500/20 rounded-xl p-3 text-center">
          <p className="text-[10px] text-amber-500 font-bold uppercase">{lang === "ar" ? "بحاجة لمراجعة" : "Needs Review"}</p>
          <p className="text-xl font-bold text-amber-500 mt-1">{countNeedsReview}</p>
        </div>
        <div className="bg-[#14171D] border border-slate-700 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-350 font-bold uppercase">{lang === "ar" ? "الغير صالحة المستبعدة" : "Excluded Invalid"}</p>
          <p className="text-xl font-bold text-slate-300 mt-1">{invalidList.length}</p>
        </div>
        <div className="bg-[#14171D] border border-slate-700 rounded-xl p-3 text-center">
          <p className="text-[10px] text-indigo-400 font-bold uppercase">{lang === "ar" ? "المكررات المحذوفة" : "Duplicates Found"}</p>
          <p className="text-xl font-bold text-indigo-400 mt-1">{duplicateList.length}</p>
        </div>
      </div>

      {/* TWO COLUMN GRID : INPUT METHODS & PREVIEW/CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: 1. MESSAGE CARD & INPUT OPTIONS (Span 6) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Card 1: Message Text Composer */}
          <div className="bg-[#14171D] border border-[#2D3139] p-4 md:p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-[#C5A059]" size={16} />
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  {lang === "ar" ? "1. نص الرسالة والصياغة" : "1. Draft Outreach Message"}
                </h2>
              </div>
              <span className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 font-bold px-2 py-0.5 rounded uppercase">
                {lang === "ar" ? "يدعم المتغيرات" : "Variables Supported"}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              {lang === "ar" 
                ? "صيغ هيكل الرسالة. يمكنك كتابة المتغيرات التالية التي سيتم استبدالها آلياً لكل مستلم: {name} (الاسم)، {governorate} (المحافظة)، {category} (التصنيف)."
                : "Type message content. Dynamic tags replace instantly: {name} (Name), {governorate} (Governorate), {category} (Category)."}
            </p>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#C5A059] transition focus:ring-1 focus:ring-[#C5A059]/20"
              placeholder={lang === "ar" ? "يرجى كتابة نص الدعاية هنا..." : "Draft outreach copy..."}
            />

            {/* INTEGRATED GEMINI AI REFINEMENT DRAWER */}
            <div className="bg-[#0A0B0E]/60 border border-[#C5A059]/10 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#C5A059]" />
                  {lang === "ar" ? "تحسين النبرة بالذكاء الاصطناعي (Gemini)" : "AI Copywriter Tone Optimization"}
                </span>
                <span className="text-[8px] bg-[#C5A059]/10 text-[#C5A059] px-1.5 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                  ACTIVE GEMINI
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-1">
                  <span className="text-slate-400">{lang === "ar" ? "نبرة الصوت" : "Desired Tone"}</span>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full bg-[#14171D] border border-[#2E333D] rounded px-2 py-1 text-white text-[10px]"
                  >
                    <option value="friendly_respectful">🤝 Friendly & Polite</option>
                    <option value="direct_promo">🔥 Urgent Offer Code</option>
                    <option value="curiosity_hook">⚡ Curious Headline</option>
                    <option value="professional_b2b">💼 Corporate B2B Style</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400">{lang === "ar" ? "اللهجة والنمط" : "Style / Accent"}</span>
                  <select
                    value={aiLangStyle}
                    onChange={(e) => setAiLangStyle(e.target.value)}
                    className="w-full bg-[#14171D] border border-[#2E333D] rounded px-2 py-1 text-white text-[10px]"
                  >
                    <option value="Colloquial Iraqi Arabic">🇮🇶 Iraqi Dialect</option>
                    <option value="Standard Simplified Arabic">🇸🇦 Modern Fusha</option>
                    <option value="Soranî Kurdish">☀️ Soranî Kurdish</option>
                    <option value="Marketing English">🇬🇧 English Ad Copy</option>
                  </select>
                </div>
              </div>

              {aiError && <p className="text-[9px] text-red-400">⚠️ {aiError}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleAiOptimizeText}
                  className="bg-[#C5A059]/10 hover:bg-[#C5A059]/20 border border-[#C5A059]/15 text-[#C5A059] text-[10px] font-bold px-3 py-1 rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <span className="w-2 h-2 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
                      {lang === "ar" ? "جاري التحسين..." : "Refining..."}
                    </>
                  ) : (
                    <>
                      <Sparkles size={11} className="text-[#C5A059]" />
                      {lang === "ar" ? "تحسين النص بالذكاء الاصطناعي ✨" : "Improve Draft with AI ✨"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Manual Numbers Input */}
          <div className="bg-[#14171D] border border-[#2D3139] p-4 md:p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Phone className="text-emerald-500" size={16} />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {lang === "ar" ? "2. إدخال الأرقام يدوياً" : "2. Manual Phone Numbers Box"}
              </h2>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-semibold block">
                {lang === "ar" ? "الأرقام اليدوية" : "Manual Phone Numbers"}
              </label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={3}
                placeholder={`Paste phone numbers here, one per line or separated by commas.\nExamples:\n07801234567\n+9647801234567\n9647801234567\n7801234567`}
                className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-mono"
              />
            </div>

            {manualLog && (
              <div className="bg-slate-900 rounded-lg p-2 border border-slate-800 text-[10px] text-emerald-400 font-mono">
                {manualLog}
              </div>
            )}

            <button
              onClick={handleAddManual}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              {lang === "ar" ? "تثبيت وإضافة الأرقام اليدوية" : "Add Manual Numbers"}
            </button>
          </div>

          {/* Card 3: CSV Multi-File Upload Container */}
          <div className="bg-[#14171D] border border-[#2D3139] p-4 md:p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <UploadCloud className="text-indigo-400" size={16} />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {lang === "ar" ? "3. رفع ملفات Excel / CSV" : "3. CSV Upload Integration"}
              </h2>
            </div>

            <div className="border-2 border-dashed border-[#2D3139] hover:border-indigo-500 bg-slate-950/40 rounded-xl p-5 text-center transition cursor-pointer relative group">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
              <div className="space-y-2 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400 group-hover:scale-105 transition-transform">
                  <UploadCloud size={20} />
                </div>
                <p className="text-xs font-bold text-white">
                  {csvFileName || (lang === "ar" ? "انقر أو اسحب ملفات CSV هنا للرفع" : "Drag and drop CSV files here or click to browse")}
                </p>
                <p className="text-[10px] text-slate-400">
                  {lang === "ar" ? "يقوم النظام تلقائياً بكشف خانات الهاتف، الاسم، المحافظة، والتصنيف" : "System auto-detects columns: Phone, Name, Governorate, and Category"}
                </p>
              </div>
            </div>

            {csvStats && (
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2 text-[11px] leading-relaxed">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block border-b border-slate-800 pb-1.5 mb-1.5">
                  📊 Dynamic Upload Audit Breakdown:
                </span>
                
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>• {lang === "ar" ? "إجمالي الأسطر المحللة:" : "Total Rows Found:"} <span className="text-white font-bold">{csvStats.total}</span></div>
                  <div>• {lang === "ar" ? "أرقام صالحة للإضافة:" : "Valid Ready Phones:"} <span className="text-emerald-400 font-bold">{csvStats.valid}</span></div>
                  <div>• {lang === "ar" ? "أرقام تالفة / فارغة:" : "Invalid Rejected Phones:"} <span className="text-red-400 font-bold">{csvStats.invalid}</span></div>
                  <div>• {lang === "ar" ? "متكررة بالملف:" : "Duplicates in Upload:"} <span className="text-indigo-400 font-bold">{csvStats.duplicates}</span></div>
                </div>

                <div className="border-t border-slate-800 pt-2 mt-2 space-y-1 text-[9px] text-slate-400">
                  <p>⚙️ Detected columns: Phone (<span className="text-slate-200">{csvPhoneCol}</span>) | Name (<span className="text-slate-200">{csvNameCol}</span>) | Gov (<span className="text-slate-200">{csvGovCol}</span>) | Cat (<span className="text-slate-200">{csvCatCol}</span>)</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={handlePreviewCSVSelected}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-white text-[10px] font-semibold py-1.5 rounded transition cursor-pointer"
                  >
                    🔍 {lang === "ar" ? "معاينة عينة الأسطر" : "Preview CSV Samples"}
                  </button>
                  <button
                    onClick={handleAddCSVToQueue}
                    className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold py-1.5 rounded transition cursor-pointer"
                  >
                    💾 {lang === "ar" ? "تأكيد واستيراد المحافظة" : "Add Selected to Queue"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 2. SEND BY GOVERNORATE ACCORDION GRID (Span 6) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#14171D] border border-[#2D3139] p-4 md:p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Building2 className="text-[#C5A059]" size={16} />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {lang === "ar" ? "4. التوزيع الذكي حسب المحافظات العراقية" : "4. Segmentation by Iraq Governorates"}
              </h2>
            </div>

            <p className="text-[11px] text-slate-400">
              {lang === "ar" 
                ? "أرسل أو أضف البيانات لمحافظة معينة. قمنا بفرز الـ 18 محافظة بملفات مستقلة لتسهيل إرسال الأرقام الجاهزة."
                : "Segment phone list by specific province. Write numbers, pick categories and act strictly on that province."}
            </p>

            {/* Grid of 18 governorates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-2 custom-scrollbar">
              {IRAQ_GOVERNORATES.map(gov => {
                const data = govInputs[gov];
                const countLines = extractAndNormalizePhones(data.text).length;

                return (
                  <div key={gov} className="bg-[#0A0B0E] border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-[#C5A059]/30 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-[11px] font-bold text-[#C5A059]">
                        📍 {lang === "ar" ? GOV_AR[gov] : gov} 
                      </span>
                      {countLines > 0 && (
                        <span className="text-[8px] bg-[#C5A059]/10 text-[#C5A059] px-1.5 py-0.5 rounded font-bold font-mono">
                          {countLines} {lang === "ar" ? "أرقام" : "phones"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <textarea
                        value={data.text}
                        onChange={(e) => handleGovChange(gov, "text", e.target.value)}
                        placeholder={lang === "ar" ? `أدخل أرقام ${GOV_AR[gov]}...` : `Paste ${gov} numbers...`}
                        rows={2}
                        className="w-full bg-[#14171D] border border-slate-800 rounded-lg p-2 text-[10px] text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-[#C5A059]"
                      />
                      
                      <div className="flex items-center justify-between gap-1.5 text-[10px]">
                        <span className="text-slate-400 whitespace-nowrap">{lang === "ar" ? "التصنيف:" : "Cat:"}</span>
                        <input
                          type="text"
                          value={data.category}
                          onChange={(e) => handleGovChange(gov, "category", e.target.value)}
                          className="w-full bg-[#14171D] border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-[#C5A059]"
                          placeholder="Category (e.g. Cafe)"
                        />
                      </div>
                    </div>

                    {/* Governorates Row Actions */}
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => handleGovPreview(gov)}
                        className="bg-slate-800/80 hover:bg-slate-750 text-white text-[9px] font-semibold py-1 rounded transition cursor-pointer"
                      >
                        🔍 Preview
                      </button>
                      <button
                        onClick={() => handleGovAdd(gov)}
                        className="bg-[#C5A059]/10 hover:bg-[#C5A059]/20 border border-[#C5A059]/15 text-[#C5A059] text-[9px] font-semibold py-1 rounded transition cursor-pointer"
                      >
                        ➕ Add Item
                      </button>
                      <button
                        onClick={() => handleGovSendOnly(gov)}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-450 text-[9px] font-bold py-1 rounded transition cursor-pointer"
                      >
                        ⚡ Send Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* MID PANEL: SENDING CONTROLS PANEL & TERMINAL OUTLOGS */}
      <div className="bg-[#14171D] border border-[#2D3139] p-4 md:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="text-amber-500" size={16} />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {lang === "ar" ? "5. لوحة التحكم والتحكم في الإرسال" : "5. Outreach Real-Time Dispatch Control"}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {lang === "ar" ? "قناة Nabda نشطة" : "Nabda API Active"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Dispatch controls form */}
          <div className="lg:col-span-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">{lang === "ar" ? "معدل التأخير (ثانية):" : "Delay Spacing (Sec):"}</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1 text-white"
                />
              </div>

              <div className="space-y-2.5 flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeNeedsReview}
                    onChange={(e) => setIncludeNeedsReview(e.target.checked)}
                    className="accent-[#C5A059]"
                  />
                  <span className="text-[10px] text-amber-500 font-bold block">
                    {lang === "ar" ? "مفاتيح الفحص والشكوك" : "Send Suspicious"}
                  </span>
                </label>
              </div>
            </div>

            {/* Core Action Send Buttons */}
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                {!isSendingActive ? (
                  <button
                    onClick={() => startBroadcastWorker()}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-[#0A0B0E] text-xs font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    <Play size={13} fill="#0A0B0E" />
                    {lang === "ar" ? "بدء الإرسال الجماعي" : "Start Sending"}
                  </button>
                ) : sendingPaused ? (
                  <button
                    onClick={handleResume}
                    className="flex-1 bg-[#C5A059] hover:bg-[#B38E4A] text-[#0A0B0E] text-xs font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlayCircle size={13} fill="#0A0B0E" />
                    {lang === "ar" ? "استئناف الإرسال" : "Resume"}
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#0A0B0E] text-xs font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Pause size={13} fill="#0A0B0E" />
                    {lang === "ar" ? "إيقاف مؤقت" : "Pause"}
                  </button>
                )}

                {(isSendingActive || sendingPaused) && (
                  <button
                    onClick={handleStop}
                    className="flex-1 bg-red-650 hover:bg-red-650 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <StopCircle size={13} />
                    {lang === "ar" ? "إيقاف تام" : "Stop"}
                  </button>
                )}
              </div>

              {/* Extra send options */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("ready");
                    startBroadcastWorker();
                  }}
                  className="bg-[#14171D] hover:bg-slate-800 border border-[#2D3139] text-slate-300 py-1.5 rounded font-semibold text-center transition cursor-pointer"
                >
                  🚀 {lang === "ar" ? "إرسال كل الأرقام الجاهزة" : "Send All Ready"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (filterGov === "All") {
                      alert(lang === "ar" ? "يرجى تحديد المحافظة أولاً من جدول الفلترة تحت!" : "Please filter specifically by governorate in the filters list first!");
                      return;
                    }
                    startBroadcastWorker(filterGov);
                  }}
                  className="bg-[#14171D] hover:bg-slate-800 border border-[#2D3139] text-slate-300 py-1.5 rounded font-semibold text-center transition cursor-pointer"
                >
                  📍 {lang === "ar" ? `إرسال المحافظة المحددة (${filterGov})` : `Send Only Gov (${filterGov})`}
                </button>
              </div>
            </div>

            {/* Realtime progress tracker */}
            {isSendingActive && (
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Processed: {countSent + countFailed} / {totalInQueue}</span>
                  <span className="text-[#C5A059] font-bold">
                    {sendingPaused ? "PAUSED" : "DISPATCHING WA"}
                  </span>
                </div>
                <div className="w-full bg-[#0A0B0E] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${totalInQueue > 0 ? ((countSent + countFailed) / totalInQueue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Logging Outlog console */}
          <div className="lg:col-span-8 flex flex-col space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider font-mono">
              📟 Active Dispatch Ledger Monitor logs:
            </span>
            <div className="bg-[#0A0B0E] border border-[#2C313B] rounded-xl p-3 flex-1 h-[155px] overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar text-left select-all">
              {sendLogs.length === 0 ? (
                <p className="text-slate-600 italic">Console idle. Awaiting action trigger inputs...</p>
              ) : (
                sendLogs.map((log, lIdx) => (
                  <p key={lIdx} className={log.includes("SUCCESS") ? "text-emerald-400" : log.includes("FAILED") ? "text-red-400" : "text-slate-300"}>
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DOWN PANEL: FILTER BAR & ACTIVE QUEUE LIST PREVIEW BOARD */}
      <div className="bg-[#14171D] border border-[#2D3139] p-4 md:p-5 rounded-2xl shadow-xl space-y-4">
        
        {/* Title row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="text-indigo-400" size={16} />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {lang === "ar" ? "6. فلترة واستعراض صفيحة البيانات" : "6. Advanced Channels Queue Preview Board"}
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">
            {lang === "ar" ? `المطابقة الحالية: ${queueFiltered.length} من أصل ${totalInQueue}` : `Matches found: ${queueFiltered.length} / ${totalInQueue}`}
          </span>
        </div>

        {/* Dynamic Filters form block */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1 text-[10px]">
            <span className="text-slate-400">{lang === "ar" ? "المحافظة:" : "Gov filter:"}</span>
            <select
              value={filterGov}
              onChange={(e) => setFilterGov(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1 text-white text-[11px]"
            >
              <option value="All">🌐 All Governorates</option>
              {IRAQ_GOVERNORATES.map(gov => (
                <option key={gov} value={gov}>📍 {lang === "ar" ? GOV_AR[gov] : gov}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-[10px]">
            <span className="text-slate-400">{lang === "ar" ? "التصنيف:" : "Category:"}</span>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1 text-white text-[11px]"
            >
              <option value="All">All Categories</option>
              {Array.from(new Set(queue.map(q => q.category))).filter(Boolean).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-[10px]">
            <span className="text-slate-400">{lang === "ar" ? "المصدر:" : "Source:"}</span>
            <select
              value={filterSrc}
              onChange={(e) => setFilterSrc(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1 text-white text-[11px]"
            >
              <option value="All">All Sources</option>
              <option value="manual">Manual Input</option>
              <option value="governorate">Gov Segment</option>
              <option value="csv">CSV Upload</option>
            </select>
          </div>

          <div className="space-y-1 text-[10px]">
            <span className="text-slate-400">{lang === "ar" ? "الحالة:" : "Status:"}</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1 text-white text-[11px]"
            >
              <option value="All">All Statuses</option>
              <option value="ready">Ready to Send</option>
              <option value="needs_review">Needs Review</option>
              <option value="sending">Sending...</option>
              <option value="sent">Completed OK</option>
              <option value="failed">Delivery Failed</option>
              <option value="skipped">Skipped/Excl</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-1 space-y-1 text-[10px]">
            <span className="text-slate-400">{lang === "ar" ? "بحث بالاسم/الهاتف:" : "Search name/phone:"}</span>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1 text-white text-[11px] pr-7"
              />
              <Search size={11} className="absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Scrollable spreadsheet HTML Table representing the queue preview */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20 max-h-[380px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0A0B0E] border-b border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3">{lang === "ar" ? "اسم المحل" : "Business Name"}</th>
                <th className="p-3">{lang === "ar" ? "الهاتف الأصلي" : "Original Phone"}</th>
                <th className="p-3">{lang === "ar" ? "الهاتف الموحد" : "Normalized WA"}</th>
                <th className="p-3">{lang === "ar" ? "المحافظة" : "Governorate"}</th>
                <th className="p-3">{lang === "ar" ? "التصنيف" : "Category"}</th>
                <th className="p-3">{lang === "ar" ? "المصدر" : "Source"}</th>
                <th className="p-3">{lang === "ar" ? "الحالة" : "Status"}</th>
                <th className="p-3">{lang === "ar" ? "تفاصيل" : "Note / API Ref"}</th>
                <th className="p-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueFiltered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 italic">
                    {lang === "ar" ? "لا توجد أي سجلات مطابقة في طابور الإرسال حالياً." : "No records inside bulk sending queue matching criteria."}
                  </td>
                </tr>
              ) : (
                queueFiltered.map((elem, qIdx) => {
                  const itemIndex = queue.findIndex(qi => qi.id === elem.id);
                  const isCurActive = itemIndex === activeQueueIndex;

                  return (
                    <tr 
                      key={elem.id} 
                      className={`border-b border-slate-850 hover:bg-white/2 select-text ${isCurActive ? "bg-[#C5A059]/5 border-l-2 border-l-[#C5A059]" : ""}`}
                    >
                      <td className="p-3 text-center text-[10px] font-mono text-slate-500">{qIdx + 1}</td>
                      <td className="p-3 font-semibold text-white whitespace-nowrap">{elem.businessName}</td>
                      <td className="p-3 text-[11px] font-mono text-slate-400">{elem.originalPhone}</td>
                      <td className="p-3 text-[11px] font-mono text-[#C5A059]">{elem.normalizedPhone}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-300">
                          📍 {lang === "ar" ? GOV_AR[elem.governorate] || elem.governorate : elem.governorate}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="bg-[#1C2128] text-slate-300 px-2 py-0.5 rounded text-[10px]">
                          {elem.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.3 rounded border border-slate-800 text-slate-450 bg-[#0A0B0E]">
                          {elem.source}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {elem.status === "sent" && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            SENT
                          </span>
                        )}
                        {elem.status === "failed" && (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            FAILED
                          </span>
                        )}
                        {elem.status === "sending" && (
                          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold animate-pulse">
                            SENDING
                          </span>
                        )}
                        {elem.status === "ready" && (
                          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            READY
                          </span>
                        )}
                        {elem.status === "needs_review" && (
                          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            NEEDS REVIEW
                          </span>
                        )}
                        {elem.status === "skipped" && (
                          <span className="bg-slate-700/15 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            SKIPPED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 text-[10px] truncate max-w-[150px] font-mono leading-none" title={elem.note}>
                        {elem.note || "-"}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setQueue(prev => prev.filter(item => item.id !== elem.id));
                          }}
                          className="bg-transparent hover:bg-slate-800 text-slate-400 hover:text-red-400 p-1.5 rounded transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORT EXPORTS BOX CARDS */}
      <div className="bg-[#14171D] border border-[#2D3139] p-4 md:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Download className="text-[#C5A059]" size={16} />
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {lang === "ar" ? "7. تصدير التقارير وسجلات الأخطاء والمكررات" : "7. Export Dedicated Broadcast Statistics"}
          </h2>
        </div>

        <p className="text-[11px] text-slate-400">
          {lang === "ar" 
            ? "نزل السجلات الناتجة عن عملية البث الحالية كملفة CSV لتثبيتها وعرضها خارجياً أو لإعادة استيراد القوائم وتدقيقها."
            : "Download localized CSV files tracking all status classes across current operations. Preserves exact Iraq formatting."}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 pt-2">
          <button
            onClick={handleExportFinalQueue}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 px-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-indigo-400" />
            <span>{lang === "ar" ? "تصدير القائمة كاملة" : "Export Queue CSV"}</span>
          </button>

          <button
            onClick={handleExportSent}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 px-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{lang === "ar" ? "تصدير المستلمة بنجاح" : "Export Sent CSV"}</span>
          </button>

          <button
            onClick={handleExportFailed}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 px-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <AlertCircle size={16} className="text-red-400" />
            <span>{lang === "ar" ? "تصدير الأرقام الفاشلة" : "Export Failed CSV"}</span>
          </button>

          <button
            onClick={handleExportInvalid}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 px-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Trash2 size={16} className="text-amber-500" />
            <span>{lang === "ar" ? "تصدير الأرقام التالفة" : "Export Invalid CSV"}</span>
          </button>

          <button
            onClick={handleExportDuplicates}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 px-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw size={16} className="text-indigo-400 animate-spin-slow" />
            <span>{lang === "ar" ? "تصدير المكررات" : "Export Duplicates CSV"}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
