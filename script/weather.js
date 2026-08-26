const axios = require("axios");

module.exports.config = {
  name: "weather",
  version: "1.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Alamin ang panahon sa kahit saang lungsod",
  usePrefix: true,
  commandCategory: "Utility",
  usages: "!weather [city name]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const city = args.join(" ") || "Manila";
  try {
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    const current = res.data.current_condition[0];
    const text = `🌤️ [ WEATHER REPORT: ${city.toUpperCase()} ]
━━━━━━━━━━━━━━━━━
🌡️ Temperatura: ${current.temp_C}°C (${current.temp_F}°F)
☁️ Kalagayan: ${current.weatherDesc[0].value}
💧 Humidity: ${current.humidity}%
💨 Bilis ng Hangin: ${current.windspeedKmph} km/h`;
    api.sendMessage(text, event.threadID, event.messageID);
  } catch {
    api.sendMessage(`❌ Hindi mahanap ang lagay ng panahon para sa "${city}".`, event.threadID, event.messageID);
  }
};
module.exports.onStart = module.exports.run;
