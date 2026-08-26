const axios = require("axios");

module.exports = {
  config: {
    name: "slap",
    aliases: ["sampal"],
    version: "1.0",
    role: 0,
    hasPrefix: true,
    description: "Sampal ng user gamit ang random GIF",
    usage: "/slap [username]"
  },

  async run({ api, event, args }) {
    const { threadID, messageID } = event;

    if (!args[0]) {
      return api.sendMessage(
        "⚠️ Usage: /slap [username]\nExample: /slap Juan",
        threadID,
        messageID
      );
    }

    const target = args.join(" ");

    const gifs = [
      "https://media.giphy.com/media/3o6Zt6D8xJ9g8/giphy.gif",
      "https://media.giphy.com/media/jLeyZWgtwgr2U/giphy.gif",
      "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif"
    ];

    const gif = gifs[Math.floor(Math.random() * gifs.length)];

    try {
      const response = await axios.get(gif, {
        responseType: "stream"
      });

      return api.sendMessage(
        {
          body: `👋 ${event.senderID ? "@" : ""}${target} was slapped! 💥`,
          attachment: response.data
        },
        threadID,
        messageID
      );
    } catch (error) {
      return api.sendMessage(
        `👋 ${target} was slapped! 💥`,
        threadID,
        messageID
      );
    }
  }
};
