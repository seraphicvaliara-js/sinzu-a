module.exports.config = {
  name: "help",
  version: "1.0.0",
  hasPermission: 0,
  credits: "Sinzu",
  description: "Ipinapakita ang lahat ng available commands.",
  commandCategory: "general",
  usages: "[command name]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const commandList = [
    "accept", "active-session", "adduser", "ai", "announce", "autoreply",
    "coins", "help", "hug", "joke", "kick", "lockgcname", "nickall",
    "pinterest", "quote", "roll", "setname", "shoti", "slap", "slot",
    "song", "tid", "translate", "unsend", "uptime", "weather", "yt"
  ];

  // Kung may binigay na specific na command name (hal. help ai)
  if (args[0]) {
    const cmdName = args[0].toLowerCase();
    if (!commandList.includes(cmdName)) {
      return api.sendMessage(`❌ Walang command na "${cmdName}".`, event.threadID, event.messageID);
    }
    return api.sendMessage(
      `📌 Command: ${cmdName}\n` +
      `Gamitin: /${cmdName}\n` +
      `Para sa buong listahan, i-type ang "help".`,
      event.threadID,
      event.messageID
    );
  }

  const prefix = global.config?.PREFIX || "/";
  let msg = `╭─────────────────╮\n`;
  msg += `   📖 SINZU BOT — HELP MENU\n`;
  msg += `╰─────────────────╯\n\n`;
  msg += `👑 Owner: Sinzu\n`;
  msg += `📦 Total Commands: ${commandList.length}\n\n`;
  msg += `━━━━━━━━━━━━━━━━\n`;

  commandList.forEach((cmd, i) => {
    msg += `${i + 1}. ${prefix}${cmd}\n`;
  });

  msg += `━━━━━━━━━━━━━━━━\n`;
  msg += `\nType "${prefix}help [command]" para sa detalye ng specific na command.`;

  return api.sendMessage(msg, event.threadID, event.messageID);
};
