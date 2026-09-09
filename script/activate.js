const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "activate",
  version: "1.4.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "24-hour global auto-roast. 1 message = 1 reply + typing indicator.",
  usePrefix: true,
  commandCategory: "Fun",
  usages: "/activate on — start 24h global auto-roast\n/activate off — stop\n/activate status — check remaining time",
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

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!body || body.startsWith("/") || senderID === api.getCurrentUserID()) return;

  if (!isActive()) return;

  // Show typing indicator
  try {
    api.sendTypingIndicator(threadID, true);
  } catch (e) {}

  // Random delay 1–2.5 seconds para natural
  const delay = 1000 + Math.floor(Math.random() * 1500);

  setTimeout(() => {
    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    
    api.sendMessage(roast, threadID, () => {
      // Stop typing after message is sent
      try {
        api.sendTypingIndicator(threadID, false);
      } catch (e) {}
    });
  }, delay);
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const sub = (args[0] || "").toLowerCase();
  const data = loadData();

  if (sub === "on") {
    const expires = Date.now() + 24 * 60 * 60 * 1000;
    data.expires = expires;
    data.activatedBy = senderID;
    data.activatedAt = Date.now();
    saveData(data);

    return api.sendMessage(
      `🔥 GLOBAL AUTO-ROAST: ON\n\n` +
      `Duration: 24 hours\n`
