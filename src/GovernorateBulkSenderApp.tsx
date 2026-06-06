import React, { useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "./apiClient";

type QueueStatus = "ready" | "needs_review" | "sending" | "sent" | "failed" | "skipped";

type QueueRow = {
  id: string;
  name: string;
  phone: string;
  governorate: string;
  category: string;
  source: "manual" | "governorate-box" | "csv";
  status: QueueStatus;
  note: string;
  raw?: string;
  createdAt: string;
  sentAt?: string;
  failedAt?: string;
};

type ReportRow = Record<string, string>;

type CsvItem = {
  name: string;
  phone: string;
  governorate: string;
  category: string;
  source: "csv";
  raw: string;
};

const GOVERNORATES = [
  "Baghdad", "Basra", "Erbil", "Sulaymaniyah", "Duhok", "Nineveh", "Kirkuk", "Najaf", "Karbala",
  "Anbar", "Diyala", "Wasit", "Babylon", "Diwaniyah", "Maysan", "Dhi Qar", "Muthanna", "Salahaddin"
];

const GOV_ALIASES = new Map<string, string>([
  ["baghdad", "Baghdad"], ["بغداد", "Baghdad"],
  ["basra", "Basra"], ["البصرة", "Basra"], ["بصرة", "Basra"],
  ["erbil", "Erbil"], ["اربيل", "Erbil"], ["أربيل", "Erbil"], ["هەولێر", "Erbil"],
  ["sulaymaniyah", "Sulaymaniyah"], ["sulaimani", "Sulaymaniyah"], ["السليمانية", "Sulaymaniyah"], ["سليمانية", "Sulaymaniyah"],
  ["duhok", "Duhok"], ["دهوك", "Duhok"], ["دهۆك", "Duhok"],
  ["nineveh", "Nineveh"], ["mosul", "Nineveh"], ["نينوى", "Nineveh"], ["الموصل", "Nineveh"],
  ["kirkuk", "Kirkuk"], ["كركوك", "Kirkuk"],
  ["najaf", "Najaf"], ["النجف", "Najaf"],
  ["karbala", "Karbala"], ["كربلاء", "Karbala"],
  ["anbar", "Anbar"], ["الانبار", "Anbar"], ["الأنبار", "Anbar"],
  ["diyala", "Diyala"], ["ديالى", "Diyala"],
  ["wasit", "Wasit"], ["واسط", "Wasit"],
  ["babylon", "Babylon"], ["بابل", "Babylon"], ["الحلة", "Babylon"],
  ["diwaniyah", "Diwaniyah"], ["الديوانية", "Diwaniyah"], ["القادسية", "Diwaniyah"],
  ["maysan", "Maysan"], ["ميسان", "Maysan"],
  ["dhi qar", "Dhi Qar"], ["ذي قار", "Dhi Qar"], ["ذيقار", "Dhi Qar"],
  ["muthanna", "Muthanna"], ["المثنى", "Muthanna"],
  ["salahaddin", "Salahaddin"], ["salah aldin", "Salahaddin"], ["صلاح الدين", "Salahaddin"], ["tikrit", "Salahaddin"]
]);

function loadStored<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

function arabicDigitsToLatin(value: unknown) {
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
  };
  return String(value ?? "").replace(/[٠-٩۰-۹]/g, d => map[d] || d);
}

function normalizePhone(raw: unknown): { ok: boolean; phone: string; reason: string; review?: boolean } {
  let value = arabicDigitsToLatin(raw).replace(/[^\d+]/g, "");
  if (!value) return { ok: false, phone: "", reason: "empty phone" };
  value = value.replace(/^\+?00/, "+");
  if (value.startsWith("964")) value = "+" + value;
  if (value.startsWith("07")) value = "+964" + value.slice(1);
  if (value.startsWith("7") && value.length === 10) value = "+964" + value;
  if (!/^\+9647\d{9}$/.test(value)) return { ok: false, phone: value, reason: "not Iraqi mobile format" };
  const local = value.replace("+964", "");
  if (/(\d)\1{6,}/.test(local)) return { ok: true, phone: value, reason: "suspicious repeated digits", review: true };
  if ("0123456789".includes(local.slice(-7)) || "9876543210".includes(local.slice(-7))) {
    return { ok: true, phone: value, reason: "suspicious sequential digits", review: true };
  }
  return { ok: true, phone: value, reason: "valid" };
}

function parsePhones(text: string) {
  return text.split(/[\n,;|\t ]+/).map(x => x.trim()).filter(Boolean);
}

function normalizeHeader(header: string) {
  return String(header || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizeGovernorate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return GOV_ALIASES.get(raw.toLowerCase()) || GOV_ALIASES.get(raw) || raw;
}

function parseCSV(text: string) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.length > 1 || row[0]?.trim()) rows.push(row);
  if (!rows.length) return [] as Record<string, string>[];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.some(c => String(c).trim())).map((r, index) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h || `Column_${i + 1}`] = r[i] || "";
    });
    obj.__row = String(index + 2);
    return obj;
  });
}

function findColumn(row: Record<string, string>, keys: string[]) {
  const headers = Object.keys(row).filter(k => !k.startsWith("__"));
  const normalized = headers.map(raw => ({ raw, norm: normalizeHeader(raw) }));
  for (const key of keys) {
    const exact = normalized.find(h => h.norm === key);
    if (exact) return exact.raw;
  }
  for (const key of keys) {
    const hit = normalized.find(h => h.norm.includes(key) || key.includes(h.norm));
    if (hit) return hit.raw;
  }
  return "";
}

function extractCsvItem(row: Record<string, string>): CsvItem {
  const phoneCol = findColumn(row, ["phone", "phone number", "phone_number", "mobile", "whatsapp", "tel", "telephone", "contact", "phone e164", "phone_e164", "رقم", "هاتف", "موبايل", "واتساب", "تلفون"]);
  const nameCol = findColumn(row, ["name", "business name", "business_name", "title", "company", "store", "place", "اسم", "اسم النشاط", "اسم الشركة", "اسم المحل"]);
  const govCol = findColumn(row, ["governorate", "governorate en", "governorate_en", "city", "province", "المحافظة", "المدينة"]);
  const catCol = findColumn(row, ["category", "category en", "category_en", "type", "business type", "التصنيف", "النوع"]);
  return {
    name: nameCol ? row[nameCol] : "",
    phone: phoneCol ? row[phoneCol] : "",
    governorate: normalizeGovernorate(govCol ? row[govCol] : ""),
    category: catCol ? row[catCol] : "",
    source: "csv",
    raw: JSON.stringify(row)
  };
}

function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const quote = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `${cols.map(quote).join(",")}\n${rows.map(row => cols.map(col => quote(row[col])).join(",")).join("\n")}`;
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    alert("No rows to export.");
    return;
  }
  const blob = new Blob(["\uFEFF" + toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const statusClass: Record<QueueStatus, string> = {
  ready: "bg-cyan-700 text-white",
  needs_review: "bg-violet-700 text-white",
  sending: "bg-blue-700 text-white",
  sent: "bg-emerald-700 text-white",
  failed: "bg-red-700 text-white",
  skipped: "bg-amber-700 text-white"
};

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl border border-[#2D3139] bg-[#14171D] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <div className={`mt-1 text-3xl font-black ${color || "text-slate-100"}`}>{value.toLocaleString()}</div>
    </div>
  );
}

export default function GovernorateBulkSenderApp() {
  const [message, setMessage] = useState("اهلاً، نخلي نشاطك ظاهر للناس بمحافظتك على منصة شاكو ماكو. التسجيل مجاني لفترة محدودة. للانضمام اضغط الرابط: https://shakumaku.pages.dev/");
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem("bulk_sender_endpoint_v3") || `${API_BASE_URL}/api/send`);
  const [campaignName, setCampaignName] = useState("Shaku Maku Outreach");
  const [delaySeconds, setDelaySeconds] = useState(12);
  const [manualText, setManualText] = useState("");
  const [manualInfo, setManualInfo] = useState("");
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [previewInfo, setPreviewInfo] = useState("");
  const [queue, setQueue] = useState<QueueRow[]>(() => loadStored("bulk_sender_queue_v3", []));
  const [duplicates, setDuplicates] = useState<ReportRow[]>(() => loadStored("bulk_sender_duplicates_v3", []));
  const [invalidRows, setInvalidRows] = useState<ReportRow[]>(() => loadStored("bulk_sender_invalid_v3", []));
  const [govTexts, setGovTexts] = useState<Record<string, string>>({});
  const [govCats, setGovCats] = useState<Record<string, string>>({});
  const [selectedGovs, setSelectedGovs] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [sendScope, setSendScope] = useState("all");
  const [includeReview, setIncludeReview] = useState(false);
  const [search, setSearch] = useState("");
  const [sendInfo, setSendInfo] = useState("Idle.");
  const sendingRef = useRef(false);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);

  const csvItems = useMemo(() => csvRows.map(extractCsvItem), [csvRows]);
  const csvGovs = useMemo(() => Array.from(new Set(csvItems.map(x => x.governorate).filter(Boolean))).sort(), [csvItems]);
  const csvCats = useMemo(() => Array.from(new Set(csvItems.map(x => x.category).filter(Boolean))).sort(), [csvItems]);
  const scopeGovs = useMemo(() => Array.from(new Set(queue.map(x => x.governorate).filter(Boolean))).sort(), [queue]);

  function persist(nextQueue = queue, nextDupes = duplicates, nextInvalid = invalidRows) {
    localStorage.setItem("bulk_sender_queue_v3", JSON.stringify(nextQueue));
    localStorage.setItem("bulk_sender_duplicates_v3", JSON.stringify(nextDupes));
    localStorage.setItem("bulk_sender_invalid_v3", JSON.stringify(nextInvalid));
    localStorage.setItem("bulk_sender_endpoint_v3", endpoint);
  }

  function addToQueue(items: Array<{ name?: string; phone: string; governorate?: string; category?: string; source: QueueRow["source"]; raw?: string }>) {
    let added = 0;
    let dup = 0;
    let bad = 0;
    let review = 0;
    const existing = new Set(queue.map(x => x.phone));
    const nextQueue = [...queue];
    const nextDupes = [...duplicates];
    const nextInvalid = [...invalidRows];

    for (const item of items) {
      const parsed = normalizePhone(item.phone);
      if (!parsed.ok) {
        nextInvalid.push({ ...item, normalized_phone: parsed.phone, reason: parsed.reason } as ReportRow);
        bad += 1;
        continue;
      }
      if (existing.has(parsed.phone)) {
        nextDupes.push({ ...item, normalized_phone: parsed.phone, reason: "duplicate phone" } as ReportRow);
        dup += 1;
        continue;
      }
      existing.add(parsed.phone);
      nextQueue.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: String(item.name || "").trim(),
        phone: parsed.phone,
        governorate: item.governorate || "",
        category: item.category || "",
        source: item.source,
        status: parsed.review ? "needs_review" : "ready",
        note: parsed.reason,
        raw: item.raw || "",
        createdAt: new Date().toISOString()
      });
      if (parsed.review) review += 1;
      added += 1;
    }

    setQueue(nextQueue);
    setDuplicates(nextDupes);
    setInvalidRows(nextInvalid);
    persist(nextQueue, nextDupes, nextInvalid);
    return { added, dup, bad, review };
  }

  function addManual() {
    const phones = parsePhones(manualText);
    const result = addToQueue(phones.map(phone => ({ phone, source: "manual" as const })));
    setManualInfo(`Added: ${result.added}, duplicates: ${result.dup}, invalid: ${result.bad}, needs review: ${result.review}`);
  }

  function previewGovernorate(governorate: string) {
    const phones = parsePhones(govTexts[governorate] || "");
    let valid = 0;
    let invalid = 0;
    let review = 0;
    for (const phone of phones) {
      const parsed = normalizePhone(phone);
      if (!parsed.ok) invalid += 1;
      else {
        valid += 1;
        if (parsed.review) review += 1;
      }
    }
    alert(`${governorate}\nValid: ${valid}\nInvalid: ${invalid}\nNeeds review: ${review}`);
  }

  function addGovernorate(governorate: string) {
    const phones = parsePhones(govTexts[governorate] || "");
    const category = govCats[governorate] || "";
    const result = addToQueue(phones.map(phone => ({ phone, governorate, category, source: "governorate-box" as const })));
    setManualInfo(`${governorate}: added ${result.added}, duplicates ${result.dup}, invalid ${result.bad}, needs review ${result.review}`);
  }

  async function loadCsv(files: FileList | null) {
    if (!files?.length) {
      alert("Choose one or more CSV files first.");
      return;
    }
    const loaded: Record<string, string>[] = [];
    for (const file of Array.from(files)) {
      const rows = parseCSV(await file.text());
      rows.forEach(row => { row.__file = file.name; });
      loaded.push(...rows);
    }
    setCsvRows(loaded);
    const items = loaded.map(extractCsvItem);
    setSelectedGovs(Array.from(new Set(items.map(x => x.governorate).filter(Boolean))));
    setSelectedCats(Array.from(new Set(items.map(x => x.category).filter(Boolean))));
    setPreviewInfo(`Loaded ${loaded.length.toLocaleString()} CSV rows.`);
  }

  function selectedCsvItems() {
    return csvItems.filter(item => {
      const govOk = selectedGovs.length === 0 || !item.governorate || selectedGovs.includes(item.governorate);
      const catOk = selectedCats.length === 0 || !item.category || selectedCats.includes(item.category);
      return govOk && catOk;
    });
  }

  function previewCsvSelected() {
    const items = selectedCsvItems();
    let valid = 0;
    let invalid = 0;
    let dup = 0;
    let review = 0;
    const seen = new Set(queue.map(x => x.phone));
    for (const item of items) {
      const parsed = normalizePhone(item.phone);
      if (!parsed.ok) invalid += 1;
      else if (seen.has(parsed.phone)) dup += 1;
      else {
        seen.add(parsed.phone);
        valid += 1;
        if (parsed.review) review += 1;
      }
    }
    setPreviewInfo(`Selected: ${items.length.toLocaleString()}, valid new: ${valid.toLocaleString()}, invalid: ${invalid.toLocaleString()}, duplicates/already queued: ${dup.toLocaleString()}, needs review: ${review.toLocaleString()}`);
  }

  function addCsvSelected() {
    const result = addToQueue(selectedCsvItems());
    setPreviewInfo(`Added: ${result.added}, duplicates: ${result.dup}, invalid: ${result.bad}, needs review: ${result.review}`);
  }

  function rowsToSend(rows = queue) {
    return rows.filter(row =>
      (row.status === "ready" || (includeReview && row.status === "needs_review")) &&
      (sendScope === "all" || row.governorate === sendScope)
    );
  }

  async function startSending(scopeOverride?: string) {
    if (sendingRef.current) return;
    if (!message.trim()) {
      alert("Write the message first.");
      return;
    }
    const scope = scopeOverride || sendScope;
    const pending = queue.filter(row =>
      (row.status === "ready" || (includeReview && row.status === "needs_review")) &&
      (scope === "all" || row.governorate === scope)
    );
    if (!pending.length) {
      alert("No ready rows for the selected scope.");
      return;
    }
    sendingRef.current = true;
    pausedRef.current = false;
    stoppedRef.current = false;
    await sendLoop(scope);
  }

  async function sendLoop(scope: string) {
    let workingQueue = [...queue];
    const delay = Math.max(5, Number(delaySeconds || 12));

    while (!stoppedRef.current) {
      while (pausedRef.current && !stoppedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      if (stoppedRef.current) break;

      const target = workingQueue.find(row =>
        (row.status === "ready" || (includeReview && row.status === "needs_review")) &&
        (scope === "all" || row.governorate === scope)
      );
      if (!target) break;

      workingQueue = workingQueue.map(row => row.id === target.id ? { ...row, status: "sending", note: "sending now" } : row);
      setQueue(workingQueue);
      setSendInfo(`Sending to ${target.phone} ${target.governorate ? `(${target.governorate})` : ""}...`);

      try {
        const response = await fetch(endpoint.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: target.phone, message, businessName: target.name, campaignName })
        });
        const responseText = await response.text();
        let payload: any = null;
        try { payload = responseText ? JSON.parse(responseText) : {}; } catch { payload = { raw: responseText }; }
        if (!response.ok) throw new Error(payload?.error || payload?.message || responseText || `HTTP ${response.status}`);
        workingQueue = workingQueue.map(row => row.id === target.id ? { ...row, status: "sent", note: "sent", sentAt: new Date().toISOString() } : row);
      } catch (error: any) {
        workingQueue = workingQueue.map(row => row.id === target.id ? { ...row, status: "failed", note: String(error?.message || error).slice(0, 300), failedAt: new Date().toISOString() } : row);
      }

      setQueue(workingQueue);
      persist(workingQueue);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    sendingRef.current = false;
    setSendInfo(stoppedRef.current ? "Stopped." : "Sending finished for selected scope.");
  }

  function pauseSending() {
    pausedRef.current = true;
    setSendInfo("Paused after current message.");
  }

  function resumeSending() {
    pausedRef.current = false;
    if (!sendingRef.current) void startSending();
  }

  function stopSending() {
    stoppedRef.current = true;
    pausedRef.current = false;
    sendingRef.current = false;
    setSendInfo("Stopped.");
  }

  function markReviewReady() {
    const next = queue.map(row => row.status === "needs_review" ? { ...row, status: "ready" as QueueStatus, note: "manually approved" } : row);
    setQueue(next);
    persist(next);
  }

  function skipReviewRows() {
    const next = queue.map(row => row.status === "needs_review" ? { ...row, status: "skipped" as QueueStatus, note: "skipped needs-review row" } : row);
    setQueue(next);
    persist(next);
  }

  function clearAll() {
    if (!confirm("Clear queue, duplicate report, and invalid report from this browser?")) return;
    setQueue([]);
    setDuplicates([]);
    setInvalidRows([]);
    persist([], [], []);
  }

  const filteredQueue = queue.filter(row => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [row.name, row.phone, row.governorate, row.category, row.source, row.status, row.note].some(value => String(value || "").toLowerCase().includes(q));
  });

  return (
    <main className="min-h-screen bg-[#0A0B0E] text-slate-100 p-4 md:p-8">
      <section className="max-w-7xl mx-auto space-y-5">
        <header className="rounded-3xl border border-[#2D3139] bg-[#14171D] p-5 md:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-bold">Shaku Maku / Nabda</p>
              <h1 className="text-2xl md:text-4xl font-black text-[#C5A059] mt-2">Governorate Bulk Sender</h1>
              <p className="text-slate-400 mt-2 max-w-3xl">Paste numbers manually, upload CSV files, or keep independent phone boxes per governorate. The queue dedupes by normalized Iraqi phone number before sending.</p>
            </div>
            <div className="rounded-2xl border border-sky-700/50 bg-sky-950/40 p-4 text-sm text-sky-100 max-w-md">
              Send only to businesses you have a legitimate reason to contact. Include opt-out text when appropriate.
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total queue" value={queue.length} />
          <StatCard label="Ready" value={queue.filter(x => x.status === "ready").length} color="text-cyan-300" />
          <StatCard label="Sent" value={queue.filter(x => x.status === "sent").length} color="text-emerald-300" />
          <StatCard label="Failed" value={queue.filter(x => x.status === "failed").length} color="text-red-300" />
          <StatCard label="Duplicates / invalid" value={duplicates.length + invalidRows.length} color="text-amber-300" />
        </div>

        <section className="sticky top-0 z-20 rounded-2xl border border-[#2D3139] bg-[#0A0B0E]/90 backdrop-blur p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => void startSending()} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold hover:bg-emerald-600">Start Sending</button>
            <button onClick={pauseSending} className="rounded-xl bg-amber-700 px-4 py-2 font-bold hover:bg-amber-600">Pause</button>
            <button onClick={resumeSending} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold hover:bg-emerald-600">Resume</button>
            <button onClick={stopSending} className="rounded-xl bg-red-700 px-4 py-2 font-bold hover:bg-red-600">Stop</button>
            <button onClick={clearAll} className="rounded-xl bg-slate-700 px-4 py-2 font-bold hover:bg-slate-600">Clear Queue</button>
            <select value={sendScope} onChange={e => setSendScope(e.target.value)} className="rounded-xl bg-[#020617] border border-[#334155] px-3 py-2">
              <option value="all">Send scope: all ready rows</option>
              {scopeGovs.map(gov => <option key={gov} value={gov}>Send only: {gov}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#020617] px-3 py-2 text-sm text-slate-300">
              <input type="checkbox" checked={includeReview} onChange={e => setIncludeReview(e.target.checked)} /> Include needs-review
            </label>
          </div>
          <p className="text-sm text-slate-400 mt-2">{sendInfo}</p>
        </section>

        <section className="rounded-2xl border border-[#2D3139] bg-[#14171D] p-5 space-y-4">
          <h2 className="text-xl font-black">1. Message + backend endpoint</h2>
          <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full min-h-28 rounded-xl border border-[#334155] bg-[#020617] p-3 text-slate-100" />
          <div className="grid lg:grid-cols-3 gap-3">
            <label className="text-sm text-slate-400">API endpoint<input value={endpoint} onChange={e => { setEndpoint(e.target.value); localStorage.setItem("bulk_sender_endpoint_v3", e.target.value); }} className="mt-1 w-full rounded-xl border border-[#334155] bg-[#020617] p-3 text-slate-100" /></label>
            <label className="text-sm text-slate-400">Campaign name<input value={campaignName} onChange={e => setCampaignName(e.target.value)} className="mt-1 w-full rounded-xl border border-[#334155] bg-[#020617] p-3 text-slate-100" /></label>
            <label className="text-sm text-slate-400">Delay seconds<input type="number" min={5} value={delaySeconds} onChange={e => setDelaySeconds(Number(e.target.value || 12))} className="mt-1 w-full rounded-xl border border-[#334155] bg-[#020617] p-3 text-slate-100" /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#2D3139] bg-[#14171D] p-5 space-y-4">
          <h2 className="text-xl font-black">2. CSV upload + filters</h2>
          <input type="file" multiple accept=".csv,text/csv" onChange={e => void loadCsv(e.target.files)} className="w-full rounded-xl border border-dashed border-[#334155] bg-[#020617] p-3 text-slate-100" />
          <div className="flex flex-wrap gap-2">
            <button onClick={previewCsvSelected} className="rounded-xl bg-blue-700 px-4 py-2 font-bold">Preview Selected</button>
            <button onClick={addCsvSelected} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold">Add Selected To Queue</button>
            <button onClick={() => { setCsvRows([]); setPreviewInfo(""); }} className="rounded-xl bg-slate-700 px-4 py-2 font-bold">Clear CSV Data</button>
          </div>
          <p className="text-sm text-slate-400">{previewInfo}</p>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold mb-2">Governorates from CSV</h3>
              <div className="max-h-44 overflow-auto rounded-xl border border-[#334155] bg-[#020617] p-3 flex flex-wrap gap-2">
                {csvGovs.length ? csvGovs.map(gov => <label key={gov} className="rounded-full bg-slate-800 px-3 py-1 text-sm"><input type="checkbox" checked={selectedGovs.includes(gov)} onChange={e => setSelectedGovs(e.target.checked ? [...selectedGovs, gov] : selectedGovs.filter(x => x !== gov))} /> {gov}</label>) : <span className="text-sm text-slate-500">No governorate column detected yet.</span>}
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2">Categories from CSV</h3>
              <div className="max-h-44 overflow-auto rounded-xl border border-[#334155] bg-[#020617] p-3 flex flex-wrap gap-2">
                {csvCats.length ? csvCats.map(cat => <label key={cat} className="rounded-full bg-slate-800 px-3 py-1 text-sm"><input type="checkbox" checked={selectedCats.includes(cat)} onChange={e => setSelectedCats(e.target.checked ? [...selectedCats, cat] : selectedCats.filter(x => x !== cat))} /> {cat}</label>) : <span className="text-sm text-slate-500">No category column detected yet.</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#2D3139] bg-[#14171D] p-5 space-y-3">
          <h2 className="text-xl font-black">3. Manual phone numbers</h2>
          <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Paste phone numbers here, one per line or separated by commas" className="w-full min-h-28 rounded-xl border border-[#334155] bg-[#020617] p-3 text-slate-100" />
          <div className="flex flex-wrap gap-2"><button onClick={addManual} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold">Add Manual Numbers</button><button onClick={() => setManualText("")} className="rounded-xl bg-slate-700 px-4 py-2 font-bold">Clear</button></div>
          <p className="text-sm text-slate-400">{manualInfo}</p>
        </section>

        <section className="rounded-2xl border border-[#2D3139] bg-[#14171D] p-5">
          <h2 className="text-xl font-black">4. Independent governorate phone boxes</h2>
          <p className="text-sm text-slate-400 mb-4">Each governorate is separate. You can add it to the queue independently or send only that governorate.</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {GOVERNORATES.map(gov => {
              const count = parsePhones(govTexts[gov] || "").length;
              return (
                <div key={gov} className="rounded-2xl border border-[#2D3139] bg-[#0B1220] p-4 space-y-3">
                  <div className="flex items-center justify-between"><h3 className="font-black">{gov}</h3><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{count} numbers</span></div>
                  <textarea value={govTexts[gov] || ""} onChange={e => setGovTexts({ ...govTexts, [gov]: e.target.value })} placeholder={`Paste ${gov} numbers here`} className="w-full min-h-24 rounded-xl border border-[#334155] bg-[#020617] p-3 text-slate-100" />
                  <input value={govCats[gov] || ""} onChange={e => setGovCats({ ...govCats, [gov]: e.target.value })} placeholder="Optional category" className="w-full rounded-xl border border-[#334155] bg-[#020617] p-3 text-slate-100" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button onClick={() => previewGovernorate(gov)} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold">Preview</button>
                    <button onClick={() => addGovernorate(gov)} className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold">Add</button>
                    <button onClick={() => { setSendScope(gov); void startSending(gov); }} className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-bold">Send only</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#2D3139] bg-[#14171D] p-5 space-y-4">
          <h2 className="text-xl font-black">5. Export reports</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => downloadCSV("final-queue.csv", queue)} className="rounded-xl bg-blue-700 px-4 py-2 font-bold">Export Final Queue</button>
            <button onClick={() => downloadCSV("sent.csv", queue.filter(x => x.status === "sent"))} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold">Export Sent</button>
            <button onClick={() => downloadCSV("failed.csv", queue.filter(x => x.status === "failed"))} className="rounded-xl bg-red-700 px-4 py-2 font-bold">Export Failed</button>
            <button onClick={() => downloadCSV("invalid.csv", invalidRows)} className="rounded-xl bg-amber-700 px-4 py-2 font-bold">Export Invalid</button>
            <button onClick={() => downloadCSV("duplicates.csv", duplicates)} className="rounded-xl bg-slate-700 px-4 py-2 font-bold">Export Duplicates</button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#2D3139] bg-[#14171D] p-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <h2 className="text-xl font-black">6. Queue preview</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={markReviewReady} className="rounded-xl bg-violet-700 px-4 py-2 font-bold">Mark needs-review ready</button>
              <button onClick={skipReviewRows} className="rounded-xl bg-amber-700 px-4 py-2 font-bold">Skip needs-review</button>
            </div>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search queue by name, phone, governorate, category..." className="w-full rounded-xl border border-[#334155] bg-[#020617] p-3 text-slate-100" />
          <div className="max-h-[520px] overflow-auto rounded-xl border border-[#2D3139] bg-[#020617]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#172033] text-slate-200"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Governorate</th><th className="p-2 text-left">Category</th><th className="p-2 text-left">Source</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Note</th></tr></thead>
              <tbody>
                {filteredQueue.slice(0, 1500).map(row => (
                  <tr key={row.id} className="border-t border-[#1F2937]">
                    <td className="p-2 max-w-xs truncate" title={row.name}>{row.name}</td>
                    <td className="p-2 whitespace-nowrap">{row.phone}</td>
                    <td className="p-2 whitespace-nowrap">{row.governorate}</td>
                    <td className="p-2 whitespace-nowrap">{row.category}</td>
                    <td className="p-2 whitespace-nowrap">{row.source}</td>
                    <td className="p-2 whitespace-nowrap"><span className={`rounded-full px-2 py-1 text-xs font-black ${statusClass[row.status]}`}>{row.status}</span></td>
                    <td className="p-2 max-w-xs truncate" title={row.note}>{row.note}</td>
                  </tr>
                ))}
                {!filteredQueue.length && <tr><td className="p-5 text-slate-500" colSpan={7}>No queue rows yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
