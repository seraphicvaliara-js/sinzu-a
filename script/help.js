module.exports = {
  name: "help",
  aliases: ["menu", "commands"],
  description: "Ipinapakita ang listahan ng mga command o detalye ng isang command.",
  usage: "/help [command]",
  category: "info",

  execute: async (api, event, args, commands) => {
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
          (c) => c.aliases && c.aliases.includes(cmdName)
        );

      if (!cmd) {
        return api.sendMessage(`❌ Walang command na "${cmdName}".`, threadID, messageID);
      }

      return api.sendMessage(
        `📖 COMMAND: ${cmd.name}\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `📝 Desc: ${cmd.description || "N/A"}\n` +
          `📦 Category: ${cmd.category || "N/A"}\n` +
          `🔤 Aliases: ${cmd.aliases && cmd.aliases.length ? cmd.aliases.join(", ") : "Wala"}\n` +
          `🛠️ Usage: ${cmd.usage || prefix + cmd.name}`,
        threadID,
        messageID
      );
    }

    // ── /help — buong listahan ──
    const list = [...commands.values()]
      .map((c) => c.name)
      .sort((a, b) => a.localeCompare(b));

    let msg = `╭─────────────────╮\n`;
    msg += `   📖 SINZU BOT — HELP MENU\n`;
    msg += `╰─────────────────╯\n\n`;
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
