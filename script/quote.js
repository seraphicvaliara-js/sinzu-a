module.exports.config = {
  name: "quote",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Magbigay ng motivational quote",
  usePrefix: true,
  commandCategory: "Fun",
  usages: "!quote",
  cooldowns: 3
};

const quotes = [
  "“Huwag kang matakot sumubok. Ang tunay na kabiguan ay ang hindi pagsubok.”",
  "“Ang tagumpay ay bunga ng sipag, tiyaga, at pananampalataya.”",
  "“Small progress is still progress. Patuloy ka lang lumaban!”",
  "“Hindi mahalaga kung gaano ka kabagal, ang mahalaga ay hindi ka humihinto.”",
  "“Believe you can and you're halfway there.”",
  "“Your only limit is your mind.”"
];

module.exports.run = async function({ api, event }) {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  api.sendMessage(`📜 [ DAILY INSPIRATION ]\n\n${randomQuote}`, event.threadID, event.messageID);
};
module.exports.onStart = module.exports.run;
