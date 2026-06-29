import React from "react";
import { Sliders, Plus, Check, Play, Settings2, Trash2 } from "lucide-react";
import { Automation } from "../types";

interface AutomationListProps {
  automations: Automation[];
  onToggleAutomation: (id: string) => void;
  onAddAutomation: (name: string, trigger: string, action: string) => void;
}

export const AutomationList: React.FC<AutomationListProps> = ({
  automations,
  onToggleAutomation,
  onAddAutomation
}) => {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [trigger, setTrigger] = React.useState("");
  const [action, setAction] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !trigger.trim() || !action.trim()) return;
    onAddAutomation(name, trigger, action);
    setName("");
    setTrigger("");
    setAction("");
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-4" id="automation-scenarios-panel">
      {/* List header + Add Button */}
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-indigo-400" />
          全屋智能场景与自动化联动规则
        </h3>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
          id="btn-trigger-add-automation"
        >
          <Plus className="w-3 h-3" />
          {isFormOpen ? "取消" : "新增联动"}
        </button>
      </div>

      {/* Slide-down Form to add automated scene */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-indigo-500/30 p-4 rounded-xl space-y-3 shadow-xl" id="form-add-automation">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Rule Name */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-semibold">联动名称</label>
              <input
                type="text"
                required
                placeholder="例如: 观影氛围联动"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 rounded px-2.5 py-1.5 outline-none focus:border-indigo-500"
                id="input-automation-name"
              />
            </div>
            {/* Conditional Trigger */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-semibold">触发条件 (Trigger)</label>
              <input
                type="text"
                required
                placeholder="例如: 玄关人体红外感应"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 rounded px-2.5 py-1.5 outline-none focus:border-indigo-500"
                id="input-automation-trigger"
              />
            </div>
            {/* Action Execution */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-semibold">执行动作 (Action)</label>
              <input
                type="text"
                required
                placeholder="例如: 开启投影仪并调低客厅灯"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 rounded px-2.5 py-1.5 outline-none focus:border-indigo-500"
                id="input-automation-action"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded shadow transition-all cursor-pointer"
            id="btn-save-automation"
          >
            保存并立即上线联动规则
          </button>
        </form>
      )}

      {/* Rules list */}
      <div className="grid grid-cols-1 gap-3">
        {automations.map((auto) => (
          <div
            key={auto.id}
            className={`p-4 rounded-xl border flex justify-between items-center transition-all ${
              auto.active 
                ? "bg-slate-900 border-slate-800" 
                : "bg-slate-900/40 border-slate-900 opacity-60"
            }`}
            id={`automation-row-${auto.id}`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${auto.active ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                <h4 className={`text-xs font-bold ${auto.active ? 'text-slate-200' : 'text-slate-400'}`}>
                  {auto.name}
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80 font-mono text-slate-300">
                  当: {auto.trigger}
                </span>
                <span className="text-slate-500 font-bold">➔</span>
                <span className="bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/30 font-mono text-indigo-300">
                  执行: {auto.action}
                </span>
              </div>
            </div>

            {/* Slide Action Switcher */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggleAutomation(auto.id)}
                className={`relative w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  auto.active ? "bg-indigo-600" : "bg-slate-800"
                }`}
                id={`switch-toggle-automation-${auto.id}`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    auto.active ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
