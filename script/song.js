const fs = require("fs-extra");
const path = require("path");
const yts = require("yt-search");
const ytdlp = require("yt-dlp-exec");

module.exports.config = {
  name: "song",
  version: "1.0.0",
  hasPermission: 0,
  credits: "GoatBot Custom",
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

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const filePath = path.join(cacheDir, `${Date.now()}_song.mp3`);

  try {
    api.sendMessage(`🔍 Hinahanap ang kantang "${keyword}"...`, threadID, messageID);

    // Mag-search sa YouTube
    const searchResults = await yts(keyword);
    const video = searchResults.videos[0];

    if (!video) {
      return api.sendMessage("❌ Walang nahanap na kanta para sa iyong search.", threadID, messageID);
    }

    // I-download ang audio gamit ang yt-dlp
    await ytdlp(video.url, {
      extractAudio: true,
      audioFormat: "mp3",
      output: filePath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true
    });

    if (!fs.existsSync(filePath)) {
      throw new Error("Pumalya ang pag-download ng mp3 file.");
    }

    // I-send ang audio file sa Facebook Messenger
    const msgPayload = {
      body: `🎵 **${video.title}**\n⏱️ Duration: ${video.timestamp}\n👀 Views: ${video.views.toLocaleString()}`,
      attachment: fs.createReadStream(filePath)
    };

    api.sendMessage(msgPayload, threadID, () => {
      // Burahin ang temporary cache file pagkasend sa Messenger
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, messageID);

  } catch (err) {
    console.error("[SONG CMD ERROR]:", err);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return api.sendMessage("❌ Nagka-error habang dina-download ang audio. Subukan ulit mamaya.", threadID, messageID);
  }
};
