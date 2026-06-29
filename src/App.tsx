import React from "react";
import { 
  Home, Sliders, Settings, Zap, Shield, Sparkles, 
  RefreshCw, Bot, AlertCircle, Info, CheckCircle2,
  Download
} from "lucide-react";
import { Device, Automation, LogEntry, HourlyEnergy, WeeklyEnergy, ChatMessage } from "./types";
import { DeviceGrid } from "./components/DeviceGrid";
import { ChatConsole } from "./components/ChatConsole";
import { EnergyCharts } from "./components/EnergyCharts";
import { AutomationList } from "./components/AutomationList";
import { SecurityConsole } from "./components/SecurityConsole";

export default function App() {
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [automations, setAutomations] = React.useState<Automation[]>([]);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [hourlyEnergy, setHourlyEnergy] = React.useState<HourlyEnergy[]>([]);
  const [weeklyEnergy, setWeeklyEnergy] = React.useState<WeeklyEnergy[]>([]);
  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  
  const [activeTab, setActiveTab] = React.useState<"devices" | "automations" | "energy" | "security">("devices");
  const [isLoadingChat, setIsLoadingChat] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [isRealGemini, setIsRealGemini] = React.useState(false);

  // Initialize and poll full dashboard state on boot
  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to pull latest IoT states");
      const data = await res.json();
      setDevices(data.devices || []);
      setAutomations(data.automations || []);
      setLogs(data.logs || []);
      setHourlyEnergy(data.hourlyEnergy || []);
      setWeeklyEnergy(data.weeklyEnergy || []);
    } catch (err) {
      console.error("Dashboard pull error:", err);
    }
  };

  React.useEffect(() => {
    fetchDashboard();
    
    // Check if real Gemini key is active in backend (by doing a quick mock check or similar)
    // We can assume if the user has setup the key, we are using the real API.
    // Let's do a quiet check
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "PING_KEY_CHECK" })
    }).then(res => {
      // If server doesn't respond with key missing warn, then it's active!
      if (res.status !== 500) {
        setIsRealGemini(true);
      }
    }).catch(() => {
      setIsRealGemini(false);
    });
  }, []);

  // Direct tactile control handler for device card changes
  const handleControlDevice = async (id: string, updates: Partial<Device>) => {
    try {
      // Optimistic state updates
      setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } as Device : d));
      
      const res = await fetch("/api/devices/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates })
      });
      if (!res.ok) throw new Error("Tactile control sync failed");
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error("Manual control failed, rolling back:", err);
      fetchDashboard(); // rollback to true server state
    }
  };

  // Toggle automation trigger rules
  const handleToggleAutomation = async (id: string) => {
    try {
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
      const res = await fetch("/api/automations/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Automation toggle failed");
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error("Automation toggle error:", err);
      fetchDashboard();
    }
  };

  // Create a new scene automation manually
  const handleAddAutomation = async (name: string, trigger: string, action: string) => {
    try {
      // We can create automation via AI Chat or mock directly
      const mockMsg = `[手动新建规则] 帮我创建一套联动规则：名称是“${name}”，触发是“${trigger}”，执行是“${action}”`;
      handleSendMessage(mockMsg);
    } catch (err) {
      console.error("Add automation error:", err);
    }
  };

  // Reset simulated state
  const handleResetHub = async () => {
    try {
      setIsResetting(true);
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset trigger failed");
      await fetchDashboard();
      
      // Clear chat history as well
      setChatHistory([]);
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setIsResetting(false);
    }
  };

  // Send instruction to the Gemini AI Agent
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoadingChat) return;

    const userMsgId = `user-${Date.now()}`;
    const timestampStr = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    
    // 1. Add user's message to chat list
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text,
      timestamp: timestampStr
    };
    
    const updatedHistory = [...chatHistory, newUserMsg];
    setChatHistory(updatedHistory);
    setIsLoadingChat(true);

    try {
      // 2. Map chat history to standard role format for API backend
      const apiHistory = updatedHistory.slice(0, -1).map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      // 3. Post to Gemini Smart Agent route
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: apiHistory
        })
      });

      const data = await res.json();

      // 4. Update core state variables if provided by backend (devices, logs, automations)
      if (data.devices) setDevices(data.devices);
      if (data.automations) setAutomations(data.automations);
      if (data.logs) setLogs(data.logs);

      // 5. Append AI Agent's final written response text and called tools list
      const modelMsgId = `model-${Date.now()}`;
      const newModelMsg: ChatMessage = {
        id: modelMsgId,
        role: "model",
        text: data.text || "已根据指令完成全屋控制。",
        timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
        calledTools: data.calledTools || []
      };

      setChatHistory(prev => [...prev, newModelMsg]);

    } catch (err: any) {
      console.error("AI command dispatch failed:", err);
      const errorMsgId = `error-${Date.now()}`;
      setChatHistory(prev => [...prev, {
        id: errorMsgId,
        role: "model",
        text: `很抱歉，智能体中枢通讯异常：${err.message || "未知连接故障"}。`,
        timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false })
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Sum instantaneous power
  const activeWattTotal = devices.reduce(
    (sum, d) => sum + (d.status === "on" || d.status === "running" || d.status === "online" ? d.watt : 0), 
    0
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="applet-viewport">
      {/* Dynamic Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/35">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-sans font-bold tracking-tight text-slate-100 flex items-center gap-2">
              Aetheris AI Smart Hub
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono">v1.2</span>
            </h1>
            <p className="text-[11px] text-slate-400">基于 Gemini AI 决策中枢的次世代全屋智能体控制系统</p>
          </div>
        </div>

        {/* Global Smart Hub Quick metrics */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs bg-slate-950/40 p-2 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-slate-400">中枢决策状态：</span>
              <span className="text-slate-200 font-semibold">就绪 (Ready)</span>
            </div>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">即时能耗：</span>
              <span className="text-indigo-400 font-mono font-bold">{activeWattTotal} W</span>
            </div>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-400">联动场景：</span>
              <span className="text-teal-400 font-bold">{automations.filter(a => a.active).length}条激活</span>
            </div>
          </div>

          <a 
            href="/api/download-zip"
            download="Aetheris_SmartHome_SourceCode.zip"
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2.5 rounded-lg shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
            id="btn-download-source"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下载全套源码 ZIP</span>
          </a>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 overflow-hidden p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left column: Conversational AI Command Center */}
        <div className="lg:col-span-5 h-[500px] lg:h-full flex flex-col min-h-0">
          <ChatConsole
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingChat}
            isRealGemini={isRealGemini}
          />
        </div>

        {/* Right column: Interactive Visual Console Panels */}
        <div className="lg:col-span-7 flex flex-col h-[600px] lg:h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-0">
          
          {/* Tab Navigation Menu */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              {(["devices", "automations", "energy", "security"] as const).map(tab => {
                const labels: Record<string, string> = {
                  devices: "设备排布",
                  automations: "自动化场景",
                  energy: "能耗管理",
                  security: "安全防务"
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      activeTab === tab
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    id={`sub-tab-${tab}`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-slate-500 font-mono bg-slate-950/40 px-2 py-1 rounded border border-slate-800/60 hidden sm:block">
              家庭物理总线：Z-Wave Plus 700
            </div>
          </div>

          {/* Panel Display Box Scrollable */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-slate-950/10">
            {activeTab === "devices" && (
              <DeviceGrid
                devices={devices}
                onControlDevice={handleControlDevice}
                onResetHub={handleResetHub}
                isResetting={isResetting}
              />
            )}

            {activeTab === "automations" && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-300">什么是场景自动化联动？</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    自动化场景是指通过特定的“触发边界”自动对多个家电执行指定指令（If This Then That）。
                    您可以让下方的 rules 保持开启，也可以通过直接对 **AI管家** 语音打字：“创建当室温大于28度时，自动开启扫地机清扫的规则”来自动录入！
                  </p>
                </div>
                <AutomationList
                  automations={automations}
                  onToggleAutomation={handleToggleAutomation}
                  onAddAutomation={handleAddAutomation}
                />
              </div>
            )}

            {activeTab === "energy" && (
              <EnergyCharts
                hourlyEnergy={hourlyEnergy}
                weeklyEnergy={weeklyEnergy}
                currentTotalWatt={activeWattTotal}
              />
            )}

            {activeTab === "security" && (
              <SecurityConsole
                logs={logs}
              />
            )}
          </div>
        </div>
      </main>

      {/* Global Bottom Banner Bar */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-2.5 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-2 shrink-0">
        <div>
          <span>物理控制器绑定端口: 3000 • </span>
          <span>系统核心状态：</span>
          <span className="text-emerald-400">运行正常 (Online)</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Aetheris IoT Agent Core Powered by</span>
          <span className="text-indigo-400 font-bold">Gemini API</span>
        </div>
      </footer>
    </div>
  );
}
