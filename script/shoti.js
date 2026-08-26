module.exports.config = {
  name: "shoti",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Random trending Shoti video link",
  usePrefix: true,
  commandCategory: "Fun",
  usages: "!shoti",
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  api.sendMessage("✨ [ SHOTI TRENDING ]\nPanuorin ang random trending short video dito:\n🔗 https://www.tiktok.com/tag/shoti", event.threadID, event.messageID);
};
module.exports.onStart = module.exports.run;
