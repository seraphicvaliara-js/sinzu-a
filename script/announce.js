module.exports = {
  config: {
    name: "announce",
    aliases: ["announcement", "broadcast", "bc"],
    version: "2.0.0",
    role: 1,
    hasPrefix: true,
    description: "Mag-broadcast ng announcement sa lahat ng registered GC",
    usage: "!announce [message]",
    credits: "sinzu",
    cooldown: 30
  },

  run: async ({ api, event, args }) => {
    const fs = require("fs");

    if (!args.length) {
      return api.sendMessage(
        "📢 Usage:\n\n!announce [message]\n\nExample:\n!announce Maintenance mamayang 10PM.",
        event.threadID,
        event.messageID
      );
    }

    const message = args.join(" ");

    const databaseFile = "./data/database.json";

    if (!fs.existsSync(databaseFile)) {
      return api.sendMessage(
        "❌ Wala pang registered GC sa database.",
        event.threadID,
        event.messageID
      );
    }

    try {
      const database = JSON.parse(
        fs.readFileSync(databaseFile, "utf8")
      );

      if (!Array.isArray(database) || database.length === 0) {
        return api.sendMessage(
          "❌ Walang GC na naka-register sa database.",
          event.threadID,
          event.messageID
        );
      }

      const threadIDs = [];

      for (const item of database) {
        if (!item || typeof item !== "object") continue;

        const ids = Object.keys(item);

        for (const threadID of ids) {
          if (
            threadID &&
            threadID !== "undefined" &&
            !threadIDs.includes(threadID)
          ) {
            threadIDs.push(threadID);
          }
        }
      }

      if (!threadIDs.length) {
        return api.sendMessage(
          "❌ Walang valid GC ID na nakita sa database.",
          event.threadID,
          event.messageID
        );
      }

      const announcement = `╔══════════════════════════╗
      📢 𝐒𝐀𝐍𝐙𝐔 𝐀𝐍𝐍𝐎𝐔𝐍𝐂𝐄𝐌𝐄𝐍𝐓
╚══════════════════════════╝

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 Official Bot Announcement
🤖 SANZU BOT`;

      let sent = 0;
      let failed = 0;

      for (const threadID of threadIDs) {
        try {
          await new Promise((resolve, reject) => {
            api.sendMessage(
              announcement,
              threadID,
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          sent++;

          // Delay para hindi sabay-sabay ang requests
          await new Promise(resolve =>
            setTimeout(resolve, 1200)
          );

        } catch (error) {
          failed++;

          console.error(
            `[ANNOUNCE] Failed: ${threadID}`,
            error?.message || error
          );
        }
      }

      return api.sendMessage(
        `╔══════════════════════════╗
       📢 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 𝐑𝐄𝐒𝐔𝐋𝐓
╚══════════════════════════╝

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Sent: ${sent}
❌ Failed: ${failed}
📊 Total GC: ${threadIDs.length}`,
        event.threadID,
        event.messageID
      );

    } catch (error) {
      console.error("[ANNOUNCE ERROR]", error);

      return api.sendMessage(
        `❌ May error habang binabasa ang GC database.

${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  }
};
