import React, { useState } from "react";
import { 
  PlusCircle, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Briefcase, 
  Layers, 
  Sparkles,
  Phone,
  CheckCircle2,
  Bookmark,
  Calendar,
  Search
} from "lucide-react";
import { Contact, LeadStage } from "../types";
import { GOVERNORATES_AR, CATEGORIES_AR } from "../mockData";

// Let's declare all possible stages for our comprehensive Acquisition Pipeline
const STAGES_LIST = [
  { id: LeadStage.NEW, labelAr: "مستورد جديد", labelEn: "Imported Contact", color: "border-slate-800 text-slate-400 bg-slate-900/30" },
  { id: LeadStage.SENT, labelAr: "تم الإرسال", labelEn: "Outreach Sent", color: "border-blue-500/30 text-blue-400 bg-blue-500/5" },
  { id: LeadStage.DELIVERED, labelAr: "مستلم بالهاتف", labelEn: "Delivered", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" },
  { id: LeadStage.READ, labelAr: "تمت القراءة", labelEn: "Read Receipt", color: "border-purple-500/30 text-purple-400 bg-purple-500/5" },
  { id: LeadStage.REPLIED, labelAr: "مستجيب رد", labelEn: "Customer Replied", color: "border-amber-500/30 text-amber-400 bg-amber-500/5" },
  { id: LeadStage.INTERESTED, labelAr: "مهتم ومستهدف", labelEn: "Interested", color: "border-green-500/30 text-green-400 bg-green-500/5" },
  { id: LeadStage.FOLLOW_UP, labelAr: "متابعة ضرورية", labelEn: "Follow-Up Cue", color: "border-red-500/30 text-red-400 bg-red-500/5" },
  { id: LeadStage.REGISTERED, labelAr: "مسجل بالكامل", labelEn: "Fully Registered", color: "border-teal-500/30 text-teal-400 bg-teal-500/5" },
  { id: LeadStage.NOT_INTERESTED, labelAr: "غير مهتم", labelEn: "Not Interested", color: "border-rose-900/35 text-rose-500 bg-rose-950/10" },
  { id: LeadStage.BAD_NUMBER, labelAr: "رقم خاطئ", labelEn: "Bad / Bounce", color: "border-stone-850 text-stone-500 bg-stone-900/10" }
];

interface LeadsBoardViewProps {
  contacts: Contact[];
  onUpdateStage: (id: string, stage: LeadStage) => void;
  lang: "ar" | "en";
}

export default function LeadsBoardView({
  contacts,
  onUpdateStage,
  lang
}: LeadsBoardViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGov, setFilterGov] = useState("All");

  // Filter contacts initially
  const filteredContacts = contacts.filter(c => {
    const matchSearch = c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.phone.includes(searchTerm) || 
                        (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchGov = filterGov === "All" || c.governorate === filterGov;
    return matchSearch && matchGov;
  });

  // Promote contact to next stage in the array
  const handlePromote = (contact: Contact) => {
    const currentIndex = STAGES_LIST.findIndex(s => s.id === contact.leadStage);
    if (currentIndex !== -1 && currentIndex < STAGES_LIST.length - 1) {
      onUpdateStage(contact.id, STAGES_LIST[currentIndex + 1].id as LeadStage);
    }
  };

  // Demote contact to previous stage in the array
  const handleDemote = (contact: Contact) => {
    const currentIndex = STAGES_LIST.findIndex(s => s.id === contact.leadStage);
    if (currentIndex !== -1 && currentIndex > 0) {
      onUpdateStage(contact.id, STAGES_LIST[currentIndex - 1].id as LeadStage);
    }
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="text-[#C5A059]" size={22} />
            {lang === "ar" ? "قمع إدارة وتتبع العملاء المتوقعين" : "Growth Leads & CRM Pipeline"}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">
            {lang === "ar" 
              ? "استعرض تقدم مشاريع أصحاب الأعمال على امتداد دورة الاستحواذ بالكامل. انقر لتعديل وتوجيه الحالات." 
              : "Track and transition merchant progress across our structured 10-stage growth and activation funnel."}
          </p>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-[#14171D] p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <span className="absolute top-3 right-3 text-[#8E9299]">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder={lang === "ar" ? "البحث باسم المتجر أو الرقم..." : "Search merchant name, phone, or logs..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg py-2.5 pr-9 pl-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C5A059] font-sans"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center shrink-0">
          <label className="text-xs text-[#8E9299] font-sans whitespace-nowrap">
            {lang === "ar" ? "المحافظة:" : "Governorate:"}
          </label>
          <select
            value={filterGov}
            onChange={(e) => setFilterGov(e.target.value)}
            className="bg-[#191D24] border border-[#2D3139] text-xs text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#C5A059] cursor-pointer font-sans"
          >
            <option value="All">{lang === "ar" ? "الكل" : "All governorates"}</option>
            <option value="Baghdad">{lang === "ar" ? "بغداد" : "Baghdad"}</option>
            <option value="Basra">{lang === "ar" ? "البصرة" : "Basra"}</option>
            <option value="Erbil">{lang === "ar" ? "أربيل" : "Erbil"}</option>
            <option value="Sulaymaniyah">{lang === "ar" ? "السليمانية" : "Sulaymaniyah"}</option>
            <option value="Najaf">{lang === "ar" ? "النجف" : "Najaf"}</option>
          </select>
        </div>
      </div>

      {/* Horizontal Kanban Scroller */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1600px] h-[650px] items-stretch">
          
          {STAGES_LIST.map((stage) => {
            const stageContacts = filteredContacts.filter(c => c.leadStage === stage.id);
            return (
              <div 
                key={stage.id} 
                className="w-80 bg-[#14171D] rounded-2xl border border-white/5 flex flex-col p-4 shadow-xl select-none"
              >
                {/* Column header */}
                <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
                    <h3 className="font-bold text-xs text-white font-sans max-w-[170px] truncate">
                      {lang === "ar" ? stage.labelAr : stage.labelEn}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-[#C5A059] bg-[#C5A059]/10 font-bold px-2 py-0.5 rounded-full">
                    {stageContacts.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageContacts.length === 0 ? (
                    <div className="text-center py-12 text-[#8E9299]/40 text-[11px] font-sans border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center space-y-2">
                      <Bookmark size={20} className="stroke-1 text-slate-700" />
                      <span>{lang === "ar" ? "لا توجد مشاريع" : "Empty Stage"}</span>
                    </div>
                  ) : (
                    stageContacts.map((contact) => (
                      <div 
                        key={contact.id}
                        className="bg-[#191D24] border border-[#2D3139] hover:border-[#C5A059]/40 p-3 rounded-xl shadow-sm hover:shadow-md transition duration-150 space-y-2.5 relative group"
                      >
                        {/* Title and indicators */}
                        <div>
                          <h4 className="font-bold text-xs text-white font-sans line-clamp-1 leading-normal">
                            {contact.businessName}
                          </h4>
                          <p className="text-[10px] text-[#8E9299] font-mono mt-0.5 flex items-center gap-1">
                            <Phone size={8} className="text-[#C5A059]" />
                            {contact.phone}
                          </p>
                        </div>

                        {/* Location and Category badges */}
                        <div className="flex flex-wrap gap-1.5 text-[9px]">
                          <span className="inline-flex items-center gap-0.5 bg-black/20 text-slate-400 border border-white/5 px-2 py-0.5 rounded-md font-sans">
                            <MapPin size={8} className="text-[#C5A059]" />
                            {lang === "ar" ? GOVERNORATES_AR[contact.governorate as keyof typeof GOVERNORATES_AR] || contact.governorate : contact.governorate}
                          </span>
                          <span className="inline-flex items-center gap-0.5 bg-black/20 text-slate-400 border border-white/5 px-2 py-0.5 rounded-md font-sans font-medium">
                            <Briefcase size={8} />
                            {lang === "ar" ? CATEGORIES_AR[contact.category as keyof typeof CATEGORIES_AR] || contact.category : contact.category}
                          </span>
                        </div>

                        {/* Last Message Status Indicator */}
                        {contact.lastMessageStatus !== "none" && (
                          <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-[#8E9299]">
                            <span>Status: <strong className="font-mono text-emerald-400 font-bold uppercase">{contact.lastMessageStatus}</strong></span>
                            {contact.lastReply && (
                              <span className="text-[8px] bg-[#C5A059]/10 text-[#C5A059] px-1 rounded truncate max-w-[80px]">💬 replied</span>
                            )}
                          </div>
                        )}

                        {/* Contact interactive Promotion controls */}
                        <div className="pt-2 border-t border-white/5 flex gap-1.5 justify-between">
                          <button
                            onClick={() => handleDemote(contact)}
                            disabled={STAGES_LIST.findIndex(s => s.id === contact.leadStage) === 0}
                            className="bg-[#14171D] text-[#8E9299] hover:text-[#C5A059] disabled:opacity-30 disabled:hover:text-[#8E9299] p-1.5 rounded border border-[#2D3139] hover:border-white/10 transition cursor-pointer text-[10px]"
                            title="Move back"
                          >
                            <ChevronLeft size={11} />
                          </button>

                          <span className="text-[9px] text-slate-500 font-mono self-center">
                            {lang === "ar" ? "نقل" : "Shift"}
                          </span>

                          <button
                            onClick={() => handlePromote(contact)}
                            disabled={STAGES_LIST.findIndex(s => s.id === contact.leadStage) === STAGES_LIST.length - 1}
                            className="bg-[#14171D] text-[#8E9299] hover:text-[#C5A059] disabled:opacity-30 disabled:hover:text-[#8E9299] p-1.5 rounded border border-[#2D3139] hover:border-white/10 transition cursor-pointer text-[10px]"
                            title="Move forward"
                          >
                            <ChevronRight size={11} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
}
