const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const util = require("util");

const execFileAsync = util.promisify(execFile);

module.exports = {
  config: {
    name: "yt",
    aliases: ["youtube", "ytdl"],
    version: "3.0.0",
    role: 0,
    hasPrefix: true,
    prefix: "/",
    description: "Search at mag-download ng YouTube video",
    usage: "/yt <search term o YouTube URL>",
    credits: "sinzu",
    cooldown: 10
  },

  run: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    if (!args[0]) {
      return api.sendMessage(
        "❌ Usage:\n/yt <search term o YouTube URL>\n\nHalimbawa:\n/yt tere naino\n/yt https://youtube.com/watch?v=xxxx",
        threadID,
        messageID
      );
    }

    const query = args.join(" ");
    const isURL = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query);

    // Kung search term, gagamitin ang ytsearch1: para kunin lang ang unang result
    const target = isURL ? query : `ytsearch1:${query}`;

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const outputTemplate = path.join(cacheDir, `yt_${Date.now()}.%(ext)s`);

    let processingMsg;
    try {
      processingMsg = await api.sendMessage(
        `🔎 Hinahanap: "${query}"...\n⏳ Naghihintay, pwedeng matagal kung malaking file.`,
        threadID
      );

      // Kunin muna ang info (title) gamit ang yt-dlp --print
      const { stdout: infoOut } = await execFileAsync("yt-dlp", [
        target,
        "--print",
        "%(title)s|||%(id)s",
        "--no-playlist",
        "--playlist-items", "1"
      ]);

      const [title] = infoOut.trim().split("|||");

      // I-download ang video (best quality, mp4 kung kaya)
      await execFileAsync("yt-dlp", [
        target,
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best",
        "--no-playlist",
        "--playlist-items", "1",
        "--merge-output-format", "mp4",
        "-o", outputTemplate,
        "--max-filesize", "0" // walang size limit sa pag-download
      ]);

      // Hanapin ang na-download na file (dahil dynamic ang extension)
      const files = fs.readdirSync(cacheDir).filter(f => f.startsWith(path.basename(outputTemplate).split(".")[0]));
      if (!files.length) {
        throw new Error("Walang nabuo na file pagkatapos mag-download.");
      }

      const filePath = path.join(cacheDir, files[0]);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

      await api.sendMessage(
        {
          body: `✅ ${title}\n📦 Size: ${sizeMB}MB`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        (err) => {
          // Linisin ang cache pagkatapos ipadala, kahit anong resulta
          fs.unlink(filePath, () => {});
          if (err) {
            console.error("YT send error:", err);
            api.sendMessage(
              `⚠️ Na-download ang video pero hindi ma-send (baka masyadong malaki para sa Messenger). Size: ${sizeMB}MB`,
              threadID
            );
          }
        },
        messageID
      );
    } catch (err) {
      console.error("YT command error:", err);
      api.sendMessage(
        `❌ May error sa pag-download: ${err.message || "Unknown error"}`,
        threadID,
        messageID
      );
    }
  }
};
