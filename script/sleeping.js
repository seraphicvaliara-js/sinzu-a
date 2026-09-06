const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sleeping",
  version: "4.1.0",
  role: 0, // role check dito ay 0 dahil ginagamit na ang sariling ADMIN_UIDS list sa baba
  aliases: [],
  credits: "you",
  description: "Toggle sleeping mode autoreply on/off — random street/rap-vibe na reply sa bawat message.",
  usage: "[on/off] [thread id]",
  cooldown: 3,
};

// Persistent storage — naka-save sa JSON file, hindi mawawala kahit mag-restart
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

// Orihinal na mga linya — playful teasing/roast style, hindi personal attack
const sleepingReplies = [
  "Wow, another life-changing message. Truly.",
  "Did you type that with your eyes closed?",
  "Bold of you to hit send on that one.",
  "That message really said 'I have nothing better to do.'",
  "Legendary typing skills. Legendary nonsense too.",
  "You types like autocorrect gave up halfway.",
  "Somewhere, a period is missing you.",
  "That was... a choice.",
  "Breaking news: nobody asked, yet here we are.",
  "Your keyboard deserves a break after that.",
  "Certified chaos, 10/10 confidence though.",
  "That message aged like milk in the sun.",
  "You really pressed send and thought 'yeah, this is it.'",
  "Somewhere a grammar teacher just felt a disturbance.",
  "Impressive. Not in a good way, but impressive.",
  "That take was so bold it needs a warning label.",
  "You typed that with main character energy, respect.",
  "Reading that took years off my patience.",
  "That's one way to start a conversation, I guess.",
  "Confidence: 100. Accuracy: still loading.",
  "That message just applied for 'most random' award.",
  "Not gonna lie, that was a plot twist nobody needed.",
  "You cooked... something. Not sure what though.",
  "Someone give this person a filter, please.",
  "That energy is unmatched, unfortunately.",
];

// Ilagay dito ang Facebook UID ng mga admin na pwedeng gumamit ng command na ito.
// Halimbawa: ["100012345678901", "100098765432109"]
const ADMIN_UIDS = [
  "PALITAN_MO_ITO_NG_UID_MO",
];
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
  const prefix = global.config?.PREFIX || "/";

  // Kung wala sa ADMIN_UIDS list ang nag-command, ignore lang — walang reply.
  if (!ADMIN_UIDS.includes(senderID)) return;

  const option = args[0] ? args[0].toLowerCase() : null;
  // Optional na 2nd argument: ibang thread ID na gustong i-toggle.
  // Kung wala, gagamitin ang thread kung saan tina-type ang command.
  const targetThreadID = args[1] ? args[1].trim() : threadID;

  try {
    if (option === "on") {
      sleepingThreads.add(targetThreadID);
      saveThreads(sleepingThreads);
      return api.sendMessage(
        `🥷 Naka-ON na ang sleeping mode sa thread ${targetThreadID}, permanente hangga't hindi mo in-off.`,
        threadID,
        messageID
      );
    }

    if (option === "off") {
      sleepingThreads.delete(targetThreadID);
      saveThreads(sleepingThreads);
      return api.sendMessage(`🌙 Naka-OFF na ang sleeping mode sa thread ${targetThreadID}.`, threadID, messageID);
    }

    return api.sendMessage(
      `Gamitin: ${prefix}sleeping on [thread id] | ${prefix}sleeping off [thread id]\n(kung walang thread id, gagamitin ang kasalukuyang thread)`,
      threadID,
      messageID
    );
  } catch (err) {
    console.log("Error sa sleeping command:", err);
  }
};

// Fire-and-forget, pero may .catch para hindi mag-unhandled rejection
// kahit sabay-sabay o sunod-sunod na magmessage ang mga tao sa GC.
module.exports.handleEvent = function ({ api, event }) {
  try {
    const { threadID, senderID, body } = event;

    if (!sleepingThreads.has(threadID)) return;
    if (!body) return;
    if (senderID === api.getCurrentUserID()) return;

    const randomReply = getRandomReply(threadID);
    api.sendMessage(randomReply, threadID).catch((err) => {
      console.log("Hindi naipadala ang autoreply:", err);
    });
  } catch (err) {
    console.log("Error sa sleeping handleEvent:", err);
  }
};
