import React from "react";
import { 
  Lightbulb, Thermometer, Lock, Unlock, Video, 
  Trash2, Volume2, Play, Pause, Power, Sparkles, Battery, RefreshCw,
  AlertTriangle, WifiOff
} from "lucide-react";
import { motion } from "motion/react";
import { Device } from "../types";

interface DeviceGridProps {
  devices: Device[];
  onControlDevice: (id: string, updates: Partial<Device>) => void;
  onResetHub: () => void;
  isResetting: boolean;
}

export const DeviceGrid: React.FC<DeviceGridProps> = ({ 
  devices, 
  onControlDevice, 
  onResetHub,
  isResetting 
}) => {
  
  // Categorize devices for filter tab
  const [filter, setFilter] = React.useState<"all" | "lighting" | "climate" | "security" | "appliances">("all");

  const filteredDevices = devices.filter(d => filter === "all" || d.category === filter);

  // Common preset colors for smart bulbs
  const colorPresets = [
    { hex: "#ffffff", label: "日光白" },
    { hex: "#ffa500", label: "暖黄光" },
    { hex: "#ff8c00", label: "温馨橙" },
    { hex: "#add8e6", label: "阅读蓝" }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl" id="device-console-container">
      {/* Console Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            全屋智能设备控制台
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            点击设备卡片可进行细致的手动调控，状态将与 AI 智能体实时保持同步。
          </p>
        </div>
        <button 
          onClick={onResetHub}
          disabled={isResetting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium rounded-lg transition-all border border-slate-700 active:scale-95 cursor-pointer"
          id="btn-reset-simulation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          重置模拟沙盒
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap gap-2">
        {(["all", "lighting", "climate", "security", "appliances"] as const).map(tab => {
          const count = tab === "all" ? devices.length : devices.filter(d => d.category === tab).length;
          const labels: Record<string, string> = {
            all: "全部设备",
            lighting: "智能照明",
            climate: "环境气候",
            security: "安防守护",
            appliances: "智能家电"
          };
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                filter === tab 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500" 
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
              id={`filter-tab-${tab}`}
            >
              {labels[tab]} <span className="ml-1 px-1.5 py-0.25 bg-slate-900/80 rounded-md text-[10px] text-slate-400 font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Device Grid Scrollable */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-slate-950/20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDevices.map(device => {
            const isActive = device.status === "on" || device.status === "running" || device.status === "online";
            const isFailed = (device.failureCount || 0) >= 3;

            const cardClass = isFailed
              ? "bg-rose-950/15 border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30 text-slate-200"
              : isActive 
              ? "bg-slate-800/80 border-indigo-500/40 shadow-lg shadow-indigo-900/10 text-slate-100" 
              : "bg-slate-900/40 border-slate-800 text-slate-500";
            
            return (
              <motion.div
                layout
                key={device.id}
                className={`p-5 rounded-xl border transition-all ${cardClass}`}
                id={`device-card-${device.id}`}
              >
                {/* Device Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg transition-all ${
                      isFailed
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                        : isActive 
                        ? "bg-indigo-500/10 text-indigo-400" 
                        : "bg-slate-800/80 text-slate-500"
                    }`}>
                      {isFailed ? (
                        <WifiOff className="w-5 h-5 animate-pulse" />
                      ) : (
                        <>
                          {device.category === "lighting" && <Lightbulb className="w-5 h-5" />}
                          {device.category === "climate" && <Thermometer className="w-5 h-5" />}
                          {device.category === "security" && (
                            device.lockState === "unlocked" ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />
                          )}
                          {device.category === "appliances" && device.id === "vacuum" && <Sparkles className="w-5 h-5" />}
                          {device.category === "appliances" && device.id === "speaker" && <Volume2 className="w-5 h-5" />}
                        </>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={`text-sm font-semibold transition-all ${isFailed ? 'text-rose-200' : isActive ? 'text-slate-100' : 'text-slate-400'}`}>
                          {device.name}
                        </h3>
                        {isFailed && (
                          <span className="flex items-center gap-0.5 text-[8px] font-extrabold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.25 rounded-full uppercase tracking-wider animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                            通信故障
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{device.details}</p>
                    </div>
                  </div>

                  {/* Tactile Power Toggle Switch */}
                  <button
                    onClick={() => {
                      if (device.category === "security") {
                        // Toggle lock state instead of status
                        const nextLock = device.lockState === "locked" ? "unlocked" : "locked";
                        onControlDevice(device.id, { lockState: nextLock });
                      } else {
                        const nextStatus = isActive ? "off" : "on";
                        onControlDevice(device.id, { status: nextStatus });
                      }
                    }}
                    className={`p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                      isActive 
                        ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30" 
                        : "bg-slate-800 text-slate-400 hover:text-slate-300 border border-slate-700"
                    }`}
                    id={`btn-toggle-power-${device.id}`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Device-Specific Details */}
                {isActive && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 pt-2 border-t border-slate-800/60 text-xs"
                  >
                    {/* LIGHTING Specific controls */}
                    {device.category === "lighting" && (
                      <div className="space-y-2" id={`ctrl-lighting-${device.id}`}>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>亮度：{device.brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={device.brightness || 80}
                          onChange={(e) => onControlDevice(device.id, { brightness: parseInt(e.target.value) })}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          id={`slider-brightness-${device.id}`}
                        />
                        <div className="flex gap-2 items-center mt-2.5">
                          <span className="text-[10px] text-slate-500">色温：</span>
                          <div className="flex gap-1.5">
                            {colorPresets.map(preset => (
                              <button
                                key={preset.hex}
                                onClick={() => onControlDevice(device.id, { color: preset.hex })}
                                title={preset.label}
                                className={`w-4 h-4 rounded-full border transition-all ${
                                  device.color === preset.hex 
                                    ? "ring-2 ring-indigo-500 scale-110 border-white" 
                                    : "border-slate-700 hover:scale-105"
                                }`}
                                style={{ backgroundColor: preset.hex }}
                                id={`btn-color-${device.id}-${preset.hex.replace('#', '')}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CLIMATE (AC) Specific controls */}
                    {device.category === "climate" && (
                      <div className="space-y-3" id={`ctrl-climate-${device.id}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">设定温度</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onControlDevice(device.id, { temperature: Math.max(16, (device.temperature || 24) - 0.5) })}
                              className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold flex items-center justify-center text-xs active:scale-90 cursor-pointer"
                              id="btn-temp-minus"
                            >
                              -
                            </button>
                            <span className="text-sm font-semibold text-slate-200 px-1 font-mono">
                              {device.temperature}°C
                            </span>
                            <button
                              onClick={() => onControlDevice(device.id, { temperature: Math.min(30, (device.temperature || 24) + 0.5) })}
                              className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold flex items-center justify-center text-xs active:scale-90 cursor-pointer"
                              id="btn-temp-plus"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Mode selectors */}
                        <div className="flex items-center justify-between gap-1.5 mt-2 pt-1 border-t border-slate-800/40">
                          <span className="text-[10px] text-slate-500">运行模式</span>
                          <div className="flex gap-1">
                            {[
                              { id: "cool", label: "制冷" },
                              { id: "heat", label: "制热" },
                              { id: "fan", label: "送风" }
                            ].map(m => (
                              <button
                                key={m.id}
                                onClick={() => onControlDevice(device.id, { mode: m.id })}
                                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all cursor-pointer ${
                                  device.mode === m.id 
                                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/40" 
                                    : "bg-slate-800/80 text-slate-400 hover:text-slate-300 border border-transparent"
                                }`}
                                id={`btn-mode-${m.id}`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECURITY (LOCK) Specific controls */}
                    {device.category === "security" && device.lockState && (
                      <div className="space-y-1.5" id={`ctrl-security-${device.id}`}>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Battery className="w-3.5 h-3.5 text-emerald-400" />
                            锁体电量: {device.battery}%
                          </span>
                          <span className={`px-1.5 py-0.25 rounded text-[10px] font-semibold ${
                            device.lockState === "locked" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {device.lockState === "locked" ? "安全锁紧中" : "门锁开启"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* APPLIANCES controls */}
                    {device.category === "appliances" && (
                      <div className="space-y-2.5" id={`ctrl-appliances-${device.id}`}>
                        {device.id === "speaker" && (
                          <>
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>播放音量：{device.volume}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={device.volume || 30}
                              onChange={(e) => onControlDevice(device.id, { volume: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              id="slider-volume"
                            />
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                              当前电台：AI智乐律动流媒体 (192kbps)
                            </div>
                          </>
                        )}
                        
                        {device.id === "vacuum" && (
                          <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-800/80">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Battery className="w-3.5 h-3.5 text-emerald-400" />
                              电量 {device.battery}%
                            </span>
                            <button
                              onClick={() => {
                                const nextStatus = device.status === "running" ? "idle" : "running";
                                onControlDevice(device.id, { 
                                  status: nextStatus,
                                  details: nextStatus === "running" ? "清扫进行中..." : "全自动扫拖一体基座" 
                                });
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold rounded shadow active:scale-95 transition-all cursor-pointer"
                              id="btn-trigger-vacuum"
                            >
                              {device.status === "running" ? "召回基座" : "开启清扫"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Instantaneous energy usage label */}
                    <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/30">
                      <span>工作功耗</span>
                      <span className="font-mono">{device.watt} W</span>
                    </div>
                  </motion.div>
                )}

                {/* Offline state visual overlay */}
                {!isActive && (
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 justify-between">
                    <span>当前处于待机/关闭状态</span>
                    <span className="font-mono text-[9px] bg-slate-800 px-1 py-0.25 rounded text-slate-500">0 W</span>
                  </div>
                )}

                {/* Connection Quality & Simulation Action Panel */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/40 flex items-center justify-between gap-2 text-[10px]">
                  {isFailed ? (
                    <>
                      <span className="text-rose-400 flex items-center gap-1.5 font-mono font-bold animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        通信异常 • 3次重试失败
                      </span>
                      <button
                        onClick={() => onControlDevice(device.id, { failureCount: 0 })}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded shadow transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        id={`btn-repair-${device.id}`}
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        诊断并一键修复
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 flex items-center gap-1">
                        物理链路: <span className="text-emerald-400 font-mono font-bold">已连接</span>
                      </span>
                      <button
                        onClick={() => {
                          const currentF = device.failureCount || 0;
                          onControlDevice(device.id, { failureCount: currentF + 1 });
                        }}
                        className="text-slate-400 hover:text-rose-400 bg-slate-950/60 hover:bg-rose-950/20 border border-slate-800/80 hover:border-rose-500/30 px-2 py-0.75 rounded font-medium transition-all cursor-pointer flex items-center gap-1"
                        id={`btn-fail-${device.id}`}
                        title="点击模拟控制未响应，累计 3 次将触发红色警示与报警日志"
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-500/70" />
                        模拟异常 ({device.failureCount || 0}/3)
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
