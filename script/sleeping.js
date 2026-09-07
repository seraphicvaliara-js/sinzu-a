const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sleeping",
  version: "5.0.0",
  role: 0,
  aliases: ["sleep"],
  credits: "you",
  description: "Toggle sleeping mode autoreply on/off — random street/rap-vibe na reply sa bawat message. May cooldown, exclude list, category ng replies, at custom reply management. Admin only.",
  usage: "[on/off/status/exclude/include/addreply/delreply/list/category] [args]",
  cooldown: 3,
};

// ==================== STORAGE ====================
const DATA_FILE = path.join(__dirname, "sleeping_data.json");

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return {
        threads: new Set(parsed.threads || []),
        excluded: new Set(parsed.excluded || []),
        customReplies: parsed.customReplies || [],
        category: parsed.category || "roast",
        cooldownSec: parsed.cooldownSec || 0,
        stats: parsed.stats || {}, // { threadID: { count, lastAt } }
        autoCategory: parsed.autoCategory ?? false,
        nightStart: parsed.nightStart ?? 0, // 12AM
        nightEnd: parsed.nightEnd ?? 5, // 5AM
        defaultWakeupMinutes: parsed.defaultWakeupMinutes ?? 0, // 0 = permanent hanggang manual off
        wakeAt: parsed.wakeAt || {}, // { threadID: timestampMs }
      };
    }
  } catch (err) {
    console.log("Hindi ma-load ang sleeping_data.json:", err);
  }
  return {
    threads: new Set(),
    excluded: new Set(),
    customReplies: [],
    category: "roast",
    cooldownSec: 0,
    stats: {},
    autoCategory: false,
    nightStart: 0,
    nightEnd: 5,
    defaultWakeupMinutes: 0,
    wakeAt: {},
  };
}

function saveData() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({
        threads: [...state.threads],
        excluded: [...state.excluded],
        customReplies: state.customReplies,
        category: state.category,
        cooldownSec: state.cooldownSec,
        stats: state.stats,
        autoCategory: state.autoCategory,
        nightStart: state.nightStart,
        nightEnd: state.nightEnd,
        defaultWakeupMinutes: state.defaultWakeupMinutes,
        wakeAt: state.wakeAt,
      }),
      "utf8"
    );
  } catch (err) {
    console.log("Hindi ma-save ang sleeping_data.json:", err);
  }
}

const state = loadData();

// ==================== REPLY BANKS (by category) ====================
const replyBanks = {
  roast: [
    "Wow, another life-changing message. Truly.",
    "Did you type that with your eyes closed?",
    "Bold of you to hit send on that one.",
    "That message really said 'I have nothing better to do.'",
    "You typed like autocorrect gave up halfway.",
    "That was... a choice.",
    "Confidence: 100. Accuracy: still loading.",
    "You cooked... something. Not sure what though.",
    "Bro really woke up and chose violence... against grammar.",
    "That message just failed the vibe check hard.",
  ],
  chill: [
    "Sige lang, nandito lang ako, natutulog mode.",
    "Basahin ko 'to mamaya, promise.",
    "Chill lang, sleeping mode active pero present pa rin.",
    "Message received, brain currently on airplane mode.",
    "Noted. Processing... maybe later.",
    "Zzz... pero nabasa ko naman.",
  ],
  motivational: [
    "Kahit natutulog ako, ikaw grind ka pa rin. Push mo yan!",
    "Sleeping mode 'to, pero energy mo dapat 'di natutulog.",
    "One message closer sa goals mo, keep going.",
    "Rest ako, hindi ka dapat. Laban lang!",
  ],
  hugot: [
    "Parang message mo, umasa lang tapos wala.",
    "Sana all ganyan ka-consistent mag-message, di tulad niya.",
    "Minsan yung sleeping mode lang ang tapat sayo.",
    "Ilang beses mo bang tinype yan bago mo pinindot ang send?",
  ],
  magdamagan: [
    "3AM na, ikaw pa rin gising. Legend or wala lang tulog?",
    "Puyat squad, tara sabay tayong maghintay ng sunrise.",
    "Sino pa gising? Ako lang siguro at ikaw, tara usap tayo hanggang umaga.",
    "Kape na lang ang katapat mo ngayon, di ba?",
    "Malamig na, tahimik na, ikaw lang at ang messages mo, iyak na lang tayo dito.",
    "Puyat na naman tayo, pero at least may kasama.",
    "Alas-tres ng umaga, chismis pa rin tayo dito.",
    "Wala nang ibang gising kundi tayo, tara kwentuhan.",
    "Puyat mode: ON. Sleeping mode: also ON. Ironic.",
    "Sana this time next year, tulog na tayo maaga. Pero ngayon, gising muna.",
  ],
};

const lastReplyByThread = new Map();

function isNightNow() {
  const hour = new Date().getHours();
  const { nightStart, nightEnd } = state;
  if (nightStart < nightEnd) {
    return hour >= nightStart && hour < nightEnd;
  }
  // wrap-around range, e.g. 22 -> 5
  return hour >= nightStart || hour < nightEnd;
}

function getActiveCategory() {
  if (state.autoCategory && isNightNow()) return "magdamagan";
  return state.category;
}

function getReplyPool() {
  const activeCategory = getActiveCategory();
  const pool = [...(replyBanks[activeCategory] || replyBanks.roast), ...state.customReplies];
  return pool.length ? pool : replyBanks.roast;
}

function getRandomReply(threadID) {
  const pool = getReplyPool();
  let reply;
  const lastReply = lastReplyByThread.get(threadID);
  do {
    reply = pool[Math.floor(Math.random() * pool.length)];
  } while (reply === lastReply && pool.length > 1);
  lastReplyByThread.set(threadID, reply);
  return reply;
}

// Returns true kung na-auto-wake ang thread (i.e. lumipas na ang wake time)
function checkAndApplyWakeup(threadID) {
  const wakeTime = state.wakeAt[threadID];
  if (!wakeTime) return false;
  if (Date.now() < wakeTime) return false;

  state.threads.delete(threadID);
  delete state.wakeAt[threadID];
  saveData();
  return true;
}

function setSleepOn(targetThreadID, minutesOverride) {
  state.threads.add(targetThreadID);
  const minutes = minutesOverride ?? state.defaultWakeupMinutes;
  if (minutes > 0) {
    state.wakeAt[targetThreadID] = Date.now() + minutes * 60 * 1000;
  } else {
    delete state.wakeAt[targetThreadID];
  }
  saveData();
  return minutes;
}

// ==================== ADMIN CHECK ====================
function isAdmin(senderID, adminList = []) {
  if (!senderID) return false;
  if (Array.isArray(adminList) && adminList.includes(senderID)) return true;
  try {
    if (global.config?.[0]?.masterKey?.admin?.includes(senderID)) return true;
  } catch (e) {}
  return false;
}

// ==================== COMMAND ====================
module.exports.run = async function ({ api, event, args, admin, prefix }) {
  const { threadID, messageID, senderID } = event;
  const usedPrefix = prefix || global.config?.PREFIX || "/";

  if (!isAdmin(senderID, admin)) return;

  const recognized = [
    "on",
    "off",
    "status",
    "exclude",
    "include",
    "category",
    "cooldown",
    "addreply",
    "delreply",
    "auto",
    "nightrange",
    "wakeup",
    "list",
  ];

  let option = args[0] ? args[0].toLowerCase() : null;

  // Shorthand: "/sleeping [threadID]" o "/sleeping [threadID] [minutes]"
  // ay katumbas ng "/sleeping on [threadID] [minutes]"
  if (option && !recognized.includes(option) && /^\d+$/.test(args[0])) {
    args = ["on", ...args];
    option = "on";
  }

  try {
    switch (option) {
      case "on": {
        const target = args[1] ? args[1].trim() : threadID;
        const minutesArg = args[2] ? parseInt(args[2], 10) : undefined;
        const minutes = setSleepOn(target, minutesArg);
        return api.sendMessage(
          `🥷 Naka-ON na ang sleeping mode sa thread ${target}.\n` +
            (minutes > 0
              ? `⏰ Auto-wakeup pagkalipas ng ${minutes} minuto.`
              : `(Permanente hanggang i-off mo o i-set ng wakeup)`),
          threadID,
          messageID
        );
      }

      case "off": {
        const target = args[1] ? args[1].trim() : threadID;
        state.threads.delete(target);
        delete state.wakeAt[target];
        saveData();
        return api.sendMessage(`🌙 Naka-OFF na ang sleeping mode sa thread ${target}.`, threadID, messageID);
      }

      case "status": {
        const target = args[1] ? args[1].trim() : threadID;
        const on = state.threads.has(target);
        const s = state.stats[target] || { count: 0, lastAt: null };
        const wakeTime = state.wakeAt[target];
        const remainingMin = wakeTime ? Math.max(0, Math.ceil((wakeTime - Date.now()) / 60000)) : null;
        return api.sendMessage(
          `📊 Status ng thread ${target}:\n` +
            `Sleeping mode: ${on ? "ON" : "OFF"}\n` +
            `Category: ${state.category}${state.autoCategory ? " (auto-switch ON)" : ""}\n` +
            `Active ngayon: ${getActiveCategory()}\n` +
            `Night range: ${state.nightStart}:00-${state.nightEnd}:00\n` +
            `Cooldown: ${state.cooldownSec}s\n` +
            `Auto-wakeup: ${remainingMin !== null ? `sa loob ng ~${remainingMin} minuto` : "wala (permanente)"}\n` +
            `Auto-replies sent: ${s.count}`,
          threadID,
          messageID
        );
      }

      case "exclude": {
        const uid = args[1]?.trim();
        if (!uid) return api.sendMessage(`Gamitin: ${usedPrefix}sleeping exclude [userID]`, threadID, messageID);
        state.excluded.add(uid);
        saveData();
        return api.sendMessage(`🚫 Hindi na maaano-autoreply si ${uid}.`, threadID, messageID);
      }

      case "include": {
        const uid = args[1]?.trim();
        if (!uid) return api.sendMessage(`Gamitin: ${usedPrefix}sleeping include [userID]`, threadID, messageID);
        state.excluded.delete(uid);
        saveData();
        return api.sendMessage(`✅ Pwede na ulit ma-autoreply si ${uid}.`, threadID, messageID);
      }

      case "category": {
        const cat = args[1]?.toLowerCase();
        const valid = Object.keys(replyBanks);
        if (!cat || !valid.includes(cat)) {
          return api.sendMessage(
            `Gamitin: ${usedPrefix}sleeping category [${valid.join("/")}]\nKasalukuyan: ${state.category}`,
            threadID,
            messageID
          );
        }
        state.category = cat;
        saveData();
        return api.sendMessage(`🎨 Napalitan ang category ng reply sa: ${cat}`, threadID, messageID);
      }

      case "cooldown": {
        const sec = parseInt(args[1], 10);
        if (isNaN(sec) || sec < 0) {
          return api.sendMessage(`Gamitin: ${usedPrefix}sleeping cooldown [seconds]`, threadID, messageID);
        }
        state.cooldownSec = sec;
        saveData();
        return api.sendMessage(`⏱️ Cooldown ng autoreply per user ngayon ay ${sec}s.`, threadID, messageID);
      }

      case "addreply": {
        const text = args.slice(1).join(" ").trim();
        if (!text) return api.sendMessage(`Gamitin: ${usedPrefix}sleeping addreply [text]`, threadID, messageID);
        state.customReplies.push(text);
        saveData();
        return api.sendMessage(`➕ Naidagdag ang custom reply:\n"${text}"`, threadID, messageID);
      }

      case "delreply": {
        const idx = parseInt(args[1], 10);
        if (isNaN(idx) || idx < 1 || idx > state.customReplies.length) {
          return api.sendMessage(`Gamitin: ${usedPrefix}sleeping delreply [number] (tingnan sa "list")`, threadID, messageID);
        }
        const removed = state.customReplies.splice(idx - 1, 1);
        saveData();
        return api.sendMessage(`🗑️ Tinanggal: "${removed[0]}"`, threadID, messageID);
      }

      case "auto": {
        const mode = args[1]?.toLowerCase();
        if (mode !== "on" && mode !== "off") {
          return api.sendMessage(
            `Gamitin: ${usedPrefix}sleeping auto [on/off]\n` +
              `Kasalukuyan: ${state.autoCategory ? "ON" : "OFF"}\n` +
              `Night range: ${state.nightStart}:00 - ${state.nightEnd}:00`,
            threadID,
            messageID
          );
        }
        state.autoCategory = mode === "on";
        saveData();
        return api.sendMessage(
          state.autoCategory
            ? `🌃 Auto-switch ON. Magdamagan mode habang ${state.nightStart}:00-${state.nightEnd}:00, tapos babalik sa "${state.category}" pag lampas na.`
            : `☀️ Auto-switch OFF. Manual category na lang: "${state.category}"`,
          threadID,
          messageID
        );
      }

      case "nightrange": {
        const start = parseInt(args[1], 10);
        const end = parseInt(args[2], 10);
        if (isNaN(start) || isNaN(end) || start < 0 || start > 23 || end < 0 || end > 23) {
          return api.sendMessage(
            `Gamitin: ${usedPrefix}sleeping nightrange [start hour 0-23] [end hour 0-23]\n` +
              `Halimbawa: ${usedPrefix}sleeping nightrange 0 5 (12AM-5AM)`,
            threadID,
            messageID
          );
        }
        state.nightStart = start;
        state.nightEnd = end;
        saveData();
        return api.sendMessage(`🕐 Na-set ang night range sa ${start}:00 - ${end}:00.`, threadID, messageID);
      }

      case "wakeup": {
        const minutes = parseInt(args[1], 10);
        if (isNaN(minutes) || minutes < 0) {
          return api.sendMessage(
            `Gamitin: ${usedPrefix}sleeping wakeup [minutes]\n` +
              `0 = walang auto-wakeup (permanente hanggang i-off)\n` +
              `Kasalukuyang default: ${state.defaultWakeupMinutes} minuto`,
            threadID,
            messageID
          );
        }
        state.defaultWakeupMinutes = minutes;
        saveData();
        return api.sendMessage(
          minutes > 0
            ? `⏰ Default auto-wakeup ngayon ay ${minutes} minuto pagkatapos i-ON.`
            : `♾️ Naka-off ang auto-wakeup, permanente na ulit hanggang i-off mo.`,
          threadID,
          messageID
        );
      }

      case "list": {
        if (!state.customReplies.length) {
          return api.sendMessage("Walang custom replies pa. Gamitin ang addreply para magdagdag.", threadID, messageID);
        }
        const listText = state.customReplies.map((r, i) => `${i + 1}. ${r}`).join("\n");
        return api.sendMessage(`📋 Custom replies:\n${listText}`, threadID, messageID);
      }

      default:
        return api.sendMessage(
          `📖 Gamitin:\n` +
            `${usedPrefix}sleeping on [threadID] [minutes] — i-on ang autoreply (minutes optional para sa auto-wakeup)\n` +
            `${usedPrefix}sleeping [threadID] — shorthand, pareho ng "on [threadID]"\n` +
            `${usedPrefix}sleeping off [threadID] — i-off\n` +
            `${usedPrefix}sleeping status [threadID] — tingnan ang status\n` +
            `${usedPrefix}sleeping wakeup [minutes] — i-set ang default auto-wakeup (0 = permanente)\n` +
            `${usedPrefix}sleeping category [roast/chill/motivational/hugot/magdamagan] — palitan ang vibe\n` +
            `${usedPrefix}sleeping auto [on/off] — auto-switch sa magdamagan tuwing gabi\n` +
            `${usedPrefix}sleeping nightrange [start] [end] — i-set ang oras ng magdamagan mode\n` +
            `${usedPrefix}sleeping cooldown [seconds] — i-set ang cooldown per user\n` +
            `${usedPrefix}sleeping exclude/include [userID] — huwag/pwedeng i-autoreply\n` +
            `${usedPrefix}sleeping addreply [text] — magdagdag ng sariling reply\n` +
            `${usedPrefix}sleeping delreply [number] — tanggalin ang reply\n` +
            `${usedPrefix}sleeping list — tingnan lahat ng custom replies`,
          threadID,
          messageID
        );
    }
  } catch (err) {
    console.log("Error sa sleeping command:", err);
  }
};

// ==================== AUTOREPLY HANDLER ====================
module.exports.handleEvent = function ({ api, event }) {
  try {
    const { threadID, senderID, body } = event;

    if (!state.threads.has(threadID)) return;
    if (!body) return;
    if (senderID === api.getCurrentUserID()) return;
    if (state.excluded.has(senderID)) return;

    // Auto-wakeup: kung lumipas na ang oras, i-off na at wag mag-reply
    if (checkAndApplyWakeup(threadID)) return;

    // Per-user cooldown
    if (state.cooldownSec > 0) {
      const key = `${threadID}_${senderID}`;
      const now = Date.now();
      const last = lastReplyByThread.get(`cd_${key}`) || 0;
      if (now - last < state.cooldownSec * 1000) return;
      lastReplyByThread.set(`cd_${key}`, now);
    }

    const randomReply = getRandomReply(threadID);
    api.sendMessage(randomReply, threadID).catch((err) => {
      console.log("Hindi naipadala ang autoreply:", err);
    });

    // Update stats
    if (!state.stats[threadID]) state.stats[threadID] = { count: 0, lastAt: null };
    state.stats[threadID].count += 1;
    state.stats[threadID].lastAt = new Date().toISOString();
    saveData();
  } catch (err) {
    console.log("Error sa sleeping handleEvent:", err);
  }
};
