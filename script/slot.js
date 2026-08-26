const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "economy.json");

function getEconomyData() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    return {};
  }
}

function saveEconomyData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
}

module.exports.config = {
  name: "slot",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Maglaro ng Mega Casino Slot Machine gamit ang iyong coins",
  usePrefix: true,
  commandCategory: "Casino",
  usages: "!slot [halaga ng taya]",
  cooldowns: 4
};

const symbols = ["🍒", "🍋", "🍇", "🔔", "⭐", "💎", "7️⃣"];

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const eco = getEconomyData();
  if (!eco[senderID]) eco[senderID] = { coins: 1000, lastDaily: 0 };

  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet < 50) {
    return api.sendMessage("⚠️ Minimum na taya sa Slot Machine ay 🪙 50 Coins.\nHalimbawa: !slot 200", threadID, messageID);
  }

  if (eco[senderID].coins < bet) {
    return api.sendMessage(`❌ Kulang ang iyong coins! Meron ka lamang 🪙 ${eco[senderID].coins.toLocaleString()} Coins.\nMag-type ng '!coins daily' para sa libreng barya.`, threadID, messageID);
  }

  // Deduct initial bet
  eco[senderID].coins -= bet;

  // Spin 3 reels
  const r1 = symbols[Math.floor(Math.random() * symbols.length)];
  const r2 = symbols[Math.floor(Math.random() * symbols.length)];
  const r3 = symbols[Math.floor(Math.random() * symbols.length)];

  let winAmount = 0;
  let resultStatus = "";

  if (r1 === "7️⃣" && r2 === "7️⃣" && r3 === "7️⃣") {
    // MEGA JACKPOT x15
    winAmount = bet * 15;
    resultStatus = "🔥💥 MEGA ULTRA JACKPOT (x15) 💥🔥";
  } else if (r1 === "💎" && r2 === "💎" && r3 === "💎") {
    // DIAMOND JACKPOT x10
    winAmount = bet * 10;
    resultStatus = "💎✨ DIAMOND JACKPOT (x10) ✨💎";
  } else if (r1 === r2 && r2 === r3) {
    // TRIPLE MATCH x5
    winAmount = bet * 5;
    resultStatus = "🎉🌟 BIG WIN TRIPLE MATCH (x5) 🌟🎉";
  } else if (r1 === r2 || r2 === r3 || r1 === r3) {
    // DOUBLE MATCH x2
    winAmount = bet * 2;
    resultStatus = "✨ DOUBLE MATCH WIN (x2) ✨";
  } else {
    // LOSE
    resultStatus = "💔 TALO! Better luck next spin! 💔";
  }

  eco[senderID].coins += winAmount;
  saveEconomyData(eco);

  const profitLossText = winAmount > 0 
    ? `🏆 Nanalo ka ng: +🪙 ${winAmount.toLocaleString()} Coins!`
    : `💸 Nabawas sa taya: -🪙 ${bet.toLocaleString()} Coins`;

  const slotDisplay = `🎰 ═══ [ SANZU CASINO MEGA SLOT ] ═══ 🎰
┌─────────────────────────┐
│     [ ${r1} | ${r2} | ${r3} ]     │  <-- PAYLINE
└─────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 Resulta: ${resultStatus}
${profitLossText}
💰 Kasalukuyang Balanse: 🪙 ${eco[senderID].coins.toLocaleString()} Coins
━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  api.sendMessage(slotDisplay, threadID, messageID);
};
module.exports.onStart = module.exports.run;
