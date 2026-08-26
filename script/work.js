const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────
const PAY_PER_SHIFT = 5000;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const DB_PATH = path.join(__dirname, "database", "work.json");
const PREFIX = "/";

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

// ── Main ws3-fca bot ─────────────────────────────────────
// Halimbawa lang ng buong setup — i-adjust ang credential loading
// depende sa paraan mo ng pag-login (appstate.json, atbp.)
const login = require("ws3-fca");

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error(err);

  api.setOptions({ listenEvents: true });

  api.listenMqtt((err, event) => {
    if (err) return console.error(err);
    if (event.type !== "message") return;

    const body = (event.body || "").trim();
    if (!body.startsWith(PREFIX)) return;

    const args = body.slice(PREFIX.length).split(/\s+/);
    const command = args.shift().toLowerCase();

    if (command === "work" || command === "trabaho" || command === "magtrabaho") {
      const senderID = event.senderID;
      const threadID = event.threadID;
      const db = loadDB();

      if (!db[senderID]) {
        db[senderID] = { balance: 0, shifts: 0, nextAvailable: 0 };
      }

      const user = db[senderID];
      const now = Date.now();
      const remaining = user.nextAvailable - now;

      if (remaining > 0) {
        return api.sendMessage(
          `⏳ Nagpapahinga ka pa!\nBalik ka pagkatapos ng ${fmtTime(remaining)} para sa /work.`,
          threadID,
          event.messageID
        );
      }

      user.balance += PAY_PER_SHIFT;
      user.shifts += 1;
      user.nextAvailable = now + COOLDOWN_MS;
      saveDB(db);

      api.sendMessage(
        `✅ Natapos mo ang shift #${user.shifts}!\n` +
        `+${fmtMoney(PAY_PER_SHIFT)}\n` +
        `💰 Balanse: ${fmtMoney(user.balance)}\n\n` +
        `Type /work ulit pagkatapos ng 5 minuto para sa susunod na shift.`,
        threadID,
        event.messageID
      );
    }
  });
});
