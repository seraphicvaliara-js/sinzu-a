const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sleeping",
  version: "5.0.0",
  hasPermission: 1,
  credits: "you",
  description: "Toggle sleeping mode autoreply on/off — 'Uncle Dags mode' na random na street/rap-vibe na reply, pero magre-reply lang habang nasa loob ng 'magdamag' na oras (default 10PM-6AM). Persistent at kayang sumabay kahit mabilis magmessage ang mga tao.",
  commandCategory: "fun",
  usages: "[on/off]",
  cooldowns: 3,
};

// ==== I-ADJUST DITO ANG ORAS NG "MAGDAMAG" MODE (24-hour format) ====
const NIGHT_START_HOUR = 22; // 10PM
const NIGHT_END_HOUR = 6;    // 6AM
// =====================================================================

// Persistent storage — naka-save sa JSON file, kaya hindi mawawala kahit mag-restart ang bot
const DATA_FILE = path.join(__dirname, "sleeping_data.json");

function loadThreads() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.log("Hindi ma-load ang sleeping_data.json:", err);
  }
  return new Set();
}

function saveThreads(threadsSet) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...threadsSet]), "utf8");
  } catch (err) {
    console.log("Hindi ma-save ang sleeping_data.json:", err);
  }
}

let sleepingThreads = loadThreads();

// Kinukuha kung nasa loob ba tayo ng "magdamag" na oras ngayon (hal. 10PM-6AM),
// support sa oras na lumalampas sa hatinggabi papuntang susunod na araw
function isNightTime() {
  const currentHour = new Date().getHours();
  if (NIGHT_START_HOUR > NIGHT_END_HOUR) {
    // Lumalampas sa hatinggabi (hal. 22 papuntang 6)
    return currentHour >= NIGHT_START_HOUR || currentHour < NIGHT_END_HOUR;
  }
  return currentHour >= NIGHT_START_HOUR && currentHour < NIGHT_END_HOUR;
}

// "Uncle Dags mode" — orihinal na mga linya na street/rap-vibe ang dating,
// HINDI kopya ng totoong lyrics ni Uncle Dags (copyrighted iyon, di pwede i-reproduce)
const sleepingReplies = [
  "angas lods 🥷",
  "tol, mag-relax ka lang diyan.",
  "solid ka pre, keep it real.",
  "ayan na naman, laging may drama.",
  "chill lang tayo diyan, walang gulo.",
  "sige lods, respeto lang sa isa't isa.",
  "araw-araw grind, walang tulugan.",
  "wag kang praning, ayos lang tayo.",
  "one time lang 'to, mag-ingat ka.",
  "totoo lang, walang paligoy-ligoy.",
  "steady lang, di kailangan mag-rush.",
  "boss moves lang dito, walang chaka.",
  "real talk, ganern lang buhay.",
  "kalma lods, may oras lahat.",
  "ganito lang buhay, ituloy lang.",
  "walang kupas, sige lang.",
  "salamat sa pagdaan, ingat lods.",
  "steady lang ang takbo natin dito.",
  "diretso lang, walang paikot-ikot.",
  "respeto muna bago lahat.",
];

// Kumuha ng random reply na hindi parehas sa huling isinend, para hindi kagad
// paulit-ulit kahit mabilis magmessage — mas natural ang randomness
const lastReplyByThread = new Map();

function getRandomReply(threadID) {
  let reply;
  const lastReply = lastReplyByThread.get(threadID);
  do {
    reply = sleepingReplies[Math.floor(Math.random() * sleepingReplies.length)];
  } while (reply === lastReply && sleepingReplies.length > 1);
  lastReplyByThread.set(threadID, reply);
  return reply;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const option = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";

  // === ADMIN-ONLY CHECK ===
  // Tanging mga group admin ng GC (o bot admin, kung meron) ang makakagamit ng command na ito
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const groupAdmins = threadInfo.adminIDs?.map((a) => a.id) || [];
    const botAdmins = global.config?.ADMINBOT || []; // list ng bot-wide admins, kung meron sa config mo

    const isGroupAdmin = groupAdmins.includes(senderID);
    const isBotAdmin = botAdmins.includes(senderID);

    if (!isGroupAdmin && !isBotAdmin) {
      return api.sendMessage(
        "🚫 Admin lang ng grupo (o bot admin) ang pwedeng gumamit ng command na ito.",
        threadID,
        messageID
      );
    }
  } catch (err) {
    return api.sendMessage("❌ Hindi ma-verify ang admin status. Subukan ulit.", threadID, messageID);
  }
  // === END ADMIN-ONLY CHECK ===

  if (option === "on") {
    sleepingThreads.add(threadID);
    saveThreads(sleepingThreads);
    return api.sendMessage(
      `🥷 Naka-ON na ang Uncle Dags mode dito, permanente ito hangga't hindi mo in-off.\n` +
      `🌙 Magre-reply lang ito habang "magdamag" (${NIGHT_START_HOUR}:00 - ${NIGHT_END_HOUR}:00), tahimik ito sa umaga't hapon.`,
      threadID,
      messageID
    );
  }

  if (option === "off") {
    sleepingThreads.delete(threadID);
    saveThreads(sleepingThreads);
    return api.sendMessage("🌙 Naka-OFF na ang Uncle Dags mode.", threadID, messageID);
  }

  return api.sendMessage(
    `Gamitin: ${prefix}sleeping on | ${prefix}sleeping off\n` +
    `Aactive lang ito habang magdamag (${NIGHT_START_HOUR}:00 - ${NIGHT_END_HOUR}:00).`,
    threadID,
    messageID
  );
};

// Hindi ito naka-await sa sendMessage — kaya hindi nagba-block ang susunod na
// event kahit sabay-sabay o sunod-sunod na magmessage ang mga tao sa GC.
module.exports.handleEvent = function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!sleepingThreads.has(threadID)) return;
  if (!body) return;
  if (senderID === api.getCurrentUserID()) return;
  if (!isNightTime()) return; // Tahimik lang kung araw pa/gabi pero hindi pa "magdamag" oras

  const randomReply = getRandomReply(threadID);
  api.sendMessage(randomReply, threadID);
};
