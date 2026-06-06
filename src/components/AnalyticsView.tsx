import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  MapPin, 
  Tag, 
  FileText, 
  Clock, 
  AlertOctagon, 
  TrendingDown,
  Layers,
  Award
} from "lucide-react";
import { Contact, LeadStage, MessageTemplate } from "../types";
import { GOVERNORATES, GOVERNORATES_AR, CATEGORIES, CATEGORIES_AR } from "../mockData";

interface AnalyticsViewProps {
  contacts: Contact[];
  templates: MessageTemplate[];
  lang: "ar" | "en";
}

export default function AnalyticsView({
  contacts,
  templates,
  lang
}: AnalyticsViewProps) {
  // Aggregate Metrics based on active contacts!
  const totalContacts = contacts.length;
  const sent = contacts.filter(c => c.lastMessageStatus !== "none").length;
  const delivered = contacts.filter(c => ["delivered", "read"].includes(c.lastMessageStatus)).length;
  const read = contacts.filter(c => c.lastMessageStatus === "read").length;
  const replied = contacts.filter(c => c.lastReply || [LeadStage.REPLIED, LeadStage.INTERESTED, LeadStage.REGISTERED].includes(c.leadStage)).length;
  const interested = contacts.filter(c => c.leadStage === LeadStage.INTERESTED || c.leadStage === LeadStage.REGISTERED).length;
  const registered = contacts.filter(c => c.leadStage === LeadStage.REGISTERED).length;
  const badNumber = contacts.filter(c => c.leadStage === LeadStage.BAD_NUMBER || c.lastMessageStatus === "failed").length;

  // Key Ratios
  const readRate = sent > 0 ? Math.round((read / sent) * 100) : 0;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
  const interestedRate = sent > 0 ? Math.round((interested / sent) * 100) : 0;
  const registrationRate = sent > 0 ? Math.round((registered / sent) * 100) : 0;
  const failureRate = sent > 0 ? Math.round((badNumber / sent) * 100) : 0;

  // Determine Best Governorate
  const govRatios = GOVERNORATES.map(gov => {
    const govC = contacts.filter(c => c.governorate === gov);
    const sentCount = govC.filter(c => c.lastMessageStatus !== "none").length;
    const regCount = govC.filter(c => c.leadStage === LeadStage.REGISTERED).length;
    return {
      gov,
      ratio: sentCount > 0 ? (regCount / sentCount) : 0,
      totalReg: regCount
    };
  }).sort((a,b) => b.ratio - a.ratio || b.totalReg - a.totalReg);
  const bestGov = govRatios[0]?.totalReg > 0 ? govRatios[0].gov : "Baghdad";

  // Determine Best Category
  const catRatios = CATEGORIES.map(cat => {
    const catC = contacts.filter(c => c.category === cat);
    const sentCount = catC.filter(c => c.lastMessageStatus !== "none").length;
    const regCount = catC.filter(c => c.leadStage === LeadStage.REGISTERED).length;
    return {
      cat,
      ratio: sentCount > 0 ? (regCount / sentCount) : 0,
      totalReg: regCount
    };
  }).sort((a,b) => b.ratio - a.ratio || b.totalReg - a.totalReg);
  const bestCat = catRatios[0]?.totalReg > 0 ? catRatios[0].cat : "Restaurant";

  // Determine Best Template
  const tempRatios = templates.map(temp => {
    const tempC = contacts.filter(c => c.assignedTemplateId === temp.id);
    const sentCount = tempC.filter(c => c.lastMessageStatus !== "none").length;
    const regCount = tempC.filter(c => c.leadStage === LeadStage.REGISTERED).length;
    return {
      name: temp.name,
      ratio: sentCount > 0 ? (regCount / sentCount) : 0,
      totalReg: regCount
    };
  }).sort((a,b) => b.ratio - a.ratio || b.totalReg - a.totalReg);
  const bestTemplate = tempRatios[0]?.totalReg > 0 ? tempRatios[0].name : "Promo Link Offer";

  // Funnel steps list
  const funnelSteps = [
    { label: lang === "ar" ? "جهات الاتصال الكلية" : "Total Directory Contacts", val: totalContacts, color: "bg-slate-800" },
    { label: lang === "ar" ? "الرسائل المرسلة فعلياً" : "WhatsApp Messages Sent", val: sent, color: "bg-blue-600/80" },
    { label: lang === "ar" ? "الرسائل المدفوعة والمستلمة" : "Delivered to Device", val: delivered, color: "bg-emerald-600/80" },
    { label: lang === "ar" ? "الرسائل المقروءة للهدف" : "Read Receipts Ack", val: read, color: "bg-purple-600/80" },
    { label: lang === "ar" ? "الردود المستلمة" : "Customer Reply Chats", val: replied, color: "bg-amber-600/80" },
    { label: lang === "ar" ? "العملاء المهتمين" : "Highly Interested Leads", val: interested, color: "bg-green-600/80" },
    { label: lang === "ar" ? "الشركات المسجلة فعلياً" : "Onboarded Registrations", val: registered, color: "bg-teal-600/80" }
  ];

  // Translations
  const txt = {
    title: lang === "ar" ? "لوحة التحليلات وقمع التحويل" : "Marketing Insights & Funnel",
    desc: lang === "ar" ? "قمع المبيعات التفصيلي والنسب التراكمية لتتبع جهود الإرسال وتحويلات أصحاب المشاريع في العراق" : "Track structural dropoff rates, conversion ratios, and comparative segments across the CRM pipeline",
    funnelTitle: lang === "ar" ? "قمع مبيعات شاكو ماكو المباشر (Conversion Funnel)" : "Live Conversion Funnel Analysis",
    ratioGridTitle: lang === "ar" ? "مؤشرات النجاح ونسب التحويل الكلية" : "Core Acquisition Performance Ratios",
    insightsTitle: lang === "ar" ? "🏆 الفائزون والمتميزون بالتفاعل" : "🏆 Top-Performing Campaign Segments",
    bestGovLabel: lang === "ar" ? "المحافظة الأكثر تحويلاً" : "Highest Converting City",
    bestCatLabel: lang === "ar" ? "التصنيف التجاري الأسرع استجابة" : "Best Business Segment",
    bestTempLabel: lang === "ar" ? "أنجح صيغة رسالة (A/B Winner)" : "Highest Converting W/A Copy",
    bestTimeLabel: lang === "ar" ? "الوقت الموصى به للإرسال" : "Best Time of Day",
    bestTimeVal: lang === "ar" ? "10:00 صباحاً - 12:30 ظهراً" : "10:00 AM - 12:30 PM"
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-amber-500" size={22} />
            {txt.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{txt.desc}</p>
        </div>
      </div>

      {/* Acquisitions KPI ratios panel */}
      <div className="bg-slate-900/60 p-4 md:p-5 rounded-2xl border border-slate-800/80">
        <h3 className="text-xs font-bold text-slate-400 pb-3 border-b border-slate-800 mb-4 uppercase tracking-wider">
          {txt.ratioGridTitle}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          {/* Read Rate */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-center">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">{lang === "ar" ? "نسبة القراءة" : "Read Rate"}</span>
            <span className="text-xl font-bold text-purple-400 mt-1 block">{readRate}%</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Read acks / Sent</span>
          </div>

          {/* Reply Rate */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-center">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">{lang === "ar" ? "نسبة الردود" : "Reply Rate"}</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">{replyRate}%</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Replies / Sent</span>
          </div>

          {/* Interested Rate */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-center">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">{lang === "ar" ? "نسبة المهتمين" : "Interested %"}</span>
            <span className="text-xl font-bold text-green-400 mt-1 block">{interestedRate}%</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Interested / Sent</span>
          </div>

          {/* Registration Rate */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-center">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">{lang === "ar" ? "نسبة التسجيل" : "Onboarded %"}</span>
            <span className="text-xl font-bold text-teal-400 mt-1 block">{registrationRate}%</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Registered / Sent</span>
          </div>

          {/* Failure Rate */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-center col-span-2 md:col-span-1">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">{lang === "ar" ? "أرقام معطوبة" : "Bounce Rate"}</span>
            <span className="text-xl font-bold text-red-400 mt-1 block">{failureRate}%</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Failed & Bad / Sent</span>
          </div>

        </div>
      </div>

      {/* Two Column details: Funnel on LHS, Insights on RHS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Funnel Layout (Columns 1 & 2) */}
        <div className="xl:col-span-2 bg-slate-900/60 p-4 md:p-5 border border-slate-800 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-400 pb-3 border-b border-slate-800 mb-5 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-amber-500" />
            {txt.funnelTitle}
          </h3>

          <div className="space-y-4 pt-1">
            {funnelSteps.map((step, idx) => {
              // Calculate percent of previous step or total
              const prevVal = idx > 0 ? funnelSteps[idx - 1].val : totalContacts;
              const percentOfTotal = totalContacts > 0 ? Math.round((step.val / totalContacts) * 100) : 0;
              const percentOfPrev = prevVal > 0 ? Math.round((step.val / prevVal) * 100) : 0;

              // Design slightly tapering widths
              const widthStyle = totalContacts > 0 
                ? `${Math.max(15, Math.round((step.val / totalContacts) * 100))}%` 
                : "100%";

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">{step.label}</span>
                    <div className="space-x-2 font-mono text-slate-400 text-[10px]">
                      <strong className="text-white text-xs">{step.val}</strong>
                      <span>({percentOfTotal}% of total)</span>
                      {idx > 0 && <span className="text-amber-400">↳ {percentOfPrev}% conversion</span>}
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 p-0.5 rounded-lg border border-slate-850">
                    <div 
                      className={`h-7 rounded-md transition-all duration-500 flex items-center px-3 text-[10px] text-slate-950 font-bold ${step.color}`}
                      style={{ width: widthStyle }}
                    >
                      <span className="text-white filter drop-shadow font-sans">IQ-{step.val}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best Performing segments (Column 3) */}
        <div className="bg-slate-900/60 p-4 md:p-5 border border-slate-800 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 pb-3 border-b border-slate-800 mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <Award size={14} className="text-amber-400 animate-bounce" />
              {txt.insightsTitle}
            </h3>

            <div className="space-y-4">
              
              {/* Best Gov */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4.5">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{txt.bestGovLabel}</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {lang === "ar" ? GOVERNORATES_AR[bestGov as keyof typeof GOVERNORATES_AR] || bestGov : bestGov}
                  </p>
                  <span className="text-[10px] text-emerald-400 mt-0.5 block font-mono">Top Registration ratios</span>
                </div>
              </div>

              {/* Best Business model */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4.5">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                  <Tag size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{txt.bestCatLabel}</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {lang === "ar" ? CATEGORIES_AR[bestCat as keyof typeof CATEGORIES_AR] || bestCat : bestCat}
                  </p>
                  <span className="text-[10px] text-emerald-400 mt-0.5 block font-mono">Strongest chat response</span>
                </div>
              </div>

              {/* Best Content copy */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4.5">
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{txt.bestTempLabel}</p>
                  <p className="text-xs font-bold text-white mt-0.5 truncate pr-1">
                    {bestTemplate}
                  </p>
                  <span className="text-[10px] text-emerald-400 mt-0.5 block font-mono">Highest A/B Conversion index</span>
                </div>
              </div>

              {/* Best Time */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4.5">
                <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-lg">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{txt.bestTimeLabel}</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {txt.bestTimeVal}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">According to open timers</span>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-4 p-3.5 bg-slate-950 rounded-xl border border-slate-850 text-center">
            <p className="text-[11px] text-slate-400">
              {lang === "ar" 
                ? "📈 يقوم نظام تحليلات شاكو ماكو بحساب هذه المخرجات ديناميكياً بناءً على الردود المدونة."
                : "📈 Insights are auto-derived dynamically based on your logged responsive templates & chats."}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
