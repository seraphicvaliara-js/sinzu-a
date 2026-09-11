const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "banat",
  version: "21.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Unified Auto-Count (1-100) and Auto-Banat Engine",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /banat on — Simulan ang mabilis na bilang (1-100) at auto-banat\n" +
    "• /banat on @mention — I-target ang isang tao sa bilang at banat\n" +
    "• /banat off — Patayin ang buong engine",
  cooldowns: 1
};

// Admin ID Configuration
const ADMIN_IDS = ["61594240921272", "61591430164540", "61593900495161"];
const DATA_PATH = path.join(__dirname, "banat_config.json");
const PREFIXES = ["/", "!", ".", "?", "-", "$", "#"];

const userSpamTimers = new Map();

// Random All-Caps Trashtalk Reasons (~25 words)
const REASONS = [
  "SOBRANG YABANG MO MAG-CHAT SA GROUP CHAT AKALA MO KUNG SINO KANG MAGALING PERO SA TOTOONG BUHAY WALA KA NAMANG MAIPAGMAMAYABANG AT PALAMUNIN KA LANG NAMAN SA BAHAY NYO KAYA DAPAT SULITIN MO ANG ARAW MO DITO SA PAGKATALO MO SA AKIN KASI KAWAWA KA LANG TALAGA",
  "AKALA MO MUKHA KANG PRO PERO SA TOTOONG BUHAY PURO KA LANG YABANG NA WALANG KANYANG KATUTURAN AT KAHIT KAILAN HINDI MO AKO MAPAPANTAYAN SA MGA MASAMANG TRASHTALK NA IBINABAGSAK KO SA MUKHA MONG RESIBO NG PANIS NA ULAM NA WALANG NAGMAMAHAL",
  "LALABAN KA PA SA AKIN AT MAG-YAYABANG EH SA UNANG HAWAK MO PA LANG NG PHONE EH HALATANG HINDI MO MAN LANG GINAGAMIT ANG UTAK MO KAYA UMIYAK KA NA LANG SA UNAN MO AT WAG KANG MAG-SPAM DITO DAHIL WALA KANG PANAMA AT PALAGING BASAG KA",
  "NAPAKALAKAS NG AMATS MO SA SARILI MO PERO KAHIT ALIKABOK WALANG TAKOT SA IYO KAYA BUMALIK KA NA LANG SA PAMBATANG CHATROOM KASI PANG-FREE WIFI KA LANG AT HINDI MO KAILANMAN MABABAGO NA TALUNAN KA KAHIT MAG-AGAW BUHAY KA PA DITO",
  "WALA KANG BINATBAT AT KAHIT BUMUO KA PA NG SANDATAHAN LABAN SA AKIN DAHIL ANG MGA HIRIT MO AY PANIS NA AT MAS MAY SILBI PA ANG SIRANG ELECTRIC FAN KAYSA SA MGA WALANG KWENTANG CHAT MONG HINDI MO MAN LANG NAIPAGLABAN ANG DIGNIDAD MO"
];

// LISTAHAN NG TRASHTALK BANAT
const TRASHTALK_BANAT = [
  "hahahahaha sira social life mo saken tabaka\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "mag dasal ka latin baka siguro mawala pa ako\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "pag hindi mo na kaya mag quit dummy ka na ha\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "e sabe ko naman sayo pag lambuten ka wag kana pumalag\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pag kakalabanin mo ako dapat may anim na immortality ka\n\n—.GG/SLEEPIN4LGNG💫💤💤"
];

const NUMBER_INTERCEPT_RESPONSES = [
  "🛑 Kakabilang mo, hindi mo napansing tulog ka na pala sa 'kin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "📊 Ilang counting pa ba ang kailangan mo para marealize mong wala kang epekto?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "💤 Putol 'yang bilang mo, umuwi ka na at humiga\n\n—.GG/SLEEPIN4LGNG💫💤💤"
];

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[BANAT-ENGINE] Load error:", err);
  }
  return { active: false, banatEnabled: true, targetID: null, targetName: null, startTime: null };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[BANAT-ENGINE] Save error:", err);
  }
}

function isCountingOrNumberSpam(text) {
  const clean = text.trim();
  return /^\d+$/.test(clean) || /^#?\d+[\.\-\)]?$/.test(clean);
}

function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  let res = "";
  if (hours > 0) res += `${hours}h `;
  if (minutes > 0) res += `${minutes}m `;
  res += `${seconds}s`;
  return res.trim() || "0s";
}

async function runAutoCount(api, threadID) {
  let botName = "Bot Account";
  try {
    const botID = api.getCurrentUserID();
    const info = await api.getUserInfo(botID);
    if (info && info[botID]) {
      botName = info[botID].name;
    }
  } catch (e) {
    console.error("Failed to get bot name:", e);
  }

  for (let i = 1; i <= 100; i++) {
    const currentData = loadData();
    if (!currentData.active) break;

    let payload = `${i}`;

    if (currentData.targetID && currentData.targetName) {
      payload = {
        body: `@${currentData.targetName} ${i}`,
        mentions: [{ id: currentData.targetID, tag: `@${currentData.targetName}` }]
      };
    }

    const sendToThread = (currentData.targetID && !threadID.includes("thread")) ? currentData.targetID : threadID;

    await new Promise((resolve) => {
      api.sendMessage(payload, sendToThread, resolve);
    });

    // Mabilis na interval (200ms - 400ms)
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 200) + 200));
  }

  const finalData = loadData();
  if (finalData.active) {
    const durationMs = Date.now() - (finalData.startTime || Date.now());
    const durationFormatted = formatDuration(durationMs);
    const randomReason = REASONS[Math.floor(Math.random() * REASONS.length)];

    const receiptMessage = 
      `🧾 [ LGC RECEIPT ]\n\n` +
      `🤖 Bot Name: ${botName}\n` +
      `⏱️ Duration: ${durationFormatted}\n` +
      `🔥 status: [ LGC STARTED ]\n\n` +
      `📝 Reason:\n${randomReason}\n\n` +
      `—.GG/SLEEPIN4LGNG💫💤💤`;

    const sendToThread = (finalData.targetID && !threadID.includes("thread")) ? finalData.targetID : threadID;
    api.sendMessage(receiptMessage, sendToThread);

    finalData.active = false;
    finalData.targetID = null;
    finalData.targetName = null;
    saveData(finalData);
  }
}

// ===== EVENT HANDLER =====
module.exports.handleEvent = async function ({ api, event }) {
  if (!event || event.type !== "message" || !event.body) return;

  const { threadID, messageID, senderID, body } = event;
  const cleanBody = body.trim();
  const isSenderAdmin = ADMIN_IDS.includes(senderID.toString());

  if (senderID === api.getCurrentUserID()) return;

  const isCommand = PREFIXES.some((p) => cleanBody.startsWith(p));

  if (!isSenderAdmin && isCommand) {
    if (userSpamTimers.has(senderID)) {
      clearTimeout(userSpamTimers.get(senderID));
      userSpamTimers.delete(senderID);
    }
    return;
  }

  if (isSenderAdmin && isCommand) return;

  const data = loadData();

  // KAPAG NAKA-MUTE / NAKA-OFF ANG BANAT ENGINE: WALANG BANAT NA AATAKE
  if (!data.active || !data.banatEnabled) return;

  if (data.targetID && senderID !== data.targetID) return;

  if (userSpamTimers.has(senderID)) {
    clearTimeout(userSpamTimers.get(senderID));
  }

  const timer = setTimeout(async () => {
    userSpamTimers.delete(senderID);

    try {
      let chosenText;

      if (isCountingOrNumberSpam(cleanBody)) {
        chosenText = NUMBER_INTERCEPT_RESPONSES[Math.floor(Math.random() * NUMBER_INTERCEPT_RESPONSES.length)];
      } else {
        chosenText = TRASHTALK_BANAT[Math.floor(Math.random() * TRASHTALK_BANAT.length)];
      }

      let payload = chosenText;
      if (data.targetID && data.targetName) {
        payload = {
          body: `@${data.targetName} ${chosenText}`,
          mentions: [{ id: data.targetID, tag: `@${data.targetName}` }]
        };
      }

      api.sendMessage(payload, threadID, (err, info) => {
        if (err) return console.error("[BANAT Send Error]:", err);

        if (info && info.messageID) {
          api.setMessageReaction("💫", info.messageID, (reactErr) => {
            if (reactErr) console.error("[SLEEP-REACT Error]:", reactErr);
          }, true);
        }
      }, messageID);

    } catch (err) {
      console.error("[BANAT-ENGINE Event Error]:", err);
    }
  }, Math.floor(Math.random() * 1000) + 2000);

  userSpamTimers.set(senderID, timer);
};

// ===== COMMAND RUN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;

  if (!ADMIN_IDS.includes(senderID.toString())) {
    return;
  }

  const sub = (args[0] || "").toLowerCase().trim();
  const data = loadData();

  if (sub === "off") {
    data.active = false;
    data.banatEnabled = false;
    data.targetID = null;
    data.targetName = null;
    data.startTime = null;
    saveData(data);
    return api.sendMessage("—.GG/SLEEPIN4LGNG💫💤💤 [ OFF ]", threadID, messageID);
  }

  if (sub === "on") {
    const mentionedKeys = Object.keys(mentions || {});
    data.active = true;
    data.banatEnabled = true;
    data.startTime = Date.now();

    if (mentionedKeys.length > 0) {
      const targetID = mentionedKeys[0];
      const targetName = mentions[targetID].replace("@", "");
      data.targetID = targetID;
      data.targetName = targetName;
    } else {
      data.targetID = null;
      data.targetName = null;
    }

    saveData(data);
    
    // Mabilisang magbibilang ng 1-100 pagka-trigger
    runAutoCount(api, threadID);
    return;
  }

  return api.sendMessage(
    `👑 SLEEPIN4LGNG BANAT & COUNT ENGINE\n\n` +
    `• /banat on\n` +
    `• /banat on @mention\n` +
    `• /banat off`,
    threadID,
    messageID
  );
};
