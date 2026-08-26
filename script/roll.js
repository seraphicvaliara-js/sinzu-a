module.exports.config = {
  name: "roll",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Mag-roll ng dice o random number",
  usePrefix: true,
  commandCategory: "Fun",
  usages: "!roll o !roll 100",
  cooldowns: 2
};

module.exports.run = async function({ api, event, args }) {
  const max = parseInt(args[0]) || 6;
  const roll = Math.floor(Math.random() * max) + 1;
  api.sendMessage(`🎲 Nag-roll ng dice (1-${max}):\n\n🎯 Nakuha mong numero: **${roll}**!`, event.threadID, event.messageID);
};
module.exports.onStart = module.exports.run;
