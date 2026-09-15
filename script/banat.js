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
  "Kenjutsu 🩸🥷🏿",
  "Iaijutsu 🩸🥷🏿",
  "Battojutsu 🩸🥷🏿",
  "Kendo 🩸🥷🏿",
  "Ninjutsu 🩸🥷🏿",
  "Taijutsu 🩸🥷🏿",
  "Genjutsu 🩸🥷🏿",
  "Shurikenjutsu 🩸🥷🏿",
  "Kusarigamajutsu 🩸🥷🏿",
  "Sojutsu 🩸🥷🏿",
  "Bojutsu 🩸🥷🏿",
  "Jojutsu 🩸🥷🏿",
  "Kyujutsu 🩸🥷🏿",
  "Naginatajutsu 🩸🥷🏿",
  "Tantojutsu 🩸🥷🏿",
  "Niten Ichi-ryu 🩸🥷🏿",
  "Hiken 🩸🥷🏿",
  "Iai 🩸🥷🏿",
  "Shinobi-iri 🩸🥷🏿",
  "Kakuremi 🩸🥷🏿",
  "Kagegakure 🩸🥷🏿",
  "Meisaigakure 🩸🥷🏿",
  "Shunshin 🩸🥷🏿",
  "Kawarimi 🩸🥷🏿",
  "Bunshin 🩸🥷🏿",
  "Henge 🩸🥷🏿",
  "Kuchiyose 🩸🥷🏿",
  "Fuuinjutsu 🩸🥷🏿",
  "Chakra Flow 🩸🥷🏿",
  "Chakra Blade 🩸🥷🏿",
  "Chakra Edge 🩸🥷🏿",
  "Chakra Guard 🩸🥷🏿",
  "Chakra Step 🩸🥷🏿",
  "Chakra Focus 🩸🥷🏿",
  "Chakra Sense 🩸🥷🏿",
  "Chakra Control 🩸🥷🏿",
  "Wind Style 🩸🥷🏿",
  "Water Style 🩸🥷🏿",
  "Fire Style 🩸🥷🏿",
  "Lightning Style 🩸🥷🏿",
  "Earth Style 🩸🥷🏿",
  "Mist Style 🩸🥷🏿",
  "Shadow Style 🩸🥷🏿",
  "Moon Style 🩸🥷🏿",
  "Storm Style 🩸🥷🏿",
  "Flame Style 🩸🥷🏿",
  "Frost Style 🩸🥷🏿",
  "Cloud Style 🩸🥷🏿",
  "Rain Style 🩸🥷🏿",
  "River Style 🩸🥷🏿",
  "Mountain Style 🩸🥷🏿",
  "Forest Style 🩸🥷🏿",
  "Leaf Style 🩸🥷🏿",
  "Dawn Style 🩸🥷🏿",
  "Dusk Style 🩸🥷🏿",
  "Star Style 🩸🥷🏿",
  "Sky Style 🩸🥷🏿",
  "Thunder Step 🩸🥷🏿",
  "Wind Step 🩸🥷🏿",
  "Silent Step 🩸🥷🏿",
  "Shadow Step 🩸🥷🏿",
  "Phantom Step 🩸🥷🏿",
  "Swift Step 🩸🥷🏿",
  "Moon Step 🩸🥷🏿",
  "Cloud Step 🩸🥷🏿",
  "Mist Step 🩸🥷🏿",
  "River Step 🩸🥷🏿",
  "Dragon Step 🩸🥷🏿",
  "Fox Step 🩸🥷🏿",
  "Tiger Step 🩸🥷🏿",
  "Eagle Step 🩸🥷🏿",
  "Serpent Step 🩸🥷🏿",
  "Crane Step 🩸🥷🏿",
  "Lotus Step 🩸🥷🏿",
  "Bamboo Step 🩸🥷🏿",
  "Falling Leaf 🩸🥷🏿",
  "Rising Leaf 🩸🥷🏿",
  "Dancing Leaf 🩸🥷🏿",
  "Silent Leaf 🩸🥷🏿",
  "Flying Leaf 🩸🥷🏿",
  "Autumn Leaf 🩸🥷🏿",
  "Moonlight Blade 🩸🥷🏿",
  "Sunrise Blade 🩸🥷🏿",
  "Dusk Blade 🩸🥷🏿",
  "Dawn Blade 🩸🥷🏿",
  "Shadow Blade 🩸🥷🏿",
  "Phantom Blade 🩸🥷🏿",
  "Crimson Blade 🩸🥷🏿",
  "Silver Blade 🩸🥷🏿",
  "Golden Blade 🩸🥷🏿",
  "Jade Blade 🩸🥷🏿",
  "Obsidian Blade 🩸🥷🏿",
  "Ivory Blade 🩸🥷🏿",
  "Moon Blade 🩸🥷🏿",
  "Storm Blade 🩸🥷🏿",
  "Wind Blade 🩸🥷🏿",
  "Flame Blade 🩸🥷🏿",
  "Frost Blade 🩸🥷🏿",
  "Cloud Blade 🩸🥷🏿",
  "River Blade 🩸🥷🏿",
  "Heaven Blade 🩸🥷🏿",
  "Silent Blade 🩸🥷🏿",
  "Swift Blade 🩸🥷🏿",
  "Hidden Blade 🩸🥷🏿",
  "Twin Blade 🩸🥷🏿",
  "Spirit Blade 🩸🥷🏿",
  "Guardian Blade 🩸🥷🏿",
  "Dragon Blade 🩸🥷🏿",
  "Tiger Blade 🩸🥷🏿",
  "Fox Blade 🩸🥷🏿",
  "Crane Blade 🩸🥷🏿",
  "Serpent Blade 🩸🥷🏿",
  "Lotus Blade 🩸🥷🏿",
  "Bamboo Blade 🩸🥷🏿",
  "Heavenly Blade 🩸🥷🏿",
  "Celestial Blade 🩸🥷🏿",
  "Eternal Blade 🩸🥷🏿",
  "Ancient Blade 🩸🥷🏿",
  "Sacred Blade 🩸🥷🏿",
  "Noble Blade 🩸🥷🏿",
  "Royal Blade 🩸🥷🏿",
  "Samurai Spirit 🩸🥷🏿",
  "Warrior Spirit 🩸🥷🏿",
  "Shinobi Spirit 🩸🥷🏿",
  "Silent Spirit 🩸🥷🏿",
  "Moon Spirit 🩸🥷🏿",
  "Dragon Spirit 🩸🥷🏿",
  "Fox Spirit 🩸🥷🏿",
  "Tiger Spirit 🩸🥷🏿",
  "Crane Spirit 🩸🥷🏿",
  "Wolf Spirit 🩸🥷🏿",
  "Eagle Spirit 🩸🥷🏿",
  "Storm Spirit 🩸🥷🏿",
  "Wind Spirit 🩸🥷🏿",
  "Flame Spirit 🩸🥷🏿",
  "Water Spirit 🩸🥷🏿",
  "Forest Spirit 🩸🥷🏿",
  "Mountain Spirit 🩸🥷🏿",
  "Sky Spirit 🩸🥷🏿",
  "Star Spirit 🩸🥷🏿",
  "Lotus Spirit 🩸🥷🏿",
  "Iron Guard 🩸🥷🏿",
  "Steel Guard 🩸🥷🏿",
  "Moon Guard 🩸🥷🏿",
  "Shadow Guard 🩸🥷🏿",
  "Silent Guard 🩸🥷🏿",
  "Dragon Guard 🩸🥷🏿",
  "Tiger Guard 🩸🥷🏿",
  "Crane Guard 🩸🥷🏿",
  "Storm Guard 🩸🥷🏿",
  "Wind Guard 🩸🥷🏿",
  "Flame Guard 🩸🥷🏿",
  "Frost Guard 🩸🥷🏿",
  "Cloud Guard 🩸🥷🏿",
  "River Guard 🩸🥷🏿",
  "Forest Guard 🩸🥷🏿",
  "Mountain Guard 🩸🥷🏿",
  "Sky Guard 🩸🥷🏿",
  "Dawn Guard 🩸🥷🏿",
  "Dusk Guard 🩸🥷🏿",
  "Lotus Guard 🩸🥷🏿",
  "Dragon Stance 🩸🥷🏿",
  "Tiger Stance 🩸🥷🏿",
  "Crane Stance 🩸🥷🏿",
  "Wolf Stance 🩸🥷🏿",
  "Fox Stance 🩸🥷🏿",
  "Serpent Stance 🩸🥷🏿",
  "Eagle Stance 🩸🥷🏿",
  "Moon Stance 🩸🥷🏿",
  "Sun Stance 🩸🥷🏿",
  "Storm Stance 🩸🥷🏿",
  "Wind Stance 🩸🥷🏿",
  "Flame Stance 🩸🥷🏿",
  "Water Stance 🩸🥷🏿",
  "Earth Stance 🩸🥷🏿",
  "Mountain Stance 🩸🥷🏿",
  "Forest Stance 🩸🥷🏿",
  "Cloud Stance 🩸🥷🏿",
  "Mist Stance 🩸🥷🏿",
  "Dawn Stance 🩸🥷🏿",
  "Dusk Stance 🩸🥷🏿",
  "Silent Stance 🩸🥷🏿",
  "Phantom Stance 🩸🥷🏿",
  "Shadow Stance 🩸🥷🏿",
  "Iron Stance 🩸🥷🏿",
  "Steel Stance 🩸🥷🏿",
  "Lotus Stance 🩸🥷🏿",
  "Bamboo Stance 🩸🥷🏿",
  "Sword Flow 🩸🥷🏿",
  "Blade Flow 🩸🥷🏿",
  "Chakra Flow 🩸🥷🏿",
  "Wind Flow 🩸🥷🏿",
  "Water Flow 🩸🥷🏿",
  "Flame Flow 🩸🥷🏿",
  "Shadow Flow 🩸🥷🏿",
  "Moon Flow 🩸🥷🏿",
  "Storm Flow 🩸🥷🏿",
  "River Flow 🩸🥷🏿",
  "Silent Flow 🩸🥷🏿",
  "Dragon Flow 🩸🥷🏿",
  "Tiger Flow 🩸🥷🏿",
  "Crane Flow 🩸🥷🏿",
  "Lotus Flow 🩸🥷🏿",
  "Bamboo Flow 🩸🥷🏿",
  "Heaven Flow 🩸🥷🏿",
  "Spirit Flow 🩸🥷🏿",
  "Noble Flow 🩸🥷🏿",
  "Royal Flow 🩸🥷🏿",
  "Dragon Slash 🩸🥷🏿",
  "Tiger Slash 🩸🥷🏿",
  "Crane Slash 🩸🥷🏿",
  "Wolf Slash 🩸🥷🏿",
  "Fox Slash 🩸🥷🏿",
  "Serpent Slash 🩸🥷🏿",
  "Eagle Slash 🩸🥷🏿",
  "Moon Slash 🩸🥷🏿",
  "Sun Slash 🩸🥷🏿",
  "Storm Slash 🩸🥷🏿",
  "Wind Slash 🩸🥷🏿",
  "Flame Slash 🩸🥷🏿",
  "Water Slash 🩸🥷🏿",
  "Frost Slash 🩸🥷🏿",
  "Cloud Slash 🩸🥷🏿",
  "Mist Slash 🩸🥷🏿",
  "Dawn Slash 🩸🥷🏿",
  "Dusk Slash 🩸🥷🏿",
  "Silent Slash 🩸🥷🏿",
  "Phantom Slash 🩸🥷🏿",
  "Shadow Slash 🩸🥷🏿",
  "Heaven Slash 🩸🥷🏿",
  "Celestial Slash 🩸🥷🏿",
  "Moonlight Slash 🩸🥷🏿",
  "Sunrise Slash 🩸🥷🏿",
  "Twilight Slash 🩸🥷🏿",
  "Whirlwind Slash 🩸🥷🏿",
  "Rising Slash 🩸🥷🏿",
  "Falling Slash 🩸🥷🏿",
  "Cross Slash 🩸🥷🏿",
  "Twin Slash 🩸🥷🏿",
  "Swift Slash 🩸🥷🏿",
  "Silent Draw 🩸🥷🏿",
  "Swift Draw 🩸🥷🏿",
  "Moon Draw 🩸🥷🏿",
  "Shadow Draw 🩸🥷🏿",
  "Wind Draw 🩸🥷🏿",
  "Storm Draw 🩸🥷🏿",
  "Flame Draw 🩸🥷🏿",
  "Water Draw 🩸🥷🏿",
  "Dawn Draw 🩸🥷🏿",
  "Dusk Draw 🩸🥷🏿",
  "Heaven Draw 🩸🥷🏿",
  "Dragon Draw 🩸🥷🏿",
  "Tiger Draw 🩸🥷🏿",
  "Phantom Draw 🩸🥷🏿",
  "Silent Guard 🩸🥷🏿",
  "Iron Guard 🩸🥷🏿",
  "Steel Guard 🩸🥷🏿",
  "Moon Guard 🩸🥷🏿",
  "Dragon Guard 🩸🥷🏿",
  "Tiger Guard 🩸🥷🏿",
  "Wind Guard 🩸🥷🏿",
  "Storm Guard 🩸🥷🏿",
  "Flame Guard 🩸🥷🏿",
  "Water Guard 🩸🥷🏿",
  "Frost Guard 🩸🥷🏿",
  "Cloud Guard 🩸🥷🏿",
  "Mist Guard 🩸🥷🏿",
  "Shadow Guard 🩸🥷🏿",
  "Phantom Guard 🩸🥷🏿",
  "Dawn Guard 🩸🥷🏿",
  "Dusk Guard 🩸🥷🏿",
  "Heaven Guard 🩸🥷🏿",
  "Spirit Guard 🩸🥷🏿",
  "Noble Guard 🩸🥷🏿",
  "Royal Guard 🩸🥷🏿",
  "Samurai Focus 🩸🥷🏿",
  "Warrior Focus 🩸🥷🏿",
  "Shinobi Focus 🩸🥷🏿",
  "Chakra Focus 🩸🥷🏿",
  "Blade Focus 🩸🥷🏿",
  "Sword Focus 🩸🥷🏿",
  "Moon Focus 🩸🥷🏿",
  "Dragon Focus 🩸🥷🏿",
  "Tiger Focus 🩸🥷🏿",
  "Silent Focus 🩸🥷🏿",
  "Shadow Focus 🩸🥷🏿",
  "Storm Focus 🩸🥷🏿",
  "Wind Focus 🩸🥷🏿",
  "Flame Focus 🩸🥷🏿",
  "Water Focus 🩸🥷🏿",
  "Iron Will 🩸🥷🏿",
  "Steel Will 🩸🥷🏿",
  "Samurai Will 🩸🥷🏿",
  "Warrior Will 🩸🥷🏿",
  "Shinobi Will 🩸🥷🏿",
  "Silent Will 🩸🥷🏿",
  "Dragon Will 🩸🥷🏿",
  "Tiger Will 🩸🥷🏿",
  "Moon Will 🩸🥷🏿",
  "Storm Will 🩸🥷🏿",
  "Wind Will 🩸🥷🏿",
  "Flame Will 🩸🥷🏿",
  "Water Will 🩸🥷🏿",
  "Heaven Will 🩸🥷🏿",
  "Spirit Will 🩸🥷🏿",
  "Noble Will 🩸🥷🏿",
  "Royal Will 🩸🥷🏿",
  "Warrior Resolve 🩸🥷🏿",
  "Samurai Resolve 🩸🥷🏿",
  "Shinobi Resolve 🩸🥷🏿",
  "Dragon Resolve 🩸🥷🏿",
  "Tiger Resolve 🩸🥷🏿",
  "Moon Resolve 🩸🥷🏿",
  "Silent Resolve 🩸🥷🏿",
  "Shadow Resolve 🩸🥷🏿",
  "Storm Resolve 🩸🥷🏿",
  "Wind Resolve 🩸🥷🏿",
  "Flame Resolve 🩸🥷🏿",
  "Water Resolve 🩸🥷🏿",
  "Heaven Resolve 🩸🥷🏿",
  "Spirit Resolve 🩸🥷🏿",
  "Noble Resolve 🩸🥷🏿",
  "Royal Resolve 🩸🥷🏿"
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
