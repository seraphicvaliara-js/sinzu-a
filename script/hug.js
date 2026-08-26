const axios = require("axios");

module.exports = {
  config: {
    name: "hug",
    aliases: ["yakap"],
    version: "1.0.0",
    role: 0,
    hasPrefix: true,
    description: "Send a hug GIF to a username",
    usage: "/hug username",
    credits: "sinzu",
    cooldown: 3
  },

  run: async ({ api, event, args }) => {
    const username = args.join(" ").trim();

    if (!username) {
      return api.sendMessage(
        "🤗 Lagyan mo ng username!\n\nExample: /hug Juan",
        event.threadID,
        event.messageID
      );
    }

    const gifs = [
      "https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif",
      "https://media.giphy.com/media/3ZnBrkqoaI2hq/giphy.gif",
      "https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif"
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];

    try {
      const response = await axios.get(gif, {
        responseType: "stream"
      });

      return api.sendMessage(
        {
          body: `🤗 ${username}, niyakap ka ni ${event.senderID}! ❤️`,
          attachment: response.data
        },
        event.threadID,
        event.messageID
      );
    } catch (err) {
      return api.sendMessage(
        `🤗 ${username}, niyakap ka! ❤️`,
        event.threadID,
        event.messageID
      );
    }
  }
};
