const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "activate",
  version: "1.2.2",
  hasPermission: 0,
  credits: "sinzu",
  description: "24-hour global auto-roast (1 reply lang kada message)",
  usePrefix: true,
  commandCategory: "Fun",
  usages: "/activate on — start 24h auto-roast\n/activate off — stop\n/activate status — check remaining time",
  cooldowns: 5
};

const DATA_PATH = path.join(__dirname, "activate_data.json");

const ROASTS = [
  "Bro really thought that message was necessary 💀",
  "The confidence… the delusion… unmatched.",
  "Say less, we already lost brain cells reading that.",
  "You typed all that just to embarrass yourself?",
  "Main character energy but the plot is mid.",
  "Who hurt you? Because that sentence hurt all of us.",
  "Please stop before the group chat files a restraining order.",
  "You really just said that out loud… in text… permanently.",
  "The audacity is loud but the intelligence is on mute.",
  "This is why group chats need a mute button for specific people.",
  "Bro woke up and chose violence against the English language.",
  "I’m not even mad, I’m just disappointed… and second-hand embarrassed.",
  "Your message just aged like milk left in the sun.",
  "Somewhere a grammar teacher is crying.",
  "This energy is giving ‘I peaked in high school’.",
  "You dropped that like it was fire. It was not.",
  "The group chat was peaceful until you arrived.",
  "Please log off for the sake of everyone’s mental health.",
  "That was a choice… a bold, terrible choice.",
  "I’m taking notes on how not to communicate."
];

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    }
  } catch {}
  return { expires: 0, activatedBy: null };
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function isActive() {
  const data = loadData();
  return data.expires && data.expires > Date.now();
}

function getRemaining() {
  const data = loadData();
  if (!data.expires) return 0;
  const left = data.expires - Date.now();
  return left > 0 ? left : 0;
}

// ===== AUTO-REPLY (1 roast lang) =====
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!body || body.startsWith("/") || senderID === api.getCurrentUserID()) return;
  if (!isActive()) return;

  const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
  api.sendMessage(roast, threadID);
};

// ===== COMMAND =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const sub = (args[0] || "").toLowerCase();
  const data = loadData();

  if (sub === "on") {
    data.expires = Date.now() + 24 * 60 * 60 * 1000;
    data.activatedBy = senderID;
    data.activatedAt = Date.now();
    saveData(data);

    return api.sendMessage(
      `🔥 AUTO-ROAST: ON\n\nDuration: 24 hours\n1 reply lang kada message.\nUse /activate off to stop.`,
      threadID,
      messageID
    );
  }

  if (sub === "off") {
    if (isActive()) {
      data.expires = 0;
      saveData(data);
      return api.sendMessage("✅ Auto-roast turned OFF.", threadID, messageID);
    }
    return api.sendMessage("Auto-roast is not active.", threadID, messageID);
  }

  if (sub === "status") {
    const left = getRemaining();
    if (left <= 0) {
      return api.sendMessage("Auto-roast is currently OFF.", threadID, messageID);
    }
    const hours = Math.floor(left / (1000 * 60 * 60));
    const mins = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
    return api.sendMessage(
      `🔥 Auto-roast is ACTIVE\nTime left: ${hours}h ${mins}m`,
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    `Usage:\n/activate on\n/activate off\n/activate status`,
    threadID,
    messageID
  );
};
