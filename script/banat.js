const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "banat",
  version: "14.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Auto-Banat Engine with Sleeping Theme, Anti-Spam Buffer, and Counter Interceptor",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /banat on — I-ON ang global auto-banat\n" +
    "• /banat on @mention — I-target ang isang tao\n" +
    "• /banat off — Patayin ang Banat Engine",
  cooldowns: 2
};

// Admin ID Configuration - Kasama na ang bagong ID (61591430164540)
const ADMIN_IDS = ["61594240921272", "61591430164540"];
const DATA_PATH = path.join(__dirname, "banat_config.json");

// Memory map para sa Anti-Spam timer per user
const userSpamTimers = new Map();

// Sleeping / Inaantok Theme Replies
const SLEEPING_BANAT = [
  "Antok na antok na ako sa mga sinasabi mo, matulog ka na rin kaya? 😴💤",
  "Napakaboring ng sinasabi mo, kahit ang utok ko nag-shutdown na sa antok. 🥱💤",
  "Gumising ka muna sa katotohanan bago ka magchat ulit, panaginip lang 'yang pinagsasabi mo. 🛌💭",
  "Huy, gisingin mo muna 'yang wisyo mo bago ka mag-type. Inaantok na ako sa 'yo. 🥱🛑",
  "Matulog ka na lang, mas may kabuluhan pa 'yang mga panaginip mo kesa sa chat mo. 😴🌙",
  "Yawn... paki-pikit na nga lang 'yang mata mo, nakakaantok ang mga argumento mo. 🥱💤",
  "Wala bang mas exciting dyan? Nakakatulog na 'yong bot sa sobrang boring mo. 😴🤖",
  "Zzzz... ano uli sinabi mo? Nakatulog ako sa gitna ng chat mo sa sobrang haba at walang kuwenta. 💤📜",
  "Pahinga mo na 'yang daliri mo at matulog ka na, halatang kulang ka lang sa tulog. 🛌💤",
  "Mas masarap pa matulog nang 12 hours kesa magbasa ng chat mong walang katuturan. 😴🌙",
  "Night night na lang sa 'yo, pati kaluluwa ko inaantok na sa mga sinasabi mo. 🥱🌌",
  "Subukan mong pumikit at matulog, baka sakaling magising kang may laman na 'yang iniisip mo. 🛌🧠",
  "Ang lakas ng amats mo pero mas malakas ang antok ko sa 'yo. Matulog ka na lang. 😴💤",
  "Shhh... tahimik na. Tutulog na ang buong barangay dahil sa sobrang boring mo. 🌙😴",
  "Inaantok na 'yong mga emojis sa 'yo: 🥱😴💤. Paki-off na ng phone mo.",
  "Kahit alikabok sa kwarto ko naiinip at nakakatulog na sa 'yo. 🛌💤",
  "Baka kailangan mo lang ng Unimark o Biogesic at mahabang tulog para gumaling 'yang opinyon mo. 😴💊",
  "Goodnight na lang sa 'yo. Walang patutunguhan 'yang pinagsasabi mo kundi sa higaan. 🌙💤",
  "Pakipikit na ang mata at magpalit ng unan, baka mas maganda pa ang panaginip mo kesa sa logic mo. 🛌💭",
  "Nakatulog na 'yong utak ko sa kalahati pa lang ng sentence mo. 😴💤"
];

const NUMBER_INTERCEPT_RESPONSES = [
  "🛑 Pikit mo na 'yang mata mo, pati pagbibilang mo nakakaantok na. 😴💤",
  "📊 Ilang beses ka ba magbibilang? Matulog ka na lang muna, night night. 🌙✂️",
  "🤡 Zzzz... naputol 'yang bilang mo dahil nakatulog na ang lahat. 💤🛑",
  "📉 Masyadong nakakaantok 'yang counting sequence mo, humiga ka na muna. 🛌💤"
];

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[BANAT-ENGINE] Load error:", err);
  }
  return { active: false, targetID: null, targetName: null };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[BANAT-ENGINE] Save error:", err);
  }
}

// Check kung ang message ay purong numero, 1-100 counting pattern, o dummy resibo
function isCountingOrNumberSpam(text) {
  const clean = text.trim();
  return /^\d+$/.test(clean) || /^#?\d+[\.\-\)]?$/.test(clean);
}

// Random delay na 2 to 3 seconds (Human Speed)
function getHumanDelay() {
  return Math.floor(Math.random() * 1000) + 2000;
}

// ===== EVENT HANDLER =====
module.exports.handleEvent = async function ({ api, event }) {
  if (!event || event.type !== "message" || !event.body) return;

  const { threadID, messageID, senderID, body } = event;
  const cleanBody = body.trim();

  // Huwag mag-reply sa commands o sa sariling message ng bot
  if (cleanBody.startsWith("/") || cleanBody.startsWith("!") || cleanBody.startsWith(".")) return;
  if (senderID === api.getCurrentUserID()) return;

  const data = loadData();
  if (!data.active) return;

  // Kung may naka-target at hindi iyon ang nag-send, huwag mag-reply
  if (data.targetID && senderID !== data.targetID) return;

  // Anti-Spam Buffer: Burahin ang nakalipas na timer para hindi sumabay sa nag-i-spam
  if (userSpamTimers.has(senderID)) {
    clearTimeout(userSpamTimers.get(senderID));
  }

  // Maghintay muna matapos mag-type/spam ang tao bago lumapag ang bot
  const timer = setTimeout(async () => {
    userSpamTimers.delete(senderID);

    try {
      let chosenText;

      // Kapag nagbibilang o nagse-send ng resibo/numero -> Puputulin ang bilang
      if (isCountingOrNumberSpam(cleanBody)) {
        chosenText = NUMBER_INTERCEPT_RESPONSES[Math.floor(Math.random() * NUMBER_INTERCEPT_RESPONSES.length)];
      } else {
        chosenText = SLEEPING_BANAT[Math.floor(Math.random() * SLEEPING_BANAT.length)];
      }

      let payload = chosenText;
      if (data.targetID && data.targetName) {
        payload = {
          body: `😴 @${data.targetName} ${chosenText}`,
          mentions: [{ id: data.targetID, tag: `@${data.targetName}` }]
        };
      }

      api.sendMessage(payload, threadID, (err, info) => {
        if (err) return console.error("[BANAT Send Error]:", err);

        if (info && info.messageID) {
          api.setMessageReaction("😴", info.messageID, (reactErr) => {
            if (reactErr) console.error("[SLEEP-REACT Error]:", reactErr);
          }, true);
        }
      }, messageID);

    } catch (err) {
      console.error("[BANAT-ENGINE Event Error]:", err);
    }
  }, getHumanDelay());

  userSpamTimers.set(senderID, timer);
};

// ===== COMMAND RUN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;
  const sub = (args[0] || "").toLowerCase().trim();

  // Permiso para sa alinman sa dalawang admin IDs
  if (!ADMIN_IDS.includes(senderID.toString())) {
    return api.sendMessage(`🚫 Admin access required.`, threadID, messageID);
  }

  const data = loadData();

  if (sub === "off") {
    data.active = false;
    data.targetID = null;
    data.targetName = null;
    saveData(data);
    return api.sendMessage("😴 [ SLEEP MODE OFF ] BANAT ENGINE IS NOW OFF!", threadID, messageID);
  }

  if (sub === "on") {
    const mentionedKeys = Object.keys(mentions || {});
    data.active = true;

    if (mentionedKeys.length > 0) {
      const targetID = mentionedKeys[0];
      const targetName = mentions[targetID].replace("@", "");
      data.targetID = targetID;
      data.targetName = targetName;
      saveData(data);

      return api.sendMessage(
        `😴 [ SLEEPING BANAT ACTIVATED ]\n\n` +
        `🎯 Target: ${mentions[targetID]}\n` +
        `💤 Theme: Sleeping / Inaantok\n` +
        `😴 Auto-React: 😴 reaction\n` +
        `⏳ Duration: Infinite\n` +
        `⚡ Anti-Spam: Active (2-3s Delay)\n` +
        `👑 Admin: Authorized`,
        threadID,
        messageID
      );
    } else {
      data.targetID = null;
      data.targetName = null;
      saveData(data);

      return api.sendMessage(
        `😴 [ GLOBAL SLEEPING BANAT ACTIVATED ]\n\n` +
        `🌐 Mode: Global\n` +
        `💤 Theme: Sleeping / Inaantok\n` +
        `😴 Auto-React: 😴 reaction\n` +
        `⏳ Duration: Infinite\n` +
        `⚡ Anti-Spam: Active (2-3s Delay)\n` +
        `👑 Admin: Authorized`,
        threadID,
        messageID
      );
    }
  }

  return api.sendMessage(
    `👑 SLEEP BANAT ENGINE\n\n` +
    `• /banat on\n` +
    `• /banat on @mention\n` +
    `• /banat off`,
    threadID,
    messageID
  );
};
