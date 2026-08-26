const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "welcome",
  version: "1.0.0",
  hasPermission: 0,
  credits: "Sinzu",
  description: "Nagpapadala ng welcome gif pag may na-add sa groupchat.",
  commandCategory: "events",
  usages: "",
  cooldowns: 0
};

// Palitan mo ito ng link ng gif na gusto mo, o maglagay ng gif file sa
// cache/welcome.gif at gamitin na lang ang local file (see fallback below).
const WELCOME_GIF_URL = "https://i.imgur.com/0000000.gif";

module.exports.handleEvent = async function ({ api, event }) {
  const { logMessageType, logMessageData, threadID } = event;

  if (logMessageType !== "log:subscribe") return;

  const addedUsers = logMessageData.addedParticipants;

  for (const user of addedUsers) {
    // Skip kung ang bot mismo ang "na-add" (hal. kabibalik lang sa gc)
    if (user.userFbId === api.getCurrentUserID()) continue;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const groupName = threadInfo.threadName || "Group Chat";

      const cachePath = path.join(__dirname, "cache", `welcome_${Date.now()}.gif`);

      // Kunin ang gif mula sa URL at i-save muna locally bago i-send
      const response = await axios.get(WELCOME_GIF_URL, { responseType: "stream" });
      if (!fs.existsSync(path.join(__dirname, "cache"))) {
        fs.mkdirSync(path.join(__dirname, "cache"));
      }
      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        const msg = {
          body:
            `👋 Welcome sa ${groupName}, ${user.fullName}!\n\n` +
            `🎉 Sana ay maging masaya ka dito. Basahin ang group rules at i-type ang "help" para makita ang mga commands.`,
          attachment: fs.createReadStream(cachePath)
        };

        api.sendMessage(msg, threadID, (err) => {
          fs.unlink(cachePath, () => {}); // linisin ang cache pagkatapos ipadala
          if (err) console.error("Welcome send error:", err);
        });
      });
    } catch (err) {
      console.error("Welcome event error:", err);
      // Fallback: text-only welcome kung nag-fail ang gif
      api.sendMessage(
        `👋 Welcome sa group, ${user.fullName}!`,
        threadID
      );
    }
  }
};
