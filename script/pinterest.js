module.exports.config = {
  name: "pinterest",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Maghanap ng Pinterest wallpaper o visual idea",
  usePrefix: true,
  commandCategory: "Media",
  usages: "!pinterest [search query]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const query = args.join(" ");
  if (!query) return api.sendMessage("🖼️ Maglagay ng hahanapin.\nHalimbawa: !pinterest anime aesthetic wallpaper", event.threadID, event.messageID);

  const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
  api.sendMessage(`📌 [ PINTEREST SEARCH ]\n\nNahanap na link para sa "${query}":\n🔗 ${url}`, event.threadID, event.messageID);
};
module.exports.onStart = module.exports.run;
