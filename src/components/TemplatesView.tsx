import React, { useState } from "react";
import { 
  FileText, 
  Sparkles, 
  Plus, 
  TrendingUp, 
  Globe, 
  Clock, 
  Trash2,
  Bookmark,
  CheckCircle,
  Copy
} from "lucide-react";
import { MessageTemplate, Contact } from "../types";
import { LeadStage } from "../types";

interface TemplatesViewProps {
  templates: MessageTemplate[];
  contacts: Contact[];
  onCreateTemplate: (template: Omit<MessageTemplate, "id">) => void;
  onDeleteTemplate: (id: string) => void;
  lang: "ar" | "en";
}

export default function TemplatesView({
  templates,
  contacts,
  onCreateTemplate,
  onDeleteTemplate,
  lang
}: TemplatesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [ctaType, setCtaType] = useState<MessageTemplate["ctaType"]>("reply_1");
  const [language, setLanguage] = useState<MessageTemplate["language"]>("Arabic");

  // Gemini assistant states
  const [aiTone, setAiTone] = useState("friendly_respectful");
  const [aiLangStyle, setAiLangStyle] = useState("Iraqi Arabic");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleAiOptimize = async () => {
    if (!text.trim()) {
      setAiError(lang === "ar" ? "يرجى كتابة مسودة رسالة أولاً لكي يقوم الذكاء الاصطناعي بتحسينها." : "Please write a draft copy first for the AI to optimize.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/gemini/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          tone: aiTone,
          language: aiLangStyle
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to contact Gemini endpoint.");
      }
      if (data.optimizedText) {
        setText(data.optimizedText.slice(0, 255));
      } else {
        throw new Error("Empty response received from AI.");
      }
    } catch (err: any) {
      setAiError(err.message || "Something went wrong.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;

    onCreateTemplate({
      name,
      text: text.slice(0, 255),
      ctaType,
      language,
      isABTesting: false
    });

    setName("");
    setText("");
    setCtaType("reply_1");
    setLanguage("Arabic");
    setShowForm(false);
  };

  const getTemplateStats = (templateId: string) => {
    // Filter contacts sent using this specific template!
    const sentContacts = contacts.filter(c => c.assignedTemplateId === templateId && c.lastMessageStatus !== "none");
    const countSent = sentContacts.length;
    const countRead = sentContacts.filter(c => c.lastMessageStatus === "read").length;
    const countReplied = sentContacts.filter(c => c.lastReply || [LeadStage.REPLIED, LeadStage.INTERESTED, LeadStage.REGISTERED].includes(c.leadStage)).length;
    const countReg = sentContacts.filter(c => c.leadStage === LeadStage.REGISTERED).length;

    return {
      sent: countSent,
      readRate: countSent > 0 ? Math.round((countRead / countSent) * 100) : 0,
      replyRate: countSent > 0 ? Math.round((countReplied / countSent) * 100) : 0,
      registrationRate: countSent > 0 ? Math.round((countReg / countSent) * 100) : 0
    };
  };

  // Translations
  const txt = {
    title: lang === "ar" ? "إعداد وقوالب الرسائل" : "WhatsApp Outreach Templates",
    desc: lang === "ar" ? "صياغة نصوص ترويجية قصيرة وجاذبة مع تحديد أزرار الإجراء السريع CTA وقياس واختبار أدائها التسويقي" : "Design high-converting broadcast copies, configure call-to-action behaviors, and inspect A/B conversion matrices",
    btnNew: lang === "ar" ? "قالب جديد +" : "Create Template +",
    tblPerformance: lang === "ar" ? "مقارنة كفاءة القوالب (A/B Testing Insights)" : "Comparative A/B Performance Matrices",
    colName: lang === "ar" ? "اسم القالب والـ CTA" : "Template Title & CTA",
    colSent: lang === "ar" ? "المرسل" : "Sent Volume",
    colReadRate: lang === "ar" ? "معدل القراءة" : "Read Rate",
    colRepRate: lang === "ar" ? "معدل الرد" : "Reply Rate",
    colRegRate: lang === "ar" ? "معدل التسجيل" : "Register %",
    formTitle: lang === "ar" ? "تسجيل قالب رسالة بديل" : "Onboard New Message Template",
    lblTName: lang === "ar" ? "اسم القالب الداخلي" : "Internal Template Identifier",
    lblLanguage: lang === "ar" ? "لغة الرسالة" : "Template Language",
    lblCta: lang === "ar" ? "رابط زر الإجراء السريع (CTA)" : "Primary Call-to-Action Link Group",
    lblText: lang === "ar" ? "نص الرسالة التسويقية" : "WhatsApp Broadcast Copy text",
    lblTextDescAr: "💡 نصيحة: صياغة الرسالة بلهجة ودية عراقية مهذبة وعرض فائدة واضحة يزيد نسبة التفاعل بنسبة 60%.",
    lblTextDescEn: "💡 Tip: Professional yet friendly tone focused on value onboarding scores 60% higher conversion.",
    btnSave: lang === "ar" ? "حفظ القالب" : "Save Template Copy",
    btnCancel: lang === "ar" ? "إلغاء" : "Cancel",
    ctaReply: lang === "ar" ? "رد بالرقم 1 للتأكيد" : "Reply '1' to confirm",
    ctaLink: lang === "ar" ? "رابط زيارة مباشر" : "Direct hyperlink visit",
    ctaRegister: lang === "ar" ? "زر التسجيل الفوري" : "Instant registration CTA",
    ctaVideo: lang === "ar" ? "رابط فيديو يوتيوب" : "Watch tutorial video link",
    charCount: lang === "ar" ? "الحروف المتبقية:" : "Remaining characters:"
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-[#2D3139] shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-[#C5A059]" size={22} />
            {txt.title}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">{txt.desc}</p>
        </div>
        <button
          id="btn_new_template"
          onClick={() => setShowForm(!showForm)}
          className="bg-[#C5A059] hover:scale-[1.02] text-[#0A0B0E] px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#C5A059]/20 flex items-center gap-1.5 self-start md:self-center cursor-pointer"
        >
          <Plus size={16} />
          {showForm ? txt.btnCancel : txt.btnNew}
        </button>
      </div>

      {/* Creation form */}
      {showForm && (
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-2xl animate-in fade-in duration-150">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-5 font-sans">
            <FileText className="text-[#C5A059]" size={18} />
            <h3 className="font-bold text-white text-sm">{txt.formTitle}</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8E9299] font-medium block">{txt.lblTName}</label>
                <input
                  id="template_name_input"
                  type="text"
                  required
                  placeholder={lang === "ar" ? "مثال: ترويج الصالونات النسائية" : "e.g., Erbil Beauty Salon Pitch"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A059] transition"
                />
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8E9299] font-medium block">{txt.lblLanguage}</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as MessageTemplate["language"])}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A059] transition cursor-pointer"
                >
                  <option value="Arabic">العربية / Arabic</option>
                  <option value="Kurdish">كوردی / Kurdish</option>
                  <option value="English">English</option>
                </select>
              </div>

              {/* CTA Type */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8E9299] font-medium block">{txt.lblCta}</label>
                <select
                  value={ctaType}
                  onChange={(e) => setCtaType(e.target.value as MessageTemplate["ctaType"])}
                  className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A059] transition cursor-pointer"
                >
                  <option value="reply_1">{txt.ctaReply}</option>
                  <option value="visit_link">{txt.ctaLink}</option>
                  <option value="register">{txt.ctaRegister}</option>
                  <option value="watch_video">{txt.ctaVideo}</option>
                </select>
              </div>

            </div>

            {/* Template copy text block */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">{txt.lblText}</label>
                <span className={`font-mono font-bold ${text.length > 240 ? "text-red-400" : "text-[#C5A059]"}`}>
                  {txt.charCount} {255 - text.length}
                </span>
              </div>
              <textarea
                id="template_text_input"
                required
                rows={4}
                maxLength={255}
                placeholder={lang === "ar" ? "أكتب هنا نص الرسالة التسويقية..." : "Write broadcast copy under 255 chars..."}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-[#191D24] border border-[#2D3139] rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-[#C5A059] transition font-sans leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 italic">
                {lang === "ar" ? txt.lblTextDescAr : txt.lblTextDescEn}
              </p>

              {/* Gemini AI Smart Assistant Panel */}
              <div className="bg-[#191D24]/60 border border-[#C5A059]/15 rounded-xl p-4 mt-3 space-y-3">
                <div className="flex items-center gap-2 justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#C5A059]" />
                    {lang === "ar" ? "مساعد الصياغة بالذكاء الاصطناعي (Gemini Copilot)" : "AI Copilot Copywriter (Gemini 3.5)"}
                  </span>
                  <span className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded font-mono font-semibold uppercase tracking-wider">
                    powered by gemini
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#8E9299] font-medium block">
                      {lang === "ar" ? "نبرة الصوت المستهدفة" : "Target Outreach Tone"}
                    </span>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full bg-[#14171D] border border-[#2D3139] rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#C5A059] transition cursor-pointer"
                    >
                      <option value="friendly_respectful">{lang === "ar" ? "🤝 ودود ومهذب ولطيف" : "🤝 Friendly & Respectful"}</option>
                      <option value="direct_promo">{lang === "ar" ? "🔥 ترويجي مباشر / عرض قوي" : "🔥 Short Pitch & Promo Offer"}</option>
                      <option value="curiosity_hook">{lang === "ar" ? "⚡ جذب انتباه وتشويق" : "⚡ Curiosity/Urgency Hook"}</option>
                      <option value="professional_b2b">{lang === "ar" ? "💼 مهني ورسمي للأعمال" : "💼 Professional Business-like"}</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#8E9299] font-medium block">
                      {lang === "ar" ? "اللهجة والأسلوب" : "Language Dialect / Style"}
                    </span>
                    <select
                      value={aiLangStyle}
                      onChange={(e) => setAiLangStyle(e.target.value)}
                      className="w-full bg-[#14171D] border border-[#2D3139] rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#C5A059] transition cursor-pointer"
                    >
                      <option value="Iraqi Arabic">{lang === "ar" ? "🇮🇶 اللهجة العراقية اليومية" : "🇮🇶 Iraqi Colloquial Arabic"}</option>
                      <option value="Modern Standard Arabic">{lang === "ar" ? "🇸🇦 الفصحى المبسطة" : "🇸🇦 Standard Arabic"}</option>
                      <option value="Soranî Kurdish">{lang === "ar" ? "☀️ كوردى سورانى (Erbil)" : "☀️ Soranî Kurdish"}</option>
                      <option value="English">{lang === "ar" ? "🇬🇧 الإنجليزية التسويقية" : "🇬🇧 Marketing English"}</option>
                    </select>
                  </div>
                </div>

                {aiError && (
                  <p className="text-[10px] text-red-400 font-sans leading-relaxed">
                    ⚠️ {aiError}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleAiOptimize}
                    className="bg-[#C5A059]/10 hover:bg-[#C5A059]/25 border border-[#C5A059]/20 text-[#C5A059] text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
                        {lang === "ar" ? "جاري التوليد..." : "Refining with Gemini..."}
                      </span>
                    ) : (
                      <>
                        <Sparkles size={11} className="text-[#C5A059]" />
                        {lang === "ar" ? "تحسين بالذكاء الاصطناعي ✨" : "Improve Draft Copy with AI ✨"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="submit"
                className="bg-[#C5A059] hover:scale-[1.02] text-[#0A0B0E] px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-[#C5A059]/10 cursor-pointer"
              >
                {txt.btnSave}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comparative A/B Performance Table */}
      <div className="bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5 mb-4 flex items-center gap-2">
          <TrendingUp className="text-[#C5A059]" size={16} />
          {txt.tblPerformance}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-[#E2E8F0] text-right ml-1">
            <thead>
              <tr className="text-[#8E9299] border-b border-white/5">
                <th className="pb-3 pr-2 font-medium text-right">{txt.colName}</th>
                <th className="pb-3 font-medium text-center">{txt.colSent}</th>
                <th className="pb-3 font-medium text-center">{txt.colReadRate}</th>
                <th className="pb-3 font-medium text-center">{txt.colRepRate}</th>
                <th className="pb-3 font-medium text-left pl-2">{txt.colRegRate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {templates.map((temp) => {
                const stats = getTemplateStats(temp.id);
                return (
                  <tr key={temp.id} className="hover:bg-[#1C2128]/50 transition group">
                    {/* Basic details */}
                    <td className="py-3.5 pr-2 text-right">
                      <p className="font-bold text-white transition">
                        {temp.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] bg-[#14171D] font-mono text-slate-400 px-1.5 py-0.5 rounded border border-[#2D3139]">
                          {temp.language}
                        </span>
                        <span className="text-[9px] text-[#C5A059] bg-[#C5A059]/10 px-1.5 py-0.5 rounded border border-[#C5A059]/20 font-bold">
                          CTA: {temp.ctaType.replace("_", " ")}
                        </span>
                      </div>
                    </td>

                    {/* Sent counts */}
                    <td className="py-3.5 text-center font-mono font-bold text-[#8E9299]">
                      {stats.sent}
                    </td>

                    {/* Read Rate with visual sub-bar */}
                    <td className="py-3.5 text-center">
                      <div className="inline-block text-center mr-1">
                        <span className="font-mono text-purple-400 font-bold block">{stats.readRate}%</span>
                        <div className="w-16 bg-[#14171D] h-1.5 rounded-full mt-1 overflow-hidden mx-auto border border-white/5">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: `${stats.readRate}%` }} />
                        </div>
                      </div>
                    </td>

                    {/* Reply Rate with visual sub-bar */}
                    <td className="py-3.5 text-center">
                      <div className="inline-block text-center mr-1">
                        <span className="font-mono text-[#C5A059] font-bold block">{stats.replyRate}%</span>
                        <div className="w-16 bg-[#14171D] h-1.5 rounded-full mt-1 overflow-hidden mx-auto border border-white/5">
                          <div className="bg-[#C5A059] h-full rounded-full" style={{ width: `${stats.replyRate}%` }} />
                        </div>
                      </div>
                    </td>

                    {/* Registration Rate with visual sub-bar */}
                    <td className="py-3.5 text-left pl-2">
                      <div className="inline-block text-left ml-1">
                        <span className="font-mono text-teal-400 font-bold block">{stats.registrationRate}%</span>
                        <div className="w-16 bg-[#14171D] h-1.5 rounded-full mt-1 overflow-hidden mx-auto border border-white/5">
                          <div className="bg-teal-500 h-full rounded-full" style={{ width: `${stats.registrationRate}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid of Templates for Text Copy and Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((temp) => (
          <div key={temp.id} className="bg-[#1C2128] p-5 rounded-xl border border-[#2D3139] hover:border-white/10 transition flex flex-col justify-between space-y-4 shadow-md">
            <div className="space-y-2.5">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bookmark size={12} className="text-[#C5A059] shrink-0" />
                    {temp.name}
                  </h4>
                  <span className="text-[10px] text-[#8E9299] mt-1 block font-sans">
                    {temp.language === "Arabic" ? "العربية" : temp.language === "Kurdish" ? "کوردی" : "English"}
                  </span>
                </div>
                {templates.length > 2 && (
                  <button
                    onClick={() => onDeleteTemplate(temp.id)}
                    className="p-1.5 hover:bg-white/5 text-red-400/80 hover:text-red-400 transition rounded-lg cursor-pointer"
                    title="حذف القالب"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Message block look */}
              <div className="bg-[#14171D] p-4 rounded-xl border border-white/5 text-xs text-[#E2E8F0] leading-relaxed font-sans relative">
                <span className="text-[9px] font-mono text-slate-400 absolute top-2.5 left-2.5 block bg-[#1C2128] px-1.5 py-0.5 rounded border border-[#2D3139]">
                  {temp.text.length} chars
                </span>
                <p className="pt-3 font-sans">"{temp.text}"</p>
                
                {/* Simulated Quick Action button matching CTA */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                  <span className="text-[11px] text-[#8E9299] font-sans">WhatsApp CTA:</span>
                  <span className="text-[11px] bg-[#C5A059]/10 text-[#C5A059] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-[#C5A059]/15">
                    <CheckCircle size={10} />
                    {temp.ctaType === "reply_1" ? txt.ctaReply :
                     temp.ctaType === "visit_link" ? txt.ctaLink :
                     temp.ctaType === "register" ? txt.ctaRegister :
                     txt.ctaVideo}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3.5 border-t border-white/5 text-[11px] text-[#8E9299]">
              <span>Nabda ID: <strong className="font-mono text-white/75">{temp.id}</strong></span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(temp.text);
                }}
                className="hover:text-[#C5A059] flex items-center gap-1 transition cursor-pointer"
              >
                <Copy size={11} />
                Copy Copy
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
