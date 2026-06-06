import React, { useState } from "react";
import { 
  Webhook, 
  Terminal, 
  RefreshCw, 
  Check, 
  CheckCheck, 
  Cpu, 
  HelpCircle, 
  Info,
  Code
} from "lucide-react";
import { WebhookEvent } from "../types";

interface WebhookViewProps {
  events: WebhookEvent[];
  lang: "ar" | "en";
  onClearLogs: () => void;
}

export default function WebhookView({
  events,
  lang,
  onClearLogs
}: WebhookViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);

  // Default selection
  React.useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0]);
    }
  }, [events]);

  const handleSelect = (ev: WebhookEvent) => {
    setSelectedEvent(ev);
  };

  // Translations
  const txt = {
    title: lang === "ar" ? "سجل أحداث وقنوات الربط Webhook" : "Nabda Webhook & API Logs",
    desc: lang === "ar" ? "قناة تحليلية لمراقبة حزم الويب-هوك الواردة من خادم Nabda لتتبع حالة وسائط الإرسال بالملي ثانية" : "Real-time webhook callback streams from Nabda Gateway mapping multi-event acknowledgments",
    explanationTitle: lang === "ar" ? "💡 كيف تعمل الخدمة والويب-هوك؟" : "💡 Webhook Delivery Architecture",
    explanationText: lang === "ar" ? "تتيح لنا منصة Nabda استلام تحديثات فورية حول رسائل الواتساب. يتم تشغيل الويب-هوك لتحديث الحالات تلقائياً إلى (Sent → Delivered → Read) بمجرد استلام هاتف الهدف للرسالة. يرجى الملاحظة أن حالات القراءة (Read Status) قد لا تتوفر دائماً إذا قام الشخص الآخر بتعطيل مؤشرات قراءة الرسائل في إعدادات خصوصية واستلام الواتساب الخاصة به." : "Nabda webhooks trigger real-time updates for sent, delivered, read, and incoming replies. Under the hood, WABA dispatches immediate ack payload streams which our CRM maps onto the contacts database. Note: Read receipts ('Read' status) might be missing if the target customer disables blue read ticks inside their WhatsApp privacy settings.",
    lblEventsLog: lang === "ar" ? "بث الويب-هوك المباشر (Webhook Stream)" : "Live Webhook Callbacks",
    lblInspector: lang === "ar" ? "مستعرض وفاحص الـ JSON" : "Raw JSON Payload Inspector",
    btnClear: lang === "ar" ? "تفريغ السجلات" : "Clear Diagnostic Logs",
    emptyLogs: lang === "ar" ? "لا توجد حزم ويب-هوك حالياً. قم بتشغيل حملة لإرسال الرسائل!" : "No webhook events received yet. Activate a campaign or send a single text message to populate logs!",
    colType: lang === "ar" ? "الحدث" : "Event Type",
    colPhone: lang === "ar" ? "رقم الهاتف" : "Target Phone",
    colMsgId: lang === "ar" ? "معرّف الرسالة" : "Message ID",
    colTime: lang === "ar" ? "التوقيت" : "Timestamp"
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Webhook className="text-amber-500 animate-spin-slow" size={22} />
            {txt.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{txt.desc}</p>
        </div>
        <button
          onClick={onClearLogs}
          disabled={events.length === 0}
          className="bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold border border-slate-800 transition self-start md:self-center font-sans cursor-pointer"
        >
          {txt.btnClear}
        </button>
      </div>

      {/* Explanation Banner */}
      <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl space-y-2">
        <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
          <Info size={14} />
          {txt.explanationTitle}
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
          {txt.explanationText}
        </p>
      </div>

      {/* Double Column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Callbacks logs list (Column 1 & 2) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between h-[450px]">
          <div>
            <h3 className="text-xs font-bold text-slate-400 pb-3 border-b border-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <Terminal size={14} className="text-amber-500" />
              {txt.lblEventsLog} ({events.length})
            </h3>

            <div className="overflow-y-auto max-h-[350px] space-y-1.5 pr-1">
              {events.length === 0 ? (
                <div className="text-center py-24 text-slate-500 text-xs">
                  {txt.emptyLogs}
                </div>
              ) : (
                events.map((ev) => {
                  const isSelected = selectedEvent?.id === ev.id;
                  const typeColors = {
                    "message.sent": "text-blue-400 bg-blue-950/40 border-blue-900/40",
                    "message.ack": "text-purple-400 bg-purple-950/40 border-purple-900/40",
                    "message.received": "text-emerald-400 bg-emerald-950/40 border-emerald-900/40",
                    "message.upsert": "text-teal-400 bg-teal-950/40 border-teal-900/40"
                  };
                  return (
                    <div
                      id={`evt_log_row_${ev.id}`}
                      key={ev.id}
                      onClick={() => handleSelect(ev)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex justify-between items-center gap-4 ${
                        isSelected 
                          ? "bg-amber-500/10 border-amber-500 shadow-sm" 
                          : "bg-slate-950 border-slate-850 hover:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          typeColors[ev.eventType] || "text-slate-400 bg-slate-900 border-slate-800"
                        }`}>
                          {ev.eventType}
                        </span>
                        <span className="font-mono text-slate-300 font-bold hidden sm:inline truncate max-w-[120px]">
                          {ev.messageId}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-slate-400 font-bold">{ev.phone}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 text-[10px] text-zinc-500 flex justify-between items-center uppercase font-bold tracking-widest">
            <span>Nabda Gateway version 1.4.2</span>
            <span>TLS SLA: 99.99%</span>
          </div>
        </div>

        {/* JSON Inspector (Column 3) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between h-[450px]">
          <div className="flex-1 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-400 pb-3 border-b border-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <Code size={14} className="text-amber-500" />
              {txt.lblInspector}
            </h3>

            {selectedEvent ? (
              <div className="flex-1 flex flex-col justify-between min-h-0 bg-slate-950 border border-slate-805 p-3 rounded-xl font-mono text-[10px] overflow-auto select-all text-slate-300">
                <pre className="overflow-auto whitespace-pre leading-relaxed pr-1 max-h-[300px]">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs py-10 bg-slate-953 rounded-xl border border-slate-800/60 font-sans">
                {lang === "ar" ? "اختر حدثاً لتفحصه" : "Select an event row from the left to inspect raw payloads"}
              </div>
            )}
          </div>

          {selectedEvent && (
            <div className="pt-3 border-t border-slate-800/40 text-[11px] text-slate-500">
              Event Class ID: <strong className="font-mono text-slate-300">{selectedEvent.eventId}</strong>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
