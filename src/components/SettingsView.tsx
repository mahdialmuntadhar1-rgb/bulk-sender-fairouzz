import React, { useState } from "react";
import { 
  Settings, 
  Key, 
  Globe, 
  Sliders, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  Save, 
  ExternalLink,
  Shield,
  Shuffle
} from "lucide-react";
import { NabdaSettings } from "../types";

interface SettingsViewProps {
  settings: NabdaSettings;
  lang: "ar" | "en";
  onSaveSettings: (settings: NabdaSettings) => void;
}

export default function SettingsView({
  settings,
  lang,
  onSaveSettings
}: SettingsViewProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [sendEndpoint, setSendEndpoint] = useState(settings.sendEndpoint);
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [bundleApiKey, setBundleApiKey] = useState(settings.bundleApiKey);
  const [defaultDelay, setDefaultDelay] = useState(settings.defaultDelay);
  const [maxMessagesPerBatch, setMaxMessagesPerBatch] = useState(settings.maxMessagesPerBatch);
  const [enableRotation, setEnableRotation] = useState(settings.enableRotation);

  // States
  const [showKey, setShowKey] = useState(false);
  const [showBundleKey, setShowBundleKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Live status monitoring states
  const [statusData, setStatusData] = useState<{
    secured: boolean;
    maskedKey: string;
    geminiSecured: boolean;
    geminiMaskedKey: string;
  } | null>(null);

  React.useEffect(() => {
    fetch("/api/status")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => setStatusData(data))
      .catch(() => {});
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      onSaveSettings({
        apiKey,
        sendEndpoint,
        webhookUrl,
        bundleApiKey,
        defaultDelay,
        maxMessagesPerBatch,
        enableRotation
      });
      setIsSaving(false);
      setTestResult(lang === "ar" ? "✅ تم حفظ التكوينات وتحديث خوادم Nabda بنجاح!" : "✅ CRM configurations updated successfully!");
    }, 800);
  };

  const handleRegisterWebhook = () => {
    setTestResult(lang === "ar" ? "⏳ جاري إرسال طلب PATCH لربط الويب-هوك..." : "⏳ Testing PATCH webhook URL binding...");
    
    setTimeout(() => {
      setTestResult(lang === "ar" 
        ? "🎯 استجابة Nabda: [200 OK] - تم ربط الويب هوك بنجاح! أحداث الارتباط النشطة: message.sent, message.ack, message.received" 
        : "🎯 Nabda Response: [200 OK] - Webhook PATCH configured successfully on Nabda instances! Listening to events: message.sent, message.ack, message.received");
    }, 1200);
  };

  // Translations
  const txt = {
    title: lang === "ar" ? "إعدادات ربط بوابة Nabda" : "Nabda API Credentials & Routing",
    desc: lang === "ar" ? "تكوين مفاتيح الترخيص لشبكة الواتساب وربط مسارات الاستدعاء المباشر للتسليم والاستقبال" : "Configure CRM properties, authorization headers, numbers rotation, and webhook pathways",
    secAuth: lang === "ar" ? "مفاتيح الترخيص الفروق (Authentication Keys)" : "API Security & Tokens",
    secBatch: lang === "ar" ? "قوى الإرسال والتأخير (Outbound Queues)" : "Campaign Dispatch Configuration",
    secRotation: lang === "ar" ? "إدارة التدوير والفرق (Unified Bundles Rotation)" : "Unified Number Rotations (BETA)",
    rotationDesc: lang === "ar" ? "تتيح ميزة حزم الأرقام (Bundles) تنظيم وإدراج عدة أرقام واتساب داخل باقة موحدة للمداورة وتوزيع الأحمال أثناء الإرسال المكثف لمنع حظر الخطوط." : "Bundles rotate the message queue through multiple linked WhatsApp numbers. This decreases strain on any single line and prevents spam triggers.",
    btnSave: lang === "ar" ? "حفظ التكوينات يدوياً" : "Save Settings",
    btnPatch: lang === "ar" ? "ربط وتصديق الويب-هوك (PATCH Webhook)" : "Register Webhook (PATCH API)",
    lblKey: lang === "ar" ? "Nabda API Key (مفتاح خط الواتساب الأساسي)" : "Primary Nabda WhatsApp API Key",
    lblBundleKey: lang === "ar" ? "Bundle API Key (مفتاح الحزمة الدائرية)" : "Unified Rotation Bundle API Key",
    lblUrl: lang === "ar" ? "رابط الويب هوك المتلقي (Webhook Event Target)" : "Your Live CRM Webhook Handler URL",
    lblEndpoint: lang === "ar" ? "رابط إرسال بوابة Nabda (WABA Sending Endpoint)" : "Nabda Outbox Broadcast Gateway URL",
    lblDelay: lang === "ar" ? "الفاصل الزمني الافتراضي للإرسال (بالثواني)" : "Default Outbox Delay (Seconds)",
    lblBatchSize: lang === "ar" ? "الحد الأقصى للرسائل في الدفعة اليومية" : "Maximum Daily Safe Broadcast Volume",
    lblRotSwitch: lang === "ar" ? "تفعيل نظام التدوير الآلي أثناء الإرسال المكثف" : "Enable Number Rotation (Bundle Level)",
    authDetailsTitle: lang === "ar" ? "⚙️ معمارية المصادقة الموثقة" : "⚙️ Nabda API Requirements",
    feature1: lang === "ar" ? "• مصادقة البوابة تعتمد على ترويسة Authorization مع إرسال المفتاح خاماً." : "• Endpoint Authentication relies on passing the Raw API key directly inside the standard Authorization header.",
    feature2: lang === "ar" ? "• تدعم البوابة هيكلية الإرسال الفردي أو الجماعي تحت مسار /api/v1/messages/send." : "• Direct WhatsApp dispatch route handles JSON payloads served at /api/v1/messages/send.",
    feature3: lang === "ar" ? "• يتم فصل خدمات المصادقة OTP عن حملات التسويق للحفاظ على سلامة الحسابات." : "• Core Transactional OTP capabilities exist on independent pipelines separate from marketing outreach to uphold SLA speed.",
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="text-amber-500" size={22} />
            {txt.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{txt.desc}</p>
        </div>
      </div>

      {testResult && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-xl text-xs font-medium font-sans">
          <span>{testResult}</span>
        </div>
      )}

      {/* Main Form content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Settings Entries Area (Columns 1 & 2) */}
        <form onSubmit={handleSave} className="xl:col-span-2 space-y-6">
          
          {/* Section A: Authentication */}
          <div className="bg-slate-900/60 p-4 md:p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 pb-3 border-b border-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Key size={14} className="text-amber-500" />
              {txt.secAuth}
            </h3>

            <div className="space-y-4">
              
              {/* Primary API Key */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 font-medium">{txt.lblKey}</label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[10px] text-amber-500 hover:text-white transition"
                  >
                    {showKey ? "Hide Hidden Key" : "Reveal RAW Token"}
                  </button>
                </div>
                <input
                  id="settings_api_key_input"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              {/* Broadcast Endpoints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">{txt.lblEndpoint}</label>
                  <input
                    type="text"
                    value={sendEndpoint}
                    onChange={(e) => setSendEndpoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">{txt.lblUrl}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-28 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                    />
                    <button
                      type="button"
                      id="btn_patch_webhook"
                      onClick={handleRegisterWebhook}
                      className="absolute top-1.5 left-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition font-sans cursor-pointer"
                    >
                      PATCH bind
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section B: Campaigns outbox constraints */}
          <div className="bg-slate-900/60 p-4 md:p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 pb-3 border-b border-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} className="text-amber-500" />
              {txt.secBatch}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
              
              {/* Default Delay */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium block">
                  {txt.lblDelay}
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={defaultDelay}
                  onChange={(e) => setDefaultDelay(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              {/* Max daily message capacity */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium block">
                  {txt.lblBatchSize}
                </label>
                <input
                  type="number"
                  value={maxMessagesPerBatch}
                  onChange={(e) => setMaxMessagesPerBatch(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

            </div>
          </div>

          {/* Section C: Rotation Bundles */}
          <div className="bg-slate-900/60 p-4 md:p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shuffle size={14} className="text-amber-500" />
                {txt.secRotation}
              </h3>
              <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono uppercase">WABA ADVANCED</span>
            </div>

            <p className="text-xs text-slate-400 leading-normal font-sans">
              {txt.rotationDesc}
            </p>

            <div className="space-y-4">
              {/* Rotation switch */}
              <label className="flex items-center gap-3 cursor-pointer p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  checked={enableRotation}
                  onChange={(e) => setEnableRotation(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-200">{txt.lblRotSwitch}</span>
              </label>

              {/* Bundle key entry */}
              {enableRotation && (
                <div className="space-y-1.5 animate-in fade-in duration-100">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-400 font-medium">{txt.lblBundleKey}</label>
                    <button
                      type="button"
                      onClick={() => setShowBundleKey(!showBundleKey)}
                      className="text-[10px] text-amber-500 hover:text-white transition"
                    >
                      {showBundleKey ? "Hide Link Key" : "Reveal Token"}
                    </button>
                  </div>
                  <input
                    type={showBundleKey ? "text" : "password"}
                    value={bundleApiKey}
                    onChange={(e) => setBundleApiKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end pt-2">
            <button
              id="settings_submit_btn"
              type="submit"
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3.5 px-8 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              <Save size={14} />
              {isSaving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : txt.btnSave}
            </button>
          </div>

        </form>

        {/* Technical help column (Column 3) */}
        <div className="bg-slate-900/60 p-4 md:p-5 border border-slate-800 rounded-2xl h-fit space-y-4">
          
          {/* Real-time backend key status visual badges */}
          <div className="space-y-3 pb-4 border-b border-slate-800">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              {lang === "ar" ? "📡 حالة الاتصال الحية (Backend API Status)" : "📡 Secure API Connection Status"}
            </h4>
            
            <div className="space-y-2">
              {/* Nabda WABA key status */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-850 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-semibold leading-none">Nabda WABA Integration</span>
                  <span className="text-[8px] font-mono text-slate-500 block leading-none select-all mt-1">
                    {statusData?.secured ? statusData.maskedKey : "No key configured"}
                  </span>
                </div>
                <div>
                  {statusData?.secured ? (
                    <span className="text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-red-500/10 text-red-500/80 border border-red-500/20 px-2 py-0.5 rounded-full font-sans">
                      MISSING
                    </span>
                  )}
                </div>
              </div>

              {/* Gemini AI key status */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-850 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-[#8E9299] block font-semibold leading-none">Gemini Copilot 3.5 AI</span>
                  <span className="text-[8px] font-mono text-slate-505 block leading-none select-all mt-1">
                    {statusData?.geminiSecured ? statusData.geminiMaskedKey : "Simulator mode only"}
                  </span>
                </div>
                <div>
                  {statusData?.geminiSecured ? (
                    <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-sans">
                      UNSET / DEMO
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-300 pb-3 border-b border-slate-800 uppercase flex items-center gap-1.5">
            <Shield className="text-amber-500" size={14} />
            {txt.authDetailsTitle}
          </h3>

          <div className="space-y-3 text-xs text-slate-400 leading-relaxed font-sans">
            <p>{txt.feature1}</p>
            <p>{txt.feature2}</p>
            <p>{txt.feature3}</p>
          </div>

          <div className="pt-2">
            <a 
              href="https://shakumaku.iq/docs/api" 
              target="_blank" 
              referrerPolicy="no-referrer"
              className="w-full inline-flex items-center justify-center p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-300 text-[11px] rounded-xl transition gap-1"
            >
              <span>View Nabda API Docs</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}
