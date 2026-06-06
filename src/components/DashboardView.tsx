import React from "react";
import { 
  Users, 
  Send, 
  CheckCircle, 
  CheckCheck, 
  AlertTriangle, 
  MessageCircle, 
  HeartHandshake, 
  FileCheck2, 
  Clock,
  TrendingUp,
  MapPin,
  Tag,
  ArrowUpRight
} from "lucide-react";
import { Contact, Campaign, ReplyInboxItem, LeadStage } from "../types";
import { GOVERNORATES, GOVERNORATES_AR, CATEGORIES, CATEGORIES_AR } from "../mockData";

interface DashboardViewProps {
  contacts: Contact[];
  campaigns: Campaign[];
  replies: ReplyInboxItem[];
  lang: "ar" | "en";
  onNavigate: (section: string) => void;
}

export default function DashboardView({
  contacts,
  campaigns,
  replies,
  lang,
  onNavigate
}: DashboardViewProps) {
  // Compute dynamically based on active contacts database state!
  const totalContacts = contacts.length;
  const totalSent = contacts.filter(c => c.lastMessageStatus !== "none").length;
  const delivered = contacts.filter(c => ["delivered", "read"].includes(c.lastMessageStatus)).length;
  const read = contacts.filter(c => c.lastMessageStatus === "read").length;
  const failed = contacts.filter(c => c.lastMessageStatus === "failed" || c.leadStage === LeadStage.BAD_NUMBER).length;
  const repliesCount = contacts.filter(c => c.leadStage === LeadStage.REPLIED || c.leadStage === LeadStage.INTERESTED || c.leadStage === LeadStage.REGISTERED || c.lastReply).length;
  const interestedLeads = contacts.filter(c => c.leadStage === LeadStage.INTERESTED || c.leadStage === LeadStage.REGISTERED).length;
  const registeredBusinesses = contacts.filter(c => c.leadStage === LeadStage.REGISTERED).length;
  
  const conversionRate = totalSent > 0 ? Math.round((registeredBusinesses / totalSent) * 100) : 0;
  const readRate = totalSent > 0 ? Math.round((read / totalSent) * 100) : 0;
  const replyRate = totalSent > 0 ? Math.round((repliesCount / totalSent) * 100) : 0;

  // Governorate Performance Analysis
  const govStats = GOVERNORATES.map(gov => {
    const govContacts = contacts.filter(c => c.governorate === gov);
    const sent = govContacts.filter(c => c.lastMessageStatus !== "none").length;
    const reg = govContacts.filter(c => c.leadStage === LeadStage.REGISTERED).length;
    const reply = govContacts.filter(c => c.lastReply).length;
    const conv = sent > 0 ? Math.round((reg / sent) * 100) : 0;
    return {
      id: gov,
      nameAr: GOVERNORATES_AR[gov as keyof typeof GOVERNORATES_AR] || gov,
      nameEn: gov,
      total: govContacts.length,
      sent,
      replied: reply,
      registered: reg,
      conversion: conv
    };
  }).sort((a, b) => b.registered - a.registered || b.total - a.total);

  // Category Performance Analysis
  const catStats = CATEGORIES.map(cat => {
    const catContacts = contacts.filter(c => c.category === cat);
    const sent = catContacts.filter(c => c.lastMessageStatus !== "none").length;
    const reg = catContacts.filter(c => c.leadStage === LeadStage.REGISTERED).length;
    const reply = catContacts.filter(c => c.lastReply).length;
    const conv = sent > 0 ? Math.round((reg / sent) * 100) : 0;
    return {
      id: cat,
      nameAr: CATEGORIES_AR[cat as keyof typeof CATEGORIES_AR] || cat,
      nameEn: cat,
      total: catContacts.length,
      sent,
      replied: reply,
      registered: reg,
      conversion: conv
    };
  }).sort((a, b) => b.registered - a.registered || b.total - a.total);

  // Text Localization Map
  const txt = {
    overviewTitle: lang === "ar" ? "لوحة المتابعة والمبيعات" : "CRM & Campaign Dashboard",
    overviewDesc: lang === "ar" ? "متابعة أرقام ونسب قمع المبيعات لربط أصحاب الأعمال العراقيين بمنصة شاكو ماكو عبر ناصية Nabda" : "Real-time pipeline analytics tracking Iraqi merchants onboarding via Nabda WhatsApp Gateway",
    kpiContacts: lang === "ar" ? "إجمالي جهات الاتصال" : "Total Contacts",
    kpiSent: lang === "ar" ? "الرسائل المرسلة" : "Total Sent",
    kpiDelivered: lang === "ar" ? "المستلمة" : "Delivered",
    kpiRead: lang === "ar" ? "المقروءة" : "Read",
    kpiFailed: lang === "ar" ? "الفاشلة" : "Failed",
    kpiReplies: lang === "ar" ? "الردود الواردة" : "Replies",
    kpiInterested: lang === "ar" ? "ليدز مهتمين" : "Interested Leads",
    kpiRegistered: lang === "ar" ? "أعمال مسجلة" : "Registered Businesses",
    kpiConversion: lang === "ar" ? "معدل التحويل الكامل" : "Conversion Rate",
    sectionGov: lang === "ar" ? "الأداء حسب المحافظات" : "Performance by Governorate",
    sectionCat: lang === "ar" ? "الأداء حسب نوع العمل" : "Performance by Business Category",
    sectionBestTimes: lang === "ar" ? "أوقات ذروة التفاعل" : "Best Engagement Insights",
    sectionReplies: lang === "ar" ? "أحدث ردود الواتساب المستلمة" : "Latest WhatsApp Replies",
    tblGovName: lang === "ar" ? "المحافظة" : "Governorate",
    tblCatName: lang === "ar" ? "الفئة" : "Category",
    tblTotal: lang === "ar" ? "العدد" : "Total",
    tblSent: lang === "ar" ? "المرسل" : "Sent",
    tblReplied: lang === "ar" ? "الردود" : "Replies",
    tblReg: lang === "ar" ? "المسجلين" : "Registered",
    tblConv: lang === "ar" ? "نسبة التحويل" : "Conv %",
    btnViewAllReplies: lang === "ar" ? "عرض الصندوق الوارد" : "Open Inbox",
    timeA: lang === "ar" ? "من 10 صباحاً - 1 ظهراً" : "10:00 AM - 1:00 PM",
    timeADesc: lang === "ar" ? "أعلى معدل قراءة في بغداد لصالونات التجميل والصيدليات" : "Peak open rates in Baghdad for Beauty Salons and Pharmacies",
    timeB: lang === "ar" ? "من 6 مساءً - 9 مساءً" : "6:00 PM - 9:00 PM",
    timeBDesc: lang === "ar" ? "أكبر نسبة ردود لمطاعم ومقاهي البصرة والنجف" : "Strongest response rates for Cafes & Restaurants in Basra & Najaf",
    emptyReplies: lang === "ar" ? "لا توجد ردود جديدة" : "No recent replies recorded"
  };

  const kpis = [
    { label: txt.kpiContacts, val: totalContacts, icon: Users, color: "border-[#2D3139] text-[#E2E8F0]" },
    { label: txt.kpiSent, val: totalSent, icon: Send, color: "border-blue-500/10 text-blue-400 bg-blue-500/5 hover:border-blue-500/20" },
    { label: txt.kpiDelivered, val: delivered, icon: CheckCircle, color: "border-emerald-500/10 text-emerald-400 bg-emerald-500/5 hover:border-emerald-500/20" },
    { label: txt.kpiRead, val: read, icon: CheckCheck, color: "border-purple-500/10 text-purple-400 bg-purple-500/5 hover:border-purple-500/20" },
    { label: txt.kpiFailed, val: failed, icon: AlertTriangle, color: "border-red-500/10 text-red-400 bg-red-400/5 hover:border-red-500/20" },
    { label: txt.kpiReplies, val: repliesCount, icon: MessageCircle, color: "border-[#C5A059]/10 text-[#C5A059] bg-[#C5A059]/5 hover:border-[#C5A059]/20" },
    { label: txt.kpiInterested, val: interestedLeads, icon: HeartHandshake, color: "border-emerald-500/10 text-emerald-400 bg-emerald-500/5 hover:border-emerald-500/20" },
    { label: txt.kpiRegistered, val: registeredBusinesses, icon: FileCheck2, color: "border-teal-500/10 text-teal-400 bg-teal-500/5 hover:border-teal-500/20" },
  ];

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-[#2D3139] shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#C5A059] rounded-full shadow-[0_0_8px_rgba(197,160,89,0.5)]"></span>
            {txt.overviewTitle}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">{txt.overviewDesc}</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="bg-[#1C2128] px-4 py-2.5 rounded-xl border border-[#2D3139] flex items-center gap-3">
            <TrendingUp size={16} className="text-[#C5A059]" />
            <div>
              <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-wider">{txt.kpiConversion}</p>
              <p className="text-sm font-bold text-[#C5A059]">{conversionRate}%</p>
            </div>
          </div>
          <div className="bg-[#1C2128] px-4 py-2.5 rounded-xl border border-[#2D3139] flex items-center gap-3">
            <CheckCheck size={16} className="text-purple-400" />
            <div>
              <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-wider">{lang === "ar" ? "معدل القراءة" : "Read Rate"}</p>
              <p className="text-sm font-bold text-purple-400">{readRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div 
              key={i} 
              className={`p-5 rounded-2xl border bg-[#14171D] flex flex-col justify-between h-28 relative overflow-hidden group shadow-xl transition-all duration-300 ${k.color}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-[#8E9299] leading-tight block pr-4">
                  {k.label}
                </span>
                <Icon size={16} className="opacity-70 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold tracking-tight text-white block">
                  {k.val.toLocaleString()}
                </span>
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-white/5 rounded-full blur-xl group-hover:bg-[#C5A059]/10 transition-all"></div>
            </div>
          );
        })}
      </div>

      {/* Two Columns Dashboard Details */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Column 1: Performance by Governorate */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin size={16} className="text-[#C5A059]" />
                {txt.sectionGov}
              </h3>
              <span className="text-[10px] bg-[#C5A059]/10 text-[#C5A059] font-bold px-2 py-0.5 rounded">
                {lang === "ar" ? "أعلى كفاءة" : "Top Performers"}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-[#E2E8F0] text-right">
                <thead>
                  <tr className="text-[#8E9299] border-b border-white/5">
                    <th className="pb-3 font-medium text-right">{txt.tblGovName}</th>
                    <th className="pb-3 font-medium text-center">{txt.tblTotal}</th>
                    <th className="pb-3 font-medium text-center">{txt.tblSent}</th>
                    <th className="pb-3 font-medium text-center">{txt.tblReplied}</th>
                    <th className="pb-3 font-medium text-center">{txt.tblReg}</th>
                    <th className="pb-3 font-medium text-left">{txt.tblConv}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {govStats.slice(0, 5).map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 font-bold text-white">
                        {lang === "ar" ? row.nameAr : row.nameEn}
                      </td>
                      <td className="py-3 text-center">{row.total}</td>
                      <td className="py-3 text-center text-blue-400">{row.sent}</td>
                      <td className="py-3 text-center text-[#C5A059]">{row.replied}</td>
                      <td className="py-3 text-center text-teal-400">{row.registered}</td>
                      <td className="py-3 text-left">
                        <span className={`inline-block font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          row.conversion >= 30 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : row.conversion > 0 
                              ? "bg-[#C5A059]/10 text-[#C5A059]" 
                              : "bg-[#1C2128] text-[#8E9299]"
                        }`}>
                          {row.conversion}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button 
            onClick={() => onNavigate("contacts")}
            className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-[#8E9299] hover:bg-white/10 hover:text-[#E2E8F0] transition cursor-pointer"
          >
            {lang === "ar" ? "تصفية المهتمين وقمع المبيعات" : "Filter Leads & Sales Pipeline"}
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Column 2: Performance by Category */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag size={16} className="text-[#C5A059]" />
                {txt.sectionCat}
              </h3>
              <span className="text-[10px] bg-[#C5A059]/10 text-[#C5A059] font-bold px-2 py-0.5 rounded">
                {lang === "ar" ? "جدول الفئات" : "Categories Matrix"}
              </span>
            </div>
 
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-[#E2E8F0] text-right">
                <thead>
                  <tr className="text-[#8E9299] border-b border-white/5">
                    <th className="pb-3 font-medium text-right">{txt.tblCatName}</th>
                    <th className="pb-3 font-medium text-center">{txt.tblTotal}</th>
                    <th className="pb-3 font-medium text-center">{txt.tblSent}</th>
                    <th className="pb-3 font-medium text-center">{txt.tblReplied}</th>
                    <th className="pb-3 font-medium text-center">{txt.tblReg}</th>
                    <th className="pb-3 font-medium text-left">{txt.tblConv}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {catStats.slice(0, 5).map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 font-bold text-white">
                        {lang === "ar" ? row.nameAr : row.nameEn}
                      </td>
                      <td className="py-3 text-center">{row.total}</td>
                      <td className="py-3 text-center text-blue-400">{row.sent}</td>
                      <td className="py-3 text-center text-[#C5A059]">{row.replied}</td>
                      <td className="py-3 text-center text-teal-400">{row.registered}</td>
                      <td className="py-3 text-left">
                        <span className={`inline-block font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          row.conversion >= 30 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : row.conversion > 0 
                              ? "bg-[#C5A059]/10 text-[#C5A059]" 
                              : "bg-[#1C2128] text-[#8E9299]"
                        }`}>
                          {row.conversion}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button 
            onClick={() => onNavigate("analytics")}
            className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-[#8E9299] hover:bg-white/10 hover:text-[#E2E8F0] transition cursor-pointer"
          >
            {lang === "ar" ? "تحليل قمع المبيعات التفصيلي" : "Detailed Funnel Analytics"}
            <ArrowUpRight size={14} />
          </button>
        </div>

      </div>

      {/* Bottom Area: Latest Replies & Best Times */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Best Message Sending Time widget */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between xl:col-span-1">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-4 border-b border-white/5 mb-4">
              <Clock size={16} className="text-[#C5A059]" />
              {txt.sectionBestTimes}
            </h3>

            <div className="space-y-4">
              <div className="bg-[#1C2128] p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-1.5 text-[#C5A059] font-bold text-xs">
                  <span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full"></span>
                  {txt.timeA}
                </div>
                <p className="text-xs text-slate-300 mt-1 font-semibold">{lang === "ar" ? "معدل فتح 74%" : "74% avg read receipt"}</p>
                <p className="text-[11px] text-[#8E9299] mt-1">{txt.timeADesc}</p>
              </div>

              <div className="bg-[#1C2128] p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-1.5 text-teal-400 font-bold text-xs">
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>
                  {txt.timeB}
                </div>
                <p className="text-xs text-slate-300 mt-1 font-semibold">{lang === "ar" ? "معدل استجابة 43%" : "43% avg reply rate"}</p>
                <p className="text-[11px] text-[#8E9299] mt-1">{txt.timeBDesc}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#C5A059]/10 rounded-xl border border-[#C5A059]/20 text-center">
            <p className="text-xs text-[#C5A059] font-bold">
              {lang === "ar" 
                ? "💡 نصيحة: استهدف مطاعم بغداد يوم الخميس مساءً"
                : "💡 Tip: Target Baghdad restaurants on Thursday PM"}
            </p>
          </div>
        </div>

        {/* Latest Incoming Replies */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-xl xl:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle size={16} className="text-[#C5A059]" />
                {txt.sectionReplies}
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md font-mono animate-pulse font-bold border border-red-500/20">
                {lang === "ar" ? "ربط مباشر" : "Live Stream Webhook"}
              </span>
            </div>

            <div className="space-y-4">
              {replies.length === 0 ? (
                <div className="text-center py-6 text-[#8E9299] text-xs">
                  {txt.emptyReplies}
                </div>
              ) : (
                replies.slice(0, 3).map((reply) => (
                  <div key={reply.id} className="p-3.5 bg-white/5 rounded-xl border-r border-y border-l-2 border-r-[#2D3139] border-y-[#2D3139] border-l-[#C5A059] flex justify-between gap-4 items-start hover:bg-white/[0.08] transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{reply.businessName}</span>
                        <span className="text-[10px] text-[#8E9299] font-mono">{reply.phone}</span>
                      </div>
                      <p className="text-xs text-[#E2E8F0] line-clamp-1 italic">
                        "{reply.messageText}"
                      </p>
                      {reply.campaignName && (
                        <p className="text-[10px] text-[#8E9299] mt-1">
                          ↳ {reply.campaignName}
                        </p>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-[10px] text-[#8E9299] block font-mono">
                        {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="inline-block mt-1 text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded font-bold border border-[#C5A059]/20">
                        {lang === "ar" ? "قيد الانتظار" : "Pending Action"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={() => onNavigate("inbox")}
            className="mt-5 flex items-center justify-center gap-1.5 w-full py-3 bg-[#C5A059] text-[#0A0B0E] rounded-xl text-xs font-bold shadow-lg shadow-[#C5A059]/20 hover:scale-[1.02] transition-transform cursor-pointer"
          >
            {txt.btnViewAllReplies}
            <ArrowUpRight size={14} />
          </button>
        </div>

      </div>

    </div>
  );
}
