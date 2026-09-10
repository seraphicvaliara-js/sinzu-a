module.exports.config = {
  name: "silent",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Absorbs silent command without replying",
  usePrefix: true,
  commandCategory: "utility",
  usages: "/silent",
  cooldowns: 0
};

module.exports.run = async function () {
  return; // 100% Tahimik, walang ireresponde sa chat
};
