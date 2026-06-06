import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  MapPin, 
  Briefcase, 
  Clock, 
  MailWarning, 
  MessageCircle, 
  UserPlus, 
  CheckCircle,
  FileSpreadsheet,
  Plus,
  BookOpen,
  ChevronRight,
  Eye,
  Settings
} from "lucide-react";
import { Contact, LeadStage, MessageTemplate } from "../types";
import { GOVERNORATES, GOVERNORATES_AR, CATEGORIES, CATEGORIES_AR } from "../mockData";

interface ContactsViewProps {
  contacts: Contact[];
  templates: MessageTemplate[];
  lang: "ar" | "en";
  onUpdateLeadStage: (id: string, stage: LeadStage) => void;
  onUpdateLeadNotes: (id: string, notes: string) => void;
  onAddContact: (contact: Omit<Contact, "id" | "updatedAt">) => void;
  onSimulateSingleSend: (id: string, templateId: string) => void;
}

export default function ContactsView({
  contacts,
  templates,
  lang,
  onUpdateLeadStage,
  onUpdateLeadNotes,
  onAddContact,
  onSimulateSingleSend
}: ContactsViewProps) {
  // Search and Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGov, setFilterGov] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStage, setFilterStage] = useState("All");
  const [filterTemplate, setFilterTemplate] = useState("All");
  const [filterReplied, setFilterReplied] = useState("All"); // "All", "Replied", "Not Replied"
  const [filterRegistered, setFilterRegistered] = useState("All"); // "All", "Registered", "Not Registered"

  // Lead Drawer State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Contact Inputs
  const [newPhone, setNewPhone] = useState("+964");
  const [newBName, setNewBName] = useState("");
  const [newGov, setNewGov] = useState("Baghdad");
  const [newCat, setNewCat] = useState("Restaurant");
  const [newSource, setNewSource] = useState("Manual Scouting");

  // Single Send selection for specific lead
  const [sendWithTemplateId, setSendWithTemplateId] = useState("");

  React.useEffect(() => {
    if (templates.length > 0 && !sendWithTemplateId) {
      setSendWithTemplateId(templates[0].id);
    }
  }, [templates]);

  // Handle Form submit
  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBName.trim() || newPhone.trim().length < 6) return;
    
    onAddContact({
      phone: newPhone,
      businessName: newBName,
      governorate: newGov,
      category: newCat,
      source: newSource,
      lastMessageStatus: "none",
      leadStage: LeadStage.NEW
    });

    // Reset Form
    setNewPhone("+964");
    setNewBName("");
    setNewGov("Baghdad");
    setNewCat("Restaurant");
    setNewSource("Manual Scouting");
    setShowAddModal(false);
  };

  // Status Style Maps
  const stageStyles: Record<LeadStage, { text: string, bg: string, border: string }> = {
    [LeadStage.NEW]: { text: "text-blue-300", bg: "bg-blue-900/10", border: "border-blue-900/30" },
    [LeadStage.SENT]: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    [LeadStage.DELIVERED]: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    [LeadStage.READ]: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    [LeadStage.REPLIED]: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    [LeadStage.INTERESTED]: { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    [LeadStage.FOLLOW_UP]: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    [LeadStage.REGISTERED]: { text: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
    [LeadStage.NOT_INTERESTED]: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    [LeadStage.BAD_NUMBER]: { text: "text-slate-500", bg: "bg-slate-800/20", border: "border-slate-800" },
  };

  // Last message status label
  const msgStatusColors = {
    sent: "text-blue-400 bg-blue-500/10",
    delivered: "text-emerald-400 bg-emerald-500/10",
    read: "text-purple-400 bg-purple-500/10",
    failed: "text-red-400 bg-red-500/10",
    none: "text-slate-500 bg-slate-853/10"
  };

  // Perform Filters
  const filteredContacts = contacts.filter((c) => {
    // Search
    const matchSearch = c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.phone.includes(searchTerm) || 
                        (c.lastReply && c.lastReply.toLowerCase().includes(searchTerm.toLowerCase()));

    // Gov
    const matchGov = filterGov === "All" || c.governorate === filterGov;

    // Cat
    const matchCat = filterCat === "All" || c.category === filterCat;

    // Stage
    const matchStage = filterStage === "All" || c.leadStage === filterStage;

    // Template
    const matchTemplate = filterTemplate === "All" || c.assignedTemplateId === filterTemplate;

    // Replied status
    let matchReplied = true;
    if (filterReplied === "Replied") {
      matchReplied = !!c.lastReply || c.leadStage === LeadStage.REPLIED;
    } else if (filterReplied === "Not Replied") {
      matchReplied = !c.lastReply && c.leadStage !== LeadStage.REPLIED;
    }

    // Registered status
    let matchRegistered = true;
    if (filterRegistered === "Registered") {
      matchRegistered = c.leadStage === LeadStage.REGISTERED;
    } else if (filterRegistered === "Not Registered") {
      matchRegistered = c.leadStage !== LeadStage.REGISTERED;
    }

    return matchSearch && matchGov && matchCat && matchStage && matchTemplate && matchReplied && matchRegistered;
  });

  // Translations
  const txt = {
    title: lang === "ar" ? "حقيبة جهات الاتصال والمهتمين" : "Lead & Customers Directory",
    desc: lang === "ar" ? "قائمة متكاملة لإدارة المهتمين ومتابعة وتحديث حالات التسجيل والتواصل مع أصحاب الأعمال في العراق" : "Search, filter, and manually update onboarding pipeline stages or append CRM client notes",
    btnAdd: lang === "ar" ? "إضافة جهة اتصال +" : "Add Contact +",
    lblSearch: lang === "ar" ? "البحث عن عمل، هاتف..." : "Search business name, phone...",
    lblF1: lang === "ar" ? "المحافظة" : "Governorate",
    lblF2: lang === "ar" ? "التصنيف" : "Category",
    lblF3: lang === "ar" ? "المرحلة" : "Lead Stage",
    lblF4: lang === "ar" ? "القالب" : "Template",
    lblF5: lang === "ar" ? "حالة الرد" : "WhatsApp Reply",
    lblF6: lang === "ar" ? "حالة التسجيل" : "Registered Stat",
    all: lang === "ar" ? "الكل" : "All",
    statusCol: lang === "ar" ? "الإيصال" : "Delivery",
    activeTotal: lang === "ar" ? "عدد نتائج التصفية:" : "Filtered Contacts:",
    thBiz: lang === "ar" ? "اسم المشروع التجاري / الهاتف" : "Business / Phone",
    thLoc: lang === "ar" ? "المدينة والتصنيف" : "Geo / Category",
    thStage: lang === "ar" ? "مرحلة القمع" : "Sales Funnel Stage",
    thActions: lang === "ar" ? "الإجراءات" : "Actions",
    noResults: lang === "ar" ? "لا توجد نتائج مطابقة شروط التصفية" : "No results match active filtering query",
    // Drawer
    drawerTitle: lang === "ar" ? "تفاصيل ملف العميل" : "Lead Profile Details",
    drawerPhone: lang === "ar" ? "رقم الهاتف والواتساب" : "WhatsApp Number",
    drawerNotes: lang === "ar" ? "ملاحظات فريق المبيعات والمتابعة" : "CRM Follow-up Notes",
    drawerUpdateStage: lang === "ar" ? "تعديل مرحلة العميل يدوياً" : "Manually Shift Pipeline Stage",
    drawerRepliedLabel: lang === "ar" ? "آخر رد مستلم عبر Nabda:" : "Latest Chat Reply received:",
    drawerAddNotesBtn: lang === "ar" ? "تحديث الملاحظات" : "Update CRM Notes",
    drawerSimulateBtn: lang === "ar" ? "إرسال رسالة تجريبية فردية" : "Test Single Send Message",
    drawerAssignedTemp: lang === "ar" ? "القالب المرسل:" : "Used Template:",
    // Modal
    modalTitle: lang === "ar" ? "إضافة عمل تجاري جديد للقمع" : "Add New Business Pitch",
    btnSaveContact: lang === "ar" ? "حفظ كجهة اتصال جديدة" : "Save as New Lead"
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Top action block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-[#2D3139] shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="text-[#C5A059]" size={22} />
            {txt.title}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">{txt.desc}</p>
        </div>
        <button
          id="btn_add_contact_show"
          onClick={() => setShowAddModal(true)}
          className="bg-[#C5A059] hover:scale-[1.02] text-[#0A0B0E] px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#C5A059]/20 flex items-center gap-1.5 self-start md:self-center font-sans cursor-pointer"
        >
          <Plus size={16} />
          {txt.btnAdd}
        </button>
      </div>

      {/* CRM Deep Filtering Block */}
      <div className="bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl space-y-4">
        
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute top-3.5 right-3.5 text-[#8E9299]" />
          <input
            id="contact_search_input"
            type="text"
            placeholder={txt.lblSearch}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl py-3 pr-10 pl-4 text-xs text-white focus:outline-none focus:border-[#C5A059] font-sans transition"
          />
        </div>

        {/* Dropdowns filters */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
          
          {/* Gov */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{txt.lblF1}</label>
            <select
              value={filterGov}
              onChange={(e) => setFilterGov(e.target.value)}
              className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2 py-2 text-xs text-white cursor-pointer focus:outline-none focus:border-[#C5A059]"
            >
              <option value="All">{txt.all}</option>
              {GOVERNORATES.map(gov => (
                <option key={gov} value={gov}>
                  {lang === "ar" ? GOVERNORATES_AR[gov as keyof typeof GOVERNORATES_AR] : gov}
                </option>
              ))}
            </select>
          </div>

          {/* Cat */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{txt.lblF2}</label>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2 py-2 text-xs text-white cursor-pointer focus:outline-none focus:border-[#C5A059]"
            >
              <option value="All">{txt.all}</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {lang === "ar" ? CATEGORIES_AR[cat as keyof typeof CATEGORIES_AR] : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stage */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{txt.lblF3}</label>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2 py-2 text-xs text-white cursor-pointer focus:outline-none focus:border-[#C5A059]"
            >
              <option value="All">{txt.all}</option>
              {Object.values(LeadStage).map(stage => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          {/* Template */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{txt.lblF4}</label>
            <select
              value={filterTemplate}
              onChange={(e) => setFilterTemplate(e.target.value)}
              className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2 py-2 text-xs text-white cursor-pointer focus:outline-none focus:border-[#C5A059]"
            >
              <option value="All">{txt.all}</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Replied / Not Replied */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{txt.lblF5}</label>
            <select
              value={filterReplied}
              onChange={(e) => setFilterReplied(e.target.value)}
              className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2 py-2 text-xs text-white cursor-pointer focus:outline-none focus:border-[#C5A059]"
            >
              <option value="All">{txt.all}</option>
              <option value="Replied">{lang === "ar" ? "مستجيب رد" : "Replied"}</option>
              <option value="Not Replied">{lang === "ar" ? "لم يستجب بعد" : "No Response"}</option>
            </select>
          </div>

          {/* Registered / Not Registered */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">{txt.lblF6}</label>
            <select
              value={filterRegistered}
              onChange={(e) => setFilterRegistered(e.target.value)}
              className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2 py-2 text-xs text-white cursor-pointer focus:outline-none focus:border-[#C5A059]"
            >
              <option value="All">{txt.all}</option>
              <option value="Registered">{lang === "ar" ? "مسجل بالكامل" : "Registered"}</option>
              <option value="Not Registered">{lang === "ar" ? "غير مسجل بعد" : "Not Registered"}</option>
            </select>
          </div>

        </div>

        {/* Total rows found indicator */}
        <div className="pt-3 border-t border-white/5 text-[11px] text-[#8E9299] flex justify-between items-center font-sans">
          <span>{txt.activeTotal} <strong className="font-mono text-[#C5A059] font-bold text-xs">{filteredContacts.length}</strong></span>
          <span className="text-slate-500 font-mono text-[10px]">Source: CRM SQLite Schema Mode</span>
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="bg-[#14171D] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-[#E2E8F0] text-right">
            <thead>
              <tr className="bg-[#1C2128] text-[#8E9299] border-b border-[#2D3139]">
                <th className="py-4 px-4 font-bold text-right">{txt.thBiz}</th>
                <th className="py-4 px-4 font-bold text-right">{txt.thLoc}</th>
                <th className="py-4 px-4 font-bold text-center">{txt.statusCol}</th>
                <th className="py-4 px-4 font-bold text-right">{txt.thStage}</th>
                <th className="py-4 px-4 font-bold text-center">{txt.thActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#8E9299] text-xs">
                    {txt.noResults}
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => {
                  const style = stageStyles[contact.leadStage] || stageStyles[LeadStage.NEW];
                  return (
                    <tr 
                      key={contact.id} 
                      className={`hover:bg-[#1C2128]/50 transition duration-150 ${
                        selectedContact?.id === contact.id ? "bg-[#C5A059]/5" : ""
                      }`}
                    >
                      {/* Name with phone under */}
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-bold text-white transition font-sans">
                          {contact.businessName}
                        </p>
                        <p className="font-mono text-[10px] text-[#8E9299] mt-0.5 tracking-tight">
                          {contact.phone}
                        </p>
                      </td>

                      {/* City / Cat */}
                      <td className="py-3.5 px-4 text-right space-y-1">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <MapPin size={11} className="text-[#C5A059]" />
                          {lang === "ar" ? GOVERNORATES_AR[contact.governorate as keyof typeof GOVERNORATES_AR] || contact.governorate : contact.governorate}
                        </span>
                        <span className="block text-[10px] text-[#8E9299] font-sans">
                          {lang === "ar" ? CATEGORIES_AR[contact.category as keyof typeof CATEGORIES_AR] || contact.category : contact.category}
                        </span>
                      </td>

                      {/* Last Message Delivery Ack status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide uppercase ${
                          msgStatusColors[contact.lastMessageStatus]
                        }`}>
                          {contact.lastMessageStatus === "none" ? "not sent" : contact.lastMessageStatus}
                        </span>
                      </td>

                      {/* Lead stage badge */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                          style.text
                        } ${style.bg} ${style.border}`}>
                          {contact.leadStage}
                        </span>
                        {contact.lastReply && (
                          <div className="text-[10px] text-[#8E9299] mt-1 line-clamp-1 italic max-w-xs block font-sans font-medium">
                            ↳ "{contact.lastReply}"
                          </div>
                        )}
                      </td>

                      {/* Edit / View detail action button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          id={`lead_action_btn_${contact.id}`}
                          onClick={() => setSelectedContact(contact)}
                          className="bg-[#1C2128] text-[#8E9299] hover:text-[#C5A059] p-2 rounded-lg border border-[#2D3139] hover:border-white/10 transition cursor-pointer"
                          title="View lead card"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Lead details side-drawer popup */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-end animate-in fade-in duration-200">
          <div 
            className="absolute inset-0" 
            onClick={() => {
              setSelectedContact(null);
            }} 
          />
          <div className="relative w-full max-w-md bg-[#14171D] border-l border-[#2D3139] h-full overflow-y-auto p-6 space-y-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-[#C5A059]" size={18} />
                  <h3 className="font-bold text-white text-sm">{txt.drawerTitle}</h3>
                </div>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="bg-[#1C2128] border border-[#2D3139] text-[#8E9299] hover:text-[#C5A059] px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition"
                >
                  {lang === "ar" ? "إغلاق" : "Close"}
                </button>
              </div>

              {/* Lead identity block */}
              <div className="bg-[#1C2128] p-4 rounded-xl border border-[#2D3139] space-y-2">
                <p className="font-bold text-white text-base font-sans">{selectedContact.businessName}</p>
                <p className="text-xs text-[#8E9299] flex items-center gap-1.5">
                  <strong>{txt.drawerPhone}:</strong> 
                  <span className="font-mono text-[#C5A059] font-bold">{selectedContact.phone}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8E9299] pt-2 border-t border-white/5 font-sans">
                  <p>📍 {lang === "ar" ? GOVERNORATES_AR[selectedContact.governorate as keyof typeof GOVERNORATES_AR] || selectedContact.governorate : selectedContact.governorate}</p>
                  <p>🏷️ {lang === "ar" ? CATEGORIES_AR[selectedContact.category as keyof typeof CATEGORIES_AR] || selectedContact.category : selectedContact.category}</p>
                  <p>🔍 Source: {selectedContact.source}</p>
                  <p>⏰ Updated: {new Date(selectedContact.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Lead Stage Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold block">{txt.drawerUpdateStage}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(LeadStage).map((stg) => {
                    const isCurrent = selectedContact.leadStage === stg;
                    return (
                      <button
                        id={`drawer_stage_btn_${stg}`}
                        key={stg}
                        onClick={() => {
                          onUpdateLeadStage(selectedContact.id, stg);
                          setSelectedContact({
                            ...selectedContact,
                            leadStage: stg,
                            updatedAt: new Date().toISOString()
                          });
                        }}
                        className={`px-2.5 py-2.5 text-[10px] font-bold rounded-lg border text-right truncate transition cursor-pointer ${
                          isCurrent 
                            ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold" 
                            : "bg-[#14171D] border-[#2D3139] text-[#8E9299] hover:border-white/10"
                        }`}
                      >
                        {stg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Last reply block (if has reply) */}
              {selectedContact.lastReply && (
                <div className="p-3.5 bg-[#C5A059]/5 border border-[#C5A059]/15 rounded-xl space-y-1">
                  <p className="text-[10px] text-[#C5A059] font-bold">{txt.drawerRepliedLabel}</p>
                  <p className="text-xs text-[#E2E8F0] italic font-sans">"{selectedContact.lastReply}"</p>
                  <span className="text-[9px] text-slate-500 block font-mono">Timestamp: {new Date(selectedContact.lastReplyTime || "").toLocaleTimeString()}</span>
                </div>
              )}

              {/* CRM internal Notes Editor */}
              <div className="space-y-2">
                <label className="text-xs text-[#8E9299] font-bold block">{txt.drawerNotes}</label>
                <textarea
                  id="drawer_notes_textarea"
                  rows={3}
                  defaultValue={selectedContact.notes || ""}
                  onBlur={(e) => {
                    onUpdateLeadNotes(selectedContact.id, e.target.value);
                  }}
                  placeholder={lang === "ar" ? "أكتب ملاحظات الاتصال، مثل: يحتاج متابعة يوم الإثنين القادم..." : "Write contact notes here (auto-saves on focus blur)..."}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#C5A059] transition leading-normal font-sans"
                />
                <p className="text-[9px] text-slate-500 italic">↳ Auto-saves when you click out of the box.</p>
              </div>

            </div>

            {/* Test Individual Message Sprout */}
            <div className="bg-[#1C2128] p-4 rounded-xl border border-[#2D3139] space-y-3.5 mt-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{txt.drawerSimulateBtn}</span>
                <span className="text-[10px] text-[#8E9299] block font-sans">
                  {lang === "ar" 
                    ? "محاكاة إرسال رسالة فردية مخصصة لهذا العميل لإجراء اختبار واتساب"
                    : "Instantly simulate Nabda API message delivery for this individual lead"}
                </span>
              </div>

              <div className="flex gap-2">
                <select
                  value={sendWithTemplateId}
                  onChange={(e) => setSendWithTemplateId(e.target.value)}
                  className="flex-1 bg-[#14171D] border border-[#2D3139] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.language}] - {t.name}
                    </option>
                  ))}
                </select>

                <button
                  id="btn_sim_send_individual"
                  onClick={() => {
                    onSimulateSingleSend(selectedContact.id, sendWithTemplateId);
                    setSelectedContact(null);
                  }}
                  className="bg-[#C5A059] hover:scale-[1.03] text-[#0A0B0E] px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 font-sans cursor-pointer"
                >
                  {lang === "ar" ? "إرسال الاَن" : "Send API"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add New Business Lead popup Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="font-bold text-white text-sm font-sans">{txt.modalTitle}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8E9299] hover:text-white font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4">
              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs text-[#8E9299] font-sans block">{lang === "ar" ? "رقم الهاتف والواتساب المستهدف" : "WhatsApp Phone number"}</label>
                <input
                  id="modal_new_phone"
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              {/* Business Name */}
              <div className="space-y-1">
                <label className="text-xs text-[#8E9299] font-sans block">{lang === "ar" ? "اسم المحل أو الشركة" : "Merchant Business name"}</label>
                <input
                  id="modal_new_bname"
                  type="text"
                  required
                  placeholder={lang === "ar" ? "مثال: مأكولات دجلة وسياح" : "e.g., Dijlah Delights Cafe"}
                  value={newBName}
                  onChange={(e) => setNewBName(e.target.value)}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3.5 py-2.5 text-xs text-white font-sans focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              {/* Governorate Select */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-[#8E9299] font-sans block">{txt.lblF1}</label>
                  <select
                    value={newGov}
                    onChange={(e) => setNewGov(e.target.value)}
                    className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2 py-2 text-xs text-white cursor-pointer focus:outline-none focus:border-[#C5A059]"
                  >
                    {GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>
                        {lang === "ar" ? GOVERNORATES_AR[gov as keyof typeof GOVERNORATES_AR] : gov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#8E9299] font-sans block">{txt.lblF2}</label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    className="w-full bg-[#191D24] border border-[#2D3139] rounded-lg px-2 py-2 text-xs text-white cursor-pointer focus:outline-none focus:border-[#C5A059]"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {lang === "ar" ? CATEGORIES_AR[cat as keyof typeof CATEGORIES_AR] : cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source */}
              <div className="space-y-1">
                <label className="text-xs text-[#8E9299] font-sans block">Merchant Lead Source</label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3.5 py-2.5 text-xs text-white font-sans focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#C5A059] hover:scale-[1.01] text-[#0A0B0E] py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#C5A059]/20 font-sans cursor-pointer mt-2"
              >
                {txt.btnSaveContact}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
