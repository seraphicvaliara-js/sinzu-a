const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "song",
  version: "1.0.2",
  hasPermission: 0,
  credits: "sinzu",
  description: "Mag-download at mag-play ng audio mula sa YouTube",
  usePrefix: true,
  commandCategory: "Media",
  usages: "/song [title / artist]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ").trim();

  if (!query) {
    return api.sendMessage("⚠️ Pakilagay ang pamagat ng kanta.\nHalimbawa: /song Pasilyo", threadID, messageID);
  }

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const filePath = path.join(cacheDir, `${Date.now()}_song.mp3`);

  try {
    api.sendMessage(`🔍 Hinahanap ang kantang "${query}"...`, threadID, messageID);

    // Search sa YouTube
    const searchResult = await yts(query);
    const video = searchResult.videos[0];

    if (!video) {
      return api.sendMessage("❌ Walang nahanap na kanta.", threadID, messageID);
    }

    // Download options para maiwasan ang blocking at stuck-ups
    const stream = ytdl(video.url, {
      filter: "audioonly",
      quality: "highestaudio",
      requestOptions: {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      }
    });

    const fileStream = fs.createWriteStream(filePath);
    stream.pipe(fileStream);

    fileStream.on("finish", async () => {
      const msgPayload = {
        body: `🎵 ${video.title}\n⏱️ Duration: ${video.timestamp}\n👀 Views: ${video.views.toLocaleString()}`,
        attachment: fs.createReadStream(filePath)
      };

      api.sendMessage(msgPayload, threadID, () => {
        // Auto-delete temporary file pagkasend
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, messageID);
    });

    fileStream.on("error", (err) => {
      console.error("[FILE STREAM ERROR]:", err);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return api.sendMessage("❌ Nagka-error habang dina-download ang audio file.", threadID, messageID);
    });

  } catch (err) {
    console.error("[SONG CMD ERROR]:", err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return api.sendMessage("❌ Nagka-error sa pag-access sa YouTube. Pakisubukan ulit.", threadID, messageID);
  }
};
