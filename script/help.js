module.exports = {
  config: {
    name: "help",
    aliases: ["menu", "commands"],
    version: "1.0",
    author: "Sinzu",
    countDown: 0,
    role: 0,
    shortDescription: "Listahan ng mga command",
    longDescription: "Ipinapakita ang lahat ng available na command o detalye ng isang command.",
    category: "info",
    guide: "{pn} [command name]"
  },

  onStart: async function ({ api, event, args, message, commandName, Users }) {
    const commands = global.client.commands; // Map ng lahat ng loaded commands
    const prefix = "/";
    const ownerName = "Sinzu";

    // ── /help [command] — detalye ng specific command ──
    if (args[0]) {
      const cmdName = args[0].toLowerCase();
      const cmd = commands.get(cmdName) ||
        [...commands.values()].find(c => c.config.aliases && c.config.aliases.includes(cmdName));

      if (!cmd) {
        return message.reply(`❌ Walang command na "${cmdName}".`);
      }

      const { name, aliases, version, author, shortDescription, longDescription, category, guide } = cmd.config;

      return message.reply(
        `📖 COMMAND: ${name}\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `📝 Desc: ${longDescription || shortDescription || "N/A"}\n` +
        `📦 Category: ${category || "N/A"}\n` +
        `🔤 Aliases: ${aliases && aliases.length ? aliases.join(", ") : "Wala"}\n` +
        `🛠️ Guide: ${(guide || "{pn}").replace(/{pn}/g, prefix + name)}\n` +
        `🔖 Version: ${version || "1.0"}\n` +
        `👤 Author: ${author || "Unknown"}`
      );
    }

    // ── /help — buong listahan ──
    // sinasala ang mga hidden command kung meron; ayaw magpakita ng duplicates
    const list = [...commands.values()]
      .filter(c => !c.config.role || c.config.role === 0 || c.config.role <= 1)
      .map(c => c.config.name)
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

    return message.reply(msg);
  }
};
