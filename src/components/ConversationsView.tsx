import React, { useState } from "react";
import { 
  Users, 
  Search, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  CheckCheck, 
  Clock, 
  ArrowLeft, 
  Play, 
  BookOpen, 
  CornerDownLeft, 
  CircleDot,
  Send
} from "lucide-react";
import { Contact, LeadStage, MessageTemplate } from "../types";
import { GOVERNORATES_AR, CATEGORIES_AR } from "../mockData";

interface ConversationsViewProps {
  contacts: Contact[];
  templates: MessageTemplate[];
  lang: "ar" | "en";
  onSendManualMessage: (contactId: string, text: string) => void;
  onSimulateSingleSend: (contactId: string, templateId: string) => void;
}

export default function ConversationsView({
  contacts,
  templates,
  lang,
  onSendManualMessage,
  onSimulateSingleSend
}: ConversationsViewProps) {
  const [selectedContactId, setSelectedContactId] = useState<string>(contacts[0]?.id || "");
  const [searchContact, setSearchContact] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [sendTemplateId, setSendTemplateId] = useState(templates[0]?.id || "");

  const activeContact = contacts.find(c => c.id === selectedContactId);

  // Filtered sidebar list
  const filteredContacts = contacts.filter(c => 
    c.businessName.toLowerCase().includes(searchContact.toLowerCase()) || 
    c.phone.includes(searchContact)
  );

  const getStageBadgeStyle = (stage: LeadStage) => {
    switch (stage) {
      case LeadStage.REGISTERED:
        return "bg-teal-500/10 text-teal-400 border border-teal-500/25";
      case LeadStage.INTERESTED:
        return "bg-green-500/10 text-green-400 border border-green-500/25";
      case LeadStage.REPLIED:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/25";
      case LeadStage.BAD_NUMBER:
        return "bg-red-500/10 text-red-400 border border-red-500/25";
      default:
        return "bg-slate-800 text-slate-300 border border-slate-700";
    }
  };

  // Generate a mock sequential timeline based on the contact's state
  const getTimelineSteps = (contact: Contact) => {
    const updatedMs = new Date(contact.updatedAt).getTime();
    const steps = [
      {
        title: lang === "ar" ? "تم الاستيراد كمسودة" : "Imported Contact",
        desc: lang === "ar" ? `قناة الاستيراد: ${contact.source}` : `Via outreach bucket: ${contact.source}`,
        time: new Date(updatedMs - 3600000 * 24).toLocaleString(),
        active: true
      }
    ];

    if (contact.lastMessageStatus !== "none") {
      steps.push({
        title: lang === "ar" ? "أرسلت منصة Nabda رسالة" : "WABA Campaign Sent",
        desc: lang === "ar" ? "أرسل عبر قنوات بث الواتساب للطلب الفوري." : "Pushed outbound message payload via Nabda bulk API.",
        time: new Date(updatedMs - 3600000 * 4).toLocaleString(),
        active: true
      });
    }

    if (["delivered", "read", "failed"].includes(contact.lastMessageStatus)) {
      const isFailed = contact.lastMessageStatus === "failed";
      steps.push({
        title: isFailed ? (lang === "ar" ? "فشل التسليم بالشبكة" : "Delivery Failed") : (lang === "ar" ? "تأكيد الاستلام بالجهاز" : "Message Delivered"),
        desc: isFailed ? (lang === "ar" ? "الرقم لا يملك واتساب نشط" : "Delivery bounce: Number without WhatsApp account") : (lang === "ar" ? "تم الاستلام بواسطة هاتف الجوال بنجاح." : "Handshake received from customer phone terminal."),
        time: new Date(updatedMs - 3600000 * 3.8).toLocaleString(),
        active: !isFailed
      });
    }

    if (contact.lastMessageStatus === "read") {
      steps.push({
        title: lang === "ar" ? "تأكيد القراءة (الصح الأزرق)" : "Message Read",
        desc: lang === "ar" ? "قرأ صاحب العمل الرسالة الترويجية." : "Double blue tick received. Recipient opened text.",
        time: new Date(updatedMs - 3600000 * 3.2).toLocaleString(),
        active: true
      });
    }

    if (contact.lastReply) {
      steps.push({
        title: lang === "ar" ? "تلقينا رد مستجيب" : "Merchant Replied",
        desc: `"${contact.lastReply}"`,
        time: contact.lastReplyTime ? new Date(contact.lastReplyTime).toLocaleString() : new Date(updatedMs - 3600000 * 2).toLocaleString(),
        active: true
      });
    }

    if (contact.leadStage === LeadStage.INTERESTED) {
      steps.push({
        title: lang === "ar" ? "تم وضع علامة مهتم" : "Tagged as Interested",
        desc: lang === "ar" ? "تم ترقية صاحب المتجر لقمع المهتمين والمتابعة الفورية." : "Lead auto-promoted or manual tagged into Pipeline Sales.",
        time: new Date(updatedMs - 3600000 * 1.5).toLocaleString(),
        active: true
      });
    }

    if (contact.leadStage === LeadStage.REGISTERED) {
      steps.push({
        title: lang === "ar" ? "اكتمل تسجيل الشركة بنجاح" : "Onboarded & Registered",
        desc: lang === "ar" ? "تم إدراج صور ومشاريع العمل وقام ببدء الاستخدام!" : "Merchant completed onboarding profile & fully active on directory.",
        time: new Date(updatedMs).toLocaleString(),
        active: true
      });
    }

    return steps;
  };

  // Compile a simulated conversation thread
  const getChatMessages = (contact: Contact) => {
    const thread = [];
    
    // Welcome outbound check
    if (contact.assignedTemplateId) {
      const template = templates.find(t => t.id === contact.assignedTemplateId);
      thread.push({
        sender: "system",
        text: template ? template.text : "مرحباً يا صاحب العمل الراقِي! نود دعوتكم للانضمام إلى دليل شاكو ماكو مجاناً.",
        time: "10:04 AM",
        type: "sent"
      });
    }

    // Inbound response check
    if (contact.lastReply) {
      thread.push({
        sender: "merchant",
        text: contact.lastReply,
        time: contact.lastReplyTime ? new Date(contact.lastReplyTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "12:12 PM",
        type: "received"
      });
    }

    // Custom system notes/replies log
    if (contact.notes && contact.notes.includes("[System Auto]")) {
      const logs = contact.notes.split("\n").filter(l => l.includes("[System Auto]"));
      logs.forEach(l => {
        thread.push({
          sender: "system",
          text: l.replace("[System Auto] ", ""),
          time: "02:15 PM",
          type: "system_info"
        });
      });
    }

    return thread;
  };

  const handleSend = () => {
    if (!typedMessage.trim() || !activeContact) return;
    onSendManualMessage(activeContact.id, typedMessage);
    setTypedMessage("");
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-[#C5A059]" size={22} />
            {lang === "ar" ? "مركز إدارة وتتبع المحادثات الزمني" : "Conversation Timeline Center"}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">
            {lang === "ar" 
              ? "استعرض سجل التفاعل الزمني الكامل لكل عميل، واقرأ الرسائل الواردة وردود الفعل المباشرة." 
              : "Verify double blue ticks, read logs, and simulate real conversation streams for Iraqi partners."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar Contacts List (Column 1) */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-4 flex flex-col h-[600px] shadow-xl space-y-3">
          <div className="relative">
            <span className="absolute top-3.5 right-3 text-[#8E9299]">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder={lang === "ar" ? "ابحث عن عميل..." : "Search Merchant..."}
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl py-2.5 pr-8 pl-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C5A059] font-sans"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-16 text-[#8E9299] text-xs font-sans">
                {lang === "ar" ? "لم نجد نتائج" : "No clients found"}
              </div>
            ) : (
              filteredContacts.map(c => {
                const isActive = c.id === selectedContactId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id)}
                    className={`w-full p-3 rounded-xl border text-right transition flex flex-col justify-between gap-1 cursor-pointer ${
                      isActive 
                        ? "bg-[#C5A059]/10 border-[#C5A059] shadow-sm" 
                        : "bg-[#191D24] border-[#2D3139] hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-white text-xs font-sans truncate max-w-[150px]">
                        {c.businessName}
                      </p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getStageBadgeStyle(c.leadStage)}`}>
                        {c.leadStage}
                      </span>
                    </div>

                    <p className="font-mono text-[9px] text-[#8E9299]">{c.phone}</p>
                    {c.lastReply && (
                      <p className="text-[10px] text-slate-300 italic truncate mt-1">
                        ↳ "{c.lastReply}"
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detailed Timeline & Chat Thread (Columns 2 & 3) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {activeContact ? (
            <>
              {/* Timeline segment */}
              <div className="bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <div>
                    <h3 className="font-bold text-sm text-white font-sans">{activeContact.businessName}</h3>
                    <p className="text-xs text-[#8E9299] font-mono mt-0.5">{activeContact.phone} • {activeContact.governorate}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-[#C5A059] bg-[#C5A059]/10 rounded-lg px-2.5 py-1 font-sans font-bold">
                      {activeContact.leadStage}
                    </span>
                  </div>
                </div>

                {/* Vertical Timeline Stepper */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 pr-3 border-r border-[#2D3139]/40">
                    <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider font-sans mb-1 flex items-center gap-1">
                      <Clock size={12} className="text-[#C5A059]" />
                      {lang === "ar" ? "مسار تتبع الاستحواذ التاريخي" : "Stage Audit Log Trail"}
                    </h4>

                    <div className="space-y-4 overflow-y-auto max-h-[190px] pr-1">
                      {getTimelineSteps(activeContact).map((step, idx) => (
                        <div key={idx} className="flex gap-3 text-right">
                          <div className="relative flex flex-col items-center">
                            <span className="w-2 h-2 rounded-full bg-[#C5A059] border border-[#C5A059]/20" />
                            {idx < getTimelineSteps(activeContact).length - 1 && (
                              <span className="w-0.5 flex-1 bg-[#2D3139]/40 my-1" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white font-sans">{step.title}</p>
                            <p className="text-[10px] text-[#8E9299] line-clamp-1">{step.desc}</p>
                            <span className="text-[9px] text-[#8E9299] font-mono">{step.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick message dispatch panel */}
                  <div className="space-y-3 p-4 bg-black/10 rounded-xl border border-[#2D3139]/40 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white font-sans flex items-center gap-1">
                        <CircleDot size={12} className="text-[#C5A059]" />
                        {lang === "ar" ? "محاكاة إرسال قالب Nabda مخصص" : "Trigger Nabda OTP Layout"}
                      </h4>
                      <p className="text-[10px] text-[#8E9299] mt-0.5 leading-relaxed">
                        {lang === "ar" 
                          ? "اختر قالباً جاهزاً من البوابة لإرساله مباشرة إلى هذا الرقم كاختبار." 
                          : "Simulate template notification trigger for this merchant's phone."}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <select
                        value={sendTemplateId}
                        onChange={(e) => setSendTemplateId(e.target.value)}
                        className="w-full bg-[#191D24] border border-[#2D3139] text-xs text-white rounded-lg px-2 py-2 focus:outline-none"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          onSimulateSingleSend(activeContact.id, sendTemplateId);
                        }}
                        className="w-full bg-[#C5A059] hover:scale-[1.01] text-[#0A0B0E] py-2 rounded-lg text-xs font-bold transition font-sans cursor-pointer flex justify-center items-center gap-1.5"
                      >
                        <Play size={12} fill="#0A0B0E" />
                        {lang === "ar" ? "محاكاة الإرسال فوراً" : "Dispatch Outbox Link"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Chat Thread segment */}
              <div className="bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl flex-1 flex flex-col h-[280px] justify-between">
                <div className="flex justify-between items-center pb-2 border-b border-white/3">
                  <span className="text-[11px] text-[#8E9299] font-sans">
                    {lang === "ar" ? "💬 محاكاة غرف دردشة واتساب ويب" : "💬 WABA Chat Simulator Mode"}
                  </span>
                  <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>ENCRYPTED</span>
                  </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                  {getChatMessages(activeContact).length === 0 ? (
                    <div className="text-center py-12 text-[#8E9299]/50 text-xs font-sans italic">
                      {lang === "ar" ? "لا توجد رسائل سابقة. أرسل الآن قالباً لبدء الحديث." : "No historic logs loaded yet. Fire a template first."}
                    </div>
                  ) : (
                    getChatMessages(activeContact).map((chat, idx) => {
                      if (chat.type === "system_info") {
                        return (
                          <div key={idx} className="text-center">
                            <span className="inline-block bg-zinc-900 border border-white/5 text-[9px] text-[#8E9299] px-2 py-0.5 rounded font-mono">
                              ℹ️ {chat.text}
                            </span>
                          </div>
                        );
                      }

                      const isOutbound = chat.sender === "system";
                      return (
                        <div 
                          key={idx} 
                          className={`flex ${isOutbound ? "justify-start" : "justify-end"}`}
                        >
                          <div 
                            className={`p-3 rounded-2xl max-w-[70%] text-xs leading-relaxed font-sans ${
                              isOutbound 
                                ? "bg-[#1C2128] text-white rounded-tl-none border border-white/5" 
                                : "bg-[#C5A059]/10 text-white border border-[#C5A059]/20 rounded-tr-none"
                            }`}
                          >
                            <p className="font-bold text-[9px] opacity-60 mb-0.5">
                              {isOutbound ? "Nabda WABA Node" : "Iraqi Merchant"}
                            </p>
                            <p className="text-white font-medium">{chat.text}</p>
                            <div className="flex justify-end gap-1 items-center mt-1 text-[8px] opacity-50 font-mono">
                              <span>{chat.time}</span>
                              {isOutbound && <CheckCheck size={10} className="text-emerald-400" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat text box input */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    placeholder={lang === "ar" ? "أكتب رد يدوي مخصص..." : "Type custom simulated chat response..."}
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                    className="flex-1 bg-[#191D24] border border-[#2D3139] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#C5A059] font-sans"
                  />
                  <button
                    onClick={handleSend}
                    className="bg-[#C5A059] hover:scale-[1.03] text-[#0A0B0E] p-2.5 rounded-xl transition font-sans cursor-pointer flex items-center shrink-0"
                    title="Send"
                  >
                    <Send size={14} />
                  </button>
                </div>

              </div>
            </>
          ) : (
            <div className="bg-[#14171D] border border-white/5 rounded-2xl p-16 text-center my-auto flex flex-col items-center justify-center space-y-4">
              <Users size={48} className="text-[#8E9299]/30" />
              <p className="text-xs text-[#8E9299] font-sans font-medium">
                {lang === "ar" ? "الرجاء اختيار جهة اتصال من القائمة لبدء التتبع الزمني" : "Select a contact from left list to activate live audit timeline and chat window."}
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
