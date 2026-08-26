const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────
const PAY_PER_SHIFT = 5000;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const FILE = path.join(__dirname, "..", "data", "economy.json"); // kaparehas ng rich.js

// ── Storage helpers ─────────────────────────────────────
function loadEconomy() {
  try {
    if (!fs.existsSync(FILE)) {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, "{}");
    }
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveEconomy(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString();
}

function fmtTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

// ── Command ─────────────────────────────────────────────
module.exports = {
  config: {
    name: "work",
    aliases: ["trabaho", "magtrabaho"],
    version: "1.0.0",
    role: 0,
    hasPrefix: true,
    description: "Magtrabaho para kumita ng pera",
    usage: "/work",
    credits: "sinzu",
    cooldown: 0
  },

  run: async ({ api, event }) => {
    const uid = event.senderID;
    const threadID = event.threadID;
    const messageID = event.messageID;

    const economy = loadEconomy();

    if (!economy[uid]) {
      economy[uid] = { balance: 0, shifts: 0, nextAvailable: 0 };
    }

    const user = economy[uid];
    const now = Date.now();
    const remaining = user.nextAvailable - now;

    if (remaining > 0) {
      return api.sendMessage(
        `⏳ Nagpapahinga ka pa!\nBalik ka pagkatapos ng ${fmtTime(remaining)} para sa /work.`,
        threadID,
        messageID
      );
    }

    user.balance = Number(user.balance || 0) + PAY_PER_SHIFT;
    user.shifts = Number(user.shifts || 0) + 1;
    user.nextAvailable = now + COOLDOWN_MS;

    saveEconomy(economy);

    return api.sendMessage(
      `✅ Natapos mo ang shift #${user.shifts}!\n` +
        `+${fmtMoney(PAY_PER_SHIFT)}\n` +
        `💰 Balanse: ${fmtMoney(user.balance)}\n\n` +
        `Type /work ulit pagkatapos ng 5 minuto para sa susunod na shift.`,
      threadID,
      messageID
    );
  }
};
