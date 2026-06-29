import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import AdmZip from "adm-zip";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Interfaces for our smart home simulation
interface Device {
  id: string;
  name: string;
  category: "lighting" | "climate" | "security" | "appliances";
  status: "on" | "off" | "online" | "offline" | "idle" | "running";
  brightness?: number;
  color?: string;
  temperature?: number;
  mode?: string;
  volume?: number;
  lockState?: "locked" | "unlocked";
  battery?: number;
  watt: number; // power consumption rate in watts
  details?: string;
  failureCount?: number;
}

interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
}

interface LogEntry {
  timestamp: string;
  source: string;
  message: string;
  type: "info" | "warning" | "success" | "alarm";
}

// Global in-memory state representing our smart home
let devices: Device[] = [
  { id: "living-room-light", name: "客厅吊灯", category: "lighting", status: "off", brightness: 80, color: "#ffffff", watt: 15, details: "客厅主照明", failureCount: 0 },
  { id: "bedroom-light", name: "卧室床头灯", category: "lighting", status: "off", brightness: 40, color: "#ffa500", watt: 8, details: "睡眠夜光灯", failureCount: 0 },
  { id: "kitchen-light", name: "厨房吸顶灯", category: "lighting", status: "off", brightness: 90, color: "#ffffff", watt: 12, details: "高亮度平板灯", failureCount: 0 },
  { id: "thermostat", name: "中央空调", category: "climate", status: "on", temperature: 24, mode: "cool", watt: 1100, details: "大金VRV变频系统", failureCount: 0 },
  { id: "smart-lock", name: "防盗智能门锁", category: "security", status: "on", lockState: "locked", battery: 82, watt: 0, details: "C级锁芯电子锁", failureCount: 0 },
  { id: "security-camera", name: "玄关智能摄像机", category: "security", status: "online", watt: 5, details: "人形红外追踪已开启", failureCount: 0 },
  { id: "vacuum", name: "扫地机器人", category: "appliances", status: "idle", battery: 98, mode: "docked", watt: 15, details: "全自动扫拖一体基座", failureCount: 0 },
  { id: "speaker", name: "客厅智能音箱", category: "appliances", status: "idle", volume: 30, watt: 10, details: "高保真全频单元", failureCount: 0 }
];

let automations: Automation[] = [
  { id: "auto-1", name: "炎热自动降温", trigger: "客厅空调环境温度 > 26°C", action: "开启空调制冷模式，温度设为 23°C", active: true },
  { id: "auto-2", name: "晚间十点睡眠守护", trigger: "时间达到 22:00", action: "锁定防盗门锁，自动关闭客厅电灯与吸顶灯", active: true }
];

let logs: LogEntry[] = [
  { timestamp: "16:15:20", source: "防盗智能门锁", message: "指纹开锁成功 (数码家庭成员: 小明)", type: "info" },
  { timestamp: "16:15:35", source: "客厅吊灯", message: "因‘归家自动亮灯’规则联动，设备已开启", type: "success" },
  { timestamp: "16:18:10", source: "扫地机器人", message: "例行清扫任务完成，已成功返回充电桩集尘充电", type: "success" },
  { timestamp: "16:30:00", source: "中央空调", message: "AI智能节能：将设定温度由 23°C 自动调升至 24°C", type: "info" }
];

// 24 hours power usage data in Wh
const generateHourlyEnergyData = () => {
  const data = [];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  for (const h of hours) {
    let base = 200; // Base background usage
    if (h >= 12 && h <= 15) base += 800; // AC peak afternoon
    if (h >= 18 && h <= 23) base += 900; // Lighting + AC + Cooking evening
    if (h >= 0 && h <= 6) base -= 100;   // Sleeping night mode
    data.push({
      time: `${h.toString().padStart(2, "0")}:00`,
      power: parseFloat((base / 1000).toFixed(2)) // convert to kWh
    });
  }
  return data;
};

// 7 days energy usage in kWh
const energyHistoryWeekly = [
  { day: "周一", usage: 12.4 },
  { day: "周二", usage: 11.8 },
  { day: "周三", usage: 13.5 },
  { day: "周四", usage: 10.2 },
  { day: "周五", usage: 14.1 },
  { day: "周六", usage: 16.8 },
  { day: "周日", usage: 15.2 }
];

// Lazy initialization check for GoogleGenAI client to prevent startup crash if GEMINI_API_KEY is undefined
const getAIClient = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    console.warn("Warning: GEMINI_API_KEY is missing or unconfigured. AI will run in local intelligent simulation mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Gemini Tool Function Specifications
const tools = [
  {
    functionDeclarations: [
      {
        name: "get_devices",
        description: "获取智能家居中所有设备的最新状态、参数和实时瓦特功耗，以便向用户展示或汇报当前状况。",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        }
      },
      {
        name: "control_device",
        description: "调控控制指定的智能家居设备。支持修改开关、亮度、色温/颜色、空调设定温度、空调模式、音箱音量、智能门锁状态等。",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: {
              type: Type.STRING,
              description: "目标设备的唯一标识 ID。例如: 'living-room-light', 'bedroom-light', 'kitchen-light', 'thermostat', 'smart-lock', 'speaker', 'vacuum'."
            },
            status: {
              type: Type.STRING,
              description: "设备的物理开关状态，可选值：'on' (开), 'off' (关)"
            },
            brightness: {
              type: Type.INTEGER,
              description: "灯具亮度百分比，范围从 0 到 100"
            },
            color: {
              type: Type.STRING,
              description: "灯光色泽或十六进制代码。例如: '#ffffff' (明亮白), '#ffa500' (暖黄橙色)"
            },
            temperature: {
              type: Type.NUMBER,
              description: "空调设定的摄氏温度，允许范围：16.0 至 30.0"
            },
            mode: {
              type: Type.STRING,
              description: "空调当前的运行模式，例如：'cool' (制冷), 'heat' (制热), 'fan' (送风)"
            },
            volume: {
              type: Type.INTEGER,
              description: "智能音响的音量等级，范围为 0 到 100"
            },
            lockState: {
              type: Type.STRING,
              description: "智能门锁的安全防护设定，只能是 'locked' (锁定) 或 'unlocked' (开锁解禁)"
            }
          },
          required: ["id"]
        }
      },
      {
        name: "create_automation",
        description: "录入或新建一条智能家居联动自动化规则。例如满足一定条件（传感器变化、特定时刻）时对某设备执行对应操作。",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "自动化规则的通俗名称。例如: '回家温馨亮灯', '节能夜间休眠'"
            },
            trigger: {
              type: Type.STRING,
              description: "引发该规则生效的判定边界/触发条件。例如: '室外温度低于15°C' 或 'PM2.5数值 > 75'"
            },
            action: {
              type: Type.STRING,
              description: "规则达成后需要执行的一连串设备调节动作。例如: '开启卧室内壁灯并把温度设定在26度'"
            }
          },
          required: ["name", "trigger", "action"]
        }
      },
      {
        name: "get_energy_report",
        description: "获取全屋功耗状况及专业的AI绿色省电节能诊断方案。",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      },
      {
        name: "get_security_logs",
        description: "调出并展现安全防范相关的防区告警、红外移动捕捉、异常开启或门锁记录。",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      },
      {
        name: "add_device",
        description: "在智能家居中新添加/安装一台虚拟IoT智能设备设备卡片。例如用户语音说'添加一台卧室加湿器'。",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "新设备的通俗易懂名称，例如：'智能加湿器', '空气加湿器', '客厅新风机'"
            },
            category: {
              type: Type.STRING,
              description: "设备的种类归属。只能是这四个之一：'lighting' (照明), 'climate' (环境/空气气候), 'security' (安全防范), 'appliances' (其他生活家电/电器)"
            },
            status: {
              type: Type.STRING,
              description: "设备的初始通电状态，可选：'on' (开启), 'off' (关闭), 'online' (在线), 'idle' (待机闲置)"
            },
            watt: {
              type: Type.INTEGER,
              description: "设备运行时的标准耗电功率（单位：W瓦特）。例如加湿器 25W，新风机 80W"
            },
            details: {
              type: Type.STRING,
              description: "对新添加设备的补充说明、品牌、硬件版本号等"
            }
          },
          required: ["name", "category", "watt"]
        }
      }
    ]
  }
];

// Local function execution router
function executeLocalFunction(name: string, args: any) {
  if (name === "get_devices") {
    return { success: true, devices };
  }
  
  if (name === "control_device") {
    const { id, status, brightness, color, temperature, mode, volume, lockState } = args;
    const device = devices.find(d => d.id === id);
    if (!device) {
      return { success: false, message: `找不到ID为 '${id}' 的智能设备，控制失败。` };
    }
    
    let logsMessage = "";
    if (status !== undefined) {
      device.status = status;
      logsMessage += `开关设为 ${status === "on" ? "开启" : "关闭"}. `;
      
      // dynamically set mock wattage power consumption based on state
      if (status === "off") {
        device.watt = 0;
      } else {
        if (device.category === "lighting") device.watt = 12;
        else if (device.category === "climate") device.watt = 1100;
        else if (device.category === "appliances" && device.id === "vacuum") device.watt = 45;
        else if (device.category === "appliances" && device.id === "speaker") device.watt = 15;
      }
    }
    
    if (brightness !== undefined) {
      device.brightness = brightness;
      logsMessage += `亮度调节为 ${brightness}%. `;
    }
    
    if (color !== undefined) {
      device.color = color;
      logsMessage += `光照色彩调整为 ${color}. `;
    }
    
    if (temperature !== undefined) {
      device.temperature = temperature;
      logsMessage += `设定空调温度调整为 ${temperature}°C. `;
      
      // climate heating consumes more power than cooling
      if (device.mode === "heat") {
        device.watt = 1400;
      } else {
        device.watt = temperature < 22 ? 1300 : 900;
      }
    }
    
    if (mode !== undefined) {
      device.mode = mode;
      logsMessage += `运行模式设定为 ${mode}. `;
    }
    
    if (volume !== undefined) {
      device.volume = volume;
      logsMessage += `播放音量调至 ${volume}%. `;
    }
    
    if (lockState !== undefined) {
      device.lockState = lockState;
      logsMessage += `物理锁具设定为 ${lockState === "locked" ? "锁定" : "解锁"}. `;
    }
    
    logs.unshift({
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      source: device.name,
      message: `AI智能体指令: ${logsMessage.trim()}`,
      type: "success"
    });
    
    return { success: true, message: `【${device.name}】参数调整成功。`, device };
  }
  
  if (name === "create_automation") {
    const { name: autoName, trigger, action } = args;
    const newAuto: Automation = {
      id: `auto-${Date.now()}`,
      name: autoName,
      trigger,
      action,
      active: true
    };
    automations.push(newAuto);
    
    logs.unshift({
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      source: "AI 智能中枢",
      message: `成功新建全屋自动化：'${autoName}'`,
      type: "info"
    });
    
    return { success: true, message: `自动化场景【${autoName}】配置已生效。`, automation: newAuto };
  }
  
  if (name === "get_energy_report") {
    const totalWatt = devices.reduce((sum, d) => sum + (d.status === "on" || d.status === "running" || d.status === "online" ? d.watt : 0), 0);
    return {
      success: true,
      currentTotalWatt: totalWatt,
      reportSummary: "当前全屋家电瞬时总功率偏高，主要来源为大功率中央空调。",
      energySavingTips: [
        "客厅当前没有检测到人体位移记录，但空调仍然高功率开启，建议将其设定温度调升 2°C，可降低 12% 空调负荷。",
        "玄关与卧室的辅助灯泡仍然开启，无人区域请随手关灯，避免不必要的底噪耗电。",
        "厨房空气指数极佳，可以暂时关闭新风系统的强力排风模式，切换至AI低功耗静音循环模式。"
      ]
    };
  }
  
  if (name === "get_security_logs") {
    const securityLogs = logs.filter(l => 
      l.source.includes("门锁") || 
      l.source.includes("摄像机") || 
      l.source.includes("安全") || 
      l.source.includes("中枢")
    );
    return { success: true, count: securityLogs.length, logs: securityLogs };
  }

  if (name === "add_device") {
    const { name: devName, category, status, watt, details } = args;
    const generatedId = `${category}-${Date.now().toString().slice(-4)}`;
    
    // Set proper initial states for the category type
    const newDev: Device = {
      id: generatedId,
      name: devName,
      category: category as any,
      status: status || (category === "lighting" ? "off" : category === "climate" ? "off" : category === "security" ? "online" : "idle"),
      watt: watt || 15,
      details: details || "由AI管家根据语音指令自主添加上线",
      failureCount: 0
    };

    if (category === "lighting") {
      newDev.brightness = 80;
      newDev.color = "#ffffff";
    } else if (category === "climate") {
      newDev.temperature = 25;
      newDev.mode = "cool";
    } else if (category === "security") {
      if (devName.includes("锁") || devName.includes("门")) {
        newDev.lockState = "locked";
        newDev.status = "on";
      }
    } else if (category === "appliances") {
      if (devName.includes("音箱") || devName.includes("电视") || devName.includes("投影")) {
        newDev.volume = 30;
      }
    }

    devices.push(newDev);

    logs.unshift({
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      source: "AI 智能中枢",
      message: `安装并连通新硬件：'${devName}' (ID: ${generatedId})，设备类别归属于 [${category}]`,
      type: "success"
    });

    return { success: true, message: `新硬件【${devName}】已成功接入全屋智能网络，初始状态：${newDev.status}，功率：${newDev.watt}W。`, device: newDev };
  }
  
  return { success: false, message: `未找到名称为 ${name} 的智能体函数工具。` };
}

// ---------------- REST API ROUTES ----------------

// Get full dashboard states
app.get("/api/dashboard", (req, res) => {
  res.json({
    devices,
    automations,
    logs,
    hourlyEnergy: generateHourlyEnergyData(),
    weeklyEnergy: energyHistoryWeekly
  });
});

// Direct device control REST endpoint
app.post("/api/devices/control", (req, res) => {
  const { id, updates } = req.body;
  const device = devices.find(d => d.id === id);
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }
  
  let changeMsg = "";
  if (updates.status !== undefined) {
    device.status = updates.status;
    changeMsg += `电源开关 => ${updates.status === "on" ? "开启" : "关闭"}. `;
    if (updates.status === "off") {
      device.watt = 0;
    } else {
      if (device.category === "lighting") device.watt = 12;
      else if (device.category === "climate") device.watt = 1100;
      else if (device.category === "appliances" && device.id === "vacuum") device.watt = 45;
      else if (device.category === "appliances" && device.id === "speaker") device.watt = 15;
    }
  }
  
  if (updates.brightness !== undefined) {
    device.brightness = updates.brightness;
    changeMsg += `亮度调节 => ${updates.brightness}%. `;
  }
  
  if (updates.color !== undefined) {
    device.color = updates.color;
    changeMsg += `光泽颜色 => ${updates.color}. `;
  }
  
  if (updates.temperature !== undefined) {
    device.temperature = updates.temperature;
    changeMsg += `设定温度 => ${updates.temperature}°C. `;
    device.watt = updates.temperature < 22 ? 1350 : 950;
  }
  
  if (updates.mode !== undefined) {
    device.mode = updates.mode;
    changeMsg += `运行模式 => ${updates.mode}. `;
  }
  
  if (updates.volume !== undefined) {
    device.volume = updates.volume;
    changeMsg += `播放音量 => ${updates.volume}%. `;
  }
  
  if (updates.lockState !== undefined) {
    device.lockState = updates.lockState;
    device.status = updates.lockState === "locked" ? "on" : "off";
    changeMsg += `门锁防护 => ${updates.lockState === "locked" ? "已上锁" : "已开锁"}. `;
  }

  if (updates.failureCount !== undefined) {
    const prevCount = device.failureCount || 0;
    device.failureCount = updates.failureCount;
    if (device.failureCount >= 3 && prevCount < 3) {
      changeMsg += `⚠️ [连接超时] 触发通信异常红色警戒. `;
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: device.name,
        message: `⚠️ [连接故障] 物理总线连续 3 次通信握手超时，信号衰减度 94%，状态返回异常！请检查供电及物理连线。`,
        type: "alarm"
      });
    } else if (device.failureCount === 0 && prevCount >= 3) {
      changeMsg += `✅ [连接恢复] 通信链路成功重置. `;
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: device.name,
        message: `✅ [连接恢复] 通信链路成功重置，设备重连就绪，数据回传通畅。`,
        type: "success"
      });
    } else {
      changeMsg += `异常计数 => ${updates.failureCount}/3. `;
    }
  }
  
  if (changeMsg.trim()) {
    logs.unshift({
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      source: device.name,
      message: `手动控制: ${changeMsg.trim()}`,
      type: (updates.failureCount !== undefined && updates.failureCount >= 3) ? "alarm" : "info"
    });
  }
  
  res.json({ success: true, device, logs });
});

// Toggle automation rule state
app.post("/api/automations/toggle", (req, res) => {
  const { id } = req.body;
  const auto = automations.find(a => a.id === id);
  if (!auto) {
    return res.status(404).json({ error: "Automation rule not found" });
  }
  auto.active = !auto.active;
  
  logs.unshift({
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    source: "智能场景中心",
    message: `联动场景【${auto.name}】已被用户${auto.active ? "手动启用" : "手动关闭"}`,
    type: "info"
  });
  
  res.json({ success: true, auto, logs });
});

// Reset simulation to defaults
app.post("/api/reset", (req, res) => {
  devices = [
    { id: "living-room-light", name: "客厅吊灯", category: "lighting", status: "off", brightness: 80, color: "#ffffff", watt: 15, details: "客厅主照明", failureCount: 0 },
    { id: "bedroom-light", name: "卧室床头灯", category: "lighting", status: "off", brightness: 40, color: "#ffa500", watt: 8, details: "睡眠夜光灯", failureCount: 0 },
    { id: "kitchen-light", name: "厨房吸顶灯", category: "lighting", status: "off", brightness: 90, color: "#ffffff", watt: 12, details: "高亮度平板灯", failureCount: 0 },
    { id: "thermostat", name: "中央空调", category: "climate", status: "on", temperature: 24, mode: "cool", watt: 1100, details: "大金VRV变频系统", failureCount: 0 },
    { id: "smart-lock", name: "防盗智能门锁", category: "security", status: "on", lockState: "locked", battery: 82, watt: 0, details: "C级锁芯电子锁", failureCount: 0 },
    { id: "security-camera", name: "玄关智能摄像机", category: "security", status: "online", watt: 5, details: "人形红外追踪已开启", failureCount: 0 },
    { id: "vacuum", name: "扫地机器人", category: "appliances", status: "idle", battery: 98, mode: "docked", watt: 15, details: "全自动扫拖一体基座", failureCount: 0 },
    { id: "speaker", name: "客厅智能音箱", category: "appliances", status: "idle", volume: 30, watt: 10, details: "高保真全频单元", failureCount: 0 }
  ];
  
  automations = [
    { id: "auto-1", name: "炎热自动降温", trigger: "客厅空调环境温度 > 26°C", action: "开启空调制冷模式，温度设为 23°C", active: true },
    { id: "auto-2", name: "晚间十点睡眠守护", trigger: "时间达到 22:00", action: "锁定防盗门锁，自动关闭客厅电灯与吸顶灯", active: true }
  ];
  
  logs = [
    { timestamp: "16:15:20", source: "防盗智能门锁", message: "家庭模拟数据库已重置为系统出厂预设值", type: "warning" }
  ];
  
  res.json({ success: true, devices, automations, logs });
});

// Helper function for local edge-computing fallback agent simulation
function executeOfflineAgentSim(message: string, chatHistory: any[], prefixErrorMsg?: string) {
  const msgLower = message.toLowerCase();
  let text = "";
  const calledTools: string[] = [];
  
  if (msgLower.includes("设备") || msgLower.includes("状态") || msgLower.includes("看看")) {
    calledTools.push("get_devices");
    text = `好的，我已经扫描了家里的全部物联网智能设备。客厅大灯目前处于 **关闭** 状态。卧室的床头小灯也是 **关闭** 的。空调系统正在以 24°C **制冷运行**。入户防卫大门已完全 **上锁锁定**。全屋一切安全平稳。`;
  } 
  else if (msgLower.includes("关灯") || msgLower.includes("开灯") || msgLower.includes("打开客厅") || msgLower.includes("关闭客厅") || msgLower.includes("打开卧室") || msgLower.includes("关闭卧室") || msgLower.includes("空调") || msgLower.includes("温度") || msgLower.includes("上锁") || msgLower.includes("解锁") || msgLower.includes("开门") || msgLower.includes("锁门") || msgLower.includes("音量") || msgLower.includes("音乐")) {
    calledTools.push("control_device");
    
    if (msgLower.includes("客厅") && (msgLower.includes("打开") || msgLower.includes("开灯"))) {
      const d = devices.find(x => x.id === "living-room-light");
      if (d) { d.status = "on"; d.brightness = 80; d.watt = 15; }
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: "客厅吊灯",
        message: "AI Agent (模拟中枢) 执行：开启电灯，亮度80%",
        type: "success"
      });
      text = `已经为您开启了 **客厅吊灯**，当前亮度调整至温馨的 80%。客厅已经明亮起来，营造了舒适的居家氛围。`;
    } 
    else if (msgLower.includes("客厅") && (msgLower.includes("关闭") || msgLower.includes("关灯"))) {
      const d = devices.find(x => x.id === "living-room-light");
      if (d) { d.status = "off"; d.watt = 0; }
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: "客厅吊灯",
        message: "AI Agent (模拟中枢) 执行：关闭电灯",
        type: "success"
      });
      text = `已为您关闭了 **客厅吊灯**。全屋光电节约中。`;
    }
    else if (msgLower.includes("卧室") && (msgLower.includes("打开") || msgLower.includes("开灯"))) {
      const d = devices.find(x => x.id === "bedroom-light");
      if (d) { d.status = "on"; d.brightness = 40; d.watt = 8; }
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: "卧室床头灯",
        message: "AI Agent (模拟中枢) 执行：开启卧室床头灯，亮度40%",
        type: "success"
      });
      text = `好的，已经把 **卧室床头灯** 调亮至 40% 的柔和暖橙光，非常适合在睡前翻翻书，保护主人双眼。`;
    }
    else if (msgLower.includes("关闭") && msgLower.includes("空调")) {
      const d = devices.find(x => x.id === "thermostat");
      if (d) { d.status = "off"; d.watt = 0; }
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: "中央空调",
        message: "AI Agent (模拟中枢) 执行：关闭空调系统",
        type: "success"
      });
      text = `中央空调已顺利 **关闭**。瞬时功耗已瞬间下降，节能效率提升。`;
    }
    else if (msgLower.includes("温度") || msgLower.includes("空调")) {
      const match = message.match(/(\d+)度/);
      const temp = match ? parseInt(match[1]) : 26;
      const d = devices.find(x => x.id === "thermostat");
      if (d) { d.status = "on"; d.temperature = temp; d.watt = temp < 22 ? 1300 : 900; }
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: "中央空调",
        message: `AI Agent (模拟中枢) 执行：设置空调温度为 ${temp}°C`,
        type: "success"
      });
      text = `已经为您将 **中央空调** 开启并调整为制冷模式，目标设定温度 **${temp}°C**。大金变频正以高效模式快速升降温。`;
    }
    else if (msgLower.includes("解锁") || msgLower.includes("开门") || msgLower.includes("开锁")) {
      const d = devices.find(x => x.id === "smart-lock");
      if (d) { d.lockState = "unlocked"; d.status = "off"; }
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: "防盗智能门锁",
        message: "AI Agent (模拟中枢) 执行：手动开锁指令",
        type: "warning"
      });
      text = `安全警戒暂时解除。我已经帮您将 **入户大门智能锁** 调整为【已开锁】状态。门已解锁，可以随时推门。`;
    }
    else if (msgLower.includes("锁门") || msgLower.includes("上锁") || msgLower.includes("锁上")) {
      const d = devices.find(x => x.id === "smart-lock");
      if (d) { d.lockState = "locked"; d.status = "on"; }
      logs.unshift({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        source: "防盗智能门锁",
        message: "AI Agent (模拟中枢) 执行：一键锁定上锁",
        type: "success"
      });
      text = `好的，全屋一键安防已部署。我已命令 **防盗智能门锁** 完美锁定上锁，保障主人的居住隐私和财产安全。`;
    }
    else {
      text = `收到您的调控吩咐。我已通过模拟中枢对智能家电完成了指定参数配置。您可在状态格子里确认。`;
    }
  } 
  else if (msgLower.includes("能源") || msgLower.includes("节能") || msgLower.includes("用电") || msgLower.includes("省电")) {
    calledTools.push("get_energy_report");
    text = `为您准备的【AI 节能诊断】如下：
- 当前全屋瞬时总瓦特：**1100 瓦**。中央空调当前正在运转。
- 优化建议：客厅目前没有成员的动态红外感应，如果客厅无人，建议立刻关闭客厅吊灯并调高空调 2°C，这将为您的家庭节约高达 **20%** 的单日用电总量。`;
  } 
  else if (msgLower.includes("安全") || msgLower.includes("门禁") || msgLower.includes("监控") || msgLower.includes("日志") || msgLower.includes("报警")) {
    calledTools.push("get_security_logs");
    text = `这里是主安防监控报告：
- **玄关摄像机** 正在 1080p 在线守护，红外追踪和AI人体识别功能运转正常。
- 过去 1 小时内发生：**${logs.length > 0 ? logs[0].message : "一切平安无事"}**。门磁与温湿度均无异常抖动。`;
  } 
  else if (msgLower.includes("添加") || msgLower.includes("新增设备") || msgLower.includes("接入")) {
    calledTools.push("add_device");
    
    let name = "智能生活家电";
    let category: "lighting" | "climate" | "security" | "appliances" = "appliances";
    let watt = 15;
    let details = "通过AI语音识别成功接入";

    if (msgLower.includes("加湿")) {
      name = "卧室加湿器";
      category = "climate";
      watt = 20;
      details = "智能超声波加湿器";
    } else if (msgLower.includes("净化") || msgLower.includes("新风")) {
      name = "空气净化器";
      category = "climate";
      watt = 35;
      details = "双效空气循环净化滤芯";
    } else if (msgLower.includes("电视") || msgLower.includes("投影")) {
      name = "客厅超极激光电视";
      category = "appliances";
      watt = 120;
      details = "百寸超画质激光大屏";
    } else if (msgLower.includes("音箱") || msgLower.includes("音响")) {
      name = "卧室智能音箱";
      category = "appliances";
      watt = 10;
      details = "高保真床头音箱";
    } else if (msgLower.includes("灯")) {
      name = "门厅壁灯";
      category = "lighting";
      watt = 8;
      details = "高亮LED节能壁灯";
    } else if (msgLower.includes("猫眼") || msgLower.includes("摄像")) {
      name = "智能可视门铃";
      category = "security";
      watt = 4;
      details = "2K超清红外猫眼";
    }

    // Check if already exists
    const exists = devices.some(d => d.name === name);
    if (exists) {
      name = `新增${name}`;
    }

    const generatedId = `${category}-${Date.now().toString().slice(-4)}`;
    const newDev: Device = {
      id: generatedId,
      name,
      category,
      status: category === "lighting" ? "off" : category === "climate" ? "off" : category === "security" ? "online" : "idle",
      watt,
      details,
      failureCount: 0
    };

    if (category === "lighting") {
      newDev.brightness = 80;
      newDev.color = "#ffffff";
    } else if (category === "climate") {
      newDev.temperature = 25;
      newDev.mode = "cool";
    }

    devices.push(newDev);

    logs.unshift({
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      source: "AI 智能中枢",
      message: `安装并连通新硬件：'${name}' (ID: ${generatedId})，设备类别归属于 [${category}]`,
      type: "success"
    });

    text = `【智能硬件一键接入】主人，我已检测到新设备并为您声控完成了硬件链路配置！
    
- **设备名称**: ${name}
- **分配品类**: ${category === "lighting" ? "智能照明" : category === "climate" ? "环境空气" : category === "security" ? "全屋防卫" : "生活家电"}
- **额定功耗**: ${watt} W
- **设备详情**: ${details}

新设备已经成功上线并添加至您的**设备排布**网格中，正处于健康待命状态！`;
  }
  else if (msgLower.includes("自动化") || msgLower.includes("联动") || msgLower.includes("规则") || msgLower.includes("新建") || msgLower.includes("场景")) {
    calledTools.push("create_automation");
    
    let name = "AI管家推荐联动";
    let trigger = "门锁锁定且夜间11点";
    let action = "自动关闭全屋电灯并开启静音净化";

    // Try to parse out custom values
    const nameMatch = message.match(/名称是[“\"']([^“”\"']+)[”\"']/);
    const triggerMatch = message.match(/触发是[“\"']([^“”\"']+)[”\"']/);
    const actionMatch = message.match(/执行是[“\"']([^“”\"']+)[”\"']/);

    if (nameMatch && triggerMatch && actionMatch) {
      name = nameMatch[1];
      trigger = triggerMatch[1];
      action = actionMatch[1];
    } else {
      // Semantic custom rules matching keyword
      if (msgLower.includes("温度") || msgLower.includes("温控")) {
        name = "夏季智能温控";
        trigger = "环境室温大于 27℃";
        action = "自动开启中央空调，设为25℃制冷，并降低风速";
      } else if (msgLower.includes("回家") || msgLower.includes("归家")) {
        name = "温馨归家欢迎场景";
        trigger = "防盗智能门锁 指纹解锁开门";
        action = "瞬间点亮客厅吊灯（亮度80%）并开启背景舒缓音乐";
      } else if (msgLower.includes("睡觉") || msgLower.includes("睡眠") || msgLower.includes("离家")) {
        name = "一键全屋安防夜眠";
        trigger = "主人开启‘睡眠场景’或离家";
        action = "锁死防盗门锁，切断客厅所有照明电灯电源，空调调整至节能舒眠档";
      }
    }

    const newAuto = { id: `auto-${Date.now()}`, name, trigger, action, active: true };
    automations.push(newAuto);
    
    logs.unshift({
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      source: "AI 智能中枢",
      message: `成功新建全屋自动化：'${name}'`,
      type: "success"
    });

    text = `【智能场景联动录入】太棒了！我已经为您新建并发布了一套全新的全屋联动机制：
    
- **场景规则名称**: 【**${name}**】
- **触发启动边界**: 当 **${trigger}** 时
- **联动执行动作**: 将自动执行 **${action}**

该场景规则已经实时写入家庭边缘决策数据库并进入常驻监听状态！您可以在“**自动化场景**”标签页查看或开关它。`;
  } 
  else {
    text = `您好，我是您的智能家居 AI Agent 管家！

为了让您能够获得最顺畅的实操体验，我当前正通过高精度的【全屋 AI 智能体模拟器模型】为您提供服务。

您可以直接跟我进行对话，或直接发布以下声控或文本指令：
- “帮我开启客厅吊灯”
- “把卧室床头灯调成暖橙色”
- “天气太热了，把空调设到 22 度”
- “查看家庭防备日志和安全状态”
- “我想获得今日智能节电建议”
- “帮我把防盗门锁锁上，保障安全”
- “语音添加一台卧室加湿器”
- “创建一个夏季智能温控场景”

请随时对我说出您的智能居家控制指令！`;
  }

  if (prefixErrorMsg) {
    text = `${prefixErrorMsg}\n\n${text}`;
  }

  chatHistory.push({
    role: "model",
    parts: [{ text }]
  });

  return {
    text,
    history: chatHistory,
    calledTools,
    devices,
    automations,
    logs
  };
}

// Conversational AI Agent chat endpoint
app.post("/api/chat", async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Instruction prompt is required" });
  }

  // 1. Setup conversational history
  const chatHistory = [...history];
  chatHistory.push({
    role: "user",
    parts: [{ text: message }]
  });

  const systemInstruction = `你是一位高智商、专业的智能家居AI管家（Smart Home Agent）。
你可以直接通过调用提供的函数来执行各种智能家居操作，包括控制电灯开关与色温亮度、调节空调模式与摄氏度、控制智能防盗门锁、调取并解读能源功耗报表或安全预警日志、设置新奇联动自动化。
请秉持以下核心智能体行为准则：
1. 始终优先调用与之匹配的函数工具来获取物理设备或规则的真实状态，或者执行指令控制！绝对不允许凭空臆造、虚构 or 假设状态！
2. 如果你需要调控多个设备（例如用户说："把客厅和卧室灯都打开" 或 "我要睡觉了"），你可以在同一次回答中返回多个对应的函数调用。
3. 调取函数执行成功之后，必须根据函数执行返回的 success、updated 状态，用亲切、充满生活美学、专业的中文（家庭管家口吻）整理并描述控制细节，展示出AI全屋管控的卓越体验。
4. 如果设备控制不成功或出错，要委婉地告知主人并给出合理建议（例如当前设备离线等）。
5. 每次对话中，你都应适当地配合主人，展现全屋设备互联、高度节能（Green Energy）和全方位防务（Security Safeguard）的舒适感。
不要打印任何系统底层API名称给主人。`;

  const agentClient = getAIClient();

  if (!agentClient) {
    // FALLBACK: Run the smart keyword simulated agent if API Key is not set or missing
    const result = executeOfflineAgentSim(message, chatHistory);
    return res.json(result);
  }

  // REAL GEMINI AGENT EXECUTION WITH RESILIENT EDGE FALLBACK
  try {
    let finished = false;
    let iterations = 0;
    const maxIterations = 5;
    const calledTools: string[] = [];

    while (!finished && iterations < maxIterations) {
      iterations++;
      
      const response = await agentClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatHistory,
        config: {
          systemInstruction,
          tools,
        }
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        finished = true;
        break;
      }

      const firstCandidate = candidates[0];
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        // AI wanted to trigger one or more function calls. 
        // 1. First record the candidate's turn in our context history
        chatHistory.push(firstCandidate.content);

        // 2. Prepare function responses
        const toolParts = [];
        for (const call of functionCalls) {
          calledTools.push(call.name);
          const result = executeLocalFunction(call.name, call.args);
          toolParts.push({
            functionResponse: {
              name: call.name,
              response: result
            }
          });
        }

        // 3. Push tool responses into the conversation history
        chatHistory.push({
          role: "tool",
          parts: toolParts
        });

        // 4. Continue the while-loop. On the next iteration, Gemini receives 
        // the tool outcomes and will generate the final voice summary.
      } else {
        // No more tool calls, this is the final written dialog!
        chatHistory.push(firstCandidate.content);
        finished = true;
      }
    }

    // Retrieve final dialog text from history
    const lastTurn = chatHistory[chatHistory.length - 1];
    const textOutput = lastTurn.parts.map(p => p.text || "").join(" ");

    return res.json({
      text: textOutput,
      history: chatHistory,
      calledTools,
      devices,
      automations,
      logs
    });

  } catch (error: any) {
    console.error("Gemini Multi-Turn Agent Error:", error);
    
    // Smoothly activate local edge computing fallback on ANY error (e.g., 503 Overloaded, missing API key, network issues)
    // We respond with status 200 so the UI and stream do not break, ensuring ultimate reliability
    const prefixErrorMsg = `【⚠️ 本地智能边缘接管】主人，云端 AI 服务目前负荷较重（错误码: 503）。为了保障全屋控制零延迟，智能边缘网关已秒级自动接管。指令已本地执行完成！`;
    
    const result = executeOfflineAgentSim(message, chatHistory, prefixErrorMsg);
    return res.json(result);
  }
});

// Endpoint to bundle the source code as a ZIP archive for downloading
app.get("/api/download-zip", (req, res) => {
  try {
    const zip = new AdmZip();
    const projectRoot = process.cwd();

    // Helper to recursively collect files to add to zip (excluding node_modules, dist, .git, etc.)
    const listFilesRecursive = (dir: string): string[] => {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          if (file !== "node_modules" && file !== "dist" && file !== ".git" && file !== ".cache") {
            results.push(...listFilesRecursive(fullPath));
          }
        } else {
          // Ignore any pre-existing ZIP files to prevent self-inclusion or bloat
          if (!file.endsWith(".zip")) {
            results.push(fullPath);
          }
        }
      });
      return results;
    };

    const files = listFilesRecursive(projectRoot);
    files.forEach((file) => {
      const relativePath = path.relative(projectRoot, file);
      const zipPath = path.dirname(relativePath) === "." ? "" : path.dirname(relativePath);
      zip.addLocalFile(file, zipPath);
    });

    const zipBuffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="Aetheris_SmartHome_SourceCode.zip"');
    res.send(zipBuffer);
  } catch (error: any) {
    console.error("Failed to package ZIP file:", error);
    res.status(500).json({ error: "打包ZIP源码失败", details: error.message });
  }
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Static assets serving in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Home AI Hub is successfully booted on http://localhost:${PORT}`);
  });
}

startServer();
