import React, { useState } from "react";
import { 
  Smartphone, 
  Activity, 
  RefreshCw, 
  Power, 
  HelpCircle, 
  QrCode, 
  Link, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  HeartCrack,
  Wifi,
  Workflow
} from "lucide-react";

interface InstanceData {
  id: string;
  name: string;
  phone: string;
  status: "Connected" | "Disconnected" | "Connecting" | "Error";
  lastActivity: string;
  healthScore: number;
  lastMessageSent: string;
  lastReplyReceived: string;
}

const INITIAL_INSTANCES: InstanceData[] = [
  { id: "inst-bg-1", name: "Main Baghdad Acquisition Outreach Router", phone: "+9647701234567", status: "Connected", lastActivity: "Just now", healthScore: 98, lastMessageSent: "3 minutes ago", lastReplyReceived: "10 minutes ago" },
  { id: "inst-kd-2", name: "Erbil/Kurdish Support Node", phone: "+9647509990001", status: "Connected", lastActivity: "2 mins ago", healthScore: 95, lastMessageSent: "15 minutes ago", lastReplyReceived: "1 hour ago" },
  { id: "inst-bs-3", name: "Basra & Southern Outreach Node", phone: "+9647814445555", status: "Connecting", lastActivity: "5 mins ago", healthScore: 70, lastMessageSent: "Never", lastReplyReceived: "Never" },
  { id: "inst-sf-4", name: "Fallback Operations Instance", phone: "+9647823334444", status: "Error", lastActivity: "1 day ago", healthScore: 0, lastMessageSent: "Yesterday", lastReplyReceived: "2 days ago" }
];

interface WhatsAppInstancesViewProps {
  lang: "ar" | "en";
}

export default function WhatsAppInstancesView({ lang }: WhatsAppInstancesViewProps) {
  const [instances, setInstances] = useState<InstanceData[]>(INITIAL_INSTANCES);
  const [selectedInstId, setSelectedInstId] = useState<string>("inst-bg-1");
  const [showQRModal, setShowQRModal] = useState(false);
  const [pairingInstName, setPairingInstName] = useState("");
  const [toast, setToast] = useState("");

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const activeInst = instances.find(i => i.id === selectedInstId) || instances[0];

  // Action: toggle status
  const handleToggleStatus = (id: string) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id === id) {
        let nextStatus: InstanceData["status"] = "Disconnected";
        if (inst.status === "Disconnected") nextStatus = "Connected";
        flashToast(`${inst.name} is now ${nextStatus}`);
        return { 
          ...inst, 
          status: nextStatus, 
          healthScore: nextStatus === "Connected" ? 95 : 0,
          lastActivity: "Just now"
        };
      }
      return inst;
    }));
  };

  // Action: Restart Node
  const handleRestart = (id: string, name: string) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id === id) {
        flashToast(`Restarting Nabda engine for node: ${name}`);
        return { ...inst, status: "Connecting", healthScore: 40 };
      }
      return inst;
    }));
    setTimeout(() => {
      setInstances(prev => prev.map(inst => {
        if (inst.id === id) {
          return { ...inst, status: "Connected", healthScore: 99, lastActivity: "Just now" };
        }
        return inst;
      }));
    }, 1500);
  };

  const getStatusBadgeStyle = (status: InstanceData["status"]) => {
    switch (status) {
      case "Connected":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
      case "Connecting":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/25";
      case "Error":
        return "bg-red-500/10 text-red-500 border border-red-500/25 animate-pulse";
      default:
        return "bg-stone-800 text-stone-400 border border-stone-700";
    }
  };

  return (
    <div className={`space-y-6 ${lang === "ar" ? "rtl text-right" : "ltr text-left"}`}>
      
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-5 left-5 bg-[#C5A059] text-slate-950 px-5 py-3 rounded-xl font-bold shadow-2xl text-xs z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 border border-white/10 font-sans">
          🎉 {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone className="text-[#C5A059]" size={22} />
            {lang === "ar" ? "بوابات ومثيلات واتساب النشطة" : "WABA Mobile Nodes & Sync Center"}
          </h2>
          <p className="text-xs text-[#8E9299] mt-1">
            {lang === "ar" 
              ? "قم بإدارة قنوات بث الهواتف للـ API، وربط الأجهزة ومحاكاة رمز الاستجابة السريع للتشغيل الثنائي." 
              : "Operate multiple routed phone modules, toggle status, synchronize active sync timers, and bind devices."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Instances List Sidebar (Column 1) */}
        <div className="bg-[#14171D] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <h3 className="text-xs font-bold text-[#8E9299] uppercase pr-1 pb-2 border-b border-white/5 font-sans">
            {lang === "ar" ? `الأجهزة والمنافذ المتاحة (${instances.length})` : `Provisioned Nodes (${instances.length})`}
          </h3>

          <div className="space-y-3">
            {instances.map(inst => {
              const isSelected = inst.id === selectedInstId;
              return (
                <div
                  key={inst.id}
                  onClick={() => setSelectedInstId(inst.id)}
                  className={`p-4 rounded-xl border text-right cursor-pointer transition flex flex-col gap-2 ${
                    isSelected 
                      ? "bg-[#C5A059]/10 border-[#C5A059]" 
                      : "bg-[#191D24] border-[#2D3139] hover:border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-white font-sans truncate max-w-[170px]">
                      {inst.name}
                    </h4>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${getStatusBadgeStyle(inst.status)}`}>
                      {inst.status}
                    </span>
                  </div>

                  <p className="font-mono text-[9px] text-[#8E9299]">{inst.phone}</p>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1 border-t border-white/3 font-sans">
                    <span>Sync score: <strong className="font-mono text-emerald-400 font-bold">{inst.healthScore}%</strong></span>
                    <span>Activity: {inst.lastActivity}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Device trigger button */}
          <button
            onClick={() => {
              setPairingInstName("Basra Node Secondary");
              setShowQRModal(true);
            }}
            className="w-full bg-[#191D24] hover:bg-white/5 text-[#8E9299] hover:text-white border border-[#2D3139] py-3 rounded-xl text-xs font-bold transition flex justify-center items-center gap-1.5 cursor-pointer font-sans"
          >
            <QrCode size={13} className="text-[#C5A059]" />
            {lang === "ar" ? "ربط جهاز واتساب جديد" : "Pair New Device QR"}
          </button>
        </div>

        {/* Selected Instance Health Operations Center (Column 2 & 3) */}
        <div className="lg:col-span-2 bg-[#14171D] border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full space-y-5">
          
          <div className="space-y-4">
            {/* Instance Title Meta */}
            <div className="pb-3 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-white font-sans">{activeInst.name}</h3>
                <p className="text-xs text-[#8E9299] font-mono mt-0.5">Instance ID: <span className="text-[#C5A059] font-bold">{activeInst.id}</span> • {activeInst.phone}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#8E9299] font-sans">
                <Wifi size={13} className="text-[#C5A059]" />
                {lang === "ar" ? "منفذ مبرمج" : "Active Node Ingress"}
              </div>
            </div>

            {/* Health Meter Block */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* Score card */}
              <div className="bg-[#191D24] p-3 rounded-xl border border-[#2D3139] text-center">
                <span className="text-[10px] text-slate-500 uppercase font-sans">Sync Health Score</span>
                <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">{activeInst.healthScore}/100</span>
              </div>

              {/* Status card */}
              <div className="bg-[#191D24] p-3 rounded-xl border border-[#2D3139] text-center">
                <span className="text-[10px] text-slate-500 uppercase font-sans">Connection State</span>
                <span className="text-xs font-bold text-white mt-1.5 block uppercase font-mono">{activeInst.status}</span>
              </div>

              {/* Outbound sent card */}
              <div className="bg-[#191D24] p-3 rounded-xl border border-[#2D3139] text-center">
                <span className="text-[10px] text-slate-500 uppercase font-sans">Last Sent Payload</span>
                <span className="text-xs font-semibold text-slate-300 mt-1.5 block font-sans truncate">{activeInst.lastMessageSent}</span>
              </div>

              {/* Inbound read card */}
              <div className="bg-[#191D24] p-3 rounded-xl border border-[#2D3139] text-center">
                <span className="text-[10px] text-slate-500 uppercase font-sans">Last Response Log</span>
                <span className="text-xs font-semibold text-slate-300 mt-1.5 block font-sans truncate">{activeInst.lastReplyReceived}</span>
              </div>

            </div>

            {/* Health Checklist indicators */}
            <div className="p-4 bg-[#191D24] rounded-xl border border-[#2D3139] space-y-3">
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-bold font-sans">Operational Health Checklist:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300 font-sans">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>Nabda API Inbound Server Handshake (Passed)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>WABA Device Battery Status (Charging - 91%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className={activeInst.healthScore > 50 ? "text-emerald-400" : "text-amber-400"} />
                  <span>Network Sync latency Status ({activeInst.healthScore > 50 ? "110ms" : "Offline"})</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className={activeInst.status === "Error" ? "text-red-400" : "text-emerald-400"} />
                  <span>Spam limit warning logs (Clear)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Interactive Operations Controls buttons */}
          <div className="space-y-3 pt-4 border-t border-white/5 font-sans">
            <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block font-bold">Manual Operations Triggers:</span>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              
              {/* Connect/Disconnect */}
              <button
                onClick={() => handleToggleStatus(activeInst.id)}
                className={`p-3 rounded-xl text-xs font-bold transition flex items-center gap-2 justify-center cursor-pointer ${
                  activeInst.status === "Connected"
                    ? "bg-stone-800 hover:bg-stone-700 text-red-400 border border-white/5"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                <Power size={13} />
                {activeInst.status === "Connected" ? (lang === "ar" ? "قطع الاتصال" : "Disconnect") : (lang === "ar" ? "تشغيل" : "Connect")}
              </button>

              {/* Restart */}
              <button
                onClick={() => handleRestart(activeInst.id, activeInst.name)}
                className="p-3 bg-[#191D24] border border-[#2D3139] hover:bg-white/5 text-slate-200 hover:text-[#C5A059] rounded-xl text-xs font-bold transition flex items-center gap-2 justify-center cursor-pointer"
              >
                <RefreshCw size={13} />
                {lang === "ar" ? "إعادة تشغيل" : "Restart Inst"}
              </button>

              {/* Refresh status */}
              <button
                onClick={() => {
                  flashToast(`Syncing message delivery ticks for ${activeInst.name}...`);
                }}
                className="p-3 bg-[#191D24] border border-[#2D3139] hover:bg-white/5 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-2 justify-center cursor-pointer"
              >
                <Workflow size={13} />
                {lang === "ar" ? "مزامنة التنزيل" : "Refresh Sync"}
              </button>

              {/* Mock QR generator */}
              <button
                onClick={() => {
                  setPairingInstName(activeInst.name);
                  setShowQRModal(true);
                }}
                className="p-3 bg-[#C5A059] hover:scale-[1.02] text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-2 justify-center cursor-pointer"
              >
                <QrCode size={13} />
                {lang === "ar" ? "توليد كود QR" : "Generate Pairing QR"}
              </button>

            </div>
          </div>

        </div>

      </div>

      {/* Pairing Simulation Modal Dialog */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/80 z-55 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#14171D] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/5 text-right">
              <h3 className="font-bold text-white text-sm font-sans">{lang === "ar" ? "ربط واتساب مبرمج عبر Nabda WABA" : "Bind Device to Nabda WABA"}</h3>
              <button 
                onClick={() => setShowQRModal(false)}
                className="text-[#8E9299] hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#8E9299] leading-relaxed font-sans">
              {lang === "ar" 
                ? "افتح تطبيق واتساب على هاتفك -> الأجهزة المرتبطة -> ربط جهاز. ثم وجه الكاميرا لمسح هذا الرمز." 
                : "Open WhatsApp application -> Linked Devices -> Link a Device. Scan the generated QR matrix below."}
            </p>

            {/* MOCK GENERATED QR ASSIGNED */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/5 inline-block mx-auto">
              <div className="w-52 h-52 bg-white p-3 rounded-lg mx-auto flex flex-col justify-between items-center relative overflow-hidden">
                {/* Visual grid lines simulating secure scanner */}
                <div className="absolute top-0 inset-x-0 h-0.5 bg-red-500 animate-bounce" />
                <img 
                  src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=200" 
                  referrerPolicy="no-referrer"
                  className="w-48 h-48 object-cover rounded opacity-80"
                  alt="Mock barcode pairing"
                />
              </div>
              <span className="text-[10px] text-[#C5A059] font-mono mt-2 block font-semibold">PAIR_ID: {Math.floor(Math.random() * 9000000) + 1000000}</span>
            </div>

            <p className="text-[10px] text-[#8E9299] font-sans">Powered by Nabda Secure TLS Link Layer encryption protocol.</p>
            
            <button
              onClick={() => {
                setShowQRModal(false);
                flashToast(`Device registered & bound successfully to: ${pairingInstName}`);
                // Set connected
                setInstances(p => p.map(inst => inst.name === pairingInstName ? { ...inst, status: "Connected" } : inst));
              }}
              className="w-full bg-[#C5A059] text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors hover:scale-[1.01] cursor-pointer"
            >
              {lang === "ar" ? "محاكاة ربط ناجح بالجهاز" : "Confirm Simulated Handshake"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
