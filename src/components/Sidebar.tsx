import React from "react";
import { 
  LayoutDashboard, 
  SendHorizontal, 
  FileText, 
  Users, 
  MessageSquare, 
  Webhook, 
  BarChart3, 
  Settings, 
  Globe, 
  Layers,
  Menu,
  X,
  Bell,
  Box,
  Smartphone,
  ShieldCheck,
  Film,
  Milestone
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  lang: "ar" | "en";
  setLang: (lang: "ar" | "en") => void;
  unreadInboxCount: number;
}

export default function Sidebar({
  activeSection,
  setActiveSection,
  lang,
  setLang,
  unreadInboxCount
}: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const menuItems = [
    // Group 1: Core CRM
    {
      id: "dashboard",
      labelAr: "لوحة التحكم الرئيسية",
      labelEn: "Dashboard Overview",
      icon: LayoutDashboard,
      group: "crm"
    },
    {
      id: "contacts",
      labelAr: "قائمة جهات الاتصال",
      labelEn: "Contacts Directory",
      icon: Users,
      group: "crm"
    },
    {
      id: "leads",
      labelAr: "قمع وتدفق العملاء",
      labelEn: "Leads Funnel Board",
      icon: Milestone,
      group: "crm"
    },
    {
      id: "inbox",
      labelAr: "صندوق الردود المستلمة",
      labelEn: "Replies Inbox",
      icon: MessageSquare,
      badge: unreadInboxCount > 0 ? unreadInboxCount : undefined,
      group: "crm"
    },
    {
      id: "conversations",
      labelAr: "مركز المتابعة والدردشة",
      labelEn: "Conversations Timeline",
      icon: MessageSquare,
      group: "crm"
    },
    {
      id: "followups",
      labelAr: "طوابير الحث والمتابعة",
      labelEn: "Follow-Up Center",
      icon: Bell,
      group: "crm"
    },
    // Group 2: Campaigns & Copy
    {
      id: "campaigns",
      labelAr: "حملات البث والإرسال",
      labelEn: "Outreach Campaigns",
      icon: SendHorizontal,
      group: "marketing"
    },
    {
      id: "media",
      labelAr: "مكتبة الوسائط والميديا",
      labelEn: "Media & Campaigns",
      icon: Film,
      group: "marketing"
    },
    {
      id: "templates",
      labelAr: "قوالب الرسائل و A/B",
      labelEn: "Message Templates",
      icon: FileText,
      group: "marketing"
    },
    // Group 3: Nabda APIs
    {
      id: "bundles",
      labelAr: "إدارة الباقات وحصصها",
      labelEn: "Nabda Bundles",
      icon: Box,
      group: "api"
    },
    {
      id: "instances",
      labelAr: "أجهزة وقنوات الواتساب",
      labelEn: "WhatsApp Instances",
      icon: Smartphone,
      group: "api"
    },
    {
      id: "webhooks",
      labelAr: "أحداث ومراقبة الويب هوك",
      labelEn: "Webhook Monitor",
      icon: Webhook,
      group: "api"
    },
    // Group 4: Insights & Ops
    {
      id: "analytics",
      labelAr: "إحصائيات وقراءات القمع",
      labelEn: "Funnel Analytics",
      icon: BarChart3,
      group: "insights"
    },
    {
      id: "billing-security",
      labelAr: "الفوترة وأمان الـ OTP",
      labelEn: "Billing & OTP Security",
      icon: ShieldCheck,
      group: "insights"
    },
    {
      id: "settings",
      labelAr: "إعدادات مزود الخدمة",
      labelEn: "CRM Settings",
      icon: Settings,
      group: "insights"
    }
  ];

  const handleSelect = (id: string) => {
    setActiveSection(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="bg-[#14171D] text-[#C5A059] p-2 rounded-lg border border-[#2D3139] flex items-center gap-1 text-xs font-semibold hover:bg-[#1C2128]"
        >
          <Globe size={14} />
          {lang === "ar" ? "EN" : "عربي"}
        </button>
        <button
          id="mobile_sidebar_toggle"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#14171D] border border-[#2D3139] text-[#C5A059] p-2.5 rounded-lg shadow-lg hover:bg-[#1C2128] transition"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 right-0 h-screen w-80 bg-[#14171D] border-l border-[#2D3139] p-5 flex flex-col z-45 transition-transform duration-300 md:translate-x-0
          ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
          ${lang === "ar" ? "rtl font-sans" : "ltr font-sans"}
        `}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#2D3139] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059] flex items-center justify-center shadow-[0_0_15px_rgba(197,160,89,0.3)]">
              <Layers className="text-[#0A0B0E]" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-[#C5A059] tracking-tight">شاكو ماكو</h1>
                <span className="text-[9px] bg-[#C5A059]/15 text-[#C5A059] px-1.5 py-0.5 rounded-md font-mono border border-[#C5A059]/20">CRM</span>
              </div>
              <p className="text-[10px] text-[#8E9299] uppercase tracking-widest">CRM & Outreach</p>
            </div>
          </div>
        </div>

        {/* Localized Lang Banner Selector & Title */}
        <div className="hidden md:flex items-center justify-between gap-2 p-2 bg-[#1C2128]/40 rounded-lg border border-[#2D3139] mb-6 text-xs text-[#8E9299]">
          <span className="flex items-center gap-1.5 text-[#8E9299]">
            <Globe size={12} className="text-[#C5A059]" />
            {lang === "ar" ? "لغة الواجهة:" : "Language:"}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setLang("ar")}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                lang === "ar" 
                  ? "bg-[#C5A059] text-[#0A0B0E] shadow-sm" 
                  : "text-[#8E9299] hover:text-[#E2E8F0]"
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                lang === "en" 
                  ? "bg-[#C5A059] text-[#0A0B0E] shadow-sm" 
                  : "text-[#8E9299] hover:text-[#E2E8F0]"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
          {[
            { id: "crm", labelAr: "إدارة علاقات العملاء", labelEn: "Core CRM & Pipelines" },
            { id: "marketing", labelAr: "الحملات والمبيعات", labelEn: "Outreach & Campaign Suite" },
            { id: "api", labelAr: "بوابات وقنوات Nabda", labelEn: "Nabda WABA Channels" },
            { id: "insights", labelAr: "التحليلات والتحكم", labelEn: "Security & Analytics" }
          ].map((grp) => {
            const itemsInGroup = menuItems.filter(item => item.group === grp.id);
            return (
              <div key={grp.id} className="space-y-1">
                <span className="block px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
                  {lang === "ar" ? grp.labelAr : grp.labelEn}
                </span>
                
                {itemsInGroup.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      id={`sidebar_btn_${item.id}`}
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all duration-150 group cursor-pointer
                        ${isActive 
                          ? "bg-[#C5A059]/10 text-[#C5A059] border-r-4 border-[#C5A059] font-bold scale-[0.98]" 
                          : "text-[#8E9299] hover:text-[#E2E8F0] hover:bg-white/5"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComponent 
                          size={15} 
                          className={`transition-colors ${
                            isActive ? "text-[#C5A059]" : "text-[#8E9299] group-hover:text-[#E2E8F0]"
                          }`} 
                        />
                        <span className="whitespace-nowrap text-right">
                          {lang === "ar" ? item.labelAr : item.labelEn}
                        </span>
                      </div>
                      {item.badge !== undefined && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? "bg-[#C5A059] text-[#0A0B0E]" : "bg-red-500 text-white animate-pulse"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer info and status */}
        <div className="pt-4 border-t border-[#2D3139] mt-auto text-[11px] text-[#8E9299] text-center space-y-1.5">
          <div className="bg-[#1C2128] rounded-xl p-3 border border-[#2D3139] flex items-center justify-between text-right mb-2">
            <span className="text-[10px] font-bold text-[#8E9299]">NABDA API</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#C5A059] font-mono">ACTIVE</span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>
          </div>
          <p className="text-[10px]">© 2026 Shaku Maku Technologies</p>
        </div>
      </aside>
    </>
  );
}
