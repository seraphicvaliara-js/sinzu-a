const yts = require("yt-search");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "song",
  description: "Search YouTube and send the song as MP4",
  usage: "/song [song name]",

  async execute(api, event, args) {
    const { threadID, messageID } = event;

    if (!args.length) {
      return api.sendMessage(
        "🎵 Usage:\n/song [song name]\n\nExample:\n/song It Will Rain Bruno Mars",
        threadID,
        messageID
      );
    }

    const query = args.join(" ");
    const cacheDir = path.join(__dirname, "../cache");

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const fileName = `song_${Date.now()}.mp4`;
    const output = path.join(cacheDir, fileName);

    try {
      await api.sendMessage(
        `🔎 Searching for:\n"${query}"\n\n⏳ Please wait...`,
        threadID,
        messageID
      );

      // Search YouTube
      const results = await yts(query);

      if (!results.videos || results.videos.length === 0) {
        return api.sendMessage(
          "❌ Walang nahanap na song.",
          threadID,
          messageID
        );
      }

      const video = results.videos[0];

      await api.sendMessage(
        `🎵 Found:\n${video.title}\n` +
        `👤 ${video.author.name}\n` +
        `⏱️ ${video.timestamp}\n\n` +
        `⬇️ Downloading MP4...`,
        threadID
      );

      // Download MP4
      await new Promise((resolve, reject) => {
        execFile(
          "yt-dlp",
          [
            "-f",
            "mp4[height<=360]/mp4",
            "--no-playlist",
            "--max-filesize",
            "50M",
            "-o",
            output,
            video.url
          ],
          {
            maxBuffer: 10 * 1024 * 1024
          },
          (error, stdout, stderr) => {
            if (error) {
              console.error(stderr);
              reject(error);
              return;
            }

            resolve();
          }
        );
      });

      if (!fs.existsSync(output)) {
        throw new Error("MP4 file was not created.");
      }

      // Send MP4
      await api.sendMessage(
        {
          body:
            `🎵 ${video.title}\n\n` +
            `👤 ${video.author.name}\n` +
            `⏱️ ${video.timestamp}\n` +
            `📺 YouTube\n\n` +
            `Enjoy! 🎧`,
          attachment: fs.createReadStream(output)
        },
        threadID,
        messageID
      );

      // Delete temporary file
      setTimeout(() => {
        try {
          if (fs.existsSync(output)) {
            fs.unlinkSync(output);
          }
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      }, 15000);

    } catch (error) {
      console.error("SONG ERROR:", error);

      // Cleanup kapag nag-error
      try {
        if (fs.existsSync(output)) {
          fs.unlinkSync(output);
        }
      } catch {}

      return api.sendMessage(
        "❌ Hindi ma-download ang song.\n\n" +
        "Possible reasons:\n" +
        "• Masyadong malaki ang video\n" +
        "• Hindi available ang video\n" +
        "• Nagbago ang YouTube format\n" +
        "• Hindi naka-install ang yt-dlp",
        threadID,
        messageID
      );
    }
  }
};
