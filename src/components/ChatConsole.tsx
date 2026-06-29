import React from "react";
import { 
  Bot, Send, Sparkles, User, Sliders, AlertTriangle, Cpu, Zap, Lock, Eye,
  Mic, MicOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";

interface ChatConsoleProps {
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isRealGemini: boolean;
}

export const ChatConsole: React.FC<ChatConsoleProps> = ({
  chatHistory,
  onSendMessage,
  isLoading,
  isRealGemini
}) => {
  const [inputText, setInputText] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [speechSupported, setSpeechSupported] = React.useState(false);
  const [recognition, setRecognition] = React.useState<any>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest message
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  // Initialize Speech Recognition
  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "zh-CN";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      setInputText("");
      recognition.start();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
  };

  // Pre-configured suggestive smart prompts
  const suggestionPrompts = [
    { label: "🎙️ 语音添加加湿器", text: "语音助手，帮我添加一台卧室加湿器并分类为环境气候" },
    { label: "🎙️ 语音添加激光电视", text: "帮我在智能家居中新增一台客厅超极激光电视" },
    { label: "🎙️ 语音创建温控场景", text: "创建一个名称是“夏季智能温控”，触发是“环境室温大于 27℃”，执行是“自动开启中央空调，设为25℃制冷”的场景" },
    { label: "💡 开启客厅吊灯", text: "打开客厅吊灯，并把亮度调节到 50%" },
    { label: "🔒 一键安全锁门", text: "锁上防盗智能锁，关闭客厅和厨房所有的灯泡" },
    { label: "🔋 能耗诊断报告", text: "看看目前用电情况，怎么做才能省电？" }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl" id="chat-console-container">
      {/* Header Info */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 font-sans">AI 智能体管家</h2>
              {isRealGemini ? (
                <span className="flex items-center gap-1 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.25 rounded-md">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Gemini API 激活
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.25 rounded-md">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  智能沙盒模拟模式
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isRealGemini 
                ? "支持实时语音声控及高精度双向控制，自主为您部署设备或定制联动规则。"
                : "支持高精度语音识别(Web Speech)和命令解析，可一键完成场景创建和新设备接入。"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/20 custom-scrollbar flex flex-col">
        {chatHistory.length === 0 && (
          <div className="my-auto text-center max-w-sm mx-auto space-y-4 py-8">
            <div className="inline-flex p-4 bg-indigo-600/10 text-indigo-400 rounded-full border border-indigo-500/10">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-slate-200 font-semibold text-sm">欢迎来到 Aetheris AI 管家中心</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                我是您的专属全屋 AI 智能体，直接与智能家居系统绑定。您可以通过输入文字或**点击右下角麦克风按钮直接语音发出控制命令**。
              </p>
            </div>
          </div>
        )}

        {chatHistory.map((msg) => {
          const isModel = msg.role === "model";
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isModel ? "self-start" : "self-end flex-row-reverse"}`}
              id={`chat-bubble-${msg.id}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 border ${
                isModel 
                  ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400" 
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}>
                {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  isModel 
                    ? "bg-slate-800/90 text-slate-200 rounded-tl-none border border-slate-700/50" 
                    : "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10"
                }`}>
                  {msg.text}
                </div>

                {/* Micro Tool invocation logs */}
                {isModel && msg.calledTools && msg.calledTools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center pl-1">
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                      <Cpu className="w-3 h-3 text-indigo-400" />
                      智能体调用工具:
                    </span>
                    {msg.calledTools.map((tool, idx) => (
                      <span 
                        key={idx} 
                        className="text-[9px] font-mono bg-slate-800/80 text-indigo-300 border border-slate-700 px-1.5 py-0.25 rounded"
                      >
                        🔧 {tool}
                      </span>
                    ))}
                  </div>
                )}

                <span className={`text-[9px] text-slate-500 block ${isModel ? "text-left" : "text-right"}`}>
                  {msg.timestamp}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Thinking skeleton loader */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 max-w-[80%] self-start"
            id="chat-thinking-indicator"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="space-y-2">
              <div className="bg-slate-800/90 border border-slate-700/50 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-300 flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="text-slate-400 text-[11px]">AI 智能体正在决策并下发物理设备调用...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Prompts */}
      <div className="px-5 py-2.5 border-t border-slate-800/60 bg-slate-950/40 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth shrink-0">
        {suggestionPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(p.text)}
            disabled={isLoading}
            className="text-[10px] text-slate-400 hover:text-indigo-300 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer active:scale-95 shrink-0"
            id={`btn-suggest-prompt-${idx}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Form Box */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-slate-900/80 flex gap-2 items-center" id="form-chat-input">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={
              isListening 
                ? "正在聆听您的声音，说完了再次点击麦克风停止..." 
                : isLoading 
                ? "请静候智能家居指令下达中..." 
                : "吩咐AI管家：‘帮我添加一台卧室加湿器分类环境气候’..."
            }
            className={`w-full bg-slate-950/80 border text-xs text-slate-100 rounded-xl pl-4 pr-11 py-3 outline-none transition-all placeholder-slate-500 font-sans ${
              isListening ? "border-indigo-500 ring-2 ring-indigo-500/25 text-indigo-200" : "border-slate-800 focus:border-indigo-500"
            }`}
            id="input-text-message"
          />

          {/* Web Speech API Trigger button */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                isListening 
                  ? "bg-indigo-600 text-white animate-pulse" 
                  : "text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80"
              }`}
              title={isListening ? "停止聆听" : "开启语音聆听输入"}
              id="btn-voice-mic-input"
            >
              {isListening ? (
                <Mic className="w-4 h-4 text-white animate-bounce" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
          id="btn-send-message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
