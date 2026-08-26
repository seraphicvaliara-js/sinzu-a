module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "commands"],
    version: "1.0.0",
    role: 0,
    hasPrefix: true,
    description: "Ipinapakita ang listahan ng mga command o detalye ng isa.",
    usage: "/help [command]",
    credits: "sinzu",
    cooldown: 5
  },

  run: async ({ api, event, args, commands }) => {
    const prefix = "/";
    const ownerName = "Sinzu";
    const threadID = event.threadID;
    const messageID = event.messageID;

    // ── /help [command] — detalye ng specific command ──
    if (args && args[0]) {
      const cmdName = args[0].toLowerCase();
      const cmd =
        commands.get(cmdName) ||
        [...commands.values()].find(
          (c) => c.config?.aliases && c.config.aliases.includes(cmdName)
        );

      if (!cmd) {
        return api.sendMessage(`❌ Walang command na "${cmdName}".`, threadID, messageID);
      }

      const { name, aliases, description, usage, credits, version } = cmd.config;

      return api.sendMessage(
        `📖 COMMAND: ${name}\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `📝 Desc: ${description || "N/A"}\n` +
          `🔤 Aliases: ${aliases && aliases.length ? aliases.join(", ") : "Wala"}\n` +
          `🛠️ Usage: ${usage || prefix + name}\n` +
          `🔖 Version: ${version || "1.0.0"}\n` +
          `👤 Credits: ${credits || "N/A"}`,
        threadID,
        messageID
      );
    }

    // ── /help — buong listahan ──
    const list = [...commands.values()]
      .map((c) => c.config?.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    let msg = `╔══════════════════════════╗\n`;
    msg += `   📖 𝐒𝐈𝐍𝐙𝐔 𝐁𝐎𝐓 — 𝐇𝐄𝐋𝐏 𝐌𝐄𝐍𝐔\n`;
    msg += `╚══════════════════════════╝\n\n`;
    msg += `👑 Owner: ${ownerName}\n`;
    msg += `📦 Total Commands: ${list.length}\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n`;

    list.forEach((name, i) => {
      msg += `${i + 1}. ${prefix}${name}\n`;
    });

    msg += `━━━━━━━━━━━━━━━━\n\n`;
    msg += `Type "${prefix}help [command]" para sa detalye ng specific na command.`;

    return api.sendMessage(msg, threadID, messageID);
  },
};
