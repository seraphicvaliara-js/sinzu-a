module.exports.config = {
  name: "setname",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Palitan ang nickname sa group chat",
  usePrefix: true,
  commandCategory: "Group",
  usages: "!setname [bagong nickname]",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, mentions, messageReply } = event;
  const nickname = args.join(" ");
  let targetID = senderID;

  if (messageReply) targetID = messageReply.senderID;
  if (mentions && Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];

  api.changeNickname(nickname, threadID, targetID, (err) => {
    if (err) return api.sendMessage("❌ Hindi mapalitan ang nickname.", threadID);
    api.sendMessage(`✓ Matagumpay na napalitan ang nickname!`, threadID);
  });
};
module.exports.onStart = module.exports.run;
