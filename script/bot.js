const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "bot",
  version: "3.0.0",
  hasPermission: 0,
  credits: "you",
  description: "Admin-only: /bot on — bubuksan ang bot dito at mag-aauto-reply na ng generic lines sa lahat ng messages. Wala nang 'off' — sa pagkakataong ma-on, permanente na itong tatakbo hanggang manually mo itong tanggalin sa data file.",
  commandCategory: "admin",
  usages: "[on]",
  cooldowns: 3,
};

// Persistent storage — naka-save sa JSON file, kaya hindi mawawala kahit
// mag-restart ang bot. Kung nandito ang threadID, active ang auto-reply.
const AUTOREPLY_DATA_FILE = path.join(__dirname, "bot_autoreply_data.json");

function loadSet(file) {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.log(`Could not load ${file}:`, err);
  }
  return new Set();
}

function saveSet(file, set) {
  try {
    fs.writeFileSync(file, JSON.stringify([...set]), "utf8");
  } catch (err) {
    console.log(`Could not save ${file}:`, err);
  }
}

let botAutoReplyThreads = loadSet(AUTOREPLY_DATA_FILE);

// Generic auto-reply lines — hindi roast, simpleng katulad ng presence
// acknowledgment lang ng bot. Puwede mong palitan/dagdagan ito.
const genericReplies = [
  "Andito lang ako, chat lang po! 🤖",
  "Nabasa ko yan, sige lang po.",
  "Noted po yan!",
  "Aktibo pa rin ako dito, tuloy lang po.",
  "Hala, may bago na naman!",
  "Okay lang po ba? Nandito lang ako.",
  "Ayan, na-receive ko na yang message mo.",
  "Sige po, andito lang ako kung kailangan.",
  "Message received, boss!",
  "Naka-standby lang ako dito, chat lang.",
];

const lastReplyByThread = new Map();

function getRandomGenericReply(threadID) {
  let reply;
  const lastReply = lastReplyByThread.get(threadID);
  do {
    reply = genericReplies[Math.floor(Math.random() * genericReplies.length)];
  } while (reply === lastReply && genericReplies.length > 1);
  lastReplyByThread.set(threadID, reply);
  return reply;
}

module.exports.run = async function ({ api, event, args, admin }) {
  const { threadID, messageID, senderID } = event;
  const option = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";

  // Dalawang pinagmumulan ng admin list — galing sa data/config.json
  // (global.config.adminBot) AT yung per-account "admin" na nilagay mo
  // mismo sa dashboard noong nag-login ka (dumadaan bilang `admin`
  // parameter dito). Kailangan pareho itong tignan.
  const adminBot = [...(global.config?.adminBot || []), ...(admin || [])];
  if (!adminBot.includes(senderID)) {
    return api.sendMessage(
      "🚫 Admin-only command. Only bot admins set in the dashboard can use this.",
      threadID,
      messageID
    );
  }

  if (option === "on") {
    botAutoReplyThreads.add(threadID);
    saveSet(AUTOREPLY_DATA_FILE, botAutoReplyThreads);

    return api.sendMessage(
      "🟢 Naka-ON na ang bot dito — mag-aauto-reply na sa lahat ng papasok na message.",
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    `Usage: ${prefix}bot on`,
    threadID,
    messageID
  );
};

module.exports.handleEvent = function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!botAutoReplyThreads.has(threadID)) return;
  if (!body) return;
  if (senderID === api.getCurrentUserID()) return;

  const randomReply = getRandomGenericReply(threadID);

  // Safe mabilis na interval (500ms–1000ms): mabilis sumagot per message
  // pero hindi agad naha-catch ng FB spam filter.
  const safeFastDelay = 500 + Math.floor(Math.random() * 500);

  setTimeout(() => {
    try {
      api.sendTypingIndicator?.(threadID);
    } catch (err) {}

    api.sendMessage(randomReply, threadID);
  }, safeFastDelay);
};
