const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

module.exports.config = {
  name: "song",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Mag-download at mag-play ng audio mula sa YouTube sa Messenger.",
  usePrefix: true,
  commandCategory: "Media",
  usages: "/song [title / artist]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const keyword = args.join(" ").trim();

  if (!keyword) {
    return api.sendMessage("⚠️ Pakilagay ang pamagat ng kanta. Halimbawa: /song Pasilyo", threadID, messageID);
  }

  try {
    api.sendMessage(`🔍 Hinahanap ang kantang "${keyword}"...`, threadID, messageID);

    // Mag-search sa YouTube
    const searchResults = await yts(keyword);
    const video = searchResults.videos[0];

    if (!video) {
      return api.sendMessage("❌ Walang nahanap na kanta para sa iyong search.", threadID, messageID);
    }

    // Kunan ng audio stream mula sa YouTube URL
    const audioStream = ytdl(video.url, {
      filter: "audioonly",
      quality: "highestaudio"
    });

    // I-send pabalik sa Messenger bilang Audio attachment
    const msgPayload = {
      body: `🎵 ${video.title}\n⏱️ Duration: ${video.timestamp}\n👀 Views: ${video.views.toLocaleString()}`,
      attachment: audioStream
    };

    return api.sendMessage(msgPayload, threadID, messageID);

  } catch (err) {
    console.error("[SONG CMD ERROR]:", err);
    return api.sendMessage("❌ Nagka-error habang dina-download ang audio. Pakisubukan ulit.", threadID, messageID);
  }
};
