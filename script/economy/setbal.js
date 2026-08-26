const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "setbal",
  version: "1.0.0",
  hasPermission: 2, // admin/owner only
  credits: "Sinzu",
  description: "Nagse-set ng balance ng user. I-reply sa message niya.",
  commandCategory: "economy",
  usages: "/setbal [amount] (i-reply sa user)",
  cooldowns: 3
};

const dbPath = path.join(__dirname, "..", "database", "balance.json");

function loadDB() {
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, messageReply, senderID } = event;

  if (!messageReply) {
    return api.sendMessage(
      "❌ I-reply mo muna ang message ng taong gusto mong i-set ang balance.\nGamit: /setbal [amount] (reply)",
      threadID,
      messageID
    );
  }

  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount < 0) {
    return api.sendMessage(
      "❌ Maglagay ng tamang halaga (number lang). Hal: /setbal 5000",
      threadID,
      messageID
    );
  }

  const targetID = messageReply.senderID;
  const db = loadDB();
  db[targetID] = amount;
  saveDB(db);

  let targetName = "user";
  try {
    const info = await api.getUserInfo(targetID);
    targetName = info[targetID]?.name || "user";
  } catch (e) {
    // sige lang, gagamitin na lang yung "user" fallback
  }

  return api.sendMessage(
    `✅ Na-set na ang balance ni ${targetName} sa 💰 ${amount.toLocaleString()}.`,
    threadID,
    messageID
  );
};
