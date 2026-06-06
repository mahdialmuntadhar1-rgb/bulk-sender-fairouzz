import React, { useState } from "react";
import { 
  Image, 
  Video, 
  FileText, 
  Music, 
  Volume2, 
  Smile, 
  PlusCircle, 
  Eye, 
  Calendar, 
  Layers, 
  TrendingUp, 
  Send, 
  CheckCircle2, 
  CloudLightning,
  MonitorPlay,
  Download,
  Flame,
  Info
} from "lucide-react";

interface MediaAsset {
  id: string;
  name: string;
  category: "Image" | "Video" | "PDF" | "Audio" | "Voice Note" | "Sticker";
  url: string;
  uploadDate: string;
  size: string;
  usageCount: number;
  campaignsUsed: string[];
}

interface MediaCampaign {
  id: string;
  name: string;
  mediaType: "Image" | "Video" | "Audio" | "PDF" | "Voice";
  assetId: string;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  status: "Running" | "Completed" | "Draft";
}

const INITIAL_ASSETS: MediaAsset[] = [
  { id: "ast-1", name: "Shaku Maku Food Board Flyer.jpg", category: "Image", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=300", uploadDate: "2026-06-01", size: "1.4 MB", usageCount: 4, campaignsUsed: ["Baghdad Restaurants Lunch", "Basra Cafe Banner campaign"] },
  { id: "ast-2", name: "Merchant Introduction Video Setup.mp4", category: "Video", url: "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=300", uploadDate: "2026-06-02", size: "18.5 MB", usageCount: 2, campaignsUsed: ["Erbil Rotana Campaign", "Video Overview Pitch"] },
  { id: "ast-3", name: "Complete Iraqi Directory Price Model.pdf", category: "PDF", url: "", uploadDate: "2026-06-03", size: "2.1 MB", usageCount: 1, campaignsUsed: ["Clinics Outreach Pricing Booklet"] },
  { id: "ast-4", name: "Audio Greeting Nabda Voice Record.wav", category: "Voice Note", url: "", uploadDate: "2026-06-04", size: "450 KB", usageCount: 3, campaignsUsed: ["Ramadan Audio Pitch campaign", "Najaf Pharmacy Voice Drop"] }
];

const INITIAL_MEDIA_CAMPAIGNS: MediaCampaign[] = [
  { id: "mcp-1", name: "Baghdad Ramadan Video Promotion", mediaType: "Video", assetId: "ast-2", sent: 1500, delivered: 1420, read: 980, replied: 340, status: "Completed" },
  { id: "mcp-2", name: "Erbil Rotana PDF PDF Prospectus", mediaType: "PDF", assetId: "ast-3", sent: 480, delivered: 420, read: 310, replied: 85, status: "Running" },
  { id: "mcp-3", name: "National Clinics voice drop notification", mediaType: "Voice", assetId: "ast-4", sent: 800, delivered: 750, read: 610, replied: 190, status: "Running" },
  { id: "mcp-4", name: "Festival Greeting Sticker Campaign", mediaType: "Image", assetId: "ast-1", sent: 0, delivered: 0, read: 0, replied: 0, status: "Draft" }
];

interface MediaManagerViewProps {
  lang: "ar" | "en";
}

export default function MediaManagerView({ lang }: MediaManagerViewProps) {
  const [activeTab, setActiveTab] = useState<"library" | "campaigns">("library");
  const [assets, setAssets] = useState<MediaAsset[]>(INITIAL_ASSETS);
  const [mediaCampaigns, setMediaCampaigns] = useState<MediaCampaign[]>(INITIAL_MEDIA_CAMPAIGNS);
  const [filterCat, setFilterCat] = useState<string>("All");
  const [toast, setToast] = useState("");

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSimulateUpload = () => {
    const categories: MediaAsset["category"][] = ["Image", "PDF", "Video", "Sticker"];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const mockRecord: MediaAsset = {
      id: `ast_${Date.now()}`,
      name: `Simulated Shaku Maku upload_${Math.random().toString(36).substring(7)}.${randomCat === "PDF" ? "pdf" : "jpg"}`,
      category: randomCat,
      url: randomCat === "Image" ? "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300" : "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=300",
      uploadDate: new Date().toISOString().split("T")[0],
      size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
      usageCount: 0,
      campaignsUsed: []
    };
    setAssets(prev => [mockRecord, ...prev]);
    flashToast(`Uploaded simulated Nabda media asset: ${mockRecord.name}`);
  };

  const filteredAssets = filterCat === "All" ? assets : assets.filter(a => a.category === filterCat);

  const getMediaIcon = (cat: MediaAsset["category"]) => {
    switch (cat) {
      case "Video": return <Video size={16} className="text-[#C5A059]" />;
      case "PDF": return <FileText size={16} className="text-red-400" />;
      case "Audio": return <Music size={16} className="text-blue-400" />;
      case "Voice Note": return <Volume2 size={16} className="text-green-400" />;
      case "Sticker": return <Smile size={16} className="text-[#C5A059]" />;
      default: return <Image size={16} className="text-[#C5A059]" />;
    }
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-5 bg-[#C5A059] text-slate-950 px-5 py-3 rounded-xl font-bold shadow-2xl text-xs z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 border border-white/10 font-sans">
          🎉 {toast}
        </div>
      )}

      {/* Title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="text-[#C5A059]" size={22} />
            {lang === "ar" ? "مخزن وموثق وسائط Nabda الميديا" : "WABA Reusable Media Assets & Campaigns"}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">
            {lang === "ar" 
              ? "تحكم بمرفقات الوسائط الموثقة مثل الصوتيات والفيديو وتتبع إحصائيات حملات الميديا التفاعلية." 
              : "Store reusable templates attachments and measure progressive delivery graphs of PDF/Vocal distributions."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 bg-[#191D24] border border-[#2D3139] p-1.5 rounded-xl self-start md:self-center">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer font-sans transition ${
              activeTab === "library" ? "bg-[#C5A059] text-slate-950" : "text-[#8E9299] hover:text-white"
            }`}
          >
            🖼 {lang === "ar" ? "مكتبة الوسائط" : "Media Library Assets"}
          </button>
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer font-sans transition ${
              activeTab === "campaigns" ? "bg-[#C5A059] text-slate-950" : "text-[#8E9299] hover:text-white"
            }`}
          >
            🎥 {lang === "ar" ? "حملات الميديا" : "Media Outreach Campaigns"}
          </button>
        </div>
      </div>

      {activeTab === "library" ? (
        <div className="space-y-6">
          {/* Controls line for media library */}
          <div className="bg-[#14171D] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
            
            {/* Category selection */}
            <div className="flex gap-1.5 flex-wrap">
              {["All", "Image", "Video", "PDF", "Voice Note", "Sticker"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer font-sans ${
                    filterCat === cat 
                      ? "bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/25 font-bold" 
                      : "bg-[#191D24] text-[#8E9299] hover:text-white border border-[#2D3139]"
                  }`}
                >
                  {cat === "All" ? (lang === "ar" ? "الكل" : "All") : cat}
                </button>
              ))}
            </div>

            {/* Sim input trigger */}
            <button
              onClick={handleSimulateUpload}
              className="bg-zinc-900 border border-[#2D3139] hover:border-white/10 text-slate-200 text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <PlusCircle size={14} className="text-[#C5A059]" />
              {lang === "ar" ? "رفع ملف محاكاة" : "Simulate File Upload"}
            </button>
          </div>

          {/* Grid of reusable assets cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredAssets.map(asset => (
              <div 
                key={asset.id} 
                className="bg-[#14171D] border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition duration-150 flex flex-col justify-between"
              >
                
                {/* Header preview box */}
                <div className="bg-[#191D24] h-36 border-b border-white/3 flex items-center justify-center relative bg-cover bg-center overflow-hidden"
                     style={asset.url ? { backgroundImage: `url(${asset.url})` } : undefined}
                >
                  {!asset.url && (
                    <div className="text-center space-y-2 text-[#8E9299] p-4">
                      {getMediaIcon(asset.category)}
                      <span className="block text-[11px] font-mono">{asset.category} Asset</span>
                    </div>
                  )}

                  {/* Top stamp */}
                  <span className="absolute top-2.5 right-2.5 bg-black/60 text-[#C5A059] text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                    {getMediaIcon(asset.category)}
                    {asset.category}
                  </span>
                </div>

                {/* Info Area */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs font-sans line-clamp-1 leading-normal">
                      {asset.name}
                    </h4>
                    <p className="text-[10px] text-[#8E9299] font-mono mt-0.5">{asset.size} • Uploaded {asset.uploadDate}</p>
                  </div>

                  {/* Usage tracking info */}
                  <div className="pt-2 border-t border-[#2D3139]/40 text-[10px] space-y-1 text-slate-400 font-sans">
                    <div className="flex justify-between">
                      <span>Usage count:</span>
                      <strong className="text-white font-mono">{asset.usageCount} times</strong>
                    </div>
                    {asset.campaignsUsed.length > 0 && (
                      <div className="flex gap-1 flex-wrap pt-1">
                        {asset.campaignsUsed.map((cmp, i) => (
                          <span key={i} className="bg-[#191D24] border border-[#2D3139] text-[8px] text-[#8E9299] px-1 rounded truncate max-w-[100px]" title={cmp}>
                            #{cmp.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions preview */}
                  <div className="pt-2 flex gap-1.5 justify-end">
                    <button
                      onClick={() => flashToast(`Loading native preview for: ${asset.name}...`)}
                      className="bg-zinc-900 border border-[#2D3139] hover:text-white p-2 text-[#8E9299] rounded-lg transition text-[10px] cursor-pointer"
                      title="Preview"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => flashToast(`File download simulated successfully (Size: ${asset.size})`)}
                      className="bg-zinc-900 border border-[#2D3139] hover:text-white p-2 text-[#8E9299] rounded-lg transition text-[10px] cursor-pointer"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                  </div>

                </div>

              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Campaigns view representing Media Campaigns */
        <div className="space-y-6">
          <div className="bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl space-y-4">
            
            {/* Table design */}
            <div className="p-1 border-b border-white/5 pb-3">
              <h3 className="font-bold text-xs text-white uppercase font-sans flex items-center gap-1">
                <CloudLightning size={14} className="text-[#C5A059]" />
                {lang === "ar" ? "قائمة أداء حملات مرفقات الميديا" : "WABA High-Inbound Media Broadcast Performance"}
              </h3>
              <p className="text-[10px] text-[#8E9299] mt-0.5 leading-relaxed">
                {lang === "ar" 
                  ? "تتبع بدقة نسب القراءة والتسليم لحملات الصوت والفيديو والمستندات ببروتوكولات Nabda API." 
                  : "Measure specific engagement ratios (Voice notes listen ticks, PDF download count) for dynamic campaign segments."}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="text-[#8E9299] border-b border-[#2D3139]">
                    <th className="py-2.5 px-3 font-sans text-right">Media Campaign</th>
                    <th className="py-2.5 px-3 font-sans text-center">Type</th>
                    <th className="py-2.5 px-3 font-sans text-center">Sent</th>
                    <th className="py-2.5 px-3 font-sans text-center">Delivered</th>
                    <th className="py-2.5 px-3 font-sans text-center">Read / Listen</th>
                    <th className="py-2.5 px-3 font-sans text-center">Inbound Replies</th>
                    <th className="py-2.5 px-3 font-sans text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mediaCampaigns.map((camp) => {
                    const readRate = camp.sent > 0 ? Math.round((camp.read / camp.sent) * 100) : 0;
                    const replyRate = camp.sent > 0 ? Math.round((camp.replied / camp.sent) * 100) : 0;
                    return (
                      <tr key={camp.id} className="hover:bg-[#1C2128]/50 transition">
                        <td className="py-3 px-3 font-bold font-sans text-white text-xs">{camp.name}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-1.5 py-0.5 bg-black/30 border border-white/5 text-[9px] text-[#C5A059] font-mono rounded">
                            {camp.mediaType}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-center text-slate-300">{camp.sent}</td>
                        <td className="py-3 px-3 font-mono text-center text-slate-300">{camp.delivered}</td>
                        <td className="py-3 px-3 font-mono text-center text-purple-400 font-bold">{camp.read} ({readRate}%)</td>
                        <td className="py-3 px-3 font-mono text-center text-amber-400 font-bold">{camp.replied} ({replyRate}%)</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-full ${
                            camp.status === "Running" 
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/25 animate-pulse" 
                              : camp.status === "Completed" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                                : "bg-stone-800 text-stone-400"
                          }`}>
                            {camp.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Educative guide line for growth managers */}
          <div className="bg-[#14171D] p-5 rounded-2xl border border-white/5 flex gap-4 text-right items-start">
            <div className="p-2.5 bg-[#C5A059]/10 text-[#C5A059] rounded-xl shrink-0">
              <Info size={20} />
            </div>
            <div className="space-y-1">
              <h5 className="font-bold text-xs text-white font-sans">
                {lang === "ar" ? "كيف تعمل حملات الوسائط المتقدمة من Nabda؟" : "How does Nabda Advanced Media campaigns execute?"}
              </h5>
              <p className="text-[11px] text-[#8E9299] leading-relaxed font-sans">
                {lang === "ar" 
                  ? "تتيح لك منصة Nabda إرفاق صور عالية الدقة أو فيديوهات أو ملفات PDF مباشرة بلغة ترميز JSON لتصل لأصحاب المحال دون تكلفة رسائل وسائط تقليدية (MMS). نوفر إحصائيات تتبع الاستماع للتسجيلات الصوتية (Voice notes telemetry) بشكل تلقائي." 
                  : "Rather than forcing users to click links, Nabda WABA injects native video preview cards, playable vocal waveforms, and readable pdf attachments directly inline. We track download logs and double-blue listen states automatically."}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
