import React, { useState } from "react";
import { 
  Bell, 
  Clock, 
  UserPlus, 
  MapPin, 
  Briefcase, 
  XOctagon, 
  SendHorizontal, 
  Video, 
  Link2, 
  Tv, 
  CheckCircle,
  HelpCircle,
  AlertOctagon
} from "lucide-react";
import { Contact, LeadStage } from "../types";
import { GOVERNORATES_AR, CATEGORIES_AR } from "../mockData";

interface FollowUpsViewProps {
  contacts: Contact[];
  lang: "ar" | "en";
  onSendRegLink: (phone: string) => void;
  onSendTutorialVideo: (phone: string) => void;
  onUpdateStage: (id: string, stage: LeadStage) => void;
}

export default function FollowUpsView({
  contacts,
  lang,
  onSendRegLink,
  onSendTutorialVideo,
  onUpdateStage
}: FollowUpsViewProps) {
  // Setup follow up queues logically
  
  // 1. Read but no reply after 2 days
  const readNoReplyQueue = contacts.filter(c => 
    c.lastMessageStatus === "read" && 
    ![LeadStage.REPLIED, LeadStage.INTERESTED, LeadStage.REGISTERED, LeadStage.NOT_INTERESTED].includes(c.leadStage)
  );

  // 2. Interested but not registered
  const interestedNoRegQueue = contacts.filter(c => c.leadStage === LeadStage.INTERESTED);

  // 3. Registered but stagnant (Simulate they registered but did not post listing yet)
  const stagnantRegQueue = contacts.filter(c => 
    c.leadStage === LeadStage.REGISTERED && 
    !(c.notes?.includes("Posted Listing") || c.notes?.includes("active"))
  );

  // 4. Failed delivery / Bad numbers
  const failedBouncedQueue = contacts.filter(c => 
    c.lastMessageStatus === "failed" || 
    c.leadStage === LeadStage.BAD_NUMBER
  );

  const [activeQueueTab, setActiveQueueTab] = useState<"read_no_reply" | "interested" | "stagnant" | "failed">("read_no_reply");

  // Get active queue array
  const getActiveQueueData = () => {
    switch (activeQueueTab) {
      case "read_no_reply": return readNoReplyQueue;
      case "interested": return interestedNoRegQueue;
      case "stagnant": return stagnantRegQueue;
      case "failed": return failedBouncedQueue;
    }
  };

  const activeRecords = getActiveQueueData();

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="text-[#C5A059]" size={22} />
            {lang === "ar" ? "مركز متابعة وحث التحويل التلقائي" : "Inbound Follow-Up Center"}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">
            {lang === "ar" 
              ? "يقوم النظام بفرز أصحاب المشاريع الذين يحتاجون متابعة تلقائياً لزيادة نسب التسجيل وإكمال الإدراج." 
              : "Smart follow-up queues derived from lead statuses. Instantly fire targeted Nabda reminders."}
          </p>
        </div>
      </div>

      {/* Stats of queues summaries */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Tab 1 */}
        <button
          onClick={() => setActiveQueueTab("read_no_reply")}
          className={`p-4 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-1 ${
            activeQueueTab === "read_no_reply" 
              ? "bg-[#C5A059]/10 border-[#C5A059]" 
              : "bg-[#14171D] border-white/5 hover:border-white/10"
          }`}
        >
          <span className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{lang === "ar" ? "قرأ وتجاهل" : "Read, No Reply"}</span>
          <span className="text-xl font-bold text-white font-mono mt-1">{readNoReplyQueue.length} <span className="text-xs text-[#8E9299]">leads</span></span>
          <span className="text-[9px] text-[#8E9299] flex items-center gap-1 mt-1">⚠️ Need secondary pitch</span>
        </button>

        {/* Tab 2 */}
        <button
          onClick={() => setActiveQueueTab("interested")}
          className={`p-4 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-1 ${
            activeQueueTab === "interested" 
              ? "bg-[#C5A059]/10 border-[#C5A059]" 
              : "bg-[#14171D] border-white/5 hover:border-white/10"
          }`}
        >
          <span className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{lang === "ar" ? "مهتم لم يسجل" : "Interested No-Reg"}</span>
          <span className="text-xl font-bold text-white font-mono mt-1">{interestedNoRegQueue.length} <span className="text-xs text-[#8E9299]">leads</span></span>
          <span className="text-[9px] text-green-400 flex items-center gap-1 mt-1">🔗 Send direct signup link</span>
        </button>

        {/* Tab 3 */}
        <button
          onClick={() => setActiveQueueTab("stagnant")}
          className={`p-4 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-1 ${
            activeQueueTab === "stagnant" 
              ? "bg-[#C5A059]/10 border-[#C5A059]" 
              : "bg-[#14171D] border-white/5 hover:border-white/10"
          }`}
        >
          <span className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{lang === "ar" ? "سجل ولم ينشر" : "Registered Stagnant"}</span>
          <span className="text-xl font-bold text-white font-mono mt-1">{stagnantRegQueue.length} <span className="text-xs text-[#8E9299]">merchants</span></span>
          <span className="text-[9px] text-teal-400 flex items-center gap-1 mt-1">🎥 Needs video setup tutorial</span>
        </button>

        {/* Tab 4 */}
        <button
          onClick={() => setActiveQueueTab("failed")}
          className={`p-4 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-1 ${
            activeQueueTab === "failed" 
              ? "bg-[#C5A059]/10 border-[#C5A059]" 
              : "bg-[#14171D] border-white/5 hover:border-white/10"
          }`}
        >
          <span className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{lang === "ar" ? "فشل الارتباط" : "Failed Bounced"}</span>
          <span className="text-xl font-bold text-white font-mono mt-1">{failedBouncedQueue.length} <span className="text-xs text-[#8E9299]">numbers</span></span>
          <span className="text-[9px] text-red-400 flex items-center gap-1 mt-1">❌ Cleanse from lists</span>
        </button>

      </div>

      {/* Main interactive directory table */}
      <div className="bg-[#14171D] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Table title and actions banner */}
        <div className="p-5 border-b border-white/5 bg-[#1C2128]/40 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-white text-xs font-sans uppercase">
              {lang === "ar" ? "قائمة المتابعة الحالية" : "Interactive Action Queue Panel"}
            </h3>
            <p className="text-[10px] text-[#8E9299] mt-0.5">
              {lang === "ar" ? "انقر على الإجراء المقترح لإرسال تنبيه بالواتساب والتحول التلقائي." : "Selected target segmentation can be messaged directly with smart macro triggers."}
            </p>
          </div>
          <span className="text-[10px] text-[#C5A059] font-mono bg-[#C5A059]/10 px-2.5 py-1 rounded-md font-bold">
            {activeRecords.length} targets identified
          </span>
        </div>

        {/* Tabular Layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-[#E2E8F0] text-right">
            <thead>
              <tr className="bg-[#1C2128]/70 text-[#8E9299] border-b border-[#2D3139]">
                <th className="py-3.5 px-4 font-bold font-sans text-right">{lang === "ar" ? "اسم الشركة / الرقم" : "Business Details"}</th>
                <th className="py-3.5 px-4 font-bold font-sans text-right">{lang === "ar" ? "المنطقة والتصنيف" : "Segment Info"}</th>
                <th className="py-3.5 px-4 font-bold font-sans text-center">{lang === "ar" ? "آخر حالة" : "Last Pipeline Status"}</th>
                <th className="py-3.5 px-4 font-bold font-sans text-right">{lang === "ar" ? "التشخيص والمقترح" : "Suggested Action Queue"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#8E9299] text-xs font-sans">
                    {lang === "ar" ? "🎉 القائمة نظيفة تماماً! لا توجد إجراءات معلقة هنا." : "🎉 Outstanding! This queue is fully cleared or empty."}
                  </td>
                </tr>
              ) : (
                activeRecords.map((contact) => (
                  <tr key={contact.id} className="hover:bg-[#1C2128]/35 transition">
                    
                    {/* Merchant basic */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-white font-sans text-xs leading-normal">
                        {contact.businessName}
                      </p>
                      <p className="font-mono text-[10px] text-[#8E9299] mt-0.5">
                        {contact.phone}
                      </p>
                    </td>

                    {/* Governorate & Category */}
                    <td className="py-4 px-4 space-y-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                        <MapPin size={11} className="text-[#C5A059]" />
                        {lang === "ar" ? GOVERNORATES_AR[contact.governorate as keyof typeof GOVERNORATES_AR] || contact.governorate : contact.governorate}
                      </span>
                      <span className="block text-[10px] text-[#8E9299]">
                        {lang === "ar" ? CATEGORIES_AR[contact.category as keyof typeof CATEGORIES_AR] || contact.category : contact.category}
                      </span>
                    </td>

                    {/* Status badges */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 uppercase">
                        {contact.lastMessageStatus} • {contact.leadStage}
                      </span>
                    </td>

                    {/* Smart follow up action dispatcher */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        
                        {activeQueueTab === "read_no_reply" && (
                          <>
                            <span className="text-[10px] text-[#8E9299] italic hidden md:inline">Secondary Video overview pitch suggested:</span>
                            <button
                              onClick={() => {
                                onSendTutorialVideo(contact.phone);
                              }}
                              className="bg-[#C5A059] text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[10px] hover:scale-[1.03] transition flex items-center gap-1 cursor-pointer font-sans"
                            >
                              <Video size={10} />
                              {lang === "ar" ? "إرسال باقة الفيديو" : "Send Video Pitch"}
                            </button>
                          </>
                        )}

                        {activeQueueTab === "interested" && (
                          <>
                            <span className="text-[10px] text-[#8E9299] italic hidden md:inline">Direct digital signup link cue:</span>
                            <button
                              onClick={() => {
                                onSendRegLink(contact.phone);
                              }}
                              className="bg-green-500 hover:bg-green-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[10px] hover:scale-[1.03] transition flex items-center gap-1 cursor-pointer font-sans"
                            >
                              <Link2 size={10} />
                              {lang === "ar" ? "إرسال رابط التسجيل" : "Send Signup Link"}
                            </button>
                          </>
                        )}

                        {activeQueueTab === "stagnant" && (
                          <>
                            <span className="text-[10px] text-[#8E9299] italic hidden md:inline">Send business posting walkthrough checklist:</span>
                            <button
                              onClick={() => {
                                onSendTutorialVideo(contact.phone);
                                // Mod notes to reflect posted listing
                                contact.notes = (contact.notes || "") + "\nPosted Listing and First Business Item successfully!";
                              }}
                              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[10px] hover:scale-[1.03] transition flex items-center gap-1 cursor-pointer font-sans"
                            >
                              <Tv size={10} />
                              {lang === "ar" ? "دليل نشر العروض" : "Send Posting Tutorial"}
                            </button>
                          </>
                        )}

                        {activeQueueTab === "failed" && (
                          <>
                            <span className="text-[10px] text-[#8E9299] italic hidden md:inline">Number is bad. Mark out of campaign bucket:</span>
                            <button
                              onClick={() => {
                                onUpdateStage(contact.id, LeadStage.NOT_INTERESTED);
                              }}
                              className="bg-stone-800 border border-stone-700 text-[#8E9299] hover:text-white px-3 py-1.5 rounded-lg text-[10px] transition flex items-center gap-1 cursor-pointer font-sans"
                            >
                              <XOctagon size={10} />
                              {lang === "ar" ? "تنظيف جهة الاتصال" : "Exclude and Archive"}
                            </button>
                          </>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
