import React, { useState } from "react";
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
  Tag
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [governorate, setGovernorate] = useState("Baghdad");
  const [category, setCategory] = useState("Restaurant");
  const [templateId, setTemplateId] = useState("");
  const [isABTesting, setIsABTesting] = useState(false);
  const [abSelectedTemplates, setAbSelectedTemplates] = useState<string[]>([]);
  const [maxContacts, setMaxContacts] = useState(5);
  const [delaySeconds, setDelaySeconds] = useState(5);

  // Set default templateId when templates are available
  React.useEffect(() => {
    if (templates.length > 0 && !templateId) {
      setTemplateId(templates[0].id);
    }
  }, [templates]);

  const handleSubmit = (e: React.FormEvent) => {
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
      setAbSelectedTemplates(abSelectedTemplates.filter(tId => tId !== id));
    } else {
      setAbSelectedTemplates([...abSelectedTemplates, id]);
    }
  };

  // Translations
  const txt = {
    title: lang === "ar" ? "قائمة وخطط الحملات" : "WhatsApp Outreach Campaigns",
    desc: lang === "ar" ? "إطلاق حملات تسويقية ذكية لجهات اتصال مخصصة مع دعم كامل لتقسيم الفئات الجغرافية والـ A/B Testing" : "Launch targeted campaigns by city and business category with real-time conversion rates and A/B templates",
    btnNew: lang === "ar" ? "إنشاء حملة جديدة +" : "Create New Campaign +2",
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

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-[#2D3139] shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#C5A059] rounded-full animate-pulse shadow-[0_0_8px_rgba(197,160,89,0.5)]"></span>
            {txt.title}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">{txt.desc}</p>
        </div>
        <button
          id="btn_create_campaign"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-[#C5A059] hover:scale-[1.02] text-[#0A0B0E] px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#C5A059]/20 flex items-center gap-1.5 self-start md:self-center cursor-pointer"
        >
          <Plus size={16} />
          {showCreateForm ? txt.btnCancel : txt.btnNew}
        </button>
      </div>

      {campaigns.some(c => c.status === "running") && (
        <div className="bg-[#C5A059]/10 border border-[#C5A059]/25 px-4 py-3 rounded-xl text-xs text-[#C5A059] flex items-center gap-2 animate-pulse">
          <Send size={14} className="animate-bounce shrink-0" />
          <span>{txt.alertRunning}</span>
        </div>
      )}

      {/* Onboarding Campaign Creator Form */}
      {showCreateForm && (
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2 pb-4 border-b border-white/5 mb-5">
            <Plus className="text-[#C5A059]" size={18} />
            <h3 className="font-bold text-white text-sm">{txt.formTitle}</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Campaign name */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8E9299] font-medium block">
                  {txt.lblCName}
                </label>
                <input
                  id="campaign_name_input"
                  type="text"
                  required
                  placeholder={lang === "ar" ? "مثال: أطباء العيادات في أربيل" : "e.g., Baghdad Pharmacy Summer Segment"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A059] text-right font-sans transition"
                />
              </div>

              {/* Governorates Target */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8E9299] font-medium block">
                  {txt.lblGov}
                </label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A059] transition cursor-pointer"
                >
                  <option value="All">{lang === "ar" ? "كل المحافظات (توزيع عام)" : "All Iraqi Cities"}</option>
                  {GOVERNORATES.map(g => (
                    <option key={g} value={g}>
                      {lang === "ar" ? GOVERNORATES_AR[g as keyof typeof GOVERNORATES_AR] : g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categorization Target */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8E9299] font-medium block">
                  {txt.lblCat}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A059] transition cursor-pointer"
                >
                  <option value="All">{lang === "ar" ? "كل تصنيفات الأعمال" : "All business trades"}</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {lang === "ar" ? CATEGORIES_AR[c as keyof typeof CATEGORIES_AR] : c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delay interval slider */}
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
                  className="w-full accent-[#C5A059] bg-[#191D24] h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Max target limit */}
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
                  className="w-full accent-[#C5A059] bg-[#191D24] h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* A/B Switcher */}
              <div className="md:col-span-2 bg-[#1C2128] p-4 rounded-xl border border-[#2D3139] space-y-3">
                <label className="flex items-center gap-3.5 cursor-pointer">
                  <input
                    id="checkbox_ab_testing"
                    type="checkbox"
                    checked={isABTesting}
                    onChange={(e) => setIsABTesting(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-[#2D3139] bg-[#191D24] accent-[#C5A059] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">{txt.lblAB}</span>
                    <span className="text-[11px] text-[#8E9299] block">
                      {lang === "ar" 
                        ? "سيقوم النظام بمداورة القوالب المحددة عشوائياً لمعرفة أي قالب يحقق أعلى نسبة تحويل"
                        : "CRM rotates selected templates to contrast registration ratios"}
                    </span>
                  </div>
                </label>

                {/* Template selectors for regular or split testing */}
                {!isABTesting ? (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] text-[#8E9299] font-bold block">{txt.lblTemp}</label>
                    <select
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2.5 py-2 text-xs text-white"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>
                          [{t.language}] - {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-[#2D3139]">
                    <p className="text-[11px] text-[#8E9299] font-bold">
                      {lang === "ar" ? "اختر القوالب المطلوب دمجها بالـ A/B Testing (اختر لغتين أو أكثر):" : "Select templates for A/B experiment pool:"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {templates.map(t => {
                        const checked = abSelectedTemplates.includes(t.id);
                        return (
                          <div 
                            key={t.id}
                            onClick={() => handleABToggleTemplate(t.id)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center gap-2 ${
                              checked 
                                ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059]" 
                                : "bg-[#14171D] border-[#2D3139] text-[#8E9299] hover:border-white/10"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              className="accent-[#C5A059]"
                            />
                            <span className="truncate">[{t.language}] - {t.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>

            <button
              type="submit"
              className="mt-2 w-full bg-[#C5A059] hover:scale-[1.01] text-[#0A0B0E] py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-[#C5A059]/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileCheck size={14} />
              {txt.btnSubmit}
            </button>
          </form>
        </div>
      )}

      {/* Campaigns Listing Container */}
      <div className="bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5 mb-4">
          {txt.campList}
        </h3>

        <div className="space-y-4">
          {campaigns.map((camp) => {
            const hasAB = camp.templateId === "ab-test";
            const totalContactsInSegment = camp.maxContacts;
            const progressPercent = camp.totalSent > 0 ? Math.round((camp.totalSent / totalContactsInSegment) * 100) : 0;
            
            return (
              <div 
                key={camp.id} 
                className="bg-[#1C2128] p-5 rounded-xl border border-[#2D3139] hover:border-white/10 shadow transition space-y-3.5 relative overflow-hidden"
              >
                {/* Campaign Header Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {camp.name}
                      {hasAB && (
                        <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-md font-mono border border-purple-500/20 uppercase font-bold">
                          A/B TEST
                        </span>
                      )}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-[#8E9299]">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-[#C5A059]" />
                        {camp.governorate === "All" ? (lang === "ar" ? "كل المحافظات" : "All Cities") : (lang === "ar" ? GOVERNORATES_AR[camp.governorate as keyof typeof GOVERNORATES_AR] : camp.governorate)}
                      </span>
                      <span className="text-[10px] text-white/5">•</span>
                      <span className="flex items-center gap-1">
                        <Tag size={11} className="text-[#C5A059]" />
                        {camp.category === "All" ? (lang === "ar" ? "كل الفئات" : "All Categories") : (lang === "ar" ? CATEGORIES_AR[camp.category as keyof typeof CATEGORIES_AR] : camp.category)}
                      </span>
                      <span className="text-[10px] text-white/5">•</span>
                      <span className="text-[#8E9299] font-mono">
                        {lang === "ar" ? "تأخير:" : "Delay:"} {camp.delaySeconds}s
                      </span>
                    </div>
                  </div>

                  {/* Campaign Status Toggle Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    
                    {/* Status badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      camp.status === "running" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse font-bold" :
                      camp.status === "paused" ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 font-bold" :
                      camp.status === "completed" ? "bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold" :
                      "bg-white/5 text-[#8E9299] border border-[#2D3139]"
                    }`}>
                      {camp.status === "running" ? txt.statusRunning :
                       camp.status === "paused" ? txt.statusPaused :
                       camp.status === "completed" ? txt.statusCompleted :
                       txt.statusIdle}
                    </span>

                    {/* Controls */}
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-[#2D3139]">
                      {camp.status !== "completed" && camp.status !== "running" && (
                        <button
                          id={`camp_btn_play_${camp.id}`}
                          onClick={() => onUpdateStatus(camp.id, "running")}
                          className="p-1 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 rounded transition cursor-pointer"
                          title="Start campaign simulated dispatch"
                        >
                          <Play size={13} fill="currentColor" />
                        </button>
                      )}
                      {camp.status === "running" && (
                        <button
                          id={`camp_btn_pause_${camp.id}`}
                          onClick={() => onUpdateStatus(camp.id, "paused")}
                          className="p-1 hover:bg-white/10 text-[#C5A059] rounded transition cursor-pointer"
                          title="Pause"
                        >
                          <Pause size={13} fill="currentColor" />
                        </button>
                      )}
                      {(camp.status === "running" || camp.status === "paused") && (
                        <button
                          id={`camp_btn_stop_${camp.id}`}
                          onClick={() => onUpdateStatus(camp.id, "completed")}
                          className="p-1 hover:bg-white/10 text-red-400 rounded transition cursor-pointer"
                          title="Stop/Complete"
                        >
                          <StopCircle size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#8E9299]">
                      {lang === "ar" ? "تقدم الدفعة الإلكترونية:" : "Onboarding progress:"} 
                      <strong className="text-white ml-1">{camp.totalSent}/{totalContactsInSegment}</strong>
                    </span>
                    <span className="text-[#8E9299]">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#14171D] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        camp.status === "completed" ? "bg-teal-500" : "bg-gradient-to-r from-[#C5A059] to-[#F2D18F]"
                      }`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Core funnel counts for this campaign */}
                <div className="grid grid-cols-5 gap-1.5 p-3 bg-[#14171D] rounded-xl border border-white/5 text-center text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[#8E9299] font-bold">{txt.statSent}</p>
                    <p className="font-bold text-blue-400">{camp.totalSent}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[#8E9299] font-bold">{txt.statDelivered}</p>
                    <p className="font-bold text-emerald-400">{camp.delivered}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[#8E9299] font-bold">{txt.statRead}</p>
                    <p className="font-bold text-purple-400">{camp.read}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[#8E9299] font-bold">{txt.statReplied}</p>
                    <p className="font-bold text-[#C5A059]">{camp.replied}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[#8E9299] font-bold">{txt.statReg}</p>
                    <p className="font-bold text-teal-400">{camp.registered}</p>
                  </div>
                </div>

                {/* Live simulation indicator overlay */}
                {camp.status === "running" && (
                  <div className="absolute right-0 bottom-0 top-0 w-1 bg-gradient-to-b from-blue-500 to-[#C5A059] animate-pulse"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
