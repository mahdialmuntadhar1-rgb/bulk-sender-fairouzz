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
  Plus, 
  Phone, 
  RefreshCw, 
  FileSpreadsheet, 
  Clock,
  Check,
  Square,
  CheckSquare,
  AlertTriangle,
  User,
  Sliders
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
  // Main state - synced with LocalStorage
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

  // FEATURE 1: Governorate Sending States
  const [selectedGovernorates, setSelectedGovernorates] = useState<string[]>([]);
  const [showGovPreview, setShowGovPreview] = useState(false);

  // FEATURE 2: Manual Input States
  const [manualText, setManualText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    valid: string[];
    invalid: { raw: string; reason: string }[];
    duplicates: string[];
  } | null>(null);

  // FEATURE 3: CSV Upload States
  const [csvSourceRows, setCsvSourceRows] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvSelectedGovernorates, setCsvSelectedGovernorates] = useState<string[]>(IRAQ_GOVERNORATES);
  const [csvSelectedCategory, setCsvSelectedCategory] = useState("All");
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  // Connection & Sending States
  const [nabdaStatus, setNabdaStatus] = useState<"idle" | "testing" | "connected" | "error">("idle");
  const [nabdaErrorDetails, setNabdaErrorDetails] = useState("");
  const [isSendingActive, setIsSendingActive] = useState(false);
  const [sendingPaused, setSendingPaused] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number | null>(null);
  const [sendLogs, setSendLogs] = useState<string[]>([]);

  // Filters State
  const [filterGov, setFilterGov] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [filterSrc, setFilterSrc] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const sendingRef = useRef({ isSendingActive, sendingPaused, queue, activeQueueIndex, delaySeconds });

  useEffect(() => {
    sendingRef.current = { isSendingActive, sendingPaused, queue, activeQueueIndex, delaySeconds };
  }, [isSendingActive, sendingPaused, queue, activeQueueIndex, delaySeconds]);

  // Sync Persistence
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

  // Test connection function
  const testNabdaConnection = async () => {
    setNabdaStatus("testing");
    setNabdaErrorDetails("");
    try {
      const response = await fetch("/api/nabda/test");
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

  useEffect(() => {
    testNabdaConnection();
  }, []);

  const appendConsoleLog = (line: string) => {
    const time = new Date().toLocaleTimeString();
    setSendLogs(l => [`[${time}] ${line}`, ...l.slice(0, 99)]);
  };

  // Governorate matches counting
  const getCrmCountByGov = (gov: string) => {
    return crmContacts.filter(c => c.governorate.toLowerCase() === gov.toLowerCase()).length;
  };

  // Matched CRM contacts preview
  const matchedCrmContacts = crmContacts.filter(c => 
    selectedGovernorates.some(selectedGov => selectedGov.toLowerCase() === c.governorate.toLowerCase())
  );

  // FEATURE 1 Handler: Add CRM records to Queue
  const handleAddGovernorateContactsToQueue = () => {
    if (matchedCrmContacts.length === 0) {
      alert(lang === "ar" ? "لم يتم العثور على أي تجار في المحافظات المحددة!" : "No registered businesses found in selected governorates!");
      return;
    }

    let added = 0, dups = 0, invs = 0;
    const newItems: QueueItem[] = [];
    const newInvalids: any[] = [];
    const newDuplicates: any[] = [];

    matchedCrmContacts.forEach(contact => {
      const res = normalizeIraqPhone(contact.phone);
      if (!res.isValid) {
        invs++;
        newInvalids.push({ originalPhone: contact.phone, source: `CRM Gov`, reason: res.reason });
        return;
      }

      const dupInQueue = queue.some(q => q.normalizedPhone === res.normalized);
      const dupInBatch = newItems.some(i => i.normalizedPhone === res.normalized);

      if (dupInQueue || dupInBatch) {
        dups++;
        newDuplicates.push({ originalPhone: contact.phone, normalizedPhone: res.normalized, source: `CRM Gov` });
        return;
      }

      added++;
      newItems.push({
        id: `bulk_gov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: contact.businessName,
        originalPhone: contact.phone,
        normalizedPhone: res.normalized,
        governorate: contact.governorate,
        category: contact.category || "General",
        source: "governorate",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    if (newItems.length > 0) setQueue(prev => [...prev, ...newItems]);
    if (newInvalids.length > 0) setInvalidList(prev => [...newInvalids, ...prev]);
    if (newDuplicates.length > 0) setDuplicateList(prev => [...newDuplicates, ...prev]);

    setSelectedGovernorates([]);
    setShowGovPreview(false);

    alert(lang === "ar" 
      ? `تمت الإضافة بنجاح! الصالحة: ${added} | المرفوضة: ${invs} | المكررة: ${dups}`
      : `Import completed! Added: ${added} | Invalid: ${invs} | Duplicates: ${dups}`
    );
  };

  // FEATURE 2 Handler: Manual Phones analyzer and adder
  const handleAnalyzeAndAddManual = () => {
    const rawLines = manualText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      alert(lang === "ar" ? "يرجى كتابة أرقام للتحليل والإدخال!" : "Please enter phone numbers first!");
      return;
    }

    const valids: QueueItem[] = [];
    const invalids: { raw: string; reason: string }[] = [];
    const duplicates: string[] = [];
    const seenInInput = new Set<string>();

    rawLines.forEach(raw => {
      const res = normalizeIraqPhone(raw);
      if (!res.isValid) {
        invalids.push({ raw, reason: res.reason });
        setInvalidList(p => [{ originalPhone: raw, source: "Manual", reason: res.reason }, ...p]);
        return;
      }

      const isDupInQueue = queue.some(q => q.normalizedPhone === res.normalized);
      const isDupInBatch = seenInInput.has(res.normalized);

      if (isDupInQueue || isDupInBatch) {
        duplicates.push(raw);
        setDuplicateList(p => [{ originalPhone: raw, normalizedPhone: res.normalized, source: "Manual" }, ...p]);
        return;
      }

      seenInInput.add(res.normalized);
      valids.push({
        id: `bulk_man_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: lang === "ar" ? "تاجر يدوي" : "Manual Merchant",
        originalPhone: raw,
        normalizedPhone: res.normalized,
        governorate: "Baghdad",
        category: "General",
        source: "manual",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    if (valids.length > 0) {
      setQueue(prev => [...prev, ...valids]);
    }

    setAnalysisResult({
      valid: valids.map(v => v.normalizedPhone),
      invalid: invalids,
      duplicates
    });

    setManualText("");
  };

  // FEATURE 3 Handler: Multiple CSV files selector
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

      const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));

      const findIdx = (patternList: string[]) => {
        return headers.findIndex(h => {
          const lh = h.toLowerCase().trim().replace(/[_-\s]/g, "");
          return patternList.some(p => lh === p.toLowerCase().trim().replace(/[_-\s]/g, "") || lh.includes(p.toLowerCase()) || p.toLowerCase().includes(lh));
        });
      };

      const pIdx = findIdx(PHONE_HEADERS);
      const nIdx = findIdx(NAME_HEADERS);
      const gIdx = findIdx(GOV_HEADERS);
      const cIdx = findIdx(CAT_HEADERS);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cells: string[] = [];
        let curr = "";
        let inQuotes = false;
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === '"' || char === "'") inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
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
    setCsvSelectedCategory("All");
  };

  // CSV reactive filtering & stats
  const csvFilteredRows = csvSourceRows.filter(row => {
    const govClean = (row.governorate || "Baghdad").trim().toLowerCase();
    const matchGov = csvSelectedGovernorates.some(g => g.trim().toLowerCase() === govClean);
    const matchCat = csvSelectedCategory === "All" || row.category === csvSelectedCategory;
    return matchGov && matchCat;
  });

  const csvStats = (() => {
    let valid = 0, invalid = 0, duplicates = 0;
    const seenInBatch = new Set<string>();

    csvFilteredRows.forEach(row => {
      if (!row.rawPhone) {
        invalid++;
        return;
      }
      const res = normalizeIraqPhone(row.rawPhone);
      if (!res.isValid) {
        invalid++;
      } else {
        const isDupInQueue = queue.some(q => q.normalizedPhone === res.normalized);
        const isDupInBatch = seenInBatch.has(res.normalized);

        if (isDupInQueue || isDupInBatch) {
          duplicates++;
        } else {
          seenInBatch.add(res.normalized);
          valid++;
        }
      }
    });

    return {
      total: csvFilteredRows.length,
      valid,
      invalid,
      duplicates
    };
  })();

  const handleAddCSVToQueueFiltered = () => {
    if (csvFilteredRows.length === 0) return;

    let added = 0, dups = 0, invs = 0;
    const newItems: QueueItem[] = [];
    const newInvalids: any[] = [];
    const newDuplicates: any[] = [];
    const seenInBatch = new Set<string>();

    csvFilteredRows.forEach(row => {
      const res = normalizeIraqPhone(row.rawPhone);
      if (!res.isValid) {
        invs++;
        newInvalids.push({ originalPhone: row.rawPhone || "[Empty]", source: "CSV Upload", reason: res.reason });
        return;
      }

      const dupInQueue = queue.some(q => q.normalizedPhone === res.normalized);
      const dupInBatch = seenInBatch.has(res.normalized);

      if (dupInQueue || dupInBatch) {
        dups++;
        newDuplicates.push({ originalPhone: row.rawPhone, normalizedPhone: res.normalized, source: "CSV Upload" });
        return;
      }

      seenInBatch.add(res.normalized);
      added++;
      newItems.push({
        id: `bulk_csv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: row.businessName,
        originalPhone: row.rawPhone,
        normalizedPhone: res.normalized,
        governorate: row.governorate,
        category: row.category,
        source: "csv",
        status: res.needsReview ? "needs_review" : "ready",
        note: res.needsReview ? res.reason : ""
      });
    });

    if (newItems.length > 0) setQueue(prev => [...prev, ...newItems]);
    if (newInvalids.length > 0) setInvalidList(prev => [...newInvalids, ...prev]);
    if (newDuplicates.length > 0) setDuplicateList(prev => [...newDuplicates, ...prev]);

    alert(lang === "ar"
      ? `تم إضافة أرقام الـ CSV المفلترة بنجاح! الصالحة: ${added} | المستبعدة: ${invs} | المكررة: ${dups}`
      : `Imported filtered CSV records! Valid Added: ${added} | Rejected: ${invs} | Duplicates: ${dups}`
    );

    setCsvSourceRows([]);
    setCsvFileName("");
    setShowCsvPreview(false);
  };

  // SENDING CONTROLS WORKERS
  const startSendingProcess = () => {
    if (isSendingActive && !sendingPaused) return;
    if (!messageText.trim()) {
      alert(lang === "ar" ? "يرجى كتابة رسالة للبث أولاً!" : "Please write a draft outreach message first!");
      return;
    }

    const readyItems = queue.filter(q => q.status === "ready");
    if (readyItems.length === 0) {
      alert(lang === "ar" ? "لا توجد أرقام بحالة 'جاهزة' للإرسال!" : "No records with 'Ready' status to send!");
      return;
    }

    setIsSendingActive(true);
    setSendingPaused(false);
    appendConsoleLog("Starting high-speed bulk broadcasting service loop...");
    setTimeout(() => dispatchNextRow(), 200);
  };

  const dispatchNextRow = async () => {
    const state = sendingRef.current;
    if (!state.isSendingActive || state.sendingPaused) {
      appendConsoleLog("Broadcaster transmission paused.");
      return;
    }

    // Find next "ready" item
    const targetIdx = state.queue.findIndex(q => q.status === "ready");
    if (targetIdx === -1) {
      setIsSendingActive(false);
      setActiveQueueIndex(null);
      appendConsoleLog("✅ All ready messages have been successfully processed!");
      return;
    }

    setActiveQueueIndex(targetIdx);
    const item = state.queue[targetIdx];

    // Template variables binding
    const customMsg = messageText
      .replace(/{name}/g, item.businessName || "")
      .replace(/{governorate}/g, GOV_AR[item.governorate] || item.governorate)
      .replace(/{category}/g, item.category || "");

    // Set sending state
    setQueue(prev => prev.map((q, i) => i === targetIdx ? { ...q, status: "sending" } : q));
    appendConsoleLog(`Dispatching WA message to ${item.normalizedPhone}...`);

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: item.normalizedPhone,
          message: customMsg,
          businessName: item.businessName
        })
      });

      const data = await response.json();
      if (response.ok) {
        setQueue(prev => prev.map((q, i) => i === targetIdx ? { ...q, status: "sent", note: data.response?.messageId || "Delivered" } : q));
        appendConsoleLog(`🟢 Successfully sent to ${item.normalizedPhone}`);
      } else {
        throw new Error(data.error || "Nabda Api Rejected");
      }
    } catch (err: any) {
      setQueue(prev => prev.map((q, i) => i === targetIdx ? { ...q, status: "failed", note: err.message || "Timeout" } : q));
      appendConsoleLog(`🔴 Failed sending to ${item.normalizedPhone}: ${err.message}`);
    }

    setTimeout(() => dispatchNextRow(), delaySeconds * 1000);
  };

  const handlePause = () => {
    setSendingPaused(true);
    appendConsoleLog("Broadcaster requested to Pause after current row finishes.");
  };

  const handleResume = () => {
    setSendingPaused(false);
    appendConsoleLog("Resuming message transmitter...");
    setTimeout(() => dispatchNextRow(), 200);
  };

  const handleStop = () => {
    setIsSendingActive(false);
    setSendingPaused(false);
    setActiveQueueIndex(null);
    appendConsoleLog("🛑 Broadcast engine halted and reset.");
  };

  // EXPORTS HELPERS
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

  // Queue View filtration
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

  // Dynamic status counters
  const totalInQueue = queue.length;
  const countSent = queue.filter(q => q.status === "sent").length;
  const countFailed = queue.filter(q => q.status === "failed").length;
  const countRemaining = queue.filter(q => q.status === "ready").length;
  const progressPercentage = (countSent + countFailed) > 0 && totalInQueue > 0
    ? Math.round(((countSent + countFailed) / totalInQueue) * 100)
    : 0;

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right font-sans" : "ltr text-left font-sans"}`}>
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {lang === "ar" ? "لوحة الإرسال الجماعي الفائقة ✨" : "Super Bulk Sender Dashboard ✨"}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === "ar" 
              ? "نظام مراسلة ذكي متكامل يدعم الإرسال حسب المحافظة، اللوائح اليدوية، ورفع ملفات Excel/CSV المتعددة" 
              : "Advanced high-throughput segment broadcaster supporting Governorate target checklist, manual list normalizer, and multiple CSV files."}
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm(lang === "ar" ? "هل أنت متأكد من مسح جميع اللوائح والطوابير؟" : "Are you sure you want to purge the queue?")) {
              setQueue([]);
              setInvalidList([]);
              setDuplicateList([]);
              appendConsoleLog("Cleared queue, duplicates, and invalid datastores.");
            }
          }}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 size={13} />
          {lang === "ar" ? "تفريغ الطابور كلياً" : "Purge Queue"}
        </button>
      </div>

      {/* Grid containing Composer, Governorate, Manual, CSV blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. MESSAGE COMPOSER */}
        <div className="bg-[#14171D] border border-[#2D3139] p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="text-indigo-400" size={16} />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {lang === "ar" ? "1. مصنف ومؤلف الرسالة" : "1. Message Composer"}
              </h2>
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded font-mono font-bold uppercase">
              {lang === "ar" ? "يدعم التخصيص" : "Templated"}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === "ar" 
              ? "اكتب رسالتك للمستلمين. المتغيرات المتاحة للاستبدال الآلي لكل مستلم: {name} (الاسم التجاري)، {governorate} (المحافظة)، {category} (التصنيف التجاري)."
              : "Compose message body. Custom tags replace dynamically on send: {name} (Business Name), {governorate} (Governorate), {category} (Category)."}
          </p>

          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={4}
            className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
            placeholder={lang === "ar" ? "اكتب دعايتك هنا..." : "Compose your advertising message copy here..."}
          />
        </div>

        {/* 2. SEND BY GOVERNORATE */}
        <div className="bg-[#14171D] border border-[#2D3139] p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-400" size={16} />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {lang === "ar" ? "2. الإرسال حسب المحافظة العِراقية" : "2. Send by Governorate"}
              </h2>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded font-bold font-mono">
              CRM DATABASE
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === "ar" 
              ? "اختر واحدة أو أكثر من المحافظات لإضافة جميع التجار المسجلين وتصفيتهم في طابور الإرسال تلقائياً طبقاً للمحافظة المحددة."
              : "Select one or multiple Iraqi governorates. Only CRM businesses located strictly in the checked provinces enter queue."}
          </p>

          {/* Governorates grid checkboxes */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto pr-1 border border-slate-800/80 p-2.5 rounded-xl bg-[#0A0B0E]">
            {IRAQ_GOVERNORATES.map(gov => {
              const currentCount = getCrmCountByGov(gov);
              const isChecked = selectedGovernorates.includes(gov);
              return (
                <label 
                  key={gov} 
                  className={`flex items-center gap-2 cursor-pointer p-1 rounded-lg transition-colors select-none ${isChecked ? "bg-indigo-500/5" : "hover:bg-slate-800/40"}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedGovernorates(prev => [...prev, gov]);
                      else setSelectedGovernorates(prev => prev.filter(g => g !== gov));
                    }}
                    className="accent-indigo-500 w-3.5 h-3.5 rounded"
                  />
                  <div className="text-[11px] leading-tight">
                    <span className="text-white font-semibold">{lang === "ar" ? GOV_AR[gov] : gov}</span>
                    <span className="text-slate-400 text-[10px] block font-mono">({currentCount} found)</span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => setSelectedGovernorates(IRAQ_GOVERNORATES)}
              className="bg-slate-800 hover:bg-slate-750 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              {lang === "ar" ? "تحديد الكل" : "Select All"}
            </button>
            <button
              onClick={() => setSelectedGovernorates([])}
              className="bg-slate-800 hover:bg-slate-750 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              {lang === "ar" ? "إلغاء الكل" : "Deselect All"}
            </button>
            <button
              onClick={() => setShowGovPreview(!showGovPreview)}
              className="border border-slate-700 hover:bg-slate-800 text-slate-250 text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ml-auto"
            >
              {lang === "ar" ? "معاينة المطابقة" : "Preview Selected"}
            </button>
            <button
              onClick={handleAddGovernorateContactsToQueue}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold px-4 py-1.5 rounded-lg transition cursor-pointer"
            >
              {lang === "ar" ? "إضافة المستهدفة للطابور" : "Add Matches to Queue"}
            </button>
          </div>

          {/* Interactive Preview sub-card */}
          {showGovPreview && (
            <div className="bg-[#0A0B0E] border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                {lang === "ar" ? `التجار المطابقين للمحافظات المحددة (${matchedCrmContacts.length}):` : `Matched selected governorate accounts (${matchedCrmContacts.length}):`}
              </span>
              <div className="max-h-[110px] overflow-y-auto space-y-1 pr-1 text-[11px]">
                {matchedCrmContacts.length === 0 ? (
                  <p className="text-slate-500 italic text-center p-2">No accounts matched current filter.</p>
                ) : (
                  matchedCrmContacts.map((c, idx) => (
                    <div key={idx} className="flex justify-between border-b border-slate-900 pb-1 text-slate-350">
                      <span>• {c.businessName}</span>
                      <span className="font-mono text-indigo-400">{c.phone} ({lang === "ar" ? GOV_AR[c.governorate] : c.governorate})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. HARD MANUAL PHONE LISTS */}
        <div className="bg-[#14171D] border border-[#2D3139] p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Phone className="text-sky-400" size={16} />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {lang === "ar" ? "3. اللائحة اليدوية للأرقام والفرز التلقائي" : "3. Manual Phone Numbers List"}
              </h2>
            </div>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2.5 py-0.5 rounded font-mono font-bold uppercase">
              Normalizer
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === "ar" 
              ? "الصق قوائم الأرقام هنا، يدعم الفصل بالفاصلة أو سطر جديد. سيقوم النظام بـ توحيد التنسيق العراقي وتنقية المتكرر تلقائياً."
              : "Paste arbitrary phone numbers here, one per line or comma separated. System auto-converts to +9647XXXXXXXXX and isolates duplicates."}
          </p>

          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={3}
            className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 transition font-mono"
            placeholder={`07801234567\n+9647801234567\n9647801234567\n7801234567`}
          />

          <button
            onClick={handleAnalyzeAndAddManual}
            className="w-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            {lang === "ar" ? "فرز وتثبيت الأرقام والاضافة مباشرة" : "Add Numbers To Queue"}
          </button>

          {/* Analysis Audit Breakdown Table */}
          {analysisResult && (
            <div className="bg-[#0A0B0E] border border-slate-800 rounded-xl p-3.5 space-y-2 text-[11px]">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider border-b border-slate-800 pb-1 mb-2">
                📋 Dynamic Parsing Analyzer Result:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-lg">
                  <p className="text-emerald-400 font-bold text-xs">{analysisResult.valid.length}</p>
                  <p className="text-slate-450 mt-0.5">Valid Loaded</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 p-2 rounded-lg">
                  <p className="text-red-400 font-bold text-xs">{analysisResult.invalid.length}</p>
                  <p className="text-slate-455 mt-0.5">Invalids Found</p>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-2 rounded-lg">
                  <p className="text-indigo-400 font-bold text-xs">{analysisResult.duplicates.length}</p>
                  <p className="text-slate-460 mt-0.5">Dups Isolated</p>
                </div>
              </div>

              {/* Expander tables for invalid entries */}
              {analysisResult.invalid.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-red-400 font-bold">Rejected Invalids:</span>
                  <div className="bg-black/40 p-2 rounded max-h-[80px] overflow-y-auto text-[10px] text-red-350 font-mono space-y-0.5">
                    {analysisResult.invalid.map((inv, idx) => (
                      <div key={idx}>• &quot;{inv.raw}&quot; ➔ {inv.reason}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. CSV MULTI-UPLOAD AND FILTER SEGMENTATION */}
        <div className="bg-[#14171D] border border-[#2D3139] p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <UploadCloud className="text-indigo-400" size={16} />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {lang === "ar" ? "4. استيراد ملفات CSV وتصفيتها" : "4. CSV Upload & Filtering"}
              </h2>
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded font-mono font-bold uppercase">
              Advanced CSV
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === "ar" 
              ? "ارفع ملفاً أو ملفات CSV متعددة. سيقوم النظام بقراءة الأعمدة تلقائياً (الاسم، الهاتف، المحافظة، والنوع)، وتحديد ما يضاف حسب رغبتك."
              : "Upload one or multiple CSV sheets. System auto-detects column maps. Filter per-governorate from the check boxes before adding."}
          </p>

          <div className="border-2 border-dashed border-[#2D3139] hover:border-indigo-500 bg-[#0A0B0E]/60 rounded-xl p-5 text-center transition cursor-pointer relative group">
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={handleCSVMultiUpload}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <div className="space-y-1 pointer-events-none">
              <UploadCloud size={20} className="text-indigo-400 mx-auto" />
              <p className="text-xs font-bold text-white">
                {csvFileName || (lang === "ar" ? "انقر أو اسحب ملفات الـ CSV هنا" : "Upload one or multiple CSV cards")}
              </p>
              <p className="text-[10px] text-slate-400">
                {lang === "ar" ? "الاسم، الهاتف، المحافظة، التصنيف" : "Supports Name, Phone, Governorate, and Business classification fields"}
              </p>
            </div>
          </div>

          {/* Expanded filtering inside the CSV section itself! */}
          {csvSourceRows.length > 0 && (
            <div className="bg-[#0A0B0E] border border-slate-800 rounded-xl p-3.5 space-y-3.5">
              <div className="border-b border-slate-800 pb-1.5 flex justify-between items-center">
                <span className="text-[11px] font-bold text-indigo-400">⚙️ CSV Import Live Filtering Segment:</span>
                <span className="text-[10px] text-slate-400 font-mono">Matched: {csvFilteredRows.length} / {csvSourceRows.length}</span>
              </div>

              {/* Dynamic Category detection */}
              <div className="space-y-1 text-[11px]">
                <span className="text-slate-400">Filter Category mapping within CSV:</span>
                <select
                  value={csvSelectedCategory}
                  onChange={(e) => setCsvSelectedCategory(e.target.value)}
                  className="w-full bg-[#14171D] border border-[#2D3139] rounded p-1.5 text-white text-[11px]"
                >
                  <option value="All">🌐 All Categories detected ({Array.from(new Set(csvSourceRows.map(r => r.category))).length})</option>
                  {Array.from(new Set(csvSourceRows.map(r => r.category))).filter(Boolean).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Checkboxes for governorates inside CSV */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-semibold">Ticked Governorates checklist to allow import:</span>
                <div className="grid grid-cols-2 shadow-inner border border-slate-900 bg-black/30 max-h-[110px] overflow-y-auto p-2 rounded-lg gap-1.5 text-[10px]">
                  {IRAQ_GOVERNORATES.map(gov => {
                    const countInCsv = csvSourceRows.filter(r => (r.governorate || "").trim().toLowerCase() === gov.trim().toLowerCase()).length;
                    const isChecked = csvSelectedGovernorates.includes(gov);
                    return (
                      <label key={gov} className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setCsvSelectedGovernorates(prev => [...prev, gov]);
                            else setCsvSelectedGovernorates(prev => prev.filter(g => g !== gov));
                          }}
                          className="accent-indigo-500 w-3.5 h-3.5"
                        />
                        <span>{lang === "ar" ? GOV_AR[gov] : gov} ({countInCsv})</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCsvSelectedGovernorates(IRAQ_GOVERNORATES)}
                    className="bg-slate-800 text-[10px] hover:bg-slate-750 text-white px-2 py-0.5 rounded"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setCsvSelectedGovernorates([])}
                    className="bg-slate-800 text-[10px] hover:bg-slate-750 text-white px-2 py-0.5 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Real-time counters matching governorate filter */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] bg-slate-900/60 p-2.5 rounded-lg font-mono">
                <div>
                  <p className="text-white font-bold">{csvStats.total}</p>
                  <p className="text-slate-400 mt-0.5">Total</p>
                </div>
                <div>
                  <p className="text-emerald-400 font-bold">{csvStats.valid}</p>
                  <p className="text-slate-400 mt-0.5">Valid</p>
                </div>
                <div>
                  <p className="text-red-400 font-bold">{csvStats.invalid}</p>
                  <p className="text-slate-400 mt-0.5">Invalid</p>
                </div>
                <div>
                  <p className="text-indigo-400 font-bold">{csvStats.duplicates}</p>
                  <p className="text-slate-400 mt-0.5">Dups</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCsvPreview(!showCsvPreview)}
                  className="flex-1 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-bold py-1.5 rounded-lg transition cursor-pointer"
                >
                  🔍 {lang === "ar" ? "معاينة عينة الاسطر" : "Preview Selected"}
                </button>
                <button
                  onClick={handleAddCSVToQueueFiltered}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-black text-xs font-black py-1.5 rounded-lg transition cursor-pointer"
                >
                  ⚡ {lang === "ar" ? "تأكيد واستيراد الجاهز" : "Add Selected To Queue"}
                </button>
              </div>

              {/* CSV selection preview */}
              {showCsvPreview && (
                <div className="bg-black/50 p-2.5 rounded-lg text-[10px] space-y-1 font-mono text-slate-300">
                  <span className="font-bold border-b border-slate-800 pb-0.5 block mb-1">CSV Selected Sample records:</span>
                  <div className="max-h-[90px] overflow-y-auto space-y-1">
                    {csvFilteredRows.slice(0, 10).map((r, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{idx+1}. {r.businessName}</span>
                        <span className="text-indigo-400">{r.rawPhone} ({r.governorate})</span>
                      </div>
                    ))}
                    {csvFilteredRows.length > 10 && <p className="text-slate-500 italic">... and {csvFilteredRows.length - 10} more records</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 5. SENDING CONTROLS CARD AND CONNECTION */}
      <div className="bg-[#14171D] border border-[#2D3139] p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="text-indigo-400" size={16} />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {lang === "ar" ? "5. لوحة التحكم والتحكم في الإرسال الفوري" : "5. Sending Controls & Channel Integrations"}
            </h2>
          </div>

          {/* Active Connection state indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              {nabdaStatus === "testing" && (
                <span className="text-slate-400 font-mono animate-pulse">Testing connection...</span>
              )}
              {nabdaStatus === "connected" && (
                <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  🟢 {lang === "ar" ? "موصول بخادم Nabda" : "Connected to Nabda"}
                </span>
              )}
              {nabdaStatus === "error" && (
                <span className="flex items-center gap-1 text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20" title={nabdaErrorDetails}>
                  🔴 {lang === "ar" ? "خطأ في الاتصال بالخادم" : "Nabda Connection Error"}
                </span>
              )}
            </div>

            <button
              onClick={testNabdaConnection}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={11} className={nabdaStatus === "testing" ? "animate-spin" : ""} />
              {lang === "ar" ? "اختبار الاتصال" : "Test Connection"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Dispatch actions list */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="space-y-1 text-xs">
                <span className="text-slate-400 block font-semibold">{lang === "ar" ? "معدل التأخير (ثانية):" : "Delay spacing (seconds):"}</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-24 bg-[#0A0B0E] border border-[#2D3139] rounded px-3 py-1.5 text-white text-xs"
                />
              </div>

              {/* Dynamic Counters displaying status */}
              <div className="flex gap-3 flex-wrap pt-2 select-text">
                <div className="bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-xl text-center">
                  <p className="text-[9px] text-slate-450 uppercase font-mono font-bold">Sent</p>
                  <p className="text-emerald-405 font-bold font-mono">{countSent}</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-xl text-center">
                  <p className="text-[9px] text-slate-450 uppercase font-mono font-bold">Failed</p>
                  <p className="text-red-405 font-bold font-mono">{countFailed}</p>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/10 px-3 py-1.5 rounded-xl text-center">
                  <p className="text-[9px] text-slate-450 uppercase font-mono font-bold">Remaining</p>
                  <p className="text-indigo-405 font-bold font-mono">{countRemaining}</p>
                </div>
              </div>
            </div>

            {/* Core visible large control buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {!isSendingActive ? (
                <button
                  onClick={startSendingProcess}
                  disabled={nabdaStatus !== "connected" && nabdaStatus !== "idle"}
                  className="col-span-2 bg-emerald-500 hover:bg-emerald-405 text-slate-950 text-sm font-black py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Play size={15} fill="#020617" />
                  {lang === "ar" ? "▶ بدء الإرسال الجماعي" : "▶ Start Sending"}
                </button>
              ) : (
                <>
                  {sendingPaused ? (
                    <button
                      onClick={handleResume}
                      className="bg-indigo-500 hover:bg-indigo-405 text-black text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PlayCircleReplacer />
                      {lang === "ar" ? "▶ استئناف الإرسال" : "▶ Resume"}
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="bg-amber-500 hover:bg-amber-405 text-black text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Pause size={14} fill="#020617" />
                      {lang === "ar" ? "⏸ إيقاف مؤقت" : "⏸ Pause"}
                    </button>
                  )}

                  <button
                    onClick={handleStop}
                    className="bg-red-650 hover:bg-red-700 text-white text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <StopCircle size={14} />
                    {lang === "ar" ? "⏹ إيقاف تام" : "⏹ Stop"}
                  </button>
                </>
              )}
            </div>

            {/* Live Progress Ticker with progress line */}
            {isSendingActive && (
              <div className="bg-[#0A0B0E] p-3 border border-slate-800 rounded-xl space-y-1.5 font-mono">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Progress: {countSent + countFailed} / {totalInQueue}</span>
                  <span className="text-indigo-400 font-bold">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-[#14171D] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Real-time Logger ledger terminal logs */}
          <div className="lg:col-span-7 flex flex-col space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">
              📟 Active Dispatch Ledger Monitor:
            </span>
            <div className="bg-[#0A0B0E] border border-slate-800 rounded-xl p-3 h-[180px] overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar text-left select-all">
              {sendLogs.length === 0 ? (
                <p className="text-slate-650 italic">Broadcaster idle. Click Start Sending to execute batch logs...</p>
              ) : (
                sendLogs.map((log, lIdx) => (
                  <p key={lIdx} className={log.includes("Successfully") || log.includes("Successfully") ? "text-emerald-400" : log.includes("Failed") || log.includes("Failed") ? "text-red-400" : "text-slate-300"}>
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. ADVANCED CHANNELS QUEUE PREVIEW BOARD */}
      <div className="bg-[#14171D] border border-[#2D3139] p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="text-[#C5A059]" size={16} />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {lang === "ar" ? "6. تصفية وإدارة طابور المستلمين" : "6. Active Sending Queue Preview Board"}
            </h2>
          </div>
          <span className="text-[11px] text-[#C5A059] font-mono font-bold">
            Matches found: {queueFiltered.length} / {totalInQueue}
          </span>
        </div>

        {/* Filters Panel form */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
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
            <span className="text-slate-400 font-semibold block">{lang === "ar" ? "بحث بالاسم / الهاتف:" : "Search name/phone:"}</span>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search text..."
                className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1.5 text-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* SPREADSHEET CHANNELS QUEUE PREVIEW TABLE */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0A0B0E]/40 max-h-[300px] overflow-y-auto custom-scrollbar select-text">
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
                <th className="p-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueFiltered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 italic">No records found matching criteria in bulk queue.</td>
                </tr>
              ) : (
                queueFiltered.map((item, qIdx) => {
                  const isActive = activeQueueIndex !== null && queue[activeQueueIndex]?.id === item.id;
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-slate-900/50 hover:bg-slate-800/10 ${isActive ? "bg-indigo-500/5 font-semibold" : ""}`}
                    >
                      <td className="p-3 text-center text-[10px] text-slate-500 font-mono">{qIdx + 1}</td>
                      <td className="p-3 font-semibold text-white whitespace-nowrap">{item.businessName}</td>
                      <td className="p-3 font-mono text-slate-300">{item.normalizedPhone}</td>
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
                        {item.status === "sent" && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Sent</span>}
                        {item.status === "failed" && <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Failed</span>}
                        {item.status === "ready" && <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Ready</span>}
                        {item.status === "sending" && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold animate-pulse">Sending</span>}
                        {item.status === "needs_review" && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Needs Review</span>}
                        {item.status === "skipped" && <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[9px]">Skipped</span>}
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-1">
                        {item.status === "needs_review" && (
                          <button
                            onClick={() => {
                              setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "ready" } : q));
                            }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] text-emerald-400 font-bold transition"
                            title="Approve to Ready"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setQueue(prev => prev.filter(q => q.id !== item.id));
                          }}
                          className="text-slate-400 hover:text-red-400 transition p-1"
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

      {/* 7. REPORTS EXPORT PANEL */}
      <div className="bg-[#14171D] border border-[#2D3139] p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Download className="text-[#C5A059]" size={16} />
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {lang === "ar" ? "7. تصدير التقارير وسجلات الأخطاء والمكررات" : "7. Export Dedicated Operations Reports"}
          </h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {lang === "ar" 
            ? "حمل ملفات التقارير والتدقيق المنفصلة كملفات Excel/CSV لتسجيل المعاملات وقوائم التكرار أو التالفة."
            : "Download custom CSV logs for audit tracking across various transaction filters. Keeps exact Iraq formatting."}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 pt-2">
          <button
            onClick={handleExportFinalQueue}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-indigo-400" />
            <span>{lang === "ar" ? "تصدير القائمة كاملة" : "Export Final Queue CSV"}</span>
          </button>

          <button
            onClick={handleExportSent}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{lang === "ar" ? "تصدير المستلم المكتمل" : "Export Sent CSV"}</span>
          </button>

          <button
            onClick={handleExportFailed}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <AlertCircle size={16} className="text-red-400" />
            <span>{lang === "ar" ? "تصدير محاولات الفشل" : "Export Failed CSV"}</span>
          </button>

          <button
            onClick={handleExportInvalid}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Trash2 size={16} className="text-amber-500" />
            <span>{lang === "ar" ? "تصدير القوائم المستبعدة" : "Export Invalid CSV"}</span>
          </button>

          <button
            onClick={handleExportDuplicates}
            className="bg-[#14171D] hover:bg-slate-800 border border-slate-800 text-slate-200 py-3 rounded-xl transition text-[11px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw size={16} className="text-indigo-400" />
            <span>{lang === "ar" ? "تصدير المكررات والشكوك" : "Export Duplicates CSV"}</span>
          </button>
        </div>
      </div>

    </div>
  );
}

// Inline custom helpers to handle TS type checks cleanly and fast representation
function PlayCircleReplacer() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play-circle"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
  );
}
