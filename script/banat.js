const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "banat",
  version: "18.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Advanced Auto-Banat Engine - 30s Auto-Count with Receipt Tracker",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /banat on — I-ON ang global auto-banat sa GC na ito\n" +
    "• /banat on @mention — I-target ang isang tao sa GC na ito\n" +
    "• /banat off — Patayin ang Banat Engine sa GC na ito",
  cooldowns: 2
};

// Admin ID Configuration
const ADMIN_IDS = ["61594240921272", "61591430164540", "61593900495161", "61594251452411"];
const DATA_PATH = path.join(__dirname, "banat_config.json");
const PREFIXES = ["/", "!", ".", "?", "-", "$", "#"];

// In-memory Timers & Counters
const userSpamTimers = new Map();
const autoCountTimers = new Map();

// ===== SMART FLEXIBLE REPLIES =====
const CONTEXTUAL_RESPONSES = [
  {
    keywords: ["aso", "asoka", "tuta"],
    replies: [
      "hindi ako aso, tao ako. ikaw ung gubat ang pinagmulan, mukha kang unggoy na tumakas sa zoo",
      "lakas mo magsalita ng aso, eh sa amoy pa lang ng hininga mo mukha ka nang garapata",
      "tahol ka nang tahol dyan, sino sa atin ang totoong aso? takot ka naman lumaban nang patas"
    ]
  },
  {
    keywords: ["bobo", "tanga", "inept", "gago"],
    replies: [
      "nagsalita ang academic failure, ayusin mo muna grammar mo bago ka magsalita ng bobo",
      "ako bobo? baka kapag sinukat IQ natin dalawa, mag-negative sa’yo sa sobrang bagal ng utak mo",
      "lakas ng loob mong tumawag ng tanga eh maski sarili mong buhay hindi mo maayos-ayos"
    ]
  },
  {
    keywords: ["tangina", "tangina mo", "gco"],
    replies: [
      "idamay mo pa magulang mo sa pagkatalo mo dito, umiyak ka na lang sa sulok nyo",
      "puro ka mura wala namang laman argumento mo, halatang kapos sa aruga",
      "galit na galit gustong manakit? mura pa lang nilalapag mo ibig sabihin talo ka na"
    ]
  },
  {
    keywords: ["mama mo", "papa mo", "magulang"],
    replies: [
      "huwag mong idamay pamilya mo dito, nahihiya na nga sila sa ginagawa mong kakornihan",
      "puro ka mama mo, ikaw nga hindi maipagmalaki ng magulang mo sa mga kapitbahay nyo"
    ]
  },
  {
    keywords: ["duwag", "takot", "pumalag"],
    replies: [
      "sino ang duwag? kanina ka pa pilit gumagawa ng dahilan kasi nararamdaman mo nang patapos ka na",
      "pumalag ka muna nang maayos bago ka magsalita tungkol sa pagiging duwag"
    ]
  }
];

const TRASHTALK_BANAT = [
  "hahahahaha sira social life mo saken tabaka",
  "mag dasal ka latin baka siguro mawala pa ako",
  "pag hindi mo na kaya mag quit dummy ka na ha",
  "e sabe ko naman sayo pag lambuten ka wag kana pumalag",
  "Pag kakalabanin mo ako dapat may anim na immortality ka",
  "Your existential irrelevance is genuinely astounding bro, go touch some organic vegetation",
  "Lmao imagine manifesting this much cognitive dissonance in a public chat room, literally mid",
  "Your intellectual capacity is severely underperforming, kindly log off and recalculate your life choices",
  "Stop barking, your logical fallacies are giving everyone here a severe migraine",
  "Bro is yapping with zero factual foundation, go fix your abysmal attention span"
];

const NUMBER_INTERCEPT_RESPONSES = [
  "🛑 Your numerical enumeration will not compensate for your lack of cognitive substance",
  "📊 Keep counting all you want, your input remains mathematically irrelevant",
  "💤 Sequential spamming won't elevate your abysmal standing in this discussion"
];

// File I/O Helpers
function loadAllData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[BANAT-ENGINE] Load error:", err);
  }
  return {};
}

function saveAllData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[BANAT-ENGINE] Save error:", err);
  }
}

function getGroupConfig(threadID) {
  const allData = loadAllData();
  return allData[threadID] || { active: false, targetID: null, targetName: null, count: 0 };
}

function setGroupConfig(threadID, config) {
  const allData = loadAllData();
  allData[threadID] = config;
  saveAllData(allData);
}

function isCountingOrNumberSpam(text) {
  const clean = text.trim();
  return /^\d+$/.test(clean) || /^#?\d+[\.\-\)]?$/.test(clean);
}

function getHumanSpeedDelay() {
  return Math.floor(Math.random() * 1000) + 800;
}

function getSmartCounterReply(text) {
  const lowerText = text.toLowerCase();
  for (const item of CONTEXTUAL_RESPONSES) {
    if (item.keywords.some((kw) => lowerText.includes(kw))) {
      const randomIndex = Math.floor(Math.random() * item.replies.length);
      return item.replies[randomIndex];
    }
  }
  return null;
}

// FORMATTER NG RESIBO / COUNT TRACKER
function formatReceipt(text, count, targetName) {
  const dateStr = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Manila" });
  return (
    `🧾 [ RESIBO TRACKER #${count} ]\n` +
    `👤 Target: ${targetName ? "@" + targetName : "Global"}\n` +
    `⏰ Time: ${dateStr}\n` +
    `💬 Message: ${text}\n\n` +
    `—.GG/SLEEPIN4LGNG💫💤💤`
  );
}

// 30-SECOND AUTO-COUNT TIMER ENGINE
function startAutoCountTimer(api, threadID, targetID, targetName) {
  stopAutoCountTimer(threadID);

  // 30 Seconds Delay para sa Auto-Count
  const timer = setTimeout(() => {
    const config = getGroupConfig(threadID);
    if (!config.active) return;

    config.count = (config.count || 0) + 1;
    setGroupConfig(threadID, config);

    const tauntList = [
      "30 seconds na nakalipas, tumigil ka na? ubos na ba stock ng utak mo?",
      "30 seconds counting... bakit tumahimik ka na dyan? nagpatulong ka na ba sa mama mo?",
      "30s stall! bilisan mo mag-type, halatang hirap ka na pumalag.",
      "counting... hindi ka na makasagot sa resibo natin, balik ka na sa lobby."
    ];

    const chosenTaunt = tauntList[Math.floor(Math.random() * tauntList.length)];
    const formattedMessage = formatReceipt(chosenTaunt, config.count, targetName);

    let payload = formattedMessage;
    if (targetID && targetName) {
      payload = {
        body: formattedMessage,
        mentions: [{ id: targetID, tag: `@${targetName}` }]
      };
    }

    api.sendMessage(payload, threadID, (err, info) => {
      if (!err && info && info.messageID) {
        api.setMessageReaction("💫", info.messageID, () => {}, true);
      }
      // I-loop ulit ang 30-seconds auto-count hanggang sa sumagot ang target
      startAutoCountTimer(api, threadID, targetID, targetName);
    });
  }, 30000); // 30000 ms = 30 seconds

  autoCountTimers.set(threadID, timer);
}

function stopAutoCountTimer(threadID) {
  if (autoCountTimers.has(threadID)) {
    clearTimeout(autoCountTimers.get(threadID));
    autoCountTimers.delete(threadID);
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

  const config = getGroupConfig(threadID);
  if (!config.active) return;

  if (config.targetID && senderID !== config.targetID) return;

  // I-reset ang 30-second timer tuwing magse-send ng chat ang target
  startAutoCountTimer(api, threadID, config.targetID, config.targetName);

  if (userSpamTimers.has(senderID)) {
    clearTimeout(userSpamTimers.get(senderID));
  }

  const timer = setTimeout(async () => {
    userSpamTimers.delete(senderID);

    try {
      config.count = (config.count || 0) + 1;
      setGroupConfig(threadID, config);

      let chosenText = getSmartCounterReply(cleanBody);

      if (!chosenText) {
        if (isCountingOrNumberSpam(cleanBody)) {
          chosenText = NUMBER_INTERCEPT_RESPONSES[Math.floor(Math.random() * NUMBER_INTERCEPT_RESPONSES.length)];
        } else {
          chosenText = TRASHTALK_BANAT[Math.floor(Math.random() * TRASHTALK_BANAT.length)];
        }
      }

      const formattedMessage = formatReceipt(chosenText, config.count, config.targetName);

      let payload = formattedMessage;
      if (config.targetID && config.targetName) {
        payload = {
          body: formattedMessage,
          mentions: [{ id: config.targetID, tag: `@${config.targetName}` }]
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
  }, getHumanSpeedDelay());

  userSpamTimers.set(senderID, timer);
};

// ===== COMMAND RUN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;

  if (!ADMIN_IDS.includes(senderID.toString())) {
    return;
  }

  const sub = (args[0] || "").toLowerCase().trim();
  const config = getGroupConfig(threadID);

  if (sub === "off") {
    config.active = false;
    config.targetID = null;
    config.targetName = null;
    config.count = 0;
    setGroupConfig(threadID, config);
    stopAutoCountTimer(threadID);

    return api.sendMessage("—.GG/SLEEPIN4LGNG💫💤💤 [ OFF - COUNT RESET ]", threadID, messageID);
  }

  if (sub === "on") {
    const mentionedKeys = Object.keys(mentions || {});
    config.active = true;
    config.count = 0; // Reset count sa panibagong round

    if (mentionedKeys.length > 0) {
      const targetID = mentionedKeys[0];
      const targetName = mentions[targetID].replace("@", "");
      config.targetID = targetID;
      config.targetName = targetName;
      setGroupConfig(threadID, config);

      startAutoCountTimer(api, threadID, targetID, targetName);

      return api.sendMessage(
        `—.GG/SLEEPIN4LGNG💫💤💤 BANAT & COUNT ACTIVATED\n\n` +
        `🎯 Target: ${mentions[targetID]}\n` +
        `🧾 Resibo Tracker: Enabled (#1 Start)\n` +
        `⏱ Auto-Count Delay: 30 Seconds\n` +
        `⚡ Response Speed: Fast Human Speed\n` +
        `👑 Status: Running`,
        threadID,
        messageID
      );
    } else {
      config.targetID = null;
      config.targetName = null;
      setGroupConfig(threadID, config);

      startAutoCountTimer(api, threadID, null, null);

      return api.sendMessage(
        `—.GG/SLEEPIN4LGNG💫💤💤 GLOBAL BANAT & COUNT ACTIVATED\n\n` +
        `🌐 Mode: Global (This GC)\n` +
        `🧾 Resibo Tracker: Enabled (#1 Start)\n` +
        `⏱ Auto-Count Delay: 30 Seconds\n` +
        `⚡ Response Speed: Fast Human Speed\n` +
        `👑 Status: Running`,
        threadID,
        messageID
      );
    }
  }

  return api.sendMessage(
    `👑 SLEEPIN4LGNG BANAT ENGINE\n\n` +
    `• /banat on\n` +
    `• /banat on @mention\n` +
    `• /banat off`,
    threadID,
    messageID
  );
};
