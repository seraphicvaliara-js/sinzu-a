module.exports.config = {
  name: "kick",
  version: "1.0.0",
  hasPermission: 1,
  credits: "sinzu",
  description: "I-kick ang pasaway na member sa GC",
  usePrefix: true,
  commandCategory: "Admin",
  usages: "!kick @mention o i-reply sa mensahe",
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, mentions, messageReply } = event;
  let targetID = null;

  if (messageReply) targetID = messageReply.senderID;
  if (mentions && Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];

  if (!targetID) {
    return api.sendMessage("⚠️ I-tag (@mention) o i-reply sa mensahe ng taong gusto mong i-kick.", threadID, messageID);
  }

  api.removeUserFromGroup(targetID, threadID, (err) => {
    if (err) return api.sendMessage("❌ Nabigong i-kick. Siguraduhing admin ang bot sa GC.", threadID, messageID);
    api.sendMessage("👋 Matagumpay na na-kick ang miyembro!", threadID, messageID);
  });
};
module.exports.onStart = module.exports.run;
