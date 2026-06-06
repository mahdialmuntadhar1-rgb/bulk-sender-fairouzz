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
  Building2, 
  Plus, 
  Phone, 
  RefreshCw, 
  FileSpreadsheet, 
  Clock,
  Check,
  Sliders,
  FileText,
  AlertTriangle,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import { INITIAL_CONTACTS } from "../mockData";
import { Contact } from "../types";

// List of 18 governorates in Iraq
const IRAQ_GOVERNORATES = [
  "Baghdad", "Basra", "Erbil", "Sulaymaniyah", "Duhok", 
  "Nineveh", "Kirkuk", "Najaf", "Karbala", "Anbar", 
  "Diyala", "Wasit", "Babylon", "Diwaniyah", "Maysan", 
  "Dhi Qar", "Muthanna", "Salahaddin"
];

// Localized governorate Arabic mapping
const GOV_AR: Record<string, string> = {
  "Baghdad": "بغداد", "Basra": "البصرة", "Erbil": "أربيل", "Sulaymaniyah": "السليمانية", "Duhok": "دهوك", 
  "Nineveh": "نينوى", "Kirkuk": "كركوك", "Najaf": "النجف", "Karbala": "كربلاء", "Anbar": "الأنبار", 
  "Diyala": "ديالى", "Wasit": "واسط", "Babylon": "بابل", "Diwaniyah": "الديوانية", "Maysan": "ميسان", 
  "Dhi Qar": "ذي قار", "Muthanna": "المثنى", "Salahaddin": "صلاح الدين"
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

  // Extract digits
  const digits = cleaned.replace(/[^\d]/g, "");
  let finalNum = "";

  if (digits.length === 10 && digits.startsWith("7")) {
    finalNum = "+964" + digits;
  } else if (digits.length === 11 && digits.startsWith("07")) {
    finalNum = "+964" + digits.slice(1);
  } else if (digits.length === 13 && digits.startsWith("9647")) {
    finalNum = "+" + digits;
  } else if (digits.length === 14 && digits.startsWith("009647")) {
    finalNum = "+" + digits.slice(2);
  } else {
    return { 
      isValid: false, 
      normalized: phoneStr, 
      needsReview: false, 
      reason: "Not Iraqi mobile format (expects prefix 07 or 7)" 
    };
  }

  const pattern = /^\+9647\d{9}$/;
  const isValid = pattern.test(finalNum);

  if (!isValid) {
    return { 
      isValid: false, 
      normalized: phoneStr, 
      needsReview: false, 
      reason: "Incorrect Iraqi mobile number length or prefix" 
    };
  }

  const tail = finalNum.slice(5);
  const set = new Set(tail.split(""));
  const isSuspicious = set.size === 1 || finalNum.includes("777777777") || finalNum.includes("888888888") || finalNum.includes("000000000");

  return {
    isValid: true,
    normalized: finalNum,
    needsReview: isSuspicious,
    reason: isSuspicious ? "Suspicious repeating digits" : ""
  };
}

export default function BulkSenderView({ lang }: BulkSenderViewProps) {
  // Main states - synced with LocalStorage
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const saved = localStorage.getItem("fairouzz_bulk_queue");
    return saved ? JSON.parse(saved) : [];
  });

  const [invalidList, setInvalidList] = useState<any[]>(() => {
    const saved = localStorage.getItem("fairouzz_bulk_invalid");
    return saved ? JSON.parse(saved) : [];
  });

  const [duplicateList, setDuplicateList] = useState<any[]>(() => {
    const saved = localStorage.getItem("fairouzz_bulk_duplicates");
    return saved ? JSON.parse(saved) : [];
  });

  const [messageText, setMessageText] = useState(() => {
    return localStorage.getItem("fairouzz_bulk_msg") || "مرحباً يا {name}، يسعدنا دعوتكم للانضمام لدليل شاكو ماكو التجاري قسم {category} في {governorate}!";
  });

  // CRM Contacts database state
  const [crmContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem("shakumaku_contacts");
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  // Active Layout Tab State
  const [activeTab, setActiveTab] = useState<"gov" | "manual" | "csv">("gov");

  // Validation / Preview Summaries to display step 3 info
  const [validationSummary, setValidationSummary] = useState<{
    tab: "gov" | "manual" | "csv";
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    isCrmFallback?: boolean;
    peek: Array<{ name: string; phone: string; gov: string; cat: string; status: string }>;
  } | null>(null);

  // TAB 1: Governorate Campaign States
  const [selectedGovernorates, setSelectedGovernorates] = useState<string[]>([]);
  
  // TAB 2: Manual Phones state
  const [manualText, setManualText] = useState("");

  // TAB 3 / TAB 1 Shared CSV Upload States
  const [csvSourceRows, setCsvSourceRows] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");

  // Connection & Sending States
  const [nabdaApiKey, setNabdaApiKey] = useState(() => {
    return localStorage.getItem("fairouzz_nabda_api_key") || "";
  });
  const [tempApiKey, setTempApiKey] = useState(() => {
    return localStorage.getItem("fairouzz_nabda_api_key") || "";
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [nabdaStatus, setNabdaStatus] = useState<"idle" | "testing" | "connected" | "error">("idle");
  const [nabdaErrorDetails, setNabdaErrorDetails] = useState("");
  const [isSendingActive, setIsSendingActive] = useState(false);
  const [sendingPaused, setSendingPaused] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number | null>(null);
  const [sendLogs, setSendLogs] = useState<string[]>([]);

  // Advanced section toggle for queue inspector & operations report
  const [showAdvancedQueue, setShowAdvancedQueue] = useState(false);

  // Filters State for the background inspector table
  const [filterGov, setFilterGov] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [filterSrc, setFilterSrc] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [isDemoMode, setIsDemoMode] = useState(false);

  const sendingRef = useRef({ isSendingActive, sendingPaused, queue, activeQueueIndex, delaySeconds, isDemoMode });

  useEffect(() => {
    sendingRef.current = { isSendingActive, sendingPaused, queue, activeQueueIndex, delaySeconds, isDemoMode };
  }, [isSendingActive, sendingPaused, queue, activeQueueIndex, delaySeconds, isDemoMode]);

  // Sync Persistence to storage
  useEffect(() => {
    try {
      localStorage.setItem("fairouzz_bulk_queue", JSON.stringify(queue));
    } catch (e) {
      console.warn("localStorage quota exceeded for fairouzz_bulk_queue", e);
    }
  }, [queue]);
  useEffect(() => {
    try {
      localStorage.setItem("fairouzz_bulk_invalid", JSON.stringify(invalidList));
    } catch (e) {
      console.warn("localStorage quota exceeded for fairouzz_bulk_invalid", e);
    }
  }, [invalidList]);
  useEffect(() => {
    try {
      localStorage.setItem("fairouzz_bulk_duplicates", JSON.stringify(duplicateList));
    } catch (e) {
      console.warn("localStorage quota exceeded for fairouzz_bulk_duplicates", e);
    }
  }, [duplicateList]);
  useEffect(() => {
    try {
      localStorage.setItem("fairouzz_bulk_msg", messageText);
    } catch (e) {
      console.warn("localStorage quota exceeded for fairouzz_bulk_msg", e);
    }
  }, [messageText]);

  // Reset validation summary on tab change to prevent contamination
  useEffect(() => {
    setValidationSummary(null);
  }, [activeTab]);

  // Test connection function
  const testNabdaConnection = async (targetKey?: string) => {
    setNabdaStatus("testing");
    setNabdaErrorDetails("");
    const keyToUse = targetKey !== undefined ? targetKey : nabdaApiKey;
    try {
      const headers: Record<string, string> = {};
      if (keyToUse) {
        headers["x-nabda-api-key"] = keyToUse;
      }
      const response = await fetch("/api/nabda/test", { headers });
      const data = await response.json();
      if (response.ok && data.success) {
        setNabdaStatus("connected");
      } else {
        setNabdaStatus("error");
        setNabdaErrorDetails(data.error || "Connection rejected by server proxy.");
      }
    } catch (err: any) {
      setNabdaStatus("error");
      setNabdaErrorDetails(err.message || "Failed parsing network check.");
    }
  };

  const handleSaveApiKey = async (newKey: string) => {
    const trimmed = newKey.trim();
    localStorage.setItem("fairouzz_nabda_api_key", trimmed);
    setNabdaApiKey(trimmed);
    try {
      const response = await fetch("/api/nabda/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed })
      });
      if (response.ok) {
        appendConsoleLog("🔑 Nabda API Key synchronized with the server registry.");
      }
    } catch (e: any) {
      console.error("Failed syncing key with backend:", e);
    }
    testNabdaConnection(trimmed);
  };

  useEffect(() => {
    const initApiKeyCheck = async () => {
      try {
        const response = await fetch("/api/nabda/key");
        const data = await response.json();
        if (response.ok && data.configured) {
          // Key exists on backend, verify connection line
          testNabdaConnection();
        } else if (nabdaApiKey) {
          // Backend has no key set, sync our local storage key
          const syncResponse = await fetch("/api/nabda/key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: nabdaApiKey })
          });
          if (syncResponse.ok) {
            appendConsoleLog("🔑 Nabda API Key synchronized with the server registry on startup.");
            testNabdaConnection(nabdaApiKey);
          }
        } else {
          setNabdaStatus("idle");
        }
      } catch (err) {
        console.warn("Error verifying API key configuration on startup:", err);
        testNabdaConnection();
      }
    };
    initApiKeyCheck();
  }, []);

  const appendConsoleLog = (line: string) => {
    const time = new Date().toLocaleTimeString();
    setSendLogs(l => [`[${time}] ${line}`, ...l.slice(0, 99)]);
  };

  // Governorate counts inside database fallback
  const getCrmCountByGov = (gov: string) => {
    return crmContacts.filter(c => c.governorate.toLowerCase() === gov.toLowerCase()).length;
  };

  // MULTIPLE CSV Uploader and column parser
  const handleCSVMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let accumulatedRows: any[] = [];
    const fileNames: string[] = [];

    const PHONE_HEADERS = ["phone", "phone_number", "phone number", "mobile", "whatsapp", "tel", "telephone", "رقم", "هاتف", "موبايل"];
    const NAME_HEADERS = ["name", "business_name", "business name", "title", "company", "store", "place", "اسم", "اسم النشاط", "الاسم", "محل"];
    const GOV_HEADERS = ["governorate", "governorate_en", "city", "province", "المحافظة", "المدينة", "محافظة"];
    const CAT_HEADERS = ["category", "category_en", "type", "business type", "التصنيف", "النوع", "تصنيف"];

    for (let f = 0; f < files.length; f++) {
      const file = files[f];
      fileNames.push(file.name);

      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string || "");
        reader.readAsText(file, "UTF-8");
      });

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      // Sniff CSV separator: supports Comma, Semicolon, and Tab (for Arabic/European excel CSV exports)
      const firstLine = lines[0];
      let separator = ",";
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semiCount = (firstLine.match(/;/) || []).length ? (firstLine.match(/;/g) || []).length : 0;
      const tabCount = (firstLine.match(/\t/) || []).length ? (firstLine.match(/\t/g) || []).length : 0;
      
      if (semiCount > commaCount && semiCount > tabCount) {
        separator = ";";
      } else if (tabCount > commaCount && tabCount > semiCount) {
        separator = "\t";
      }

      const headers = firstLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ""));

      const findIdx = (patternList: string[]) => {
        return headers.findIndex(h => {
          const lh = h.toLowerCase().trim().replace(/[_-\s]/g, "");
          return patternList.some(p => lh === p.toLowerCase().trim().replace(/[_-\s]/g, "") || lh.includes(p.toLowerCase()) || p.toLowerCase().includes(lh));
        });
      };

      let pIdx = findIdx(PHONE_HEADERS);
      const nIdx = findIdx(NAME_HEADERS);
      const gIdx = findIdx(GOV_HEADERS);
      const cIdx = findIdx(CAT_HEADERS);

      // Auto-detect phone column index fallback if headers have no matching labels
      if (pIdx === -1) {
        const sampleLine = lines.length > 1 ? lines[1] : lines[0];
        const sampleCells = sampleLine.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ""));
        const detectedPhoneIdx = sampleCells.findIndex(cell => {
          const cleanedDigits = cell.replace(/[^\d]/g, "");
          return cleanedDigits.length >= 7 && (cleanedDigits.startsWith("07") || cleanedDigits.startsWith("7") || cleanedDigits.startsWith("96"));
        });
        if (detectedPhoneIdx !== -1) {
          pIdx = detectedPhoneIdx;
          appendConsoleLog(`ℹ️ Could not find 'phone' column header. Auto-detected column ${detectedPhoneIdx + 1} as phone number field.`);
        } else {
          pIdx = 0; // Default fallback to first column
        }
      }

      // Sniff whether first line is actually data (no headers present)
      let parseStartLine = 1;
      const firstLineRawCells = lines[0].split(separator).map(c => c.trim().replace(/^["']|["']$/g, ""));
      const pCellOnFirst = pIdx !== -1 && firstLineRawCells[pIdx] ? firstLineRawCells[pIdx] : "";
      if (pCellOnFirst && normalizeIraqPhone(pCellOnFirst).isValid) {
        parseStartLine = 0;
        appendConsoleLog(`ℹ️ First line of spreadsheet parsed directly as contact data.`);
      }

      for (let i = parseStartLine; i < lines.length; i++) {
        const line = lines[i];
        const cells: string[] = [];
        let curr = "";
        let inQuotes = false;
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === '"' || char === "'") inQuotes = !inQuotes;
          else if (char === separator && !inQuotes) {
            cells.push(curr.trim().replace(/^["']|["']$/g, ""));
            curr = "";
          } else curr += char;
        }
        cells.push(curr.trim().replace(/^["']|["']$/g, ""));

        if (cells.length < headers.length && cells.join("").trim() === "") continue;

        const rawPhone = pIdx !== -1 && cells[pIdx] ? cells[pIdx] : "";
        const businessName = nIdx !== -1 && cells[nIdx] ? cells[nIdx] : "Valued Merchant";
        const governorate = gIdx !== -1 && cells[gIdx] ? cells[gIdx] : "Baghdad";
        const category = cIdx !== -1 && cells[cIdx] ? cells[cIdx] : "General";

        accumulatedRows.push({
          rawPhone,
          businessName,
          governorate,
          category,
          fileName: file.name
        });
      }
    }

    setCsvFileName(fileNames.join(", "));
    setCsvSourceRows(accumulatedRows);
    appendConsoleLog(`CSV spreadsheet parsing complete: Loaded ${accumulatedRows.length} total raw lines.`);
    
    // Auto-validate and load the batch into bulk pipeline immediately
    autoValidateCsvData(accumulatedRows);
  };

  const autoValidateCsvData = (rows: any[]) => {
    if (rows.length === 0) return;
    appendConsoleLog(`⚡ Ingesting ${rows.length} spreadsheet records...`);
    const generated = runValidateCsv(rows);
    appendConsoleLog(`✨ Primary pipeline ready with ${generated.length} candidates loaded.`);
  };

  // PREVIEW & VALIDATION SYSTEM MODULES FOR EACH CAMPAIGN SOURCE TYPE

  const runValidateGov = (): QueueItem[] => {
    if (selectedGovernorates.length === 0) {
      alert(lang === "ar" 
        ? "يرجى تحديد محافظة واحدة على الأقل للاستهداف!" 
        : "Please select at least one governorate first!"
      );
      return [];
    }

    let sourceRows: any[] = [];
    let isCrmFallback = false;

    // Filter CSV file if uploaded, otherwise fallback to database
    if (csvSourceRows.length > 0) {
      sourceRows = csvSourceRows.filter(row => {
        const govClean = (row.governorate || "Baghdad").trim().toLowerCase();
        return selectedGovernorates.some(g => g.trim().toLowerCase() === govClean);
      });
    } else {
      isCrmFallback = true;
      sourceRows = crmContacts.filter(contact => 
        selectedGovernorates.some(gov => gov.toLowerCase() === contact.governorate.toLowerCase())
      ).map(c => ({
        rawPhone: c.phone,
        businessName: c.businessName,
        governorate: c.governorate,
        category: c.category || "General"
      }));
    }

    if (sourceRows.length === 0) {
      alert(lang === "ar" 
        ? "تنبيه: لم يتم العثور على أي أرقام هواتف للمحافظات المحددة!" 
        : "No phone contacts found matching the selected governorates!"
      );
      return [];
    }

    let validCount = 0;
    let invalidCount = 0;
    let dupCount = 0;
    const newQueueItems: QueueItem[] = [];
    const localInvalids: any[] = [];
    const localDuplicates: any[] = [];
    const seenInBatch = new Set<string>();

    sourceRows.forEach(row => {
      const res = normalizeIraqPhone(row.rawPhone);
      if (!res.isValid) {
        invalidCount++;
        localInvalids.push({ originalPhone: row.rawPhone || "[Empty]", source: isCrmFallback ? "CRM Gov" : "CSV Gov", reason: res.reason });
        return;
      }

      const dupInBatch = seenInBatch.has(res.normalized);
      if (dupInBatch) {
        dupCount++;
        localDuplicates.push({ originalPhone: row.rawPhone, normalizedPhone: res.normalized, source: isCrmFallback ? "CRM Gov" : "CSV Gov" });
        return;
      }

      seenInBatch.add(res.normalized);
      validCount++;
      newQueueItems.push({
        id: `bulk_gov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: row.businessName || "Merchant",
        originalPhone: row.rawPhone,
        normalizedPhone: res.normalized,
        governorate: row.governorate || "Baghdad",
        category: row.category || "General",
        source: "governorate",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    setQueue(newQueueItems);
    if (localInvalids.length > 0) setInvalidList(prev => [...localInvalids, ...prev]);
    if (localDuplicates.length > 0) setDuplicateList(prev => [...localDuplicates, ...prev]);

    setValidationSummary({
      tab: "gov",
      total: sourceRows.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: dupCount,
      isCrmFallback,
      peek: newQueueItems.slice(0, 10).map(q => ({
        name: q.businessName,
        phone: q.normalizedPhone,
        gov: q.governorate,
        cat: q.category,
        status: q.status
      }))
    });

    appendConsoleLog(`Prepared Governorate Campaign: ${validCount} valid targets mapped into pipeline.`);
    return newQueueItems;
  };

  const runValidateManual = (): QueueItem[] => {
    const rawLines = manualText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      alert(lang === "ar" ? "يرجى كتابة أرقام الهواتف أولاً في المربع لتحليلها!" : "Please write phone numbers inside the text area first!");
      return [];
    }

    let validCount = 0;
    let invalidCount = 0;
    let dupCount = 0;
    const newQueueItems: QueueItem[] = [];
    const localInvalids: any[] = [];
    const localDuplicates: any[] = [];
    const seenInBatch = new Set<string>();

    rawLines.forEach(raw => {
      const res = normalizeIraqPhone(raw);
      if (!res.isValid) {
        invalidCount++;
        localInvalids.push({ originalPhone: raw, source: "Manual", reason: res.reason });
        return;
      }

      const dupInBatch = seenInBatch.has(res.normalized);
      if (dupInBatch) {
        dupCount++;
        localDuplicates.push({ originalPhone: raw, normalizedPhone: res.normalized, source: "Manual" });
        return;
      }

      seenInBatch.add(res.normalized);
      validCount++;
      newQueueItems.push({
        id: `bulk_man_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: lang === "ar" ? "رقم يدوي" : "Manual Recipient",
        originalPhone: raw,
        normalizedPhone: res.normalized,
        governorate: "Baghdad",
        category: "General",
        source: "manual",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    setQueue(newQueueItems);
    if (localInvalids.length > 0) setInvalidList(prev => [...localInvalids, ...prev]);
    if (localDuplicates.length > 0) setDuplicateList(prev => [...localDuplicates, ...prev]);

    setValidationSummary({
      tab: "manual",
      total: rawLines.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: dupCount,
      peek: newQueueItems.slice(0, 10).map(q => ({
        name: q.businessName,
        phone: q.normalizedPhone,
        gov: q.governorate,
        cat: q.category,
        status: q.status
      }))
    });

    appendConsoleLog(`Prepared Manual Campaign: ${validCount} phone numbers verified in queue.`);
    return newQueueItems;
  };

  const runValidateCsv = (rowsToValidate: any[]): QueueItem[] => {
    let validCount = 0;
    let invalidCount = 0;
    let dupCount = 0;
    const newQueueItems: QueueItem[] = [];
    const localInvalids: any[] = [];
    const localDuplicates: any[] = [];
    const seenInBatch = new Set<string>();

    rowsToValidate.forEach(row => {
      const res = normalizeIraqPhone(row.rawPhone);
      if (!res.isValid) {
        invalidCount++;
        localInvalids.push({ originalPhone: row.rawPhone || "[Empty]", source: "Full CSV", reason: res.reason });
        return;
      }

      const dupInBatch = seenInBatch.has(res.normalized);
      if (dupInBatch) {
        dupCount++;
        localDuplicates.push({ originalPhone: row.rawPhone, normalizedPhone: res.normalized, source: "Full CSV" });
        return;
      }

      seenInBatch.add(res.normalized);
      validCount++;
      newQueueItems.push({
        id: `bulk_csv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: row.businessName || "CSV Contact",
        originalPhone: row.rawPhone,
        normalizedPhone: res.normalized,
        governorate: row.governorate || "Baghdad",
        category: row.category || "General",
        source: "csv",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    setQueue(newQueueItems);
    if (localInvalids.length > 0) setInvalidList(prev => [...localInvalids, ...prev]);
    if (localDuplicates.length > 0) setDuplicateList(prev => [...localDuplicates, ...prev]);

    setValidationSummary({
      tab: "csv",
      total: rowsToValidate.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: dupCount,
      peek: newQueueItems.slice(0, 10).map(q => ({
        name: q.businessName,
        phone: q.normalizedPhone,
        gov: q.governorate,
        cat: q.category,
        status: q.status
      }))
    });

    appendConsoleLog(`Prepared Full CSV Campaign: Evaluated ${rowsToValidate.length} rows, found ${validCount} valid entries.`);
    return newQueueItems;
  };

  // Event handlers for manual click interactions
  const handleValidateGovTab = () => {
    runValidateGov();
  };

  const handleValidateManualTab = () => {
    runValidateManual();
  };

  const handleValidateFullCsvTab = () => {
    if (csvSourceRows.length === 0) {
      alert(lang === "ar" ? "يرجى رفع ملف الـ CSV أولاً ليتم تحليله وفحصه!" : "Please upload a CSV file to begin analysis first!");
      return;
    }
    runValidateCsv(csvSourceRows);
  };

  // DISPATCH TRANSMITTER CORE LOOP LOGIC
  const startSendingProcess = () => {
    if (isSendingActive && !sendingPaused) return;
    if (!messageText.trim()) {
      alert(lang === "ar" ? "يرجى كتابة نص الرسالة أولاً!" : "Please write a draft outreach message first!");
      return;
    }

    let activeQueue = [...queue];
    let readyItems = activeQueue.filter(q => q.status === "ready");

    if (readyItems.length === 0) {
      appendConsoleLog("Queue was uninitialized. Programmatically compiling campaign variables...");
      if (activeTab === "csv") {
        if (csvSourceRows.length > 0) {
          const generated = runValidateCsv(csvSourceRows);
          activeQueue = generated;
          readyItems = generated.filter(q => q.status === "ready");
        }
      } else if (activeTab === "gov") {
        if (selectedGovernorates.length > 0) {
          const generated = runValidateGov();
          activeQueue = generated;
          readyItems = generated.filter(q => q.status === "ready");
        }
      } else if (activeTab === "manual") {
        if (manualText.trim()) {
          const generated = runValidateManual();
          activeQueue = generated;
          readyItems = generated.filter(q => q.status === "ready");
        }
      }
    }

    if (readyItems.length === 0) {
      alert(lang === "ar" 
        ? "لا توجد أي أرقام بحالة 'جاهزة' للإرسال! الرجاء رفع ملف الـ CSV أو إدخال الأرقام أولاً." 
        : "No contacts found with status 'Ready'! Please upload a CSV or enter numbers first."
      );
      return;
    }

    let runAsDemo = isDemoMode;
    if (nabdaStatus !== "connected" && !isDemoMode) {
      const confirmDemo = window.confirm(
        lang === "ar"
          ? "تنبيه: بوابة الإرسال غير متصلة (أو مفتاح الـ API للنبضة غير مهيأ في الإعدادات العميقة).\n\nهل تريد تشغيل البث في وضع المحاكاة والتدريب السريع (Demo Simulation Mode)؟\nسيسمح لك هذا برؤية شريط التقدم وعدادات الإحصائيات وسجلات البث تعمل بشكل تفاعلي بالكامل!"
          : "Notice: Dispatch gateway not connected (or NABDA_API_KEY is not configured yet).\n\nWould you like to run this campaign in Sandbox Demo Simulation Mode?\nThis will allow you to watch the interactive progression bar, stats metrics, and active ledger run in real time!"
      );
      if (confirmDemo) {
        runAsDemo = true;
        setIsDemoMode(true);
      }
    }

    // Set Ref values direct to prevent execution timing races or state synchronicity lag
    sendingRef.current = {
      isSendingActive: true,
      sendingPaused: false,
      queue: activeQueue,
      activeQueueIndex: null,
      delaySeconds,
      isDemoMode: runAsDemo
    };

    setIsSendingActive(true);
    setSendingPaused(false);
    appendConsoleLog("Initiating high-speed message transmission line...");
    setTimeout(() => dispatchNextRow(), 200);
  };

  const dispatchNextRow = async () => {
    const state = sendingRef.current;
    if (!state.isSendingActive || state.sendingPaused) {
      appendConsoleLog("Broadcast process paused.");
      return;
    }

    // Isolate next queued item with ready status
    const targetIdx = state.queue.findIndex(q => q.status === "ready");
    if (targetIdx === -1) {
      setIsSendingActive(false);
      setActiveQueueIndex(null);
      appendConsoleLog("✅ Transmission Finished! All ready records evaluated.");
      return;
    }

    setActiveQueueIndex(targetIdx);
    const item = state.queue[targetIdx];

    // Template binders
    const customMsg = messageText
      .replace(/{name}/g, item.businessName || "")
      .replace(/{governorate}/g, GOV_AR[item.governorate] || item.governorate)
      .replace(/{category}/g, item.category || "");

    // Mark as in-flight
    setQueue(prev => prev.map((q, i) => i === targetIdx ? { ...q, status: "sending" } : q));
    appendConsoleLog(`Sending payload to ${item.normalizedPhone}...`);

    if (state.isDemoMode) {
      // Simulation mode delay block
      await new Promise(resolve => setTimeout(resolve, 800));
      // Simulate success (96%) and failures (4%)
      const isSuccessSim = Math.random() < 0.96;
      if (isSuccessSim) {
        setQueue(prev => prev.map((q, i) => i === targetIdx ? { ...q, status: "sent", note: "Sim-ID-" + Math.floor(100000 + Math.random() * 900000) } : q));
        appendConsoleLog(`🟢 [Demo Simulation] Message delivered to ${item.normalizedPhone}`);
      } else {
        setQueue(prev => prev.map((q, i) => i === targetIdx ? { ...q, status: "failed", note: "Simulated busy line signal" } : q));
        appendConsoleLog(`🔴 [Demo Simulation] Message failed to ${item.normalizedPhone}: Simulated busy line signal`);
      }
    } else {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (nabdaApiKey) {
          headers["x-nabda-api-key"] = nabdaApiKey.trim();
        }
        const response = await fetch("/api/nabda/send", {
          method: "POST",
          headers,
          body: JSON.stringify({
            phone: item.normalizedPhone,
            message: customMsg,
            businessName: item.businessName
          })
        });

        const data = await response.json();
        if (response.ok) {
          setQueue(prev => prev.map((q, i) => i === targetIdx ? { ...q, status: "sent", note: data.response?.messageId || "Delivered" } : q));
          appendConsoleLog(`🟢 Delivered safely to ${item.normalizedPhone}`);
        } else {
          throw new Error(data.error || "Nabda Host rejected");
        }
      } catch (err: any) {
        setQueue(prev => prev.map((q, i) => i === targetIdx ? { ...q, status: "failed", note: err.message || "Timeout" } : q));
        appendConsoleLog(`🔴 Transmission Failed to ${item.normalizedPhone}: ${err.message}`);
      }
    }

    setTimeout(() => dispatchNextRow(), delaySeconds * 1000);
  };

  const handlePause = () => {
    setSendingPaused(true);
    appendConsoleLog("Requested pause. Transceiver will freeze after compiling the active row.");
  };

  const handleResume = () => {
    setSendingPaused(false);
    appendConsoleLog("Resuming active campaign...");
    setTimeout(() => dispatchNextRow(), 200);
  };

  const handleStop = () => {
    setIsSendingActive(false);
    setSendingPaused(false);
    setActiveQueueIndex(null);
    appendConsoleLog("⏹ Broadcast halted completely.");
  };

  // EXPORT AUDIT LOG FILES
  const triggerCSVDownload = (fileName: string, csvContent: string) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFinalQueue = () => {
    let content = "Business Name,Original Phone,Normalized Phone,Governorate,Category,Source,Status,Note\n";
    queue.forEach(q => {
      content += `"${q.businessName}","${q.originalPhone}","${q.normalizedPhone}","${q.governorate}","${q.category}","${q.source}","${q.status}","${q.note}"\n`;
    });
    triggerCSVDownload(`fairouzz_bulk_queue_${Date.now()}.csv`, content);
  };

  const handleExportSent = () => {
    let content = "Business Name,Phone,Governorate,Category,Status,Reference\n";
    queue.filter(q => q.status === "sent").forEach(q => {
      content += `"${q.businessName}","${q.normalizedPhone}","${q.governorate}","${q.category}","Sent","${q.note}"\n`;
    });
    triggerCSVDownload(`fairouzz_delivered_sent_${Date.now()}.csv`, content);
  };

  const handleExportFailed = () => {
    let content = "Business Name,Phone,Governorate,Category,Status,ErrorDetails\n";
    queue.filter(q => q.status === "failed").forEach(q => {
      content += `"${q.businessName}","${q.normalizedPhone}","${q.governorate}","${q.category}","Failed","${q.note}"\n`;
    });
    triggerCSVDownload(`fairouzz_failures_${Date.now()}.csv`, content);
  };

  const handleExportInvalid = () => {
    let content = "Original Phone,Source,Reason\n";
    invalidList.forEach(i => {
      content += `"${i.originalPhone}","${i.source}","${i.reason}"\n`;
    });
    triggerCSVDownload(`fairouzz_invalids_${Date.now()}.csv`, content);
  };

  const handleExportDuplicates = () => {
    let content = "Original Phone,Normalized,Source\n";
    duplicateList.forEach(d => {
      content += `"${d.originalPhone}","${d.normalizedPhone}","${d.source}"\n`;
    });
    triggerCSVDownload(`fairouzz_duplicates_${Date.now()}.csv`, content);
  };

  // Backstage viewer filtering rules
  const queueFiltered = queue.filter(item => {
    const matchGov = filterGov === "All" || item.governorate.toLowerCase() === filterGov.toLowerCase();
    const matchCat = filterCat === "All" || item.category === filterCat;
    const matchSrc = filterSrc === "All" || item.source === filterSrc;
    const matchStatus = filterStatus === "All" || item.status === filterStatus;
    const matchSearch = searchTerm === "" || 
      item.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.normalizedPhone.includes(searchTerm) || 
      item.originalPhone.includes(searchTerm);

    return matchGov && matchCat && matchSrc && matchStatus && matchSearch;
  });

  // Numeric tracking indices
  const totalInQueue = queue.length;
  const countSent = queue.filter(q => q.status === "sent").length;
  const countFailed = queue.filter(q => q.status === "failed").length;
  const countRemaining = queue.filter(q => q.status === "ready").length;
  const progressPercentage = (countSent + countFailed) > 0 && totalInQueue > 0
    ? Math.round(((countSent + countFailed) / totalInQueue) * 100)
    : 0;

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right font-sans" : "ltr text-left font-sans"}`}>
      
      {/* Title Header with status display */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {lang === "ar" ? "لوحة الإرسال الجماعي الفائقة ✨" : "Super Bulk Sender Dashboard ✨"}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === "ar" 
              ? "نظام مراسلة عسكري الدقة يدعم الحملات الموجهة للمحافظات، اللوائح اليدوية الارتجالية، واستيراد ملفات الـ Excel/CSV الكلية." 
              : "Advanced military-grade broadcasting pipeline supporting localized governorate targeting, arbitrary copy-paste strings, or entire raw spreadsheets."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Nabda Channel Integrations Banner */}
          <div className="flex items-center gap-1.5 text-xs">
            {nabdaStatus === "testing" && (
              <span className="text-slate-400 font-mono animate-pulse text-[11px] bg-slate-800 px-2 py-1 rounded">Testing line...</span>
            )}
            {nabdaStatus === "connected" && (
              <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 text-[11px]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                {lang === "ar" ? "متصل ببوابة النبضة" : "Active Port: Nabda"}
              </span>
            )}
            {nabdaStatus === "error" && (
              <span className="flex items-center gap-1 text-red-405 font-bold bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 text-[11px]" title={nabdaErrorDetails}>
                ⚠️ {lang === "ar" ? "خطأ اتصال" : "Nabda Port Error"}
              </span>
            )}
          </div>

          {/* Sandbox Simulation Mode Toggle */}
          <button
            onClick={() => {
              setIsDemoMode(!isDemoMode);
              appendConsoleLog(`Simulation/Sandbox mode ${!isDemoMode ? "ENABLED ✔" : "DISABLED ✘"}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${
              isDemoMode 
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 font-extrabold shadow-lg shadow-amber-500/5 hover:bg-amber-500/20" 
                : "bg-slate-800/40 text-slate-400 border-slate-755 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span>✨ {lang === "ar" ? "محاكاة الإرسال" : "Sandbox Simulation"}</span>
            <span className={`w-2 h-2 rounded-full ${isDemoMode ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`}></span>
          </button>

          <button
            onClick={() => {
              if (window.confirm(lang === "ar" ? "هل أنت متأكد من مسح قائمة الانتظار الحالية وسجلات المسارات؟" : "Are you sure you want to clear the active candidate queue?")) {
                setQueue([]);
                setValidationSummary(null);
                appendConsoleLog("Operations ledger cleared.");
              }
            }}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
            title={lang === "ar" ? "تصفير الطابور" : "Purge operational pipeline"}
          >
            <Trash2 size={13} />
            <span>{lang === "ar" ? "تفريغ الطابور" : "Purge Queue"}</span>
          </button>
        </div>
      </div>

      {/* NABDA API Integration Settings Box */}
      <div className="bg-[#14171D] border border-[#2D3139] rounded-2xl shadow-xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {lang === "ar" ? "بوابة الإرسال والربط مع النبضة" : "Nabda Gateway API Integration"}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {lang === "ar" 
                ? "أدخل مفتاح الـ API الخاص بـ Nabda لتفعيل ميزة البث والإرسال المباشر للرسائل عبر بوابتهم الرقمية." 
                : "Configure your Nabda platform development API key here to route actual SMS/WhatsApp dispatches seamlessly."}
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium font-mono text-[11px]">
              {lang === "ar" ? "حالة ربط البوابة:" : "Gateway link status:"}
            </span>
            {nabdaStatus === "testing" && (
              <span className="text-slate-400 font-mono animate-pulse text-[11px] bg-slate-800 px-2.5 py-1 rounded">Testing line...</span>
            )}
            {nabdaStatus === "connected" && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-[#1B2C24] px-2.5 py-1 rounded-full border border-emerald-500/25 text-[11px]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {lang === "ar" ? "متصل ببوابة النبضة" : "Connected Secured"}
              </span>
            )}
            {nabdaStatus === "error" && (
              <span className="flex items-center gap-1.5 text-red-400 font-bold bg-[#341B21] px-2.5 py-1 rounded-full border border-red-500/25 text-[11px]" title={nabdaErrorDetails}>
                ⚠️ {lang === "ar" ? "خطأ اتصال" : "Port Error"}
              </span>
            )}
            {nabdaStatus === "idle" && (
              <span className="text-slate-400 font-bold bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 text-[11px]">
                {lang === "ar" ? "بانتظار التهيئة" : "Unconfigured"}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type={showApiKey ? "text" : "password"}
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder={lang === "ar" ? "أدخل مفتاح الـ API للنبضة (sk_...)" : "Enter Nabda API credential key (sk_...)"}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          
          <button
            onClick={() => handleSaveApiKey(tempApiKey)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3.5 rounded-xl transition shadow-md shadow-indigo-600/15 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Check size={14} />
            <span>{lang === "ar" ? "حفظ واعتماد المفتاح" : "Save & Verify Connection"}</span>
          </button>
        </div>
        
        {nabdaStatus === "error" && nabdaErrorDetails && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-[11px] text-red-400 flex items-start gap-2 animate-fadeIn font-mono">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>{lang === "ar" ? "تفاصيل التنبيه:" : "Gateway message:"}</strong> {nabdaErrorDetails}
            </p>
          </div>
        )}
      </div>

      {/* 3-Tab Navigator Panel */}
      <div className="bg-[#12141a] p-1.5 rounded-2xl border border-slate-800/80 max-w-2xl mx-auto flex gap-1">
        <button
          onClick={() => setActiveTab("gov")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "gov" 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" 
              : "text-slate-400 hover:text-white hover:bg-slate-800/30"
          }`}
        >
          <Building2 size={14} />
          <span>{lang === "ar" ? "1. حملة المحافظات" : "1. Governorate Campaign"}</span>
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "manual" 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" 
              : "text-slate-400 hover:text-white hover:bg-slate-800/30"
          }`}
        >
          <Phone size={14} />
          <span>{lang === "ar" ? "2. أرقام يدوية" : "2. Manual Phone Numbers"}</span>
        </button>

        <button
          onClick={() => setActiveTab("csv")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "csv" 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" 
              : "text-slate-400 hover:text-white hover:bg-slate-800/30"
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>{lang === "ar" ? "3. حملة CSV الكاملة" : "3. Full CSV Campaign"}</span>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-[#14171D] border border-[#2D3139] rounded-2xl shadow-xl overflow-hidden p-5 md:p-6 space-y-6">
        
        {/* TAB 1: Governorate Campaign Layout Content */}
        {activeTab === "gov" && (
          <div className="space-y-6">
            {/* Helper Text banner explanation */}
            <div className="bg-indigo-500/5 border border-indigo-505/10 rounded-xl p-4 flex gap-3 text-slate-300">
              <Sparkles size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest">
                  {lang === "ar" ? "🎯 دليل الاستخدام: حملات المحافظات المستهدفة" : "🎯 Campaign Guide: Governorate-Targeted Broadcaster"}
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {lang === "ar" 
                    ? "اختر هذا الوضع عندما تريد تصفية المتلقين حسب محافظات محددة في العراق. يمكنك إما رفع ورقة ملف CSV وسيقوم النظام بفرزها تلقائياً، أو ترك ميزة رفع الملفات فارغة ليقوم الخادم بسحب وتصفية التجار تلقائياً وبشكل حصري من قاعدة بيانات الـ CRM المركزية المسجلين لديك للحصول على سرعة إطلاق فائقة!" 
                    : "Select this mode when you want to target recipients from specific structural governorates in Iraq. You can upload a custom CSV file to parse matches, or leave the upload blank to automatically extract matching businesses registered inside your unified CRM database."}
                </p>
              </div>
            </div>

            {/* Steps Workflow List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Data Import Step (Step 1 & 2) */}
              <div className="space-y-5">
                
                {/* STEP 1: CSV Upload Selector */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {lang === "ar" ? "الخطوة الأولى: رفع ورقة العمل (اختياري)" : "Step 1: Upload Contact Spreadsheet (Optional)"}
                    </label>
                  </div>

                  {!csvFileName ? (
                    <div className="border border-dashed border-[#2D3139] bg-[#0A0B0E]/60 rounded-xl p-6 text-center hover:border-indigo-500 transition cursor-pointer relative group">
                      <input
                        type="file"
                        accept=".csv"
                        multiple
                        onChange={handleCSVMultiUpload}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                      />
                      <div className="space-y-2 pointer-events-none">
                        <UploadCloud size={20} className="text-indigo-400 mx-auto" />
                        <p className="text-xs font-bold text-white">
                          {lang === "ar" ? "انقر أو اسحب ملف الـ CSV هنا" : "Upload spreadsheet records here"}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {lang === "ar" ? "الاسم، الهاتف، المحافظة، التصنيف" : "Auto-detects Name, Phone, Governorate tags"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#090b0e] border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-xs text-white">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <div className="font-mono">
                          <p className="font-bold max-w-[200px] truncate">{csvFileName}</p>
                          <p className="text-[10px] text-slate-400">{csvSourceRows.length} {lang === "ar" ? "سجل مكتشف" : "records parsed"}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setCsvFileName("");
                          setCsvSourceRows([]);
                        }}
                        className="text-slate-400 hover:text-red-405 transition text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>{lang === "ar" ? "حذف" : "Remove"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* STEP 2: Governorate selection Checkboxes */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">2</span>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        {lang === "ar" ? "الخطوة الثانية: حدد المحافظات المستهدفة" : "Step 2: Select Target Governorates"}
                      </label>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedGovernorates(IRAQ_GOVERNORATES)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-750 text-white font-semibold px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        {lang === "ar" ? "الكل" : "All"}
                      </button>
                      <button
                        onClick={() => setSelectedGovernorates([])}
                        className="text-[10px] bg-slate-800 hover:bg-slate-750 text-white font-semibold px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        {lang === "ar" ? "إلغاء" : "Clear"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 shadow-inner border border-slate-800 bg-[#0A0B0E] max-h-[160px] overflow-y-auto p-3 rounded-xl gap-2 text-xs">
                    {IRAQ_GOVERNORATES.map(gov => {
                      const isChecked = selectedGovernorates.includes(gov);
                      const currentCount = getCrmCountByGov(gov);
                      return (
                        <label 
                          key={gov} 
                          className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-lg transition-all select-none ${
                            isChecked ? "bg-indigo-500/5 text-white" : "text-slate-400 hover:bg-slate-850/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedGovernorates(prev => [...prev, gov]);
                              else setSelectedGovernorates(prev => prev.filter(g => g !== gov));
                            }}
                            className="accent-indigo-500 w-3.5 h-3.5"
                          />
                          <div className="text-[11px] leading-tight">
                            <span className="font-bold">{lang === "ar" ? GOV_AR[gov] : gov}</span>
                            {!csvFileName && <span className="text-slate-500 block text-[9px] font-mono">({currentCount} central CRM)</span>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Message Composer (Step 3) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">3</span>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {lang === "ar" ? "الخطوة الثالثة: صياغة قالب الرسالة" : "Step 3: Message Template Composer"}
                    </label>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded font-mono uppercase">
                    Variables OK
                  </span>
                </div>

                <div className="bg-[#0A0B0E] border border-slate-800 p-4 rounded-xl space-y-3.5 shadow-inner">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                    className="w-full bg-[#12141a] border border-[#2D3139] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono leading-relaxed resize-none"
                    placeholder={lang === "ar" ? "اكتب دعايتك هنا..." : "Compose your advertising message copy here..."}
                  />

                  {/* Character stats & tag helpers */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold">{lang === "ar" ? "اضغط لإدراج متغير:" : "Insert tags:"}</span>
                      <button
                        onClick={() => setMessageText(t => t + " {name}")}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded font-mono select-none cursor-pointer"
                      >
                        {lang === "ar" ? "الاسم" : "{name}"}
                      </button>
                      <button
                        onClick={() => setMessageText(t => t + " {governorate}")}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded font-mono select-none cursor-pointer"
                      >
                        {lang === "ar" ? "المحافظة" : "{governorate}"}
                      </button>
                      <button
                        onClick={() => setMessageText(t => t + " {category}")}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded font-mono select-none cursor-pointer"
                      >
                        {lang === "ar" ? "القسم" : "{category}"}
                      </button>
                    </div>

                    <span className="font-mono text-indigo-400 font-bold">{messageText.length} chars</span>
                  </div>
                </div>

                {/* Validation Trigger Button */}
                <button
                  onClick={handleValidateGovTab}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>{lang === "ar" ? "🔍 معاينة وفحص أرقام المحافظات" : "🔍 Preview & Validate Campaign"}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: Manual Phone Numbers Layout Content */}
        {activeTab === "manual" && (
          <div className="space-y-6">
            {/* Helper Text banner explanation */}
            <div className="bg-indigo-500/5 border border-indigo-505/10 rounded-xl p-4 flex gap-3 text-slate-300">
              <Phone size={18} className="text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-sky-400 uppercase tracking-widest">
                  {lang === "ar" ? "📋 دليل الاستخدام: لوائح الإلصاق اليدوي السريع" : "📋 Campaign Guide: Manual Text Area Broadcaster"}
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {lang === "ar" 
                    ? "اختر هذا الوضع عندما ترغب في نسخ قائمة أرقام من مفكرة أو تطبيق خارجي ولصقها هنا لسرعة الإرسال الفوري. يدعم النظام كتابة الأرقام بكل الصيغ (مع أو بدون مفتاح وبفواصل متنوعة أو أسطر جديدة) وسيجري تلقائياً تصحيحها للتنسيق التجاري العراقي الصياغة وتنقية المتكرر وحذف الزوائد والرموز الخاطئة." 
                    : "Select this mode when you want to paste a custom list of phone numbers directly. The normalizer system handles Iraqi formats recursively (converting local 077... or arbitrary strings to standard international formats) and filters out duplicate rows instantly."}
                </p>
              </div>
            </div>

            {/* Workflow steps layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: STEP 1: Textarea box */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {lang === "ar" ? "الخطوة الأولى: الصق الهواتف المستهدفة" : "Step 1: Paste Target Numbers"}
                  </label>
                </div>

                <div className="bg-[#0A0B0E] p-3 border border-slate-800 rounded-xl">
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    rows={7}
                    className="w-full bg-[#12141a] border border-[#2D3139] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-sky-500 transition font-mono leading-relaxed"
                    placeholder={`0770xxxxxxx\n0780xxxxxxx\n+964790xxxxxxx\n750xxxxxxx, 0771xxxxxxx`}
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 font-mono">
                    <span>{lang === "ar" ? "يدعم سطر جديد، فاصلة، أو منقوطة" : "Supports newlines, commas, semicolons"}</span>
                    <span>{manualText.split(/[\n,;]+/).filter(Boolean).length} {lang === "ar" ? "أرقام مدخلة" : "lines typed"}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: STEP 2: Composer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">2</span>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {lang === "ar" ? "الخطوة الثانية: صياغة الرسالة" : "Step 2: Message Composer"}
                    </label>
                  </div>
                </div>

                <div className="bg-[#0A0B0E] border border-slate-800 p-4 rounded-xl space-y-3.5 shadow-inner">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                    className="w-full bg-[#12141a] border border-[#2D3139] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono leading-relaxed resize-none"
                    placeholder={lang === "ar" ? "مرحباً بكم..." : "Write message..."}
                  />

                  {/* Character stats & tag helpers */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5 text-[10px] text-slate-400">
                    <span className="italic">{lang === "ar" ? "ملاحظة: يمكنك استخدام {name} للرسائل المخصصة كإسم افتراضي يكتب تاجر يدوي" : "Note: Tags like {name} will render as Manual Recipient"}</span>
                    <span className="font-mono text-indigo-400 font-bold">{messageText.length} chars</span>
                  </div>
                </div>

                {/* Validation trigger */}
                <button
                  onClick={handleValidateManualTab}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>{lang === "ar" ? "🔍 معاينة وفحص قائمة الأرقام" : "🔍 Preview & Validate List"}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: Full CSV Campaign Layout Content */}
        {activeTab === "csv" && (
          <div className="space-y-6">
            {/* Helper Text banner explanation */}
            <div className="bg-indigo-500/5 border border-indigo-505/10 rounded-xl p-4 flex gap-3 text-slate-300">
              <FileSpreadsheet size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                  {lang === "ar" ? "📂 دليل الاستخدام: حملات ملفات الـ CSV الكاملة" : "📂 Campaign Guide: Full CSV File Broadcaster"}
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {lang === "ar" 
                    ? "اختر هذا الوضع لرفع ملف Excel/CSV واستيراد كامل قاعدة أرقام الهواتف التابعة له مباشرة لإطلاق البث دون تطبيق أي تصفية تابعة للمحافظات أو شروط أخرى. سيقودك معالج السحب لتغطية جميع التجار المسجلين في الورقة المرفقة بكل سهولة وسرعة." 
                    : "Select this mode to load a spreadsheet and target all valid phone numbers inside it unconditionally, ignoring any governorate filters. Fast column mapping logic automatically detects contacts and groups them in absolute integrity."}
                </p>
              </div>
            </div>

            {/* Steps layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: STEP 1: CSV Upload */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {lang === "ar" ? "الخطوة الأولى: ارفع ملف الـ CSV" : "Step 1: Upload CSV Database file"}
                  </label>
                </div>

                {!csvFileName ? (
                  <div className="border-2 border-dashed border-[#2D3139] bg-[#0A0B0E]/60 rounded-xl p-9 text-center hover:border-indigo-500 transition cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".csv"
                      multiple
                      onChange={handleCSVMultiUpload}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div className="space-y-2 pointer-events-none font-sans">
                      <UploadCloud size={24} className="text-indigo-400 mx-auto" />
                      <p className="text-xs font-bold text-white">
                        {lang === "ar" ? "انقر أو اسحب ملفات الـ CSV هنا" : "Upload one or multiple CSV sheets"}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {lang === "ar" ? "الاسم، الهاتف، المحافظة، التصنيف" : "Supports Name, Phone, Governorate, and Classification fields"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#090b0e] border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-xs text-white">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <div className="font-mono">
                        <p className="font-bold max-w-[200px] truncate">{csvFileName}</p>
                        <p className="text-[10px] text-slate-400">{csvSourceRows.length} {lang === "ar" ? "سجل مكتشف" : "records parsed"}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCsvFileName("");
                        setCsvSourceRows([]);
                      }}
                      className="text-slate-400 hover:text-red-405 transition text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{lang === "ar" ? "حذف" : "Remove"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: STEP 2: Composer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">2</span>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {lang === "ar" ? "الخطوة الثانية: صياغة الرسالة المنوطة" : "Step 2: Message Builder"}
                    </label>
                  </div>
                </div>

                <div className="bg-[#0A0B0E] border border-slate-800 p-4 rounded-xl space-y-3.5 shadow-inner">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                    className="w-full bg-[#12141a] border border-[#2D3139] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono leading-relaxed resize-none"
                    placeholder={lang === "ar" ? "اكتب دعايتك هنا..." : "Compose your advertising message copy here..."}
                  />

                  {/* Character stats & tag helpers */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5 flex-wrap font-sans">
                      <span className="font-bold">{lang === "ar" ? "إدراج متغير:" : "Insert tags:"}</span>
                      <button
                        onClick={() => setMessageText(t => t + " {name}")}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded font-mono select-none"
                      >
                        {lang === "ar" ? "الاسم" : "{name}"}
                      </button>
                    </div>

                    <span className="font-mono text-indigo-400 font-bold">{messageText.length} chars</span>
                  </div>
                </div>

                {/* Validation triggers */}
                <button
                  onClick={handleValidateFullCsvTab}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>{lang === "ar" ? "🔍 معاينة وفحص ملف الـ CSV بالكامل" : "🔍 Preview & Validate File"}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* STEP 4: INTERACTIVE VALIDATION DISPLAY BANNER */}
        {validationSummary && (
          <div className="border border-slate-800 bg-[#0c0e12] rounded-2xl p-5 md:p-6 space-y-4 shadow-xl select-none font-sans animate-fadeIn">
            
            {/* Header and stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider block w-fit mb-1">
                  {lang === "ar" ? "تم التحليل والتحقق من التنسيق" : "Verification Complete"}
                </span>
                <h3 className="text-sm font-extrabold text-white">
                  {lang === "ar" ? "📑 تقرير تدقيق وتثبيت الملف" : "📑 Dynamic Dataset Audit Report"}
                </h3>
              </div>

              {validationSummary.isCrmFallback && (
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
                  {lang === "ar" ? "💡 مسترجع تلقائياً من الـ CRM" : "💡 CRM Central Auto-loaded"}
                </span>
              )}
            </div>

            {/* Statistical grid breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#12141a]/60 border border-slate-800/80 p-3.5 rounded-xl text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{lang === "ar" ? "إجمالي السجلات" : "Total Scanned"}</p>
                <p className="text-xl font-mono font-black text-white mt-1">{validationSummary.total}</p>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl text-center">
                <p className="text-[10px] text-emerald-450 uppercase font-bold tracking-wider">{lang === "ar" ? "صالحة للإرسال" : "Valid (Ready)"}</p>
                <p className="text-xl font-mono font-black text-emerald-405 mt-1">{validationSummary.valid}</p>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl text-center flex flex-col justify-between items-center">
                <p className="text-[10px] text-red-450 uppercase font-bold tracking-wider">{lang === "ar" ? "أرقام خاطئة" : "Rejected Invalids"}</p>
                <p className="text-xl font-mono font-black text-red-500 mt-0.5">{validationSummary.invalid}</p>
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl text-center flex flex-col justify-between items-center">
                <p className="text-[10px] text-indigo-450 uppercase font-bold tracking-wider">{lang === "ar" ? "أرقام مكررة" : "Duplicates Found"}</p>
                <p className="text-xl font-mono font-black text-indigo-400 mt-0.5">{validationSummary.duplicates}</p>
              </div>
            </div>

            {/* Candidates peek preview list */}
            {validationSummary.peek.length > 0 && (
              <div className="bg-black/30 p-4 rounded-xl border border-slate-850 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-indigo-400 uppercase tracking-widest text-[10px]">
                    {lang === "ar" ? "📋 عينة عشوائية للمستلمين الجاهزين أول 10 أسطر:" : "📋 Valid Recipient Queue Sample (Top 10 entries):"}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Matched total: {validationSummary.valid}</span>
                </div>

                <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-[11px] font-mono leading-relaxed">
                  {validationSummary.peek.map((r, itemIdx) => (
                    <div key={itemIdx} className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-900 pb-1 text-slate-300">
                      <span>{itemIdx + 1}. {r.name} ➔ {r.phone}</span>
                      <span className="text-slate-500 font-sans text-[10px] sm:text-right mt-0.5 sm:mt-0">
                        {lang === "ar" ? GOV_AR[r.gov] || r.gov : r.gov} | {r.cat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: CORE CAMPAIGN CONTROLLER ENGINE */}
        <div className="border-t border-slate-800 pt-5 space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* Delay Speed setting & Real-time indices */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                  {lang === "ar" ? "سرعة الإرسال (تأخير بثواني):" : "Transmit Delay spacing:"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-20 bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1 text-white text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">{lang === "ar" ? "ثواني بين كل رسالة" : "seconds spacer"}</span>
                </div>
              </div>

              {/* Dynamic Queue Indicators */}
              <div className="flex gap-2.5 select-text pt-2.5">
                <div className="bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-lg text-center min-w-[70px]">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">{lang === "ar" ? "مكتمل" : "Sent"}</p>
                  <p className="text-sm font-bold font-mono text-emerald-400">{countSent}</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-lg text-center min-w-[70px]">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">{lang === "ar" ? "فشل" : "Failed"}</p>
                  <p className="text-sm font-bold font-mono text-red-400">{countFailed}</p>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/10 px-3 py-1.5 rounded-lg text-center min-w-[70px]">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">{lang === "ar" ? "متبقي" : "Ready"}</p>
                  <p className="text-sm font-bold font-mono text-indigo-400">{countRemaining}</p>
                </div>
              </div>
            </div>

            {/* Broadcast action trigger buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {!isSendingActive ? (
                <button
                  onClick={startSendingProcess}
                  className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
                >
                  <Play size={13} fill="#020617" />
                  <span>{lang === "ar" ? "▶ بدء بث الإرسال الجماعي" : "▶ Start Broadcast"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  {sendingPaused ? (
                    <button
                      onClick={handleResume}
                      className="flex-1 md:flex-none bg-indigo-500 hover:bg-indigo-400 text-black font-extrabold px-5 py-3.5 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play size={13} fill="#000" />
                      <span>{lang === "ar" ? "استئناف" : "Resume"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-5 py-3.5 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <Pause size={13} fill="#000" />
                      <span>{lang === "ar" ? "إيقاف مؤقت" : "Pause"}</span>
                    </button>
                  )}

                  <button
                    onClick={handleStop}
                    className="flex-1 md:flex-none bg-red-600 hover:bg-red-550 text-white font-extrabold px-5 py-3.5 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <StopCircle size={13} />
                    <span>{lang === "ar" ? "إنهاء تماماً" : "Stop"}</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Real-time Ticker Progression Bar */}
          {isSendingActive && (
            <div className="bg-[#0A0B0E] p-4 border border-slate-800 rounded-xl space-y-2 font-mono">
              <div className="flex justify-between items-center text-[11px] text-slate-450">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-505 animate-ping"></span>
                  Progress Rate: {countSent + countFailed} / {totalInQueue}
                </span>
                <span className="text-indigo-400 font-black">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-[#14171D] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Terminal Console Logs */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono block">
              📟 Active Dispatch Ledger Monitor:
            </label>
            <div className="bg-black/40 border border-slate-800 rounded-xl p-3 h-[140px] overflow-y-auto font-mono text-[10px] space-y-1 text-left select-all">
              {sendLogs.length === 0 ? (
                <p className="text-slate-600 italic">Ledger pipeline cold. Push Play above to stream active log events...</p>
              ) : (
                sendLogs.map((log, lIdx) => (
                  <p key={lIdx} className={log.includes("🟢") ? "text-emerald-400" : log.includes("🔴") ? "text-red-400" : "text-slate-400"}>
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* COLLAPSIBLE DETAILED CONTROLS: QUEUE LIST AND OPERATIONS REPORT */}
      <div className="bg-[#14171D] border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => setShowAdvancedQueue(!showAdvancedQueue)}
          className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-900/70 border-b border-slate-800/40 text-left cursor-pointer transition"
        >
          <div className="flex items-center gap-2">
            <Sliders className="text-[#C5A059]" size={15} />
            <span className="text-xs font-bold text-slate-205 uppercase tracking-wider">
              {lang === "ar" ? "🔍 تفقد قائمة الجدولة وإصدار تقارير البث المتقدمة" : "🔍 Advanced Queue Inspector & Operational Reports"}
            </span>
          </div>

          <span className="text-[10px] bg-slate-800 hover:bg-slate-700 font-mono font-bold px-2.5 py-1 rounded text-slate-300 select-none">
            {showAdvancedQueue ? (lang === "ar" ? "إخفاء التفاصيل" : "Collapse Block") : (lang === "ar" ? "استعراض السجلات" : "Expand Block")}
          </span>
        </button>

        {showAdvancedQueue && (
          <div className="p-5 md:p-6 space-y-6 animate-fadeIn">
            
            {/* Operational Reports download area */}
            <div className="space-y-3 font-sans">
              <div>
                <h4 className="text-xs font-extrabold text-slate-205 uppercase tracking-widest">
                  {lang === "ar" ? "1. تصدير تقارير حملات البث" : "1. Export Dedicated Transaction CSV Logs"}
                </h4>
                <p className="text-[11px] text-slate-405 mt-0.5">
                  {lang === "ar" 
                    ? "حمّل النسخ المنفصلة لملخص المعاملات، أو الأرقام الخاطئة التالفة التي تم فلترتها، أو سجل المعوقات." 
                    : "Download separate transaction reports to store external backups, audits, fails, or isolated dups."}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                <button
                  onClick={handleExportFinalQueue}
                  className="bg-[#12141a] hover:bg-slate-800/80 border border-slate-800 p-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer shadow-sm text-slate-200"
                >
                  <FileSpreadsheet size={15} className="text-indigo-400" />
                  <span>{lang === "ar" ? "تصدير الطابور بالكامل" : "Final Queue CSV"}</span>
                </button>

                <button
                  onClick={handleExportSent}
                  className="bg-[#12141a] hover:bg-slate-800/80 border border-slate-800 p-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer shadow-sm text-slate-200"
                >
                  <CheckCircle2 size={15} className="text-emerald-405" />
                  <span>{lang === "ar" ? "تصدير الرسائل الناجحة" : "Delivered CSV"}</span>
                </button>

                <button
                  onClick={handleExportFailed}
                  className="bg-[#12141a] hover:bg-slate-800/80 border border-slate-800 p-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer shadow-sm text-slate-200"
                >
                  <Trash2 size={15} className="text-red-405" />
                  <span>{lang === "ar" ? "تصدير محاولات الفشل" : "Failures CSV"}</span>
                </button>

                <button
                  onClick={handleExportInvalid}
                  className="bg-[#12141a] hover:bg-slate-800/80 border border-slate-800 p-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer shadow-sm text-slate-200"
                >
                  <AlertCircle size={15} className="text-amber-500" />
                  <span>{lang === "ar" ? "تصدير الأرقام التالفة" : "Invalids CSV"}</span>
                </button>

                <button
                  onClick={handleExportDuplicates}
                  className="bg-[#12141a] hover:bg-slate-800/80 border border-slate-800 p-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer shadow-sm col-span-2 sm:col-span-1 text-slate-200"
                >
                  <RefreshCw size={15} className="text-indigo-400" />
                  <span>{lang === "ar" ? "تصدير الأرقام المكررة" : "Duplicates CSV"}</span>
                </button>
              </div>
            </div>

            {/* Filtering Controls and Pipeline Spreadsheet Table */}
            <div className="space-y-4">
              <div className="border-t border-slate-800/60 pt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-indigo-400" />
                  <h4 className="text-xs font-extrabold text-slate-205 uppercase tracking-widest font-sans">
                    {lang === "ar" ? "2. تصفية وفرز طابور المستلمين النشط" : "2. Real-time Queue Filter & Viewer"}
                  </h4>
                </div>
                <span className="text-[10px] text-indigo-400 font-mono font-bold">
                  {lang === "ar" ? `العناصر المطابقة: ${queueFiltered.length} / ${totalInQueue}` : `Matches: ${queueFiltered.length} / ${totalInQueue}`}
                </span>
              </div>

              {/* Filters Panel form items */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs select-none font-sans">
                <div className="space-y-1">
                  <span className="text-slate-400">{lang === "ar" ? "المحافظة:" : "Governorate:"}</span>
                  <select
                    value={filterGov}
                    onChange={(e) => setFilterGov(e.target.value)}
                    className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="All">All Governorates</option>
                    {IRAQ_GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>{lang === "ar" ? GOV_AR[gov] : gov}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400">{lang === "ar" ? "التصنيف:" : "Category:"}</span>
                  <select
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                    className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="All">All Categories</option>
                    {Array.from(new Set(queue.map(q => q.category))).filter(Boolean).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400">{lang === "ar" ? "المصدر:" : "Source:"}</span>
                  <select
                    value={filterSrc}
                    onChange={(e) => setFilterSrc(e.target.value)}
                    className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="All">All Sources</option>
                    <option value="manual">Manual Input</option>
                    <option value="governorate">Gov Search</option>
                    <option value="csv">CSV Parsing</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400">{lang === "ar" ? "الحالة:" : "Status:"}</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="ready">Ready</option>
                    <option value="sending">Sending</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="skipped">Skipped</option>
                    <option value="needs_review">Needs Review</option>
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1 space-y-1">
                  <span className="text-slate-400">{lang === "ar" ? "بحث بالاسم/الهاتف:" : "Search word:"}</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
              </div>

              {/* Table list */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0A0B0E]/40 max-h-[300px] overflow-y-auto select-text font-sans">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0A0B0E] border-b border-slate-850 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">Business Name</th>
                      <th className="p-3">Phone Number</th>
                      <th className="p-3">Governorate</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Status</th>
                      <th className="p-2.5 text-center w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 italic">No records present in bulk queue ledger matching search.</td>
                      </tr>
                    ) : (
                      queueFiltered.map((item, qIdx) => {
                        const isActive = activeQueueIndex !== null && queue[activeQueueIndex]?.id === item.id;
                        return (
                          <tr 
                            key={item.id} 
                            className={`border-b border-slate-900/50 hover:bg-slate-800/10 ${isActive ? "bg-indigo-505/5 font-semibold" : ""}`}
                          >
                            <td className="p-3 text-center text-[10px] text-slate-500 font-mono">{qIdx + 1}</td>
                            <td className="p-3 font-semibold text-white whitespace-nowrap">{item.businessName}</td>
                            <td className="p-3 font-mono text-slate-350">{item.normalizedPhone}</td>
                            <td className="p-3">
                              <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-[10px]">
                                {lang === "ar" ? GOV_AR[item.governorate] || item.governorate : item.governorate}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="bg-slate-800 text-slate-350 px-2 py-0.5 rounded text-[10px]">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="bg-[#1C2128] text-indigo-400 border border-slate-800 px-1.5 py-0.2 rounded uppercase font-mono text-[9px]">
                                {item.source}
                              </span>
                            </td>
                            <td className="p-3">
                              {item.status === "sent" && <span className="bg-emerald-500/10 text-emerald-405 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Sent</span>}
                              {item.status === "failed" && <span className="bg-red-500/10 text-red-405 border border-red-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono">Failed</span>}
                              {item.status === "ready" && <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-505/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Ready</span>}
                              {item.status === "sending" && <span className="bg-amber-500/10 text-amber-550 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold animate-pulse">Sending</span>}
                              {item.status === "needs_review" && <span className="bg-amber-500/10 text-amber-550 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Needs Review</span>}
                              {item.status === "skipped" && <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[9px]">Skipped</span>}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {item.status === "needs_review" && (
                                  <button
                                    onClick={() => {
                                      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "ready" } : q));
                                    }}
                                    className="bg-emerald-500/15 hover:bg-emerald-500/25 px-1.5 py-0.5 rounded text-[9px] text-emerald-400 font-bold transition cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setQueue(prev => prev.filter(q => q.id !== item.id));
                                  }}
                                  className="text-slate-400 hover:text-red-405 transition p-1 cursor-pointer"
                                  title="Delete record"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
