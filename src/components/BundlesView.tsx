import React, { useState } from "react";
import { 
  Package, 
  KeyRound, 
  Layers, 
  CheckCircle2, 
  ArrowUpRight, 
  BarChart3, 
  Clock, 
  Search, 
  Zap, 
  Smartphone,
  Flame,
  Activity,
  History
} from "lucide-react";

interface BundleData {
  id: string;
  name: string;
  status: "Active" | "Deactivated" | "Configuring";
  apiKey: string;
  slots: number;
  sent: number;
  delivered: number;
  replies: number;
  registered: number;
  activeBiz: number;
}

const INITIAL_BUNDLES: BundleData[] = [
  { id: "bndl-1", name: "Baghdad Capital Bundle", status: "Active", apiKey: "nbd_bndl_9921eef00a2948ce761", slots: 500, sent: 340, delivered: 310, replies: 95, registered: 32, activeBiz: 28 },
  { id: "bndl-2", name: "Iraqi Elite Restaurants Bundle", status: "Active", apiKey: "nbd_bndl_8172aac11029e0002", slots: 1000, sent: 720, delivered: 680, replies: 210, registered: 84, activeBiz: 72 },
  { id: "bndl-3", name: "National Clinics & Pharmacies Bundle", status: "Active", apiKey: "nbd_bndl_4412fdb90291cc999", slots: 350, sent: 120, delivered: 112, replies: 38, registered: 12, activeBiz: 10 },
  { id: "bndl-4", name: "Internal Testing Sandbox Bundle", status: "Active", apiKey: "nbd_bndl_test_7a129fecc0", slots: 100, sent: 48, delivered: 42, replies: 5, registered: 2, activeBiz: 2 },
  { id: "bndl-5", name: "Marketing Expansion Bundle", status: "Configuring", apiKey: "nbd_bndl_config_91823ab", slots: 250, sent: 0, delivered: 0, replies: 0, registered: 0, activeBiz: 0 }
];

// History logs
const BUNDLE_HISTORY_LOGS = [
  { id: "log-1", bundleId: "bndl-1", campaignName: "Baghdad Elite Restaurants Launch", messageText: "مرحباً يا صاحب العمل الراقِي! تم اختيار مشروعكم...", event: "Campaign Dispatched", timestamp: "2026-06-01T10:00:00Z" },
  { id: "log-2", bundleId: "bndl-1", campaignName: "Baghdad Elite Restaurants Launch", messageText: "أهلاً بك! زبائن أكثر بانتظاركم في بغداد والمحافظات...", event: "Drip Hook Delivered", timestamp: "2026-06-02T11:30:00Z" },
  { id: "log-3", bundleId: "bndl-2", campaignName: "Basra Cafes A/B Test Campaign", messageText: "سلاو هاوڕێی بەڕێز! دەتەوێت کار متمانەپێکراوەکەت فراوانتر بکەیت...", event: "A/B Payload Injected", timestamp: "2026-06-05T09:00:00Z" },
  { id: "log-4", bundleId: "bndl-3", campaignName: "Iraqi Medical Onboarding", messageText: "السلام عليكم دكتور، دليل شاكو ماكو يرحب بكم...", event: "Webhook Ack Received", timestamp: "2026-06-05T18:00:00Z" }
];

interface BundlesViewProps {
  lang: "ar" | "en";
}

export default function BundlesView({ lang }: BundlesViewProps) {
  const [bundles, setBundles] = useState<BundleData[]>(INITIAL_BUNDLES);
  const [selectedBundleId, setSelectedBundleId] = useState<string>("bndl-1");
  const [showKeyMap, setShowKeyMap] = useState<{ [key: string]: boolean }>({});

  const toggleShowKey = (id: string) => {
    setShowKeyMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeBundleDetail = bundles.find(b => b.id === selectedBundleId) || bundles[0];

  // Helper to compute ratios
  const getDeliveryRate = (b: BundleData) => b.sent > 0 ? Math.round((b.delivered / b.sent) * 100) : 0;
  const getReplyRate = (b: BundleData) => b.sent > 0 ? Math.round((b.replies / b.sent) * 100) : 0;
  const getConvRate = (b: BundleData) => b.sent > 0 ? Math.round((b.registered / b.sent) * 100) : 0;

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-[#C5A059]" size={22} />
            {lang === "ar" ? "إدارة باقات إرسال Nabda Bundles" : "Nabda Bundle Control & History"}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">
            {lang === "ar" 
              ? "تحكم بحصص ومفاتيح الربط الخاصة بباقات التسويق الموثقة ومراقبة أدائها الإجمالي بالدليل التاريخي." 
              : "Manage API keys, slots thresholds, delivery ratios, and historic campaigns segmented by Nabda Bundles."}
          </p>
        </div>
      </div>

      {/* Grid of Bundles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bundles.map((bundle) => {
          const isSelected = bundle.id === selectedBundleId;
          const isVisible = showKeyMap[bundle.id];
          return (
            <div 
              key={bundle.id}
              onClick={() => setSelectedBundleId(bundle.id)}
              className={`p-5 rounded-2xl border transition duration-150 flex flex-col justify-between h-56 cursor-pointer relative ${
                isSelected 
                  ? "bg-[#C5A059]/10 border-[#C5A059] shadow-lg shadow-[#C5A059]/5" 
                  : "bg-[#14171D] border-white/5 hover:border-white/10"
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white text-sm font-sans truncate pr-1">
                    {bundle.name}
                  </h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    bundle.status === "Active" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                  }`}>
                    {bundle.status}
                  </span>
                </div>

                {/* API Key masker */}
                <div className="mt-3 flex items-center bg-[#191D24] border border-[#2D3139] p-2 rounded-lg justify-between gap-2 max-w-full">
                  <span className="font-mono text-[9px] text-[#8E9299] select-all truncate pr-1">
                    {isVisible ? bundle.apiKey : "••••••••••••••••••••••••"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleShowKey(bundle.id);
                    }}
                    className="text-[#C5A059] hover:text-white p-1 text-[10px] uppercase font-bold shrink-0 font-sans"
                  >
                    {isVisible ? (lang === "ar" ? "إخفاء" : "Hide") : (lang === "ar" ? "عرض" : "Reveal")}
                  </button>
                </div>
              </div>

              {/* Ratios metadata indicators */}
              <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-white/5">
                <div>
                  <span className="text-[10px] text-[#8E9299] block">Slots</span>
                  <span className="text-xs font-bold text-white font-mono">{bundle.slots}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8E9299] block">Used</span>
                  <span className="text-xs font-bold text-white font-mono">{bundle.sent}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8E9299] block">{lang === "ar" ? "تحويل" : "Conv"}</span>
                  <span className="text-xs font-bold text-[#C5A059] font-mono">{getConvRate(bundle)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ratios & Ranking Analysis (Bento style 2-column) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Selected Bundle Analytics summary */}
        <div className="xl:col-span-2 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider font-sans pb-3 border-b border-white/5 flex items-center gap-1">
            <BarChart3 size={14} className="text-[#C5A059]" />
            {lang === "ar" ? `تحليلات باقة: ${activeBundleDetail.name}` : `Performance Metrics: ${activeBundleDetail.name}`}
          </h4>

          {/* Core Analytics Grid Indicators */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-[#191D24] p-3 rounded-xl border border-[#2D3139]">
              <span className="text-[10px] text-[#8E9299] uppercase block font-sans">Outbound campaigns Sent</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">{activeBundleDetail.sent}</span>
            </div>
            <div className="bg-[#191D24] p-3 rounded-xl border border-[#2D3139]">
              <span className="text-[10px] text-[#8E9299] uppercase block font-sans">Delivered handshakes</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">{activeBundleDetail.delivered} ({getDeliveryRate(activeBundleDetail)}%)</span>
            </div>
            <div className="bg-[#191D24] p-3 rounded-xl border border-[#2D3139]">
              <span className="text-[10px] text-[#8E9299] uppercase block font-sans">Conversational replies</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">{activeBundleDetail.replies} ({getReplyRate(activeBundleDetail)}%)</span>
            </div>
            <div className="bg-[#191D24] p-3 rounded-xl border border-[#2D3139]">
              <span className="text-[10px] text-[#8E9299] uppercase block font-sans">Registered Conversions</span>
              <span className="text-xl font-[#C5A059] font-mono mt-1 block text-[#C5A059] font-bold">{activeBundleDetail.registered} ({getConvRate(activeBundleDetail)}%)</span>
            </div>
          </div>

          <div className="bg-[#191D24] p-3.5 rounded-xl border border-[#2D3139] text-center text-xs text-[#8E9299] leading-relaxed">
            🚀 Combined Score: <strong className="text-white font-mono">{(activeBundleDetail.activeBiz * 10) + activeBundleDetail.registered}</strong>. This bundle handles directory mappings natively.
          </div>
        </div>

        {/* Rankings leaderboard (Column 3, 4, 5) */}
        <div className="xl:col-span-3 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider font-sans pb-3 border-b border-white/5 mb-4 flex items-center gap-1">
              <Flame size={14} className="text-[#C5A059] animate-pulse" />
              {lang === "ar" ? "جدول ترتيب وتقييم الباقات" : "Best Performing Bundles Ranking"}
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="text-[#8E9299] border-b border-[#2D3139]">
                    <th className="py-2.5 px-3 font-sans text-right">Bundle</th>
                    <th className="py-2.5 px-3 font-sans text-center">Sent</th>
                    <th className="py-2.5 px-3 font-sans text-center">Reply %</th>
                    <th className="py-2.5 px-3 font-sans text-center">Onboarded</th>
                    <th className="py-2.5 px-3 font-sans text-center">Active Biz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bundles.map((b) => (
                    <tr 
                      key={b.id} 
                      className={`hover:bg-[#1C2128]/50 transition ${
                        b.id === selectedBundleId ? "bg-[#C5A059]/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-bold font-sans text-white text-xs">{b.name}</td>
                      <td className="py-3 px-3 font-mono text-center text-slate-300">{b.sent}</td>
                      <td className="py-3 px-3 font-mono text-center text-purple-400">{getReplyRate(b)}%</td>
                      <td className="py-3 px-3 font-mono text-center text-teal-400 font-bold">{b.registered}</td>
                      <td className="py-3 px-3 font-mono text-center text-[#C5A059] font-bold">{b.activeBiz}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Bundle History logs section */}
      <div className="bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider font-sans pb-3 border-b border-white/5 mb-4 flex items-center gap-1">
          <History size={14} className="text-[#C5A059]" />
          {lang === "ar" ? "سجل حملات ورسائل الباقة النشطة" : `Outreach chronological logs: ${activeBundleDetail.name}`}
        </h4>

        <div className="space-y-3">
          {BUNDLE_HISTORY_LOGS.filter(l => l.bundleId === selectedBundleId).length === 0 ? (
            <div className="text-center py-8 text-[#8E9299]/55 text-xs font-sans italic">
              {lang === "ar" ? "لا توجد سجلات تاريخية بعد لهذه الباقة." : "No historic campaign runs logged under this specific Nabda slot."}
            </div>
          ) : (
            BUNDLE_HISTORY_LOGS.filter(l => l.bundleId === selectedBundleId).map((log) => (
              <div 
                key={log.id} 
                className="bg-[#191D24] p-4 rounded-xl border border-[#2D3139] flex flex-col md:flex-row justify-between gap-3 text-right"
              >
                <div>
                  <span className="inline-block bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 font-mono text-[9px] font-bold px-2 py-0.5 rounded mb-2">
                    {log.event}
                  </span>
                  <h5 className="font-bold text-xs text-white font-sans">{log.campaignName}</h5>
                  <p className="text-[11px] text-slate-300 italic mt-1 leading-relaxed">"{log.messageText}"</p>
                </div>
                <div className="shrink-0 text-left self-end md:self-start">
                  <span className="text-[10px] text-[#8E9299] font-mono leading-none">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
