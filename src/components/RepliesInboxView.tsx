import React, { useState } from "react";
import { 
  MessageSquare, 
  Smartphone, 
  Sparkles, 
  CheckCircle, 
  Link, 
  Tv, 
  XCircle, 
  FileText,
  Clock,
  ArrowUpRight,
  UserCheck,
  Send,
  PlusCircle
} from "lucide-react";
import { ReplyInboxItem, Contact, LeadStage } from "../types";

interface RepliesInboxViewProps {
  replies: ReplyInboxItem[];
  contacts: Contact[];
  lang: "ar" | "en";
  onMarkInterested: (phone: string) => void;
  onSendRegLink: (phone: string) => void;
  onSendTutorialVideo: (phone: string) => void;
  onMarkNotInterested: (phone: string) => void;
  onAddNote: (phone: string, notes: string) => void;
  onTriggerSimulatedReply: (customText?: string) => void;
}

export default function RepliesInboxView({
  replies,
  contacts,
  lang,
  onMarkInterested,
  onSendRegLink,
  onSendTutorialVideo,
  onMarkNotInterested,
  onAddNote,
  onTriggerSimulatedReply
}: RepliesInboxViewProps) {
  const [selectedReply, setSelectedReply] = useState<ReplyInboxItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [customSimText, setCustomSimText] = useState("");
  const [typedReplyText, setTypedReplyText] = useState("");

  const handleSelectReply = (reply: ReplyInboxItem) => {
    setSelectedReply(reply);
    setNoteText(reply.notes || "");
    setTypedReplyText("");
  };

  const currentContact = selectedReply 
    ? contacts.find(c => c.phone === selectedReply.phone) 
    : null;

  // Quick Action Notification states for feedback
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 3000);
  };

  // Translations
  const txt = {
    title: lang === "ar" ? "صندوق الردود وحجوزات المبيعات" : "WhatsApp Replies Inbox",
    desc: lang === "ar" ? "استقبال وتحليل الرسائل الواردة من webhook التابع لمنصة Nabda والرد عليها بنقرة زر ذكية لتحويل العملاء" : "Process inbound messages captured via Nabda webhooks and capture leads with conversion macros",
    btnSimulate: lang === "ar" ? "محاكاة رد وارد عشوائي 💬" : "Simulate Random Inbound Reply 💬",
    btnSimulateCustom: lang === "ar" ? "حقن رد مخصص" : "Inject custom chat",
    replyPlaceholder: lang === "ar" ? "أكتب نص محاكاة رد وارد حر..." : "Type custom incoming phrase...",
    msgInboundList: lang === "ar" ? "الرسائل الواردة المعلقة" : "Intercepted WhatsApp Chats",
    msgDetailTitle: lang === "ar" ? "محادثة ومجهود مبيعات العميل" : "Chat & Lead Action Portal",
    btnInterested: lang === "ar" ? "تحديد كمهتم جداً" : "Mark Interested",
    btnRegLink: lang === "ar" ? "إرسال رابط التسجيل" : "Send Onboarding Link",
    btnVideo: lang === "ar" ? "إرسال دليل الفيديو" : "Send Tutorial Video",
    btnNotInterested: lang === "ar" ? "غير مهتم" : "Mark Uninterested",
    btnSaveNote: lang === "ar" ? "تعديل وحفظ ملاحظه" : "Save Note Profile",
    labelCampaign: lang === "ar" ? "تاريخ الحملة المرسلة:" : "Origin campaign context:",
    labelCurrentStage: lang === "ar" ? "المرحلة الحالية في القمع:" : "Lead's pipeline status:",
    emptyInbox: lang === "ar" ? "تهانينا! صندوق الردود فارغ وجميع المهتمين تمت خدمتهم ومتابعتهم" : "Inbox clear! All incoming responses have been serviced and followed up",
    btnTypeSend: lang === "ar" ? "إرسال رد مخصص عبر الواتساب" : "Send manual WhatsApp reply"
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Title with live simulator option */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-[#C5A059]" size={22} />
            {txt.title}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">{txt.desc}</p>
        </div>

        {/* Simulator controls */}
        <div className="flex flex-col sm:flex-row gap-2 self-start md:self-center bg-[#191D24] p-2.5 rounded-xl border border-[#2D3139]">
          <input
            id="sim_reply_custom_input"
            type="text"
            placeholder={txt.replyPlaceholder}
            value={customSimText}
            onChange={(e) => setCustomSimText(e.target.value)}
            className="bg-[#14171D] border border-[#2D3139] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none w-44 font-sans"
          />
          <button
            id="btn_trigger_sim_reply"
            onClick={() => {
              onTriggerSimulatedReply(customSimText || undefined);
              setCustomSimText("");
              showFeedback(lang === "ar" ? "تمت محاكاة وصول رسالة جديدة بنجاح!" : "Simulated incoming reply injected!");
            }}
            className="bg-[#C5A059] hover:scale-[1.02] text-[#0A0B0E] px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 font-sans cursor-pointer"
          >
            <PlusCircle size={14} />
            {txt.btnSimulateCustom}
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2 animate-pulse">
          <CheckCircle size={14} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Main split area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chats Inbox list (Column 1) */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-4 md:p-5 lg:col-span-1 space-y-4 flex flex-col h-[520px] shadow-xl">
          <h3 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider pb-3 border-b border-white/5 font-sans">
            {txt.msgInboundList} ({replies.length})
          </h3>

          <div className="divide-y divide-white/5 overflow-y-auto flex-1 space-y-2 pr-1">
            {replies.length === 0 ? (
              <div className="text-center py-16 text-[#8E9299] text-xs">
                {txt.emptyInbox}
              </div>
            ) : (
              replies.map((reply) => {
                const isSelected = selectedReply?.id === reply.id;
                const contact = contacts.find(c => c.phone === reply.phone);
                return (
                  <div
                    id={`reply_card_${reply.id}`}
                    key={reply.id}
                    onClick={() => handleSelectReply(reply)}
                    className={`p-3.5 rounded-xl border text-right cursor-pointer transition flex flex-col justify-between gap-1 ${
                      isSelected 
                        ? "bg-[#C5A059]/10 border-[#C5A059] shadow-[0_4px_12px_rgba(197,160,89,0.05)]" 
                        : "bg-[#191D24] border-[#2D3139] hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-white text-xs leading-tight font-sans">
                          {reply.businessName}
                        </p>
                        <p className="font-mono text-[9px] text-[#8E9299] mt-0.5 font-bold">
                          {reply.phone}
                        </p>
                      </div>
                      <span className="text-[9px] text-[#8E9299] font-mono flex items-center gap-0.5">
                        <Clock size={10} />
                        {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-[#E2E8F0] line-clamp-2 italic font-sans mt-2 leading-relaxed">
                      "{reply.messageText}"
                    </p>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 text-[10px] font-sans">
                      <span className="text-[#8E9299] truncate max-w-[120px]">
                        {reply.campaignName || "Single Test Message"}
                      </span>
                      {contact && (
                        <span className="text-[9px] bg-[#14171D] border border-[#2D3139] text-[#C5A059] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          {contact.leadStage}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Actions & Reply formulation (Column 2 & 3) */}
        <div className="lg:col-span-2 bg-[#14171D] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col justify-between h-[520px] shadow-xl">
          {selectedReply && currentContact ? (
            <div className="space-y-4 flex flex-col justify-between h-full">
              
              {/* Profile identity header */}
              <div>
                <div className="pb-3 border-b border-white/5 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-sm font-sans">
                      {selectedReply.businessName}
                    </h3>
                    <p className="text-xs text-[#8E9299] font-mono mt-0.5">{selectedReply.phone}</p>
                  </div>
                  <span className="text-[10px] bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 px-2 py-0.5 rounded font-bold font-sans">
                    📍 {lang === "ar" ? "عميل مستهدف" : "Active Target Lead"}
                  </span>
                </div>

                {/* Info summary strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3.5 bg-[#191D24] rounded-xl border border-[#2D3139] text-[11px] text-[#8E9299] mt-3 font-sans">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold">{txt.labelCampaign}</p>
                    <p className="font-medium text-white truncate text-xs mt-0.5">{selectedReply.campaignName || "Internal Outreach"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold">{txt.labelCurrentStage}</p>
                    <p className="font-bold text-[#C5A059] text-xs mt-0.5">{currentContact.leadStage}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold">Governorate / الفئة:</p>
                    <p className="font-medium text-slate-300 text-xs mt-0.5">{currentContact.governorate} / {currentContact.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold">Last delivery status:</p>
                    <p className="font-medium text-slate-300 font-mono uppercase text-xs mt-0.5">{currentContact.lastMessageStatus}</p>
                  </div>
                </div>

                {/* Substantive chat bubble */}
                <div className="space-y-2 mt-4">
                  <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-bold font-sans">Inbound webhook payload:</span>
                  <div className="bg-[#191D24] p-4 rounded-xl border border-[#2D3139] font-sans text-xs text-slate-300 leading-relaxed relative">
                    <div className="absolute top-2 left-2 bg-red-500/15 text-red-400 border border-red-500/20 text-[8px] font-bold px-1.5 py-0.2 rounded font-mono uppercase tracking-wide">
                      WABA WEBHOOK
                    </div>
                    <p className="text-emerald-400 font-bold font-mono text-[10px]">[ {new Date(selectedReply.timestamp).toLocaleTimeString()} ]</p>
                    <p className="mt-2 font-bold italic">"{selectedReply.messageText}"</p>
                  </div>
                </div>
              </div>

              {/* Quick macros action list */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-bold font-sans">Quick WhatsApp Actions (Nabda Macros):</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-sans">
                  
                  {/* Mark Interested */}
                  <button
                    id="macro_btn_interested"
                    onClick={() => {
                      onMarkInterested(selectedReply.phone);
                      showFeedback(lang === "ar" ? "تم تحديد العميل كمهتم وحفظه في قمع المبيعات!" : "Lead stage updated to Interested!");
                    }}
                    className="p-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 justify-center cursor-pointer"
                  >
                    <UserCheck size={13} />
                    {txt.btnInterested}
                  </button>

                  {/* Send Onboarding link */}
                  <button
                    id="macro_btn_reg_link"
                    onClick={() => {
                      onSendRegLink(selectedReply.phone);
                      showFeedback(lang === "ar" ? "تم إرسال الرابط وسيتفاعل العميل للتسجيل!" : "Onboarding Link simulated via WhatsApp API!");
                    }}
                    className="p-2.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 hover:border-teal-500/40 text-teal-400 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 justify-center cursor-pointer"
                  >
                    <Link size={13} />
                    {txt.btnRegLink}
                  </button>

                  {/* Send video guide */}
                  <button
                    id="macro_btn_video"
                    onClick={() => {
                      onSendTutorialVideo(selectedReply.phone);
                      showFeedback(lang === "ar" ? "تم إرسال رابط الشرح ويوتيوب للعميل!" : "Tutorial Video Link simulated via WhatsApp API!");
                    }}
                    className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 justify-center cursor-pointer"
                  >
                    <Tv size={13} />
                    {txt.btnVideo}
                  </button>

                  {/* Mark Uninterested */}
                  <button
                    id="macro_btn_not_interested"
                    onClick={() => {
                      onMarkNotInterested(selectedReply.phone);
                      showFeedback(lang === "ar" ? "تم تصفية العميل كغير مهتم" : "Lead stage updated to Not Interested.");
                    }}
                    className="p-2.5 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 hover:border-red-400/40 text-red-400 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 justify-center cursor-pointer"
                  >
                    <XCircle size={13} />
                    {txt.btnNotInterested}
                  </button>

                </div>

                {/* Manual text builder reply box */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <input
                    id="manual_whatsapp_reply_input"
                    type="text"
                    placeholder={lang === "ar" ? "صياغة رد واتساب مخصص يدوي..." : "Draft custom text reply to send back via Nabda..."}
                    value={typedReplyText}
                    onChange={(e) => setTypedReplyText(e.target.value)}
                    className="flex-1 bg-[#191D24] border border-[#2D3139] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C5A059] transition font-sans"
                  />
                  <button
                    id="btn_send_manual_whatsapp_message"
                    disabled={!typedReplyText.trim()}
                    onClick={() => {
                      onAddNote(selectedReply.phone, `CRM Reply Sent: ${typedReplyText}`);
                      setTypedReplyText("");
                      showFeedback(lang === "ar" ? "تم إلحاق الرد بسجل محادثات العميل!" : "Manual reply logged in lead's stream!");
                    }}
                    className="bg-[#C5A059] hover:scale-[1.02] disabled:bg-[#1C2128] disabled:text-[#8E9299] text-[#0A0B0E] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 font-sans cursor-pointer"
                  >
                    <Send size={12} />
                    {lang === "ar" ? "إرسال" : "Send API"}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-24 text-slate-500 text-xs my-auto flex flex-col items-center justify-center space-y-4">
              <MessageSquare size={36} className="text-[#8E9299]/60" />
              <span className="font-sans leading-relaxed text-[#8E9299]">
                {lang === "ar" 
                  ? "👈 اختر محادثة واردة من الجانب لعرض أدوات التحكم وتحويل العميل" 
                  : "👈 Choose an inbound WhatsApp response from the sidebar to activate CRM action portal"}
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
