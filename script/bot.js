const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "bot",
  version: "2.0.0",
  hasPermission: 0,
  credits: "you",
  description: "Admin-only: /bot on — bubuksan ang bot dito at mag-aauto-reply na ng generic lines sa lahat ng messages. /bot off — ihihinto ang auto-reply at ia-ignore ang lahat ng hindi bot admin sa thread na 'yon.",
  commandCategory: "admin",
  usages: "[on/off]",
  cooldowns: 3,
};

// Persistent storage — naka-save sa JSON file, kaya hindi mawawala kahit
// mag-restart ang bot.
//   botOffThreads      -> kung nandito ang threadID, naka-OFF/ignore mode.
//   botAutoReplyThreads -> kung nandito ang threadID, active ang auto-reply.
const OFF_DATA_FILE = path.join(__dirname, "bot_data.json");
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

let botOffThreads = loadSet(OFF_DATA_FILE);
let botAutoReplyThreads = loadSet(AUTOREPLY_DATA_FILE);

// BAGONG: inilalagay sa `global` para magamit ito ng dispatcher sa auto.js
// (yung pangunahing message handler) — dun mismo ichecheck kung naka-OFF
// ang bot sa isang thread bago pa man patakbuhin ang ibang commands o
// handleEvent ng ibang scripts (roast, gclock, atbp.).
global.botOffThreads = botOffThreads;

// Generic auto-reply lines — hindi roast, simpleng katulad ng presence
// acknowledgment lang ng bot. Puwede mong palitan/dagdagan ito.
const genericReplies = [
  "ops",
  "mabigat kapa sa balyena bugok",
  "opsie kinantot ko nanay mo naka 69 posision",
  "mag meta ka na kung gusto mo maka takas sakin tanga",
  "ako greatest trauma mo boboka para ma talo mo ako dapat naka droga ka",
  "shupaen mo dick ko hold on",
  "sabeko sayo wag kang tatakbo baka pumayat ka",
  "sabeko sayo shuk gng onyaface bitch",
  "idol ako ng idol mo boboka, hindi mo ako mapapatumba kahit mag kampe pa kayong lahat",
  "wag kang maaning hindi ako tinatablan ng silent mode bobo!",
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

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const option = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";

  // Admin-only — IDs galing sa global.config.adminBot (nilalagay sa dashboard/config)
  const adminBot = global.config?.adminBot || [];
  if (!adminBot.includes(senderID)) {
    return api.sendMessage(
      "🚫 Admin-only command. Only bot admins set in the dashboard can use this.",
      threadID,
      messageID
    );
  }

  if (option === "off") {
    // Itigil ang auto-reply AT i-enable ulit ang ignore-non-admin gate.
    botAutoReplyThreads.delete(threadID);
    saveSet(AUTOREPLY_DATA_FILE, botAutoReplyThreads);

    botOffThreads.add(threadID);
    global.botOffThreads = botOffThreads;
    saveSet(OFF_DATA_FILE, botOffThreads);

    return api.sendMessage(
      "🔴 Naka-OFF na ang bot dito. Hindi na mag-aauto-reply, at ia-ignore ang lahat ng messages/commands mula sa hindi bot admin.",
      threadID,
      messageID
    );
  }

  if (option === "on") {
    // Alisin sa ignore list AT simulan ang auto-reply.
    botOffThreads.delete(threadID);
    global.botOffThreads = botOffThreads;
    saveSet(OFF_DATA_FILE, botOffThreads);

    botAutoReplyThreads.add(threadID);
    saveSet(AUTOREPLY_DATA_FILE, botAutoReplyThreads);

    return api.sendMessage(
      "🟢 Naka-ON na ang bot dito — mag-aauto-reply na sa mga susunod na messages.",
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    `Usage: ${prefix}bot on | ${prefix}bot off`,
    threadID,
    messageID
  );
};

// sendMessage isn't awaited here — bawat message ay may sariling reply na
// pinapadala nang independent, kahit sabay-sabay maraming nagmemessage.
//
// May random na "typing delay" (3–8 seconds) bago magsend, para hindi
// mukhang instant/bot ang pattern.
module.exports.handleEvent = function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!botAutoReplyThreads.has(threadID)) return;
  if (!body) return;
  if (senderID === api.getCurrentUserID()) return;

  const randomReply = getRandomGenericReply(threadID);
  const humanDelay = 3000 + Math.floor(Math.random() * 5000); // 3–8 segundo

  setTimeout(() => {
    try {
      api.sendTypingIndicator?.(threadID);
    } catch (err) {
      // Hindi lahat ng fork/library may ganitong method — okay lang kung wala.
    }

    api.sendMessage(randomReply, threadID);
  }, humanDelay);
};
