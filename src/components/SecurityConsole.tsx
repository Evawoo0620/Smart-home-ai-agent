import React from "react";
import { ShieldCheck, Video, Info, AlertTriangle, CheckCircle2, AlertOctagon } from "lucide-react";
import { LogEntry } from "../types";

interface SecurityConsoleProps {
  logs: LogEntry[];
}

export const SecurityConsole: React.FC<SecurityConsoleProps> = ({ logs }) => {
  return (
    <div className="space-y-4" id="security-surveillance-panel">
      {/* Visual Live Video Streaming Frame Mock */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            玄关高清广角摄像机 (Live Stream Mock)
          </span>
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.25 rounded">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            LIVE • HD 1080P
          </span>
        </div>

        {/* Video stream box with visual scanlines */}
        <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-950 flex items-center justify-center bg-slate-950">
          {/* Mock Camera Image Graphic */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 opacity-90" />
          
          {/* Visual Grid Lines and Scanning bar */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500/15 animate-pulse blur-sm" />

          {/* Camera overlay HUD text */}
          <div className="absolute top-3 left-3 text-[9px] text-emerald-400/80 font-mono tracking-wider space-y-0.5 bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
            <div>CAM_ID: ENTRANCE_01</div>
            <div>FPS: 24.0 (HEVC)</div>
            <div>HUMAN_TRACK: ENABLED</div>
          </div>

          <div className="absolute bottom-3 right-3 text-[9px] text-slate-500 font-mono">
            REC ● {new Date().toLocaleDateString("zh-CN")} {new Date().toLocaleTimeString("zh-CN", { hour12: false })}
          </div>

          {/* Centered Graphic */}
          <div className="relative text-center z-10 p-4 space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-400/40 mx-auto animate-pulse" />
            <span className="text-[10px] text-slate-400 font-sans block tracking-wide">
              智能红外移动监测中 • 区域无任何威胁入侵
            </span>
          </div>
        </div>
      </div>

      {/* Activity Log Timeline */}
      <div className="space-y-3" id="security-logs-timeline">
        <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">最近传感器与门磁安全日志</h4>
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-900">
          {logs.slice(0, 10).map((log, idx) => {
            return (
              <div key={idx} className="p-3 text-xs flex gap-3 items-start hover:bg-slate-900/20 transition-all">
                {/* Visual Icon Badge */}
                <div className="mt-0.5 shrink-0">
                  {log.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {log.type === "info" && <Info className="w-4 h-4 text-indigo-400" />}
                  {log.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {log.type === "alarm" && <AlertOctagon className="w-4 h-4 text-rose-500 animate-pulse" />}
                </div>

                {/* Log Text */}
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 text-[11px]">{log.source}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">{log.message}</p>
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500 font-sans">
              暂无任何安全报警或门禁开启日志
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
