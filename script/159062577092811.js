const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "159062577092811",
  version: "6.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Number Triggered Auto-Roast Engine with Target Lockdown & Anti-Ban System.",
  usePrefix: true,
  commandCategory: "Fun",
  usages: 
    "• /159062577092811 — Simulan ang 24h global auto-roast (o gamiting /159062577092811 on)\n" +
    "• /159062577092811 off — Patayin ang auto-roast\n" +
    "• /159062577092811 target @mention — Targetin ang isang tao\n" +
    "• /159062577092811 status — Tingnan ang status at natitirang oras",
  cooldowns: 3
};

const DATA_PATH = path.join(__dirname, "activate_data.json");

// QUEUE & SPAM CONTROL
const activeQueues = new Set();
const recentRoasts = [];

// HARDCORE & DYNAMIC TAGALOG ROASTS
const ROASTS = [
  "Akala mo talaga may sense 'yung sinabi mo 'no? 💀",
  "Lakas ng loob mo mag-type, mahina naman utak mo.",
  "Medyo bawasan mo pagkain ng bigas, lumalabas sa Chat 'yung epekto e.",
  "Napakagaling mong patunay na hindi lahat ng tao dapat binibigyan ng internet access.",
  "Gusto lang naman namin ng tahimik na buhay pero dumagdag ka pa.",
  "Isip muna bago pindot ng send, libre lang naman mag-isip.",
  "Main character ka ba? Bakit parang extra ka lang sa sarili mong buhay?",
  "Nawalan ng kwenta 'yung chat nung nag-message ka.",
  "Mas may lasa pa 'yung tubig kaysa sa personalidad mo.",
  "Pakisara na lang 'yung app, pakiusap lang sa buong GC.",
  "Mukha kang taong nagpapakulo ng tubig tapos nakakalimutan.",
  "Dami mong sinabi pero walang laman, parang tsitsirya.",
  "Bro, huwag ka nang mag-English, nasasaktan 'yung diksyonaryo.",
  "May award ka siguro sa pagiging pinaka-corny.",
  "Lahat kami rito agree na sana hindi mo na lang itinype 'yan.",
  "Hindi ka nakakatuwa, nakakaramdam kami ng second-hand embarrassment sayo.",
  "Medyo pahiya ka roon ah, ulitin mo pa para sagad.",
  "Yung confidence mo parang wifi, mabilis pero walang kwenta.",
  "Kung ibebenta ko 'yang utak mo, brand new kasi never na-use.",
  "Nag-type pa talaga, para lang maipakitang walang maambag.",
  "Sana 'yung galing mong mag-type ginamit mo sa pag-aaral.",
  "May notification lang pala mula sayo, akala ko mahalaga.",
  "Ang ingay mo, parang lata na walang laman.",
  "Ganyan ka ba talaga o nag-eensayo ka lang maging pabuhat?",
  "Baka naman pwedeng paki-delete 'yung message mo para umunlad 'yung pilipinas.",
  "Tigilan mo na 'yan, maski 'yung keyboard mo sumusuko na sayo.",
  "Mas maganda pa magbasa ng ingredients ng shampoo kaysa sa chat mo.",
  "Walang nakinig sayo sa bahay niyo kaya rito ka nag-iingay?",
  "Hindi ka ba napapagod maging walking disaster?",
  "Siguro kapag nag-isip ka, may maririnig na tunog ng electric fan.",
  "Ang lakas ng amoy ng kababawan dito sa chat ah.",
  "Kahit 'yung signal ng globe sumusuko sa argumento mo.",
  "Huwag ka nang sumali sa usapan, pang-background noise ka lang.",
  "Hindi ko alam kung nagpapatawa ka o sadyang ganyan ka talaga.",
  "Sayang 'yung load/data mo sa ginagawa mo.",
  "May point ka naman e, kaso 'yung point mo nasa pinakadulo ng kawalan.",
  "Auto-pass sayo, masyadong pabuhat.",
  "Gawa ka ng sarili mong GC tapos kausapin mo sarili mo.",
  "Medyo adjust mo naman 'yung humor mo, lumang-luma na.",
  "Mas mabilis pa mag-reply 'yung bot kaysa sa logic ng utak mo.",
  "Okay lang 'yan, bata ka pa naman siguro... sa pag-iisip.",
  "Sana ngayong araw makaisip ka naman ng magandang sasabihin.",
  "Parang typo 'yung buong pagkatao mo.",
  "Subukan mong manahimik kahit 5 minutes lang, subok lang.",
  "Grabe 'yung ambag mo rito, nakakawalang-gana.",
  "Paalala lang: Pwedeng mag-isip bago mag-reply.",
  "Sino nagpapasok sayo rito? Paki-kick nga.",
  "Walang naintindihan 'yung sistema sa sinabi mo.",
  "Parang nag-Crash 'yung IQ ng GC nung nag-type ka.",
  "Kasing babaw ng kanal 'yung dahilan mo.",
  "Huwag mong subukang mag-matalino, di bagay sayo.",
  "Masarap sigurong tulog mo 'no? Kasi hindi mo ramdam 'yung pahiya.",
  "Next time paki-filter muna 'yang i-tatype mo.",
  "Hulog ka ng langit, kaso mukhang naumpog ka bago bumagsak.",
  "Sobrang boring ng message mo, nakakaantok.",
  "Salamat sa usapan pero paki-block na lang sarili mo.",
  "Lahat kami naghahanap ng pumuputok na utak, ikaw putok lang.",
  "Pahinga ka muna, napapagod din kaming magbasa ng walang kwenta.",
  "Nakalimutan mo ata 'yung utak mo sa cabinet bago ka nag-chat.",
  "Lakas magmarunong pero sablay naman.",
  "Mukha kang tao na natatapon 'yung sabaw kapag kumakain.",
  "Paki-mura na lang 'yung sarili mo para samin.",
  "Walang naka-relate sayo kahit isa.",
  "Yung ganyang style ng pakikipag-chat, 2010 pa nauso.",
  "I-off mo na 'yang data mo, tulog mo na lang 'yan.",
  "Hindi ka naman asukal pero nakakaimbyerna ka.",
  "Mas malinaw pa 'yung tubig sa ilog pasig kaysa sa sinasabi mo.",
  "Sana masarap ulam mo para kahit paano may maganda sayo ngayong araw.",
  "Grabe 'yung talino mo, tinalo 'yung bato.",
  "May free trial ba 'yang pag-iisip mo?",
  "Tigilan ang pagse-send ng text na walang kabuluhan.",
  "Kasing bagal ng pag-load ng litrato 'yung utak mo.",
  "Walang nakipag-away sayo pero talo ka pa rin.",
  "Gusto mo ng medal sa pagiging pabuhat?",
  "Ang lalim ng sinabi mo, kaso mabaw ang pag-iintindi.",
  "Mas nakakatuwa pa panuorin ang pinturang natutuyo kaysa basahin 'to.",
  "Pwede bang paki-mute 'yang account mo pabalik sa lobby?",
  "Nawala 'yung sigla ng araw ko dahil sa message mo.",
  "Isang malaking 'WHAAT' na lang para sayo.",
  "Pang-offline mode 'yang utak mo.",
  "Ilang beses ka ba nahulog nung sanggol ka?",
  "Bakit parang kasalanan pa namin na nag-type ka?",
  "Bawi ka na lang sa susunod mong buhay.",
  "Paki-check 'yung signal baka hindi nakarating 'yung utak mo.",
  "Napakagandang halimbawa ng huwag gagayahin.",
  "Wala kang mapapala rito kung ganyan ka mag-isip.",
  "Gawa ka na lang ng reseta, wag ka na mag-chat.",
  "Gusto ko lang naman mag-FB, bakit may ganitong klaseng tao rito.",
  "Mag-aral ka muna bago ka makipag-sagutan sa bot.",
  "Wala sa hulog, wala rin sa ayos.",
  "Sana maging maayos na 'yang buhay mo para 'di ka nag-iingay rito.",
  "Ang galing mo! Sa susunod huwag mo na uulitin.",
  "Kape ka muna para magising ka sa katotohanan.",
  "I-delete mo na 'yan habang kaunti pa lang nakakakita.",
  "Medyo sumakit ang ulo ko sa grammar at argumento mo.",
  "Parang sirang plaka na paulit-ulit na walang kwenta.",
  "Sana all may lakas ng loob mag-chat kahit walang alam.",
  "Sipag mag-type, tamad mag-isip.",
  "Bye, paki-sara 'yung pinto paglabas mo ng GC.",
  "Huwag ka nang mag-reply, tapos na 'yung usapan."
];

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[AUTO-ROAST] Load error:", err);
  }
  return { expires: 0, activatedBy: null, targetID: null };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[AUTO-ROAST] Save error:", err);
  }
}

function isActive() {
  const data = loadData();
  return Boolean(data.expires && data.expires > Date.now());
}

function getRandomUniqueRoast() {
  const available = ROASTS.filter(r => !recentRoasts.includes(r));
  const pool = available.length > 0 ? available : ROASTS;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  
  recentRoasts.push(chosen);
  if (recentRoasts.length > 30) recentRoasts.shift();
  
  return chosen;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sendMsg(api, payload, threadID, messageID = null) {
  return new Promise((resolve) => {
    const callback = (err, info) => {
      if (err) console.error("[AUTO-ROAST] Send error:", err);
      resolve(info);
    };

    if (messageID) {
      api.sendMessage(payload, threadID, messageID, callback);
    } else {
      api.sendMessage(payload, threadID, callback);
    }
  });
}

// ===== EVENT HANDLER =====
module.exports.handleEvent = async function ({ api, event }) {
  if (!event || event.type !== "message" || !event.body) return;

  const { threadID, senderID, body } = event;
  const cleanBody = body.trim();

  if (cleanBody.startsWith("/") || cleanBody.startsWith("!") || cleanBody.startsWith(".")) return;
  if (cleanBody.length < 2) return;
  if (senderID === api.getCurrentUserID()) return;
  if (!isActive()) return;

  const data = loadData();

  if (data.targetID && senderID !== data.targetID) return;

  if (activeQueues.has(threadID)) return;
  activeQueues.add(threadID);

  try {
    const totalCount = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < totalCount; i++) {
      if (!isActive()) break;
      
      let roastText = getRandomUniqueRoast();
      let payload = roastText;

      if (data.targetID) {
        payload = {
          body: `🔥 ${roastText}`,
          mentions: [{ id: data.targetID, tag: roastText }]
        };
      }

      await sendMsg(api, payload, threadID);

      const dynamicDelay = Math.floor(Math.random() * 2000) + 3500;
      await sleep(dynamicDelay);
    }
  } catch (err) {
    console.error("[AUTO-ROAST Event Error]:", err);
  } finally {
    activeQueues.delete(threadID);
  }
};

// ===== COMMAND RUN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;
  const sub = (args[0] || "").toLowerCase().trim();
  const data = loadData();

  const adminList = (global.config && (global.config.ADMINBOT || global.config.NDH)) || [];
  const isAdmin = adminList.includes(senderID.toString());

  if (!isAdmin) {
    return sendMsg(api, "🚫 Admin access required.", threadID, messageID);
  }

  // DIRETSONG TURN ON KAPAG /159062577092811 LANG O /159062577092811 on
  if (!sub || sub === "on" || sub === "1") {
    data.expires = Date.now() + 24 * 60 * 60 * 1000;
    data.activatedBy = senderID;
    data.activatedAt = Date.now();
    data.targetID = null;
    saveData(data);

    return sendMsg(
      api,
      `⚡ [ AUTO-ROAST SYSTEM: ON ]\n\n` +
      `🎯 Mode: Global Auto-Roast\n` +
      `⏳ Duration: 24 Hours\n` +
      `🛡 Safe-Delay: ACTIVE (3-5s)\n` +
      `👑 Admin Authorized`,
      threadID,
      messageID
    );
  }

  // OFF
  if (sub === "off" || sub === "2") {
    data.expires = 0;
    data.targetID = null;
    saveData(data);
    return sendMsg(api, "🛑 Auto-Roast System is now OFF.", threadID, messageID);
  }

  // TARGET MODE
  if (sub === "target" || sub === "3") {
    const mentionedKeys = Object.keys(mentions || {});
    if (mentionedKeys.length === 0) {
      return sendMsg(api, "⚠️ Mag-mention ng taong i-ta-target.\nExample: /159062577092811 target @User", threadID, messageID);
    }

    const targetUser = mentionedKeys[0];
    data.expires = Date.now() + 24 * 60 * 60 * 1000;
    data.targetID = targetUser;
    saveData(data);

    return sendMsg(
      api,
      `🎯 [ TARGET LOCKDOWN ACTIVATED ]\n\n` +
      `👤 Target User: ${mentions[targetUser]}\n` +
      `🔥 Naka-lockdown na sa user na ito!`,
      threadID,
      messageID
    );
  }

  // STATUS
  if (sub === "status" || sub === "4") {
    if (!isActive()) {
      return sendMsg(api, "🔴 Auto-Roast System is currently INACTIVE.", threadID, messageID);
    }

    const left = data.expires - Date.now();
    const hours = Math.floor(left / (1000 * 60 * 60));
    const mins = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));

    return sendMsg(
      api,
      `⚡ [ SYSTEM STATUS ]\n\n` +
      `🟢 Status: ONLINE\n` +
      `⏱ Natitirang Oras: ${hours}h ${mins}m\n` +
      `🎯 Target Mode: ${data.targetID ? `Locked on [${data.targetID}]` : "Global"}\n` +
      `⚡ Active Queue: ${activeQueues.has(threadID) ? "BUSY" : "IDLE"}`,
      threadID,
      messageID
    );
  }
};
