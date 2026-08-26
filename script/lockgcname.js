const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "locked_gc.json");

function getLockedData() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "{}", "utf8");
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    return {};
  }
}

function saveLockedData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
}

module.exports.config = {
  name: "lockgcname",
  version: "1.0.0",
  hasPermission: 1, // Admin only
  credits: "sinzu",
  description: "I-lock o i-unlock ang pangalan ng Group Chat upang hindi mapalitan ng iba",
  usePrefix: true,
  commandCategory: "Admin",
  usages: "!lockgcname on [Custom Name] | !lockgcname off",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const lockedData = getLockedData();
  const sub = args[0]?.toLowerCase();

  if (sub === "off" || sub === "unlock") {
    delete lockedData[threadID];
    saveLockedData(lockedData);
    return api.sendMessage("🔓 [ UNLOCKED ] Naka-unlock na ang GC Name. Malaya na itong mapapalitan ng mga miyembro.", threadID, messageID);
  }

  if (sub === "on" || sub === "lock") {
    let desiredName = args.slice(1).join(" ");
    if (!desiredName) {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        desiredName = threadInfo.threadName || "Sanzu Official GC";
      } catch {
        desiredName = "Sanzu Official GC";
      }
    }

    lockedData[threadID] = {
      name: desiredName,
      locked: true
    };
    saveLockedData(lockedData);

    // Set thread name immediately
    api.setTitle(desiredName, threadID, (err) => {
      if (err) console.error("Error setting title:", err);
    });

    return api.sendMessage(`🔒 [ GC NAME LOCKED ]\n\nMatagumpay na na-lock ang pangalan ng GC bilang:\n👉 "${desiredName}"\n\nKapag may nagpalit nito na hindi authorized, awtomatiko itong ibabalik ni Sanzu AI Bot!`, threadID, messageID);
  }

  return api.sendMessage("💡 Gamitin:\n• !lockgcname on [Pangalan] - I-lock ang pangalan ng GC\n• !lockgcname off - I-unlock ang GC", threadID, messageID);
};
module.exports.onStart = module.exports.run;
