const { PermissionsBitField } = require('discord.js');

// TODO: palitan ng tamang way niyo ng pag-check ng "bot admin"
// (hal. env var na ADMIN_IDS, o db lookup). Default dito: Discord "Administrator" permission.
const BOT_ADMIN_IDS = (process.env.BOT_ADMIN_IDS || '').split(',').filter(Boolean);

function isBotAdmin(member) {
  if (BOT_ADMIN_IDS.includes(member.id)) return true;
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

module.exports = {
  name: 'nickall',
  description: 'Mass-rename lahat ng members sa server (bot admin only).',
  async execute(message, args) {
    // 1. Admin check
    if (!isBotAdmin(message.member)) {
      return message.reply('❌ Bot admins lang ang pwedeng gumamit ng command na ito.');
    }

    const newNick = args.join(' ').trim();
    if (!newNick) {
      return message.reply('⚠️ Gamitin: `!nickall <bagong nickname>`');
    }
    if (newNick.length > 32) {
      return message.reply('⚠️ Ang nickname ay hindi pwedeng lumagpas ng 32 characters.');
    }

    const statusMsg = await message.reply('⏳ Kinukuha ang listahan ng members...');

    // 2. Fetch all members (importante ito para makuha lahat, hindi lang cached)
    const guild = message.guild;
    let members;
    try {
      members = await guild.members.fetch();
    } catch (err) {
      console.error('nickall fetch error:', err);
      return statusMsg.edit('❌ Nabigo ang pagkuha ng members list.');
    }

    const targets = members.filter(m => !m.user.bot); // laktawan ang mga bot account
    const total = targets.size;

    let success = 0;
    let skipped = 0;
    let failed = 0;

    // 3. Batch processing para hindi ma-rate-limit sa Discord API
    const BATCH_SIZE = 10;
    const DELAY_MS = 1500; // delay sa pagitan ng bawat batch

    const targetArray = Array.from(targets.values());

    for (let i = 0; i < targetArray.length; i += BATCH_SIZE) {
      const batch = targetArray.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (member) => {
        try {
          // Hindi puwedeng i-rename ng bot ang server owner o mas mataas ang role
          if (member.id === guild.ownerId || !member.manageable) {
            skipped++;
            return;
          }
          await member.setNickname(newNick);
          success++;
        } catch (err) {
          failed++;
        }
      }));

      // Update progress paminsan-minsan
      if (i + BATCH_SIZE < targetArray.length) {
        await statusMsg.edit(
          `⏳ Nagpapalit ng nickname... (${Math.min(i + BATCH_SIZE, total)}/${total})`
        );
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    // 4. Final summary
    return statusMsg.edit(
      `✅ **Tapos na ang nickall.**\n` +
      `• Na-rename: ${success}\n` +
      `• Nalaktawan (owner/higher role): ${skipped}\n` +
      `• Nabigo: ${failed}\n` +
      `• Total members: ${total}`
    );
  }
};
