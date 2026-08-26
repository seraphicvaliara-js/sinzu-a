module.exports.config = {
  name: "joke",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Magbigay ng nakakatawang Pinoy joke",
  usePrefix: true,
  commandCategory: "Fun",
  usages: "!joke",
  cooldowns: 3
};

const jokes = [
  "Bakit malungkot ang kalendaryo?\n\nKasi bilang na ang araw niya! 😂",
  "Anong hayop ang hindi marunong magsuklay?\n\nEh 'di Lion! Kasi lion-gulo ng buhok! 🦁🤣",
  "Anong isda ang lumilipad?\n\nEh 'di flying fish! Akala mo kung ano no? 🐟😂",
  "Bakit pabilog ang pizza, square ang box, at triangle ang hiwa?\n\nKasi ganyan talaga ang buhay, magulo! 🍕😆"
];

module.exports.run = async function({ api, event }) {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
  api.sendMessage(`🤣 [ PINOY JOKE ]\n\n${randomJoke}`, event.threadID, event.messageID);
};
module.exports.onStart = module.exports.run;
