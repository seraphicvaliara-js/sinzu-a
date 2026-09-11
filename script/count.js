const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "count",
  version: "19.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Fast Auto-Count 1-100 with LGC Receipt",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /count on — Simulan ang mabilis na bilang (1-100)\n" +
    "• /count on @mention — Mabilis na bilang na may target\n" +
    "• /count off — I-stop ang pagbibilang",
  cooldowns: 1
};

const ADMIN_IDS = ["61594240921272", "61591430164540", "61593900495161"];
const DATA_PATH = path.join(__dirname, "count_config.json");
const PREFIXES = ["/", "!", ".", "?", "-", "$", "#"];

const REASONS = [
  "SOBRANG YABANG MO MAG-CHAT SA GROUP CHAT AKALA MO KUNG SINO KANG MAGALING PERO SA TOTOONG BUHAY WALA KA NAMANG MAIPAGMAMAYABANG AT PALAMUNIN KA LANG NAMAN SA BAHAY NYO KAYA DAPAT SULITIN MO ANG ARAW MO DITO SA PAGKATALO MO SA AKIN KASI KAWAWA KA LANG TALAGA",
  "AKALA MO MUKHA KANG PRO PERO SA TOTOONG BUHAY PURO KA LANG YABANG NA WALANG KANYANG KATUTURAN AT KAHIT KAILAN HINDI MO AKO MAPAPANTAYAN SA MGA MASAMANG TRASHTALK NA IBINABAGSAK KO SA MUKHA MONG RESIBO NG PANIS NA ULAM NA WALANG NAGMAMAHAL",
  "LALABAN KA PA SA AKIN AT MAG-YAYABANG EH SA UNANG HAWAK MO PA LANG NG PHONE EH HALATANG HINDI MO MAN LANG GINAGAMIT ANG UTAK MO KAYA UMIYAK KA NA LANG SA UNAN MO AT WAG KANG MAG-SPAM DITO DAHIL WALA KANG PANAMA AT PALAGING BASAG KA",
  "NAPAKALAKAS NG AMATS MO SA SARILI MO PERO KAHIT ALIKABOK WALANG TAKOT SA IYO KAYA BUMALIK KA NA LANG SA PAMBATANG CHATROOM KASI PANG-FREE WIFI KA LANG AT HINDI MO KAILANMAN MABABAGO NA TALUNAN KA KAHIT MAG-AGAW BUHAY KA PA DITO",
  "WALA KANG BINATBAT AT KAHIT BUMUO KA PA NG SANDATAHAN LABAN SA AKIN DAHIL ANG MGA HIRIT MO AY PANIS NA AT MAS MAY SILBI PA ANG SIRANG ELECTRIC FAN KAYSA SA MGA WALANG KWENTANG CHAT MONG HINDI MO MAN LANG NAIPAGLABAN ANG DIGNIDAD MO"
];

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[COUNT-ENGINE] Load error:", err);
  }
  return { active: false, targetID: null, targetName: null, startTime: null };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[COUNT-ENGINE] Save error:", err);
  }
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

    await new Promise((resolve) => {
      api.sendMessage(payload, threadID, resolve);
    });

    // Super fast delay (200ms - 400ms)
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

    api.sendMessage(receiptMessage, threadID);

    finalData.active = false;
    finalData.targetID = null;
    finalData.targetName = null;
    saveData(finalData);
  }
}

module.exports.handleEvent = async function ({ api, event }) {
  if (!event || event.type !== "message" || !event.body) return;
  const { senderID, body } = event;
  const isSenderAdmin = ADMIN_IDS.includes(senderID.toString());
  const isCommand = PREFIXES.some((p) => body.trim().startsWith(p));

  if (!isSenderAdmin && isCommand) return;
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;

  if (!ADMIN_IDS.includes(senderID.toString())) return;

  const sub = (args[0] || "").toLowerCase().trim();
  const data = loadData();

  if (sub === "off") {
    data.active = false;
    data.targetID = null;
    data.targetName = null;
    data.startTime = null;
    saveData(data);
    return api.sendMessage("—.GG/SLEEPIN4LGNG💫💤💤 [ OFF ]", threadID, messageID);
  }

  if (sub === "on") {
    const mentionedKeys = Object.keys(mentions || {});
    data.active = true;
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
    runAutoCount(api, threadID);
    return;
  }

  return api.sendMessage(
    `👑 SLEEPIN4LGNG COUNT ENGINE\n\n• /count on\n• /count on @mention\n• /count off`,
    threadID,
    messageID
  );
};
