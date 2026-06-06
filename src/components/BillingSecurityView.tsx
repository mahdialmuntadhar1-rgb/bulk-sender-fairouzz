import React, { useState } from "react";
import { 
  CreditCard, 
  ShieldCheck, 
  Cpu, 
  Key, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle, 
  Compass, 
  Smartphone,
  Lock,
  LockOpen,
  Eye,
  Percent,
  Coins
} from "lucide-react";

interface BillingSecurityViewProps {
  lang: "ar" | "en";
}

export default function BillingSecurityView({ lang }: BillingSecurityViewProps) {
  // Billing Usage stats (Mock Data only)
  const statsToday = 1420;
  const statsMonth = 34910;
  const quotaLimit = 100000;
  const percentUsed = Math.round((statsMonth / quotaLimit) * 100);
  const remainingCapacity = quotaLimit - statsMonth;

  // Security Center credentials state
  const [apiKey, setApiKey] = useState("nbd_live_7a3d2eef98c94e0193bbcc102431ff9d03");
  const [bundleKey, setBundleKey] = useState("nbd_bndl_9921eef00a2948ce761");
  const [rotationDate, setRotationDate] = useState("2026-05-15 11:24:00 (UTC)");
  const [revealKeys, setRevealKeys] = useState(false);

  // OTP simulation variables
  const [otpPhoneSim, setOtpPhoneSim] = useState("+9647701234567");
  const [otpGeneratedCode, setOtpGeneratedCode] = useState("");
  const [otpEnteredCode, setOtpEnteredCode] = useState("");
  const [otpStatus, setOtpStatus] = useState<"Idle" | "Sent" | "Verified" | "Failed">("Idle");

  const [toast, setToast] = useState("");

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleRotateKey = () => {
    const nextKey = "nbd_live_rot_" + Math.random().toString(36).substring(2, 18);
    setApiKey(nextKey);
    setRotationDate(new Date().toUTCString().replace("GMT", "UTC"));
    flashToast("Primary Nabda API Key rotated successfully! Distributed to active campaigns.");
  };

  const handleRotateBundleKey = () => {
    const nextBundleKey = "nbd_bndl_rot_" + Math.random().toString(36).substring(2, 18);
    setBundleKey(nextBundleKey);
    setRotationDate(new Date().toUTCString().replace("GMT", "UTC"));
    flashToast("Bundle License License Key rotated successfully!");
  };

  const handleTriggerOTPSim = () => {
    if (!otpPhoneSim) return;
    const randomCode = Math.floor(1000 + Math.random() * 900).toString();
    setOtpGeneratedCode(randomCode);
    setOtpStatus("Sent");
    flashToast(`OTP verification dispatch triggered successfully via Nabda API!`);
  };

  const handleVerifyOTPSim = () => {
    if (otpEnteredCode === otpGeneratedCode) {
      setOtpStatus("Verified");
      flashToast("OTP verified successfully on Nabda server nodes! Merchant authenticated.");
    } else {
      setOtpStatus("Failed");
      flashToast("OTP validation mismatch error.");
    }
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-5 left-5 bg-[#C5A059] text-slate-950 px-5 py-3 rounded-xl font-bold shadow-2xl text-xs z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 border border-white/10 font-sans">
          🎉 {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-[#C5A059]" size={22} />
            {lang === "ar" ? "أدوات الإدارة، الفوترة والحماية" : "WABA Billing Rates, Security & OTP Engines"}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">
            {lang === "ar" 
              ? "تفقد رسوم الاستهلاك، والتحكم بمفاتيح تشفير الحماية، والاطلاع المبرمج على خطة معايير التحقق الثنائي (OTP)." 
              : "Monitor quota metrics, rotate access keys, and run interactive simulations showing OTP signup verification."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Module 1: Billing & Usage */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider pb-3 border-b border-white/5 flex items-center gap-1.5 font-sans">
            <CreditCard size={14} className="text-[#C5A059]" />
            {lang === "ar" ? "إحصائيات وقدرات الفوترة والـ Quota" : "Nabda API Billing Quotas & Monthly Usage"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#191D24] p-4 rounded-xl border border-[#2D3139]">
              <span className="text-[10px] text-slate-500 block">Messages Sent Today</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">{statsToday}</span>
              <span className="text-[9px] text-slate-500 mt-1 block">Refreshes every 24h</span>
            </div>
            
            <div className="bg-[#191D24] p-4 rounded-xl border border-[#2D3139]">
              <span className="text-[10px] text-slate-500 block">Simulated Spend (Month)</span>
              <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">$24.50</span>
              <span className="text-[9px] text-slate-500 mt-1 block">Free promotional credits applied</span>
            </div>
          </div>

          {/* Progress bar of current quota */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#8E9299] font-sans">Quota Limit Utilization</span>
              <span className="font-mono text-white text-xs">{percentUsed}% ({statsMonth} / {quotaLimit.toLocaleString()} messages used)</span>
            </div>
            
            <div className="w-full bg-slate-950 p-1 rounded-lg border border-[#2D3139]">
              <div 
                className="h-4 rounded-md bg-[#C5A059] transition-all duration-300"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-sans">
              <span>Remaining Capacity: {remainingCapacity.toLocaleString()}</span>
              <span>Reset Date: 1st of July</span>
            </div>
          </div>
        </div>

        {/* Module 2: Security Center */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider pb-3 border-b border-white/5 flex items-center gap-1.5 font-sans">
            <Lock size={14} className="text-[#C5A059]" />
            {lang === "ar" ? "بوابة الأمان وإدارة مفاتيح التشغيل" : "Operations Security Gateway Settings"}
          </h3>

          <div className="space-y-3.5">
            
            {/* Primary key entry */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#8E9299] font-sans uppercase font-bold">Nabda Instance Key (Active Encryption Key):</label>
              <div className="flex gap-2">
                <input
                  type={revealKeys ? "text" : "password"}
                  value={apiKey}
                  readOnly
                  className="flex-1 bg-[#191D24] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
                <button
                  onClick={handleRotateKey}
                  className="bg-zinc-900 border border-[#2D3139] hover:border-white/10 text-[#C5A059] p-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer font-sans"
                  title="Rotate Key"
                >
                  <RotateCw size={12} />
                  <span>Rotate</span>
                </button>
              </div>
            </div>

            {/* Bundle key entry */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#8E9299] font-sans uppercase font-bold">Nabda Bundle Key (Bulk Slot Key):</label>
              <div className="flex gap-2">
                <input
                  type={revealKeys ? "text" : "password"}
                  value={bundleKey}
                  readOnly
                  className="flex-1 bg-[#191D24] border border-[#2D3139] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
                <button
                  onClick={handleRotateBundleKey}
                  className="bg-zinc-900 border border-[#2D3139] hover:border-white/10 text-[#C5A059] p-2 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer font-sans"
                  title="Rotate Key"
                >
                  <RotateCw size={12} />
                  <span>Rotate</span>
                </button>
              </div>
            </div>

            {/* Rotation Metadata */}
            <div className="flex justify-between items-center pt-2 border-t border-[#2D3139]/40 text-[10px] text-slate-500 font-sans">
              <span>Last rotation timestamp: <strong>{rotationDate}</strong></span>
              
              <button
                onClick={() => setRevealKeys(!revealKeys)}
                className="text-[#C5A059] hover:text-white transition font-bold"
              >
                {revealKeys ? "Hide Secret Keys" : "Reveal Shared Keys"}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Module 3: Separated OTP Future Features Showcase */}
      <div className="bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
        
        <div className="pb-3 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-right">
          <div>
            <h3 className="font-bold text-sm text-[#C5A059] flex items-center gap-2 font-sans">
              <Cpu size={16} />
              {lang === "ar" ? "محاكي بوابات كود التحقق والتحقق الثنائي للمستقبل" : "🔮 Future OTP Integration & Merchant Authentication Engine"}
            </h3>
            <p className="text-xs text-[#8E9299] mt-0.5">
              {lang === "ar" 
                ? "قسم منفصل لمخطط بوابات OTP للمطابقة المستقبلية. مخصص لتأكيد التسجيل ويمنع المطالبات العشوائية بالمتاجر." 
                : "This strictly isolated panel shows future integration capabilities for registration verification via WhatsApp OTP."}
            </p>
          </div>
          <span className="text-[10px] text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/20 font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Isolated OTP scope
          </span>
        </div>

        {/* 3-card layout of features explaining usecases */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Usecase 1 */}
          <div className="bg-[#191D24] p-4 rounded-xl border border-[#2D3139] space-y-1.5">
            <span className="inline-block p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Smartphone size={16} />
            </span>
            <h4 className="font-bold text-white text-xs font-sans">1. Phone Number Verification</h4>
            <p className="text-[10px] text-[#8E9299] leading-relaxed">
              Before allowing catalog uploads, merchants are prompted to verify ownership by completing a 4-digit numeric handshake sent over secure WhatsApp channels.
            </p>
          </div>

          {/* Usecase 2 */}
          <div className="bg-[#191D24] p-4 rounded-xl border border-[#2D3139] space-y-1.5">
            <span className="inline-block p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
              <ShieldCheck size={16} />
            </span>
            <h4 className="font-bold text-white text-xs font-sans">2. Claim Business Listing</h4>
            <p className="text-[10px] text-[#8E9299] leading-relaxed">
              When a merchant discovers their scraped business on public lists, claiming listing ownership triggers an immediate secure verification code callback request.
            </p>
          </div>

          {/* Usecase 3 */}
          <div className="bg-[#191D24] p-4 rounded-xl border border-[#2D3139] space-y-1.5">
            <span className="inline-block p-1.5 bg-teal-500/10 text-teal-400 rounded-lg">
              <CheckCircle size={16} />
            </span>
            <h4 className="font-bold text-white text-xs font-sans">3. Registration Verification</h4>
            <p className="text-[10px] text-[#8E9299] leading-relaxed">
              Provides robust compliance filters protecting Shaku Maku platforms against spam listings by enforcing a single authenticated mobile pairing limit per account.
            </p>
          </div>

        </div>

        {/* Interactive OTP Simulator box */}
        <div className="bg-black/10 p-5 rounded-xl border border-[#2D3139] mt-3 space-y-4">
          <h4 className="text-xs font-bold text-white font-sans uppercase flex items-center gap-1">
            <Compass size={14} className="text-[#C5A059]" />
            {lang === "ar" ? "منصة محاكاة إرسال ومطابقة كود الهاتف" : "Interactive OTP Handshake Playground"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-right">
            
            {/* Input target phone */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#8E9299] font-sans">Enter phone target:</label>
              <input
                type="text"
                value={otpPhoneSim}
                onChange={(e) => setOtpPhoneSim(e.target.value)}
                disabled={otpStatus === "Sent" || otpStatus === "Verified"}
                className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            {/* Trigger Button */}
            <div className="space-y-1 text-center font-sans">
              {otpStatus === "Idle" || otpStatus === "Failed" ? (
                <button
                  onClick={handleTriggerOTPSim}
                  className="w-full bg-[#C5A059] hover:scale-[1.01] text-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Generate & Send WABA OTP
                </button>
              ) : (
                <div className="py-2 text-[10px] text-green-400 font-bold font-mono">
                  ✓ CODE BROADCASTED OUTBOX
                </div>
              )}
            </div>

            {/* OTP checker */}
            <div className="space-y-1 font-sans">
              <label className="text-[10px] text-[#8E9299] block">Enter received 4-digit code:</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 1420"
                  value={otpEnteredCode}
                  onChange={(e) => setOtpEnteredCode(e.target.value)}
                  disabled={otpStatus !== "Sent"}
                  className="flex-1 bg-[#191D24] border border-[#2D3139] rounded-lg px-3 py-2 text-xs text-white font-mono text-center tracking-widest"
                />
                <button
                  onClick={handleVerifyOTPSim}
                  disabled={otpStatus !== "Sent"}
                  className="bg-zinc-900 border border-[#2D3139] hover:text-white disabled:opacity-30 disabled:pointer-events-none px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Verify
                </button>
              </div>
            </div>

          </div>

          {/* Prompt informing secret code if sent */}
          {otpStatus === "Sent" && (
            <div className="p-3 bg-[#C5A059]/10 text-white border border-[#C5A059]/25 rounded-md text-xs font-sans text-center">
              💬 [Simulator Helper Alert]: A mock text message was broadcast via Nabda API. The code generated is: <strong className="font-mono text-[#C5A059] text-sm tracking-wider">{otpGeneratedCode}</strong>.
            </div>
          )}

          {otpStatus === "Verified" && (
            <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-sans text-center flex items-center justify-center gap-1">
              <CheckCircle size={14} />
              <span>Merchant fully verified! Phone listing claims was mapped successfully under Shaku Maku SQL directory.</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
