const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "roast",
  version: "4.0.0",
  hasPermission: 0,
  credits: "you",
  description: "Toggle roast-mode autoreply on/off — random savage one-liner replies to every message sent by a bot admin (others are ignored). Persistent and handles rapid-fire messages independently.",
  commandCategory: "fun",
  usages: "[on/off]",
  cooldowns: 3,
};

// Persistent storage — saved to a JSON file so it survives bot restarts
const DATA_FILE = path.join(__dirname, "roast_data.json");

function loadThreads() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.log("Could not load roast_data.json:", err);
  }
  return new Set();
}

function saveThreads(threadsSet) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...threadsSet]), "utf8");
  } catch (err) {
    console.log("Could not save roast_data.json:", err);
  }
}

let roastThreads = loadThreads();

// Original, generic roast lines — playful ribbing, not aimed at any real
// person or protected group, and not lifted from any copyrighted source.
const roastReplies = [
  "bro really typed that and pressed send 💀",
  "not you texting like this is a group project",
  "sir this is a chat, not your diary",
  "certified L take right there",
  "ok and? nobody asked but go off ig",
  "this you? couldn't be me",
  "the confidence of someone who's clearly wrong",
  "big words for someone on airplane mode wifi",
  "ratio, but make it gentle",
  "sit down champ, adults are typing",
  "you had ONE job, use punctuation next time",
  "this message aged like milk in the sun",
  "npc dialogue detected",
  "buffering... still not funny",
  "main character energy but side character material",
  "loading respect... 0% complete",
  "somebody hand this man a participation trophy",
  "the audacity walked so this message could run",
  "we get it, you have a keyboard",
  "error 404: valid point not found",
];

// Pull a random reply that isn't the same as the last one sent in that
// thread, so back-to-back messages don't get the exact same roast twice.
const lastReplyByThread = new Map();

function getRandomReply(threadID) {
  let reply;
  const lastReply = lastReplyByThread.get(threadID);
  do {
    reply = roastReplies[Math.floor(Math.random() * roastReplies.length)];
  } while (reply === lastReply && roastReplies.length > 1);
  lastReplyByThread.set(threadID, reply);
  return reply;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";

  if (option === "on") {
    roastThreads.add(threadID);
    saveThreads(roastThreads);
    return api.sendMessage(
      "🔥 Roast mode is now ON here — stays on permanently until you turn it off, even through bot restarts.",
      threadID,
      messageID
    );
  }

  if (option === "off") {
    roastThreads.delete(threadID);
    saveThreads(roastThreads);
    return api.sendMessage("🧊 Roast mode is now OFF.", threadID, messageID);
  }

  return api.sendMessage(
    `Usage: ${prefix}roast on | ${prefix}roast off`,
    threadID,
    messageID
  );
};

// sendMessage isn't awaited here — so incoming events never block each
// other. Every message gets its own reply fired off independently, even
// if a bunch of people are messaging the group chat at once.
module.exports.handleEvent = function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!roastThreads.has(threadID)) return;
  if (!body) return;
  if (senderID === api.getCurrentUserID()) return;

  // I-ignore ang message kung hindi bot admin ang nagsend — IDs galing sa
  // global.config.adminBot (yung nilalagay mo sa dashboard/config).
  const adminBot = global.config?.adminBot || [];
  if (!adminBot.includes(senderID)) return;

  const randomReply = getRandomReply(threadID);

  api.sendMessage(randomReply, threadID, (err, info) => {
    if (err || !info) return;
    // Bot reacts to its own roast with a HAHA emoji
    api.setMessageReaction("😆", info.messageID, () => {}, true);
  });
};
