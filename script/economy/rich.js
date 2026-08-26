const fs = require("fs");

module.exports = {
  config: {
    name: "rich",
    aliases: ["richest", "toprich", "topmoney"],
    version: "1.0.0",
    role: 0,
    hasPrefix: true,
    description: "Shows the richest users",
    usage: "/rich",
    credits: "sinzu",
    cooldown: 5
  },

  run: async ({ api, event }) => {
    const file = "./data/economy.json";

    if (!fs.existsSync(file)) {
      return api.sendMessage(
        "💰 Wala pang economy data.",
        event.threadID,
        event.messageID
      );
    }

    let economy;

    try {
      economy = JSON.parse(
        fs.readFileSync(file, "utf8")
      );
    } catch {
      return api.sendMessage(
        "❌ Hindi mabasa ang economy database.",
        event.threadID,
        event.messageID
      );
    }

    const users = Object.entries(economy)
      .map(([uid, data]) => ({
        uid,
        balance: Number(data?.balance || 0)
      }))
      .filter(user => Number.isFinite(user.balance))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    if (!users.length) {
      return api.sendMessage(
        "💰 Wala pang users sa economy leaderboard.",
        event.threadID,
        event.messageID
      );
    }

    let msg = `╔══════════════════════════╗
       💰 𝐓𝐎𝐏 𝐑𝐈𝐂𝐇𝐄𝐒𝐓
╚══════════════════════════╝

`;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      let name = user.uid;

      try {
        const info = await api.getUserInfo(user.uid);
        name = info?.[user.uid]?.name || user.uid;
      } catch {}

      const medal =
        i === 0 ? "🥇" :
        i === 1 ? "🥈" :
        i === 2 ? "🥉" :
        `${i + 1}.`;

      msg += `${medal} ${name}
   💰 $${user.balance.toLocaleString()}
   🆔 ${user.uid}

`;

    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Showing Top ${users.length} Users`;

    return api.sendMessage(
      msg,
      event.threadID,
      event.messageID
    );
  }
};
