import React, { useState, useRef, useCallback } from "react";
import { 
  Plus, 
  Play, 
  Pause, 
  StopCircle, 
  Send, 
  Layers, 
  HelpCircle,
  FileCheck, 
  Eye, 
  ArrowRight,
  TrendingUp,
  MapPin,
  Tag,
  Upload,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  History,
  ShieldCheck,
  Globe
} from "lucide-react";
import { Campaign, MessageTemplate } from "../types";
import { GOVERNORATES, GOVERNORATES_AR, CATEGORIES, CATEGORIES_AR } from "../mockData";

interface CampaignsViewProps {
  campaigns: Campaign[];
  templates: MessageTemplate[];
  onCreateCampaign: (campaign: Omit<Campaign, "id" | "totalSent" | "delivered" | "read" | "replied" | "interested" | "registered" | "createdAt" | "status">) => void;
  onUpdateStatus: (id: string, status: Campaign["status"]) => void;
  lang: "ar" | "en";
}

export default function CampaignsView({
  campaigns,
  templates,
  onCreateCampaign,
  onUpdateStatus,
  lang
}: CampaignsViewProps) {
  // Global sub-navigation: "csv" = WABA CSV Bulk Sender, "crm" = CRM Funnel campaigns
  const [activeTab, setActiveTab] = useState<"csv" | "crm">("csv");

  // --- CRM FUNNEL CAMPAIGN STATES (Original mockup states) ---
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [governorate, setGovernorate] = useState("Baghdad");
  const [category, setCategory] = useState("Restaurant");
  const [templateId, setTemplateId] = useState("");
  const [isABTesting, setIsABTesting] = useState(false);
  const [abSelectedTemplates, setAbSelectedTemplates] = useState<string[]>([]);
  const [maxContacts, setMaxContacts] = useState(5);
  const [delaySeconds, setDelaySeconds] = useState(5);

  // --- ACTIVE CSV BULK CAMPAIGN SCHEDULER STATES ---
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawRecords, setCsvRawRecords] = useState<any[]>([]);
  const [filteredCSVRecords, setFilteredCSVRecords] = useState<any[]>([]);
  const [headersList, setHeadersList] = useState<string[]>([]);
  const [colMapping, setColMapping] = useState({ phone: 0, name: 1, gov: 2, cat: 3 });

  // Filter conditions
  const [csvGovFilter, setCsvGovFilter] = useState("All");
  const [csvCatFilter, setCsvCatFilter] = useState("All");

  // Customized draft values
  const [csvMessageText, setCsvMessageText] = useState(
    lang === "ar"
      ? "أهلاً {name}! متوفر لدينا عرض مخصص لكم في محافظة {governorate} لشركات نوع {category}..."
      : "Hello {name}! We have custom WhatsApp solutions inside {governorate} for your business type {category}."
  );
  const [csvDelay, setCsvDelay] = useState(5);
  const [csvBlacklistNumber, setCsvBlacklistNumber] = useState("");

  // Queue Controller status
  const [senderState, setSenderState] = useState<"idle" | "running" | "paused" | "stopped">("idle");
  const [activeIdx, setActiveIdx] = useState(0);
  const [backendStatusMsg, setBackendStatusMsg] = useState("Checking Proxy...");
  const [backendIsConnected, setBackendIsConnected] = useState(false);
  const [dndPhones, setDndPhones] = useState<string[]>([]);
  const [campaignHistoryRuns, setCampaignHistoryRuns] = useState<any[]>([]);

  // Feedback banner
  const [toastFeedback, setToastFeedback] = useState("");

  const triggerToast = (msg: string) => {
    setToastFeedback(msg);
    setTimeout(() => setToastFeedback(""), 4000);
  };

  // Default Template binding for original forms
  React.useEffect(() => {
    if (templates.length > 0 && !templateId) {
      setTemplateId(templates[0].id);
    }
  }, [templates]);

  // Load backend statuses and historical logs
  const fetchBackendReports = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setBackendIsConnected(data.secured);
        setBackendStatusMsg(lang === "ar"
          ? `نشط ومصادق (${data.logsCount.sent} مرسلة)`
          : `Proxy Active (${data.logsCount.sent} sent)`);
      } else {
        setBackendStatusMsg(lang === "ar" ? "خطأ باتصال الخادم" : "Server Connection Issue");
      }
    } catch (e) {
      setBackendStatusMsg(lang === "ar" ? "وضع المحاكاة الافتراضية نشط" : "Simulator Mode Enabled");
    }

    try {
      const resHistory = await fetch("/api/history");
      if (resHistory.ok) {
        const data = await resHistory.json();
        setCampaignHistoryRuns(data);
      }
    } catch (e) {
      // ignore
    }

    try {
      const resDnd = await fetch("/api/dnd");
      if (resDnd.ok) {
        const data = await resDnd.json();
        setDndPhones(data.map((item: any) => item.phone));
      }
    } catch (e) {
      // ignore
    }
  }, [lang]);

  React.useEffect(() => {
    fetchBackendReports();
  }, [fetchBackendReports]);

  // --- REFS FOR SECURE BATCH LOOP TO PREVENT STALE CLOSURES ---
  const senderStateRef = useRef(senderState);
  senderStateRef.current = senderState;

  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;

  const filteredCSVRecordsRef = useRef(filteredCSVRecords);
  filteredCSVRecordsRef.current = filteredCSVRecords;

  const csvDelayRef = useRef(csvDelay);
  csvDelayRef.current = csvDelay;

  const csvMessageTextRef = useRef(csvMessageText);
  csvMessageTextRef.current = csvMessageText;

  // Save campaign statistics to backend json database
  const saveCampaignHistory = async (status: string) => {
    const sent = filteredCSVRecordsRef.current.filter((r) => r.status === "Sent").length;
    const failed = filteredCSVRecordsRef.current.filter((r) => r.status === "Failed").length;
    const skipped = filteredCSVRecordsRef.current.filter((r) => r.status === "Skipped" || r.status === "DND").length;

    const payload = {
      id: `camp_${Date.now()}`,
      name: lang === "ar" ? `إرسال جماعي (${new Date().toLocaleDateString()})` : `React Broadcast (${new Date().toLocaleDateString()})`,
      sent,
      failed,
      skipped,
      status,
      timestamp: new Date().toISOString()
    };

    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      fetchBackendReports();
    } catch (e) {
      console.warn("Could not save history to disk:", e);
    }
  };

  // Primary sequential rates controller loop
  const executeCampaignLoop = useCallback(async () => {
    if (senderStateRef.current !== "running") return;

    let idx = activeIdxRef.current;
    const records = filteredCSVRecordsRef.current;

    // Loop until we find a target that hasn't been processed yet
    while (idx < records.length && records[idx].status !== "Ready") {
      idx++;
    }

    if (idx >= records.length) {
      setSenderState("stopped");
      triggerToast(lang === "ar" ? "🎉 تم الانتهاء من الإرسال الجماعي بالكامل!" : "🎉 Bulk campaign sending finished!");
      saveCampaignHistory("Completed");
      return;
    }

    // Set row status to Sending
    setFilteredCSVRecords((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, status: "Sending" } : item))
    );
    setActiveIdx(idx);
    activeIdxRef.current = idx;

    const target = records[idx];

    // Normalize phone number
    const targetPhoneRaw = target.phone || "";
    let cleanedPhone = targetPhoneRaw.trim().replace(/[^\d+]/g, "");
    if (cleanedPhone.startsWith("07") && cleanedPhone.length === 11) {
      cleanedPhone = "+964" + cleanedPhone.substring(1);
    } else if (cleanedPhone.startsWith("7") && cleanedPhone.length === 10) {
      cleanedPhone = "+964" + cleanedPhone;
    } else if (cleanedPhone.startsWith("964")) {
      cleanedPhone = "+" + cleanedPhone;
    }

    // Checking validation
    const isValidIraqi = /^(\+9647\d{9})$/.test(cleanedPhone);
    const isDND = dndPhones.includes(cleanedPhone);

    if (!isValidIraqi) {
      setFilteredCSVRecords((prev) =>
        prev.map((item, i) =>
          i === idx ? { ...item, status: "Skipped", details: "Invalid Iraqi Format" } : item
        )
      );
      try {
        await fetch("/api/logs/skipped", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanedPhone, businessName: target.businessName, reason: "Invalid Phone" })
        });
      } catch (e) {}

      // Move instantly to next
      activeIndexNextStep(idx + 1);
      return;
    }

    if (isDND) {
      setFilteredCSVRecords((prev) =>
        prev.map((item, i) =>
          i === idx ? { ...item, status: "DND", details: "Blacklisted" } : item
        )
      );
      activeIndexNextStep(idx + 1);
      return;
    }

    // Replace fields
    const renderedMsg = csvMessageTextRef.current
      .replace(/{name}/g, target.businessName || (lang === "ar" ? "عميلنا العزيز" : "Business Store"))
      .replace(/{governorate}/g, target.governorate || (lang === "ar" ? "بغداد" : "Baghdad"))
      .replace(/{category}/g, target.category || (lang === "ar" ? "متجر" : "Market"));

    try {
      const response = await fetch("/api/nabda/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanedPhone,
          message: renderedMsg,
          businessName: target.businessName
        })
      });

      if (response.ok) {
        setFilteredCSVRecords((prev) =>
          prev.map((item, i) => (i === idx ? { ...item, status: "Sent" } : item))
        );
      } else {
        const responseData = await response.json();
        const stat = responseData.isDND ? "DND" : "Failed";
        setFilteredCSVRecords((prev) =>
          prev.map((item, i) =>
            i === idx ? { ...item, status: stat, details: responseData.error || "WABA Error" } : item
          )
        );
      }
    } catch (err: any) {
      setFilteredCSVRecords((prev) =>
        prev.map((item, i) =>
          i === idx ? { ...item, status: "Failed", details: err.message || "Network issue" } : item
        )
      );
    }

    activeIndexNextStep(idx + 1);
  }, [lang, dndPhones]);

  const activeIndexNextStep = (nextIdx: number) => {
    setActiveIdx(nextIdx);
    activeIdxRef.current = nextIdx;
    setTimeout(() => {
      executeCampaignLoop();
    }, csvDelayRef.current * 1000);
  };

  // Parse CSV File manually
  const parseCSVFileText = (text: string) => {
    const lineBreakChar = text.indexOf("\r\n") > -1 ? "\r\n" : "\n";
    const lines = text.split(lineBreakChar).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    // Header split
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    setHeadersList(headers);

    // Map column positions matches
    const mapped = {
      phone: headers.findIndex((h) => /phone|number|hait|tel|mobile|هاتف|رقم/i.test(h)),
      name: headers.findIndex((h) => /name|business|company|merchant|client|store|اسم|محل|شركة/i.test(h)),
      gov: headers.findIndex((h) => /gov|city|town|province|location|محافظة|المدينة|مدنية/i.test(h)),
      cat: headers.findIndex((h) => /cat|trade|sector|vocation|type|تصنيف|قسم|فئة/i.test(h))
    };

    if (mapped.phone === -1) mapped.phone = 0;
    if (mapped.name === -1) mapped.name = 1;
    if (mapped.gov === -1) mapped.gov = 2;
    if (mapped.cat === -1) mapped.cat = 3;

    setColMapping(mapped);

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      // robust character splitting
      const rowCells = [];
      let cell = "";
      let inQuotes = false;
      const line = lines[i];
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          rowCells.push(cell);
          cell = "";
        } else {
          cell += char;
        }
      }
      rowCells.push(cell);

      if (rowCells.length === 0 || !rowCells[mapped.phone]) continue;

      records.push({
        phone: rowCells[mapped.phone]?.trim() || "",
        businessName: rowCells[mapped.name]?.trim() || "Store Merchant",
        governorate: rowCells[mapped.gov]?.trim() || "Baghdad",
        category: rowCells[mapped.cat]?.trim() || "Restaurant",
        status: "Ready",
        details: ""
      });
    }

    setCsvRawRecords(records);
    applyCSVFiltering(records, csvGovFilter, csvCatFilter);
  };

  const applyCSVFiltering = (records: any[], gov: string, cat: string) => {
    const list = records.filter((item) => {
      const matchGov = gov === "All" || item.governorate.toLowerCase().includes(gov.toLowerCase());
      const matchCat = cat === "All" || item.category.toLowerCase().includes(cat.toLowerCase());
      return matchGov && matchCat;
    });
    setFilteredCSVRecords(list);
    setActiveIdx(0);
    activeIdxRef.current = 0;
  };

  // Drop and browse selections
  const handleCSVUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          parseCSVFileText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const insertToken = (token: string) => {
    setCsvMessageText((prev) => prev + token);
  };

  const handleStartCSVSending = () => {
    if (filteredCSVRecords.length === 0) {
      triggerToast(lang === "ar" ? "الرجاء رفع ملف جهات الاتصال أولاً!" : "Please upload a target contact list first!");
      return;
    }
    setSenderState("running");
    senderStateRef.current = "running";
    triggerNextSend();
  };

  const triggerNextSend = () => {
    setTimeout(() => {
      executeCampaignLoop();
    }, 100);
  };

  const handlePauseCSVSending = () => {
    setSenderState("paused");
    senderStateRef.current = "paused";
    saveCampaignHistory("Paused");
    triggerToast(lang === "ar" ? "تم إيقاف الإرسال مؤقتاً" : "Campaign dispatch paused.");
  };

  const handleStopCSVSending = () => {
    setSenderState("stopped");
    senderStateRef.current = "stopped";
    saveCampaignHistory("Stopped");
    triggerToast(lang === "ar" ? "تم إيقاف الحملة نهائياً" : "Campaign dispatch stopped.");
  };

  const handleResetSender = () => {
    setCsvFile(null);
    setCsvRawRecords([]);
    setFilteredCSVRecords([]);
    setSenderState("idle");
    setActiveIdx(0);
    activeIdxRef.current = 0;
  };

  const handleAddDNDBlacklist = async () => {
    if (!csvBlacklistNumber.trim()) return;
    try {
      const res = await fetch("/api/dnd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: csvBlacklistNumber, notes: "React blacklist controller" })
      });
      if (res.ok) {
        triggerToast(lang === "ar" ? `تم إدراج الرقم ${csvBlacklistNumber} بالقائمة السوداء` : `Number ${csvBlacklistNumber} blacklisted!`);
        setCsvBlacklistNumber("");
        fetchBackendReports();
      }
    } catch (e) {
      // offline fallback
    }
  };

  const handleDownloadCSVLog = (type: string) => {
    window.open(`/api/logs/${type}`, "_blank");
  };

  // --- CRM ORIGINAL FORM SUBMISSION ---
  const handleSubmitFunnel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateCampaign({
      name,
      templateId: isABTesting ? "ab-test" : templateId,
      templateIdsAB: isABTesting ? abSelectedTemplates : undefined,
      governorate,
      category,
      maxContacts,
      delaySeconds
    });

    // Reset Form
    setName("");
    setTemplateId(templates[0]?.id || "");
    setIsABTesting(false);
    setAbSelectedTemplates([]);
    setMaxContacts(5);
    setDelaySeconds(5);
    setShowCreateForm(false);
  };

  const handleABToggleTemplate = (id: string) => {
    if (abSelectedTemplates.includes(id)) {
      setAbSelectedTemplates(abSelectedTemplates.filter((tId) => tId !== id));
    } else {
      setAbSelectedTemplates([...abSelectedTemplates, id]);
    }
  };

  // Core translations mapping
  const txt = {
    title: lang === "ar" ? "قائمة وخطط الحملات" : "WhatsApp Outreach Campaigns",
    desc: lang === "ar" ? "إطلاق حملات تسويقية ذكية لجهات اتصال مخصصة مع دعم كامل لتقسيم الفئات الجغرافية والـ A/B Testing" : "Launch targeted campaigns by city and business category with real-time conversion rates and A/B templates",
    btnNew: lang === "ar" ? "إنشاء حملة جديدة +" : "Create New Campaign +",
    btnCancel: lang === "ar" ? "إلغاء التنصيب" : "Cancel",
    formTitle: lang === "ar" ? "إعداد حملة جديدة" : "New Campaign Onboarding",
    lblCName: lang === "ar" ? "اسم الحمله (مثال: مطاعم الكرادة)" : "Campaign Title (e.g., Karrada Restaurants Deal)",
    lblGov: lang === "ar" ? "تحديد المحافظة المستهدفة" : "Target Iraqi Governorate",
    lblCat: lang === "ar" ? "تقسيم فئة العمل" : "Business Category Segment",
    lblTemp: lang === "ar" ? "قالب الرسالة الأساسي" : "Primary Outbound Template",
    lblAB: lang === "ar" ? "تفعيل اختبار A/B للرسائل (توزيع ذكي تلقائي)" : "Enable A/B testing (Rotates randomized templates)",
    lblLimit: lang === "ar" ? "الحد الأقصى للمستهدفين في الدفعة" : "Maximum Target Contacts",
    lblDelay: lang === "ar" ? "الفاصل الزمني التلقائي للإرسال (بالثواني)" : "Outbox Dispatch Interval (Seconds)",
    btnSubmit: lang === "ar" ? "حفظ وإطلاق الحملة" : "Save & Onboard Campaign",
    campList: lang === "ar" ? "الحملات النشطة والسابقة" : "Active & Historic Campaigns",
    colName: lang === "ar" ? "الحملة والتفاصيل" : "Campaign & Metrics",
    colTarget: lang === "ar" ? "الهدف المستهدف" : "Target Geo/Category",
    colStatus: lang === "ar" ? "حالة الإرسال" : "Dispatch Status",
    colPerformance: lang === "ar" ? "الأرقام وقمع التحويل" : "Funnel Performance",
    statusRunning: lang === "ar" ? "جاري الإرسال" : "Sending",
    statusPaused: lang === "ar" ? "متوقف مؤقتاً" : "Paused",
    statusCompleted: lang === "ar" ? "مكتملة" : "Completed",
    statusIdle: lang === "ar" ? "خاملة" : "Idle",
    statSent: lang === "ar" ? "مرسل" : "Sent",
    statDelivered: lang === "ar" ? "مستلم" : "Del",
    statRead: lang === "ar" ? "مقروء" : "Read",
    statReplied: lang === "ar" ? "ردود" : "Rep",
    statReg: lang === "ar" ? "مسجل" : "Reg",
    alertRunning: lang === "ar" ? "💡 الإرسال التلقائي نشط! جاري تشغيل خوادم Nabda ومحاكاة التسليم الافتراضي..." : "💡 Dispatch mode is running! Nabda is simulation-sending and logging real-time callbacks..."
  };

  // CSV Statistics counters
  const csvSentCount = filteredCSVRecords.filter((r) => r.status === "Sent").length;
  const csvFailedCount = filteredCSVRecords.filter((r) => r.status === "Failed").length;
  const csvSkippedCount = filteredCSVRecords.filter((r) => r.status === "Skipped" || r.status === "DND").length;
  const csvRemainingCount = filteredCSVRecords.length - (csvSentCount + csvFailedCount + csvSkippedCount);

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Toast Overlay Banner */}
      {toastFeedback && (
        <div className="fixed top-4 left-4 z-50 bg-[#C5A059] text-[#0A0B0E] font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={16} />
          <span>{toastFeedback}</span>
        </div>
      )}

      {/* Top Main Title & Navigation Toggle Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-[#2D3139] shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#C5A059] rounded-full animate-pulse shadow-[0_0_8px_rgba(197,160,89,0.5)]"></span>
            {lang === "ar" ? "شاكو ماكو - بوابات الإرسال" : "Shaku Maku Broadcast Suites"}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">
            {lang === "ar" 
              ? "تحكم بحملات الإرسال المجدولة وإرسال الرسائل عبر بوابات واتساب بربط مباشر ونسب إرسال آمنة"
              : "Synchronize and schedule high-delivery bulk WABA outreach with Iraqi phone validations and CSV importers."}
          </p>
        </div>

        {/* Dual Mode Sub-Tab Navifiers */}
        <div className="flex bg-[#191D24] border border-[#2D3139]/70 p-1.5 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "csv"
                ? "bg-[#C5A059] text-[#0A0B0E]"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Send size={13} />
            {lang === "ar" ? "الإرسال الجماعي بالملف CSV" : "CSV Bulk WABA Sender"}
          </button>
          <button
            onClick={() => setActiveTab("crm")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "crm"
                ? "bg-[#C5A059] text-[#0A0B0E]"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Layers size={13} />
            {lang === "ar" ? "حملات قمع العملاء CRM" : "CRM Funnel Campaigns"}
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 🚀 MODE 1: ACTIVE CSV BULK CAMPAIGN SCHEDULER VIEW */}
      {/* ========================================== */}
      {activeTab === "csv" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Quick Stats Panel */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#14171D] p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#8E9299] uppercase font-bold">{lang === "ar" ? "ناجحة المرسلة" : "Sent OK"}</p>
                <p className="text-lg font-bold text-emerald-400 font-mono">{csvSentCount}</p>
              </div>
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">✔</span>
            </div>

            <div className="bg-[#14171D] p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#8E9299] uppercase font-bold">{lang === "ar" ? "فشلت رسائلها" : "Failed Errors"}</p>
                <p className="text-lg font-bold text-red-400 font-mono">{csvFailedCount}</p>
              </div>
              <span className="p-2 rounded-lg bg-red-400/10 text-red-400 border border-red-500/20 text-xs">✖</span>
            </div>

            <div className="bg-[#14171D] p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#8E9299] uppercase font-bold">{lang === "ar" ? "مستبعدة / مكررة" : "DND / Excluded"}</p>
                <p className="text-lg font-bold text-amber-500 font-mono">{csvSkippedCount}</p>
              </div>
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs">🛡</span>
            </div>

            <div className="bg-[#14171D] p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#8E9299] uppercase font-bold">{lang === "ar" ? "قيد الانتظار" : "Pending Pool"}</p>
                <p className="text-lg font-bold text-blue-400 font-mono">{csvRemainingCount}</p>
              </div>
              <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">⏳</span>
            </div>

          </div>

          {/* Active Loop Running HUD */}
          {senderState !== "idle" && filteredCSVRecords.length > 0 && (
            <div className="bg-[#C5A059]/10 border border-[#C5A059]/20 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#C5A059]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-ping" />
                  <span className="font-bold">
                    {senderState === "running" 
                      ? (lang === "ar" ? `جاري الإرسال حالياً - مستهدف رقم ${activeIdx + 1}` : `WABA campaign in progress - Executing target #${activeIdx + 1}`)
                      : (lang === "ar" ? "تم إيقاف الإرسال مؤقتاً" : "Outbox paused")}
                  </span>
                </div>
                <span className="font-mono font-bold">
                  {csvSentCount + csvFailedCount + csvSkippedCount} / {filteredCSVRecords.length} ({Math.round(((csvSentCount + csvFailedCount + csvSkippedCount) / filteredCSVRecords.length) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-[#14171D] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#C5A059] to-[#F3DB9F] h-full transition-all duration-300"
                  style={{ width: `${Math.round(((csvSentCount + csvFailedCount + csvSkippedCount) / filteredCSVRecords.length) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Configuration & Action Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Upload, Settings, Mapping */}
            <div className="space-y-6 lg:col-span-1">
              
              {/* Step 1: Drag & Drop CSV */}
              <div className="bg-[#14171D] border border-white/5 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/5 font-sans">
                  <span className="text-[#C5A059] font-mono">01.</span>
                  {lang === "ar" ? "قاعدة بيانات العملاء CSV" : "Import Campaign Spreadsheet"}
                </h3>

                <label className="border-2 border-dashed border-[#2D3139] hover:border-[#C5A059]/40 bg-[#191D24] transition rounded-xl p-5 text-center cursor-pointer block group relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleCSVUploadChange}
                  />
                  <div className="space-y-2 text-center">
                    <Upload className="mx-auto text-slate-500 group-hover:text-[#C5A059] transition" size={28} />
                    <p className="text-xs font-semibold text-slate-300">
                      {lang === "ar" ? "انقر لاستيراد ملف CSV أو اسحبه هنا" : "Click to select CSV, or drag file here"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-sans">
                      {lang === "ar" ? "يدعم تلقائياً أعمدة: الرقم والاسم والمدينة والتصنيف" : "Auto matches Columns: Phone, Name, City, Sector"}
                    </p>
                  </div>
                </label>

                {csvFile && (
                  <div className="bg-[#1C2128] border border-[#2D3139] p-3 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="font-bold truncate text-slate-300">{csvFile.name} ({csvRawRecords.length} lines)</span>
                    </div>
                    <button 
                      onClick={handleResetSender}
                      className="text-red-400 hover:text-red-300 transition"
                      title="Clear Spreadsheet"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {csvRawRecords.length > 0 && (
                  <div className="bg-[#1C2128] p-3 rounded-xl border border-white/5 text-[11px] space-y-1.5 text-slate-400">
                    <p className="font-semibold text-slate-300">{lang === "ar" ? "مخطط ربط الأعمدة المكشوفة:" : "Detected Columns Layout:"}</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                      <div>Phone: <span className="text-[#C5A059] font-bold">{headersList[colMapping.phone] || "Col 0"}</span></div>
                      <div>Name: <span className="text-[#C5A059] font-bold">{headersList[colMapping.name] || "Col 1"}</span></div>
                      <div>Area: <span className="text-[#C5A059] font-bold">{headersList[colMapping.gov] || "Col 2"}</span></div>
                      <div>Category: <span className="text-[#C5A059] font-bold">{headersList[colMapping.cat] || "Col 3"}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Rate Limitings & Segment Excluders */}
              <div className="bg-[#14171D] border border-white/5 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/5 font-sans">
                  <span className="text-[#C5A059] font-mono">02.</span>
                  {lang === "ar" ? "التحكم ومستوى التأخير الآمن" : "Delay & Filter Exclusions"}
                </h3>

                {/* Delay Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-400">{lang === "ar" ? "الفاصل الزمني للفرد" : "Dispatch Interval"}</label>
                    <span className="text-[#C5A059] font-mono font-bold">{csvDelay} Seconds</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="20" 
                    className="w-full h-2 accent-[#C5A059] bg-[#191D24] cursor-pointer"
                    value={csvDelay}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCsvDelay(v);
                      csvDelayRef.current = v;
                    }}
                  />
                  <p className="text-[10px] text-slate-500 font-sans">
                    {lang === "ar" ? "يعمل على تجنب حظر أرقامك في واتساب عبر تباعد الإرسال." : "Rate spacing safeguards WABA lines from rapid automated bot bans."}
                  </p>
                </div>

                {/* Advanced Campaign Filters */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-slate-300 font-bold">{lang === "ar" ? "تصفية الفئة والمحافظة" : "Segmentation Filters Outbox"}</p>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">{lang === "ar" ? "محافظة إلكترونية معينة" : "Iraqi City Governorate"}</label>
                    <select 
                      value={csvGovFilter} 
                      onChange={(e) => {
                        setCsvGovFilter(e.target.value);
                        applyCSVFiltering(csvRawRecords, e.target.value, csvCatFilter);
                      }}
                      className="w-full bg-[#191D24] text-xs px-2.5 py-2.5 rounded-lg border border-[#2D3139] text-[#C5A059] focus:outline-none"
                    >
                      <option value="All">{lang === "ar" ? "كل محافظات العراق (بدون فلتر)" : "All Iraqi Governorates (No Filter)"}</option>
                      {GOVERNORATES.map((g) => (
                        <option key={g} value={g}>{lang === "ar" ? GOVERNORATES_AR[g as keyof typeof GOVERNORATES_AR] : g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">{lang === "ar" ? "تصنيف عملي مخصص" : "Activity Category"}</label>
                    <select 
                      value={csvCatFilter} 
                      onChange={(e) => {
                        setCsvCatFilter(e.target.value);
                        applyCSVFiltering(csvRawRecords, csvGovFilter, e.target.value);
                      }}
                      className="w-full bg-[#191D24] text-xs px-2.5 py-2.5 rounded-lg border border-[#2D3139] text-[#C5A059] focus:outline-none"
                    >
                      <option value="All">{lang === "ar" ? "كافة الأعمال التجارية" : "All business trades"}</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{lang === "ar" ? CATEGORIES_AR[c as keyof typeof CATEGORIES_AR] : c}</option>
                      ))}
                    </select>
                  </div>

                </div>

              </div>
            </div>

            {/* Right Column: Draft message, live previews & past reports */}
            <div className="space-y-6 lg:col-span-2">
              
              {/* Message Composer Draft */}
              <div className="bg-[#14171D] border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                    <span className="text-[#C5A059] font-mono">03.</span>
                    {lang === "ar" ? "صياغة نص الرسالة الذكي" : "Campaign Outbox Template Composer"}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => insertToken("{name}")} className="bg-[#191D24] hover:bg-white/5 border border-[#2D3139] px-1.5 py-0.5 rounded text-[9px] font-mono text-[#C5A059]">{lang === "ar" ? "الاسم" : "{name}"}</button>
                    <button onClick={() => insertToken("{governorate}")} className="bg-[#191D24] hover:bg-white/5 border border-[#2D3139] px-1.5 py-0.5 rounded text-[9px] font-mono text-[#C5A059]">{lang === "ar" ? "محافظة" : "{city}"}</button>
                    <button onClick={() => insertToken("{category}")} className="bg-[#191D24] hover:bg-white/5 border border-[#2D3139] px-1.5 py-0.5 rounded text-[9px] font-mono text-[#C5A059]">{lang === "ar" ? "تصنيف" : "{type}"}</button>
                  </div>
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={5}
                    value={csvMessageText}
                    onChange={(e) => {
                      setCsvMessageText(e.target.value);
                      csvMessageTextRef.current = e.target.value;
                    }}
                    className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#C5A059] text-right font-sans transition"
                    placeholder="أهلاً {name}! عروضنا في {governorate} تبدأ الآن..."
                  />
                </div>

                {/* Main Action Controllers */}
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleStartCSVSending}
                    disabled={senderState === "running" || filteredCSVRecords.length === 0}
                    className="flex-1 bg-[#C5A059] text-[#0A0B0E] hover:scale-[1.01] transition disabled:opacity-50 py-3 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#C5A059]/10"
                  >
                    <Play size={14} fill="currentColor" />
                    {senderState === "paused" ? (lang === "ar" ? "استئناف الإرسال" : "Resume Outbox") : (lang === "ar" ? "بدء الإرسال الجماعي" : "Start Bulk Campaign")}
                  </button>
                  <button
                    onClick={handlePauseCSVSending}
                    disabled={senderState !== "running"}
                    className="bg-[#1C2128] border border-[#2D3139] text-[#C5A059] disabled:opacity-40 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Pause size={14} />
                    {lang === "ar" ? "مؤقت" : "Pause"}
                  </button>
                  <button
                    onClick={handleStopCSVSending}
                    disabled={senderState !== "running" && senderState !== "paused"}
                    className="bg-red-950/30 border border-red-950 text-red-400 disabled:opacity-40 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <StopCircle size={14} />
                    {lang === "ar" ? "إيقاف" : "Stop"}
                  </button>
                </div>
              </div>

              {/* Dynamic preview list */}
              <div className="bg-[#14171D] border border-white/5 p-5 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{lang === "ar" ? "معاينة قائمة المستهدفين الحالية" : "Active targets live preview list"}</h4>
                  <span className="text-[10px] font-mono text-[#C5A059]">{filteredCSVRecords.length} {lang === "ar" ? "جهة اتصال محملة" : "Addresses mapped"}</span>
                </div>

                <div className="overflow-x-auto border border-[#2D3139] bg-[#191D24] rounded-xl h-[300px]">
                  <table class="w-full text-[11px] text-slate-300 text-right min-w-[500px]">
                    <thead className="bg-[#14171D] text-[#8E9299]">
                      <tr className="border-b border-[#2D3139]">
                        <th className="py-2 px-3 text-center">#</th>
                        <th className="py-2 px-3 text-right">{lang === "ar" ? "اسم المحل والتفاصيل" : "Business Store"}</th>
                        <th className="py-2 px-3 text-center">{lang === "ar" ? "الرقم المسجل" : "Phone"}</th>
                        <th className="py-2 px-3 text-right">{lang === "ar" ? "المدينة" : "City"}</th>
                        <th className="py-2 px-3 text-right">{lang === "ar" ? "القسم" : "Sector"}</th>
                        <th className="py-2 px-3 text-center">{lang === "ar" ? "الحالة" : "Dispatch Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {filteredCSVRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500 text-xs italic">
                            {lang === "ar" 
                              ? "لا توجد جهات اتصال لمراجعتها بعد. قم برفع ورقة CSV للبدء." 
                              : "No parsed accounts ready for dispatch. Drag and drop file."}
                          </td>
                        </tr>
                      ) : (
                        filteredCSVRecords.map((r, idx) => {
                          const isActiveRow = idx === activeIdx && senderState === "running";
                          let badgeStyle = "bg-white/5 text-[#8E9299]";
                          if (r.status === "Sent") badgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-bold";
                          if (r.status === "Failed") badgeStyle = "bg-red-400/10 text-red-500 border border-red-500/15 font-bold";
                          if (r.status === "DND") badgeStyle = "bg-amber-400/10 text-amber-500 border border-amber-500/15 font-bold font-sans";
                          if (r.status === "Sending") badgeStyle = "bg-blue-400/10 text-blue-400 border border-blue-400/20 animate-pulse font-bold";

                          return (
                            <tr key={idx} className={`hover:bg-white/5 text-xs transition border-b border-white/5 ${isActiveRow ? "bg-[#C5A059]/5" : ""}`}>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-white whitespace-nowrap">{r.businessName}</td>
                              <td className="py-2.5 px-3 text-center font-mono text-[#F3DB9F]">{r.phone}</td>
                              <td className="py-2.5 px-3 text-right truncate max-w-[100px]">{r.governorate}</td>
                              <td className="py-2.5 px-3 text-right truncate max-w-[100px]">{r.category}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${badgeStyle}`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Advanced logs manager & blacklisters */}
              <div className="bg-[#14171D] border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{lang === "ar" ? "تحميل سجلات الإكسل المسجلة وتحديث الأرقام" : "Download historic logs and blacklist numbers"}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{backendStatusMsg}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Manual Blacklist adder */}
                  <div className="bg-[#191D24] p-3.5 rounded-xl border border-white/5 space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">{lang === "ar" ? "إضافة رقم مانع للإرسال (DND)" : "Add opt-out Blacklisted telephone"}</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="+9647XXXXXXXXX"
                        className="flex-1 bg-[#14171D] border border-[#2D3139] px-3 py-1 text-xs text-white focus:outline-none focus:border-[#C5A059] rounded"
                        value={csvBlacklistNumber}
                        onChange={(e) => setCsvBlacklistNumber(e.target.value)}
                      />
                      <button 
                        onClick={handleAddDNDBlacklist}
                        className="bg-[#C5A059] text-[#0A0B0E] hover:bg-[#b08e4d] font-bold text-xs px-3 py-1 rounded transition cursor-pointer"
                      >
                        {lang === "ar" ? "استبعاد" : "Exclude"}
                      </button>
                    </div>
                  </div>

                  {/* Log CSV download portals */}
                  <div className="bg-[#191D24] p-3.5 rounded-xl border border-white/5 space-y-2">
                    <p className="text-[10px] text-slate-400 block font-bold uppercase">{lang === "ar" ? "تحميل سجلات عمليات الإرسال" : "Download Transaction CSV Ledgers"}</p>
                    <div className="grid grid-cols-3 gap-1.5 font-sans">
                      <button onClick={() => handleDownloadCSVLog("sent")} className="bg-[#14171D] hover:bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 py-1.5 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                        <Download size={10} /> Sent
                      </button>
                      <button onClick={() => handleDownloadCSVLog("failed")} className="bg-[#14171D] hover:bg-red-500/10 border border-red-500/10 text-red-400 py-1.5 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                        <Download size={10} /> Fail
                      </button>
                      <button onClick={() => handleDownloadCSVLog("skipped")} className="bg-[#14171D] hover:bg-amber-500/10 border border-amber-500/10 text-amber-500 py-1.5 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                        <Download size={10} /> Skip
                      </button>
                    </div>
                  </div>

                </div>

                {/* JSON list run log */}
                <div className="space-y-2.5 pt-3 border-t border-white/5 text-xs">
                  <p className="font-bold text-slate-400">{lang === "ar" ? "السجل التاريخي لإطلاقات الواتساب Nabda:" : "Recent Campaign Run Histories:"}</p>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {campaignHistoryRuns.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">{lang === "ar" ? "لا توجد سجلات بعد." : "No historic run logs found."}</p>
                    ) : (
                      campaignHistoryRuns.slice(0, 4).map((c, i) => (
                        <div key={i} className="bg-[#191D24] hover:bg-white/5 transition p-2.5 rounded-lg border border-[#2D3139] flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-bold text-slate-200">{c.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono">{new Date(c.timestamp).toLocaleString()}</p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                              c.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                            }`}>{c.status}</span>
                            <p className="text-[9px] text-slate-400 font-mono">S: <strong className="text-emerald-400">{c.sent}</strong> | F: <strong class="text-red-400">{c.failed}</strong></p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* 📊 MODE 2: ORIGINAL CRM AUTOMATED FUNNEL VIEW */}
      {/* ========================================== */}
      {activeTab === "crm" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-4 rounded-xl border border-white/5">
            <div>
              <p className="text-xs text-[#8E9299]">{txt.desc}</p>
            </div>
            <button
              id="btn_create_campaign"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-[#C5A059] hover:scale-[1.02] text-[#0A0B0E] px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#C5A059]/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              {showCreateForm ? txt.btnCancel : txt.btnNew}
            </button>
          </div>

          {campaigns.some((c) => c.status === "running") && (
            <div className="bg-[#C5A059]/10 border border-[#C5A059]/25 px-4 py-3 rounded-xl text-xs text-[#C5A059] flex items-center gap-2 animate-pulse">
              <Send size={14} className="animate-bounce shrink-0" />
              <span>{txt.alertRunning}</span>
            </div>
          )}

          {/* Form wrapper */}
          {showCreateForm && (
            <div className="bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-4 duration-200">
              <form onSubmit={handleSubmitFunnel} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#8E9299] font-medium block">{txt.lblCName}</label>
                    <input
                      id="campaign_name_input"
                      type="text"
                      required
                      placeholder={lang === "ar" ? "مطاعم المنصور" : "Baghdad pharmacy segment"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2 text-xs text-white text-right"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[#8E9299] font-medium block">{txt.lblGov}</label>
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2.5 text-xs text-white text-right focus:outline-none focus:border-[#C5A059]"
                    >
                      <option value="All">{lang === "ar" ? "كل المحافظات" : "All governorates"}</option>
                      {GOVERNORATES.map((g) => (
                        <option key={g} value={g}>{lang === "ar" ? GOVERNORATES_AR[g as keyof typeof GOVERNORATES_AR] : g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[#8E9299] font-medium block">{txt.lblCat}</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2.5 text-xs text-white text-right focus:outline-none focus:border-[#C5A059]"
                    >
                      <option value="All">{lang === "ar" ? "كل الأعمال" : "All fields"}</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{lang === "ar" ? CATEGORIES_AR[c as keyof typeof CATEGORIES_AR] : c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[#8E9299] font-medium block flex justify-between">
                      <span>{txt.lblDelay}</span>
                      <span className="text-[#C5A059] font-mono font-bold">{delaySeconds}s</span>
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={delaySeconds}
                      onChange={(e) => setDelaySeconds(Number(e.target.value))}
                      className="w-full accent-[#C5A059] h-2 bg-[#191D24] rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[#8E9299] font-medium block flex justify-between">
                      <span>{txt.lblLimit}</span>
                      <span className="text-[#C5A059] font-mono font-bold">{maxContacts}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={maxContacts}
                      onChange={(e) => setMaxContacts(Number(e.target.value))}
                      className="w-full h-2 accent-[#C5A059] bg-[#191D24]"
                    />
                  </div>

                  {/* A/B checkbox */}
                  <div className="md:col-span-2 bg-[#1C2128] p-4 rounded-xl border border-[#2D3139] space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isABTesting}
                        onChange={(e) => setIsABTesting(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#C5A059]"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{txt.lblAB}</span>
                      </div>
                    </label>

                    {!isABTesting ? (
                      <div className="space-y-1.5">
                        <select
                          value={templateId}
                          onChange={(e) => setTemplateId(e.target.value)}
                          className="w-full bg-[#191D24] border border-[#2D3139] rounded text-xs px-2 py-1.5 text-white"
                        >
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>[{t.language}] - {t.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {templates.map((t) => {
                          const checked = abSelectedTemplates.includes(t.id);
                          return (
                            <div 
                              key={t.id} 
                              onClick={() => handleABToggleTemplate(t.id)}
                              className={`p-2 border rounded cursor-pointer ${checked ? "border-[#C5A059] bg-[#C5A059]/5" : "border-white/5"}`}
                            >
                              <span className="text-[11px] truncate block">[{t.language}] {t.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                <button type="submit" className="w-full bg-[#C5A059] py-2.5 rounded-xl text-xs font-bold text-[#0A0B0E] font-sans hover:scale-[1.01] transition">
                  {txt.btnSubmit}
                </button>
              </form>
            </div>
          )}

          {/* CRM Campaign runs list */}
          <div className="bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5 font-sans">{txt.campList}</h3>
            <div className="space-y-4">
              {campaigns.map((camp) => {
                const percentage = camp.totalSent > 0 ? Math.round((camp.totalSent / camp.maxContacts) * 100) : 0;
                return (
                  <div key={camp.id} className="bg-[#1C2128] p-4 border border-[#2D3139] rounded-xl relative space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs">
                      <div>
                        <h4 className="font-bold text-white">{camp.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {camp.governorate} • {camp.category} • Interval {camp.delaySeconds}s
                        </p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        camp.status === "running" ? "bg-blue-500/15 text-blue-400 border border-blue-500/10 animate-pulse" : "bg-white/5 text-slate-400"
                      }`}>{camp.status}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Onboarding: {camp.totalSent} / {camp.maxContacts}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#14171D] rounded-full overflow-hidden">
                        <div className="bg-[#C5A059] h-full" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#14171D] rounded border border-white/5 text-center text-[10px]">
                      <div>
                        <p className="text-slate-500">{txt.statSent}</p>
                        <p className="font-bold text-blue-400">{camp.totalSent}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{txt.statDelivered}</p>
                        <p className="font-bold text-emerald-400">{camp.delivered}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{txt.statRead}</p>
                        <p className="font-bold text-purple-400">{camp.read}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{txt.statReplied}</p>
                        <p className="font-bold text-[#C5A059]">{camp.replied}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{txt.statReg}</p>
                        <p className="font-bold text-teal-400">{camp.registered}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
