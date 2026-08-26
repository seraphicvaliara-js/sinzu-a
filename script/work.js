const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────
const PAY_PER_SHIFT = 5000;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const DB_PATH = path.join(__dirname, "..", "database", "work.json");

// ── Storage helpers ─────────────────────────────────────
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, "{}");
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function fmtMoney(n) {
  return "₱" + n.toLocaleString("en-PH");
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
    version: "1.0",
    author: "you",
    countDown: 0,
    role: 0,
    shortDescription: "Kumita ng pera",
    longDescription: "Magtrabaho para kumita ng pera, may 5-minutong cooldown bawat shift.",
    category: "economy",
    guide: "{pn}"
  },

  onStart: async function ({ api, event, message }) {
    const senderID = event.senderID;
    const db = loadDB();

    if (!db[senderID]) {
      db[senderID] = { balance: 0, shifts: 0, nextAvailable: 0 };
    }

    const user = db[senderID];
    const now = Date.now();
    const remaining = user.nextAvailable - now;

    if (remaining > 0) {
      return message.reply(
        `⏳ Nagpapahinga ka pa!\nBalik ka pagkatapos ng ${fmtTime(remaining)} para sa /work.`
      );
    }

    user.balance += PAY_PER_SHIFT;
    user.shifts += 1;
    user.nextAvailable = now + COOLDOWN_MS;
    saveDB(db);

    return message.reply(
      `✅ Natapos mo ang shift #${user.shifts}!\n` +
      `+${fmtMoney(PAY_PER_SHIFT)}\n` +
      `💰 Balanse: ${fmtMoney(user.balance)}\n\n` +
      `Type /work ulit pagkatapos ng 5 minuto para sa susunod na shift.`
    );
  }
};
