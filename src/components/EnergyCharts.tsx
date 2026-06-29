import React from "react";
import { Zap, TrendingUp, Sparkles, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { HourlyEnergy, WeeklyEnergy } from "../types";

interface EnergyChartsProps {
  hourlyEnergy: HourlyEnergy[];
  weeklyEnergy: WeeklyEnergy[];
  currentTotalWatt: number;
}

export const EnergyCharts: React.FC<EnergyChartsProps> = ({
  hourlyEnergy,
  weeklyEnergy,
  currentTotalWatt
}) => {
  const [hoveredHour, setHoveredHour] = React.useState<HourlyEnergy | null>(null);
  const [hoveredDay, setHoveredDay] = React.useState<WeeklyEnergy | null>(null);

  // Hourly Chart SVG computations (24 hour area chart)
  const padX = 40;
  const padY = 20;
  const chartW = 520;
  const chartH = 150;

  const maxPower = Math.max(...hourlyEnergy.map(d => d.power), 1);
  
  // Calculate SVG Points
  const hourlyPoints = hourlyEnergy.map((d, idx) => {
    const x = padX + (idx / (hourlyEnergy.length - 1)) * (chartW - padX * 2);
    const y = chartH - padY - (d.power / maxPower) * (chartH - padY * 2);
    return { x, y, data: d };
  });

  const areaPath = hourlyPoints.length > 0 
    ? `M ${hourlyPoints[0].x} ${chartH - padY} ` + 
      hourlyPoints.map(p => `L ${p.x} ${p.y}`).join(" ") + 
      ` L ${hourlyPoints[hourlyPoints.length - 1].x} ${chartH - padY} Z`
    : "";

  const linePath = hourlyPoints.length > 0
    ? hourlyPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ")
    : "";

  // Weekly Chart computations (7 bar chart)
  const maxWeeklyUsage = Math.max(...weeklyEnergy.map(d => d.usage), 1);
  const barChartW = 520;
  const barChartH = 150;
  const barPadX = 45;
  const barPadY = 20;

  return (
    <div className="space-y-6" id="energy-diagnostics-container">
      {/* Dynamic Instantaneous Power Gauge Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Active Power Wattage */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">全屋即时功耗总值</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-mono font-bold text-indigo-400 tracking-tight" id="label-total-watt">
                {currentTotalWatt}
              </span>
              <span className="text-xs text-slate-400 font-medium font-mono">W</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              当前全网传感器数据采样中...
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/10">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* AI Saving Suggestion Quick Board */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">AI 绿色低碳评分</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-mono font-bold text-teal-400 tracking-tight">
                {currentTotalWatt > 1000 ? "78" : "94"}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 100分</span>
            </div>
            <p className="text-[10px] text-teal-400 mt-2 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              {currentTotalWatt > 1000 ? "温和节能空间：建议关闭待机闲置设备" : "节能表现优异：家庭绿色低碳循环中"}
            </p>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/10">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Hourly Energy Curve Layout */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="hourly-consumption-card">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-200">今日 24 小时用电分布 (kWh)</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">峰谷能耗采样</span>
        </div>

        {/* Responsive Area Curve */}
        <div className="relative h-[160px] w-full bg-slate-950/40 rounded-lg p-2 border border-slate-800/40">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* horizontal grid lines */}
            <line x1={padX} y1={padY} x2={chartW - padX} y2={padY} stroke="#1e293b" strokeDasharray="3,3" />
            <line x1={padX} y1={(chartH) / 2} x2={chartW - padX} y2={(chartH) / 2} stroke="#1e293b" strokeDasharray="3,3" />
            <line x1={padX} y1={chartH - padY} x2={chartW - padX} y2={chartH - padY} stroke="#334155" />

            {/* Fill Area */}
            {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

            {/* Line Path */}
            {linePath && <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="2" />}

            {/* Interactive anchors */}
            {hourlyPoints.map((pt, idx) => {
              const isHovered = hoveredHour?.time === pt.data.time;
              return (
                <g key={idx}>
                  {/* Invisible broad handle for easier hover on mobile and desktop */}
                  <rect
                    x={pt.x - 10}
                    y={padY}
                    width={20}
                    height={chartH - padY * 2}
                    fill="transparent"
                    onMouseEnter={() => setHoveredHour(pt.data)}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="cursor-pointer"
                  />
                  {/* Actual visual anchor point */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 4 : 2}
                    fill={isHovered ? "#6366f1" : "#818cf8"}
                    stroke={isHovered ? "#ffffff" : "none"}
                    strokeWidth="1"
                    className="transition-all pointer-events-none"
                  />
                </g>
              );
            })}

            {/* Y Axis labels */}
            <text x={padX - 8} y={padY + 4} fill="#64748b" fontSize="9" textAnchor="end" className="font-mono">{maxPower.toFixed(1)}</text>
            <text x={padX - 8} y={chartH / 2 + 4} fill="#64748b" fontSize="9" textAnchor="end" className="font-mono">{(maxPower / 2).toFixed(1)}</text>
            <text x={padX - 8} y={chartH - padY + 4} fill="#64748b" fontSize="9" textAnchor="end" className="font-mono">0.0</text>

            {/* X Axis select labels */}
            <text x={padX} y={chartH - padY + 12} fill="#64748b" fontSize="8" textAnchor="middle" className="font-mono">00:00</text>
            <text x={chartW / 4 + 10} y={chartH - padY + 12} fill="#64748b" fontSize="8" textAnchor="middle" className="font-mono">06:00</text>
            <text x={chartW / 2} y={chartH - padY + 12} fill="#64748b" fontSize="8" textAnchor="middle" className="font-mono">12:00</text>
            <text x={(chartW * 3) / 4 - 10} y={chartH - padY + 12} fill="#64748b" fontSize="8" textAnchor="middle" className="font-mono">18:00</text>
            <text x={chartW - padX} y={chartH - padY + 12} fill="#64748b" fontSize="8" textAnchor="middle" className="font-mono">23:00</text>
          </svg>

          {/* Floating Tooltip */}
          {hoveredHour && (
            <div className="absolute top-2 right-4 bg-slate-900 border border-slate-700 rounded p-1.5 shadow-xl text-[10px] text-slate-300 font-mono flex items-center gap-1.5 z-10">
              <span className="font-bold text-indigo-400">{hoveredHour.time}</span>
              <span>功耗: {hoveredHour.power} kWh</span>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Energy Consumption Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="weekly-consumption-card">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold text-slate-200">本周 7 日绿色功耗走势 (kWh)</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">周度节约对比</span>
        </div>

        {/* Responsive Bar Grid */}
        <div className="relative h-[160px] w-full bg-slate-950/40 rounded-lg p-2 border border-slate-800/40">
          <svg viewBox={`0 0 ${barChartW} ${barChartH}`} className="w-full h-full overflow-visible">
            {/* Horizontal guidelines */}
            <line x1={barPadX} y1={barPadY} x2={barChartW - barPadX} y2={barPadY} stroke="#1e293b" strokeDasharray="3,3" />
            <line x1={barPadX} y1={barChartH / 2} x2={barChartW - barPadX} y2={barChartH / 2} stroke="#1e293b" strokeDasharray="3,3" />
            <line x1={barPadX} y1={barChartH - barPadY} x2={barChartW - barPadX} y2={barChartH - barPadY} stroke="#334155" />

            {/* Vertical Bars */}
            {weeklyEnergy.map((day, idx) => {
              const numBars = weeklyEnergy.length;
              const usableW = barChartW - barPadX * 2;
              const barSpacing = usableW / numBars;
              const barWidth = 24;
              
              const x = barPadX + idx * barSpacing + (barSpacing - barWidth) / 2;
              const valH = (day.usage / maxWeeklyUsage) * (barChartH - barPadY * 2);
              const y = barChartH - barPadY - valH;

              const isHovered = hoveredDay?.day === day.day;

              return (
                <g key={day.day}>
                  {/* broad hover trigger */}
                  <rect
                    x={x - 5}
                    y={barPadY}
                    width={barWidth + 10}
                    height={barChartH - barPadY * 2}
                    fill="transparent"
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="cursor-pointer"
                  />
                  {/* rounded rect bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(2, valH)}
                    rx={3}
                    fill={isHovered ? "#2dd4bf" : "#0f766e"}
                    className="transition-all duration-150 pointer-events-none"
                  />
                  {/* Text labels on X axis */}
                  <text
                    x={x + barWidth / 2}
                    y={barChartH - barPadY + 12}
                    fill={isHovered ? "#2dd4bf" : "#64748b"}
                    fontSize="9"
                    textAnchor="middle"
                    className="transition-all duration-150 font-medium"
                  >
                    {day.day}
                  </text>
                </g>
              );
            })}

            {/* Y labels */}
            <text x={barPadX - 8} y={barPadY + 4} fill="#64748b" fontSize="9" textAnchor="end" className="font-mono">{maxWeeklyUsage.toFixed(1)}</text>
            <text x={barPadX - 8} y={barChartH / 2 + 4} fill="#64748b" fontSize="9" textAnchor="end" className="font-mono">{(maxWeeklyUsage / 2).toFixed(1)}</text>
            <text x={barPadX - 8} y={barChartH - barPadY + 4} fill="#64748b" fontSize="9" textAnchor="end" className="font-mono">0.0</text>
          </svg>

          {/* Tooltip */}
          {hoveredDay && (
            <div className="absolute top-2 right-4 bg-slate-900 border border-slate-700 rounded p-1.5 shadow-xl text-[10px] text-slate-300 font-mono flex items-center gap-1.5 z-10 animate-fade-in">
              <span className="font-bold text-teal-400">{hoveredDay.day}</span>
              <span>用电: {hoveredDay.usage} kWh</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
