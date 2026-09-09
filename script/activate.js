const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "activate",
  version: "3.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Walang patayang Tagalog auto-roast na kayang mag-handle ng malalang spam.",
  usePrefix: true,
  commandCategory: "Fun",
  usages: "/activate on — simulan ang 24h global auto-roast (Admin Only)\n/activate off — itigil (Admin Only)\n/activate status — tingnan ang natitirang oras",
  cooldowns: 5
};

const DATA_PATH = path.join(__dirname, "activate_data.json");

// QUEUE & SPAM CONTROL (Prevents server lag & spam crashes)
const activeQueues = new Set();
const recentRoasts = [];

// 100+ TAGALOG ROASTS (HARDCORE / WALANG PATAYAN)
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
  } catch {}
  return { expires: 0, activatedBy: null };
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function isActive() {
  const data = loadData();
  return data.expires && data.expires > Date.now();
}

function getRemaining() {
  const data = loadData();
  if (!data.expires) return 0;
  const left = data.expires - Date.now();
  return left > 0 ? left : 0;
}

// Helper: Pick a unique roast that wasn't used recently
function getRandomUniqueRoast() {
  const available = ROASTS.filter(r => !recentRoasts.includes(r));
  const pool = available.length > 0 ? available : ROASTS;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  
  recentRoasts.push(chosen);
  if (recentRoasts.length > 30) recentRoasts.shift(); // Keep buffer under 30
  
  return chosen;
}

// Helper: Sleep function for controlled loops
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===== EVENT HANDLER (ANTI-SPAM + NON-STOP QUEUE) =====
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body, type } = event;

  // 1. IGNORE LIFECYCLE / NON-TEXT MESSAGES
  if (type !== "message" || !body) return;

  const cleanBody = body.trim();

  // 2. IGNORE PREFIXES, COMMANDS, AND SHORT SPAM (Single letters like 'a', 'hh')
  if (cleanBody.startsWith("/") || cleanBody.startsWith("!") || cleanBody.startsWith(".")) return;
  if (cleanBody.length < 3) return;

  // 3. IGNORE BOT'S OWN MESSAGES
  if (senderID === api.getCurrentUserID()) return;

  if (!isActive()) return;

  // 4. SPAM QUEUE LOCK: Kapag bumabaha ang chat, huwag mag-overlap. Antayin matapos ang kasalukuyang lapag.
  if (activeQueues.has(threadID)) return;
  activeQueues.add(threadID);

  try {
    // Maglalapag ng 4-6 roasts, eksaktong 5 seconds ang interval per lapag
    const totalCount = Math.floor(Math.random() * 3) + 4;
    for (let i = 0; i < totalCount; i++) {
      if (!isActive()) break; // Auto-stop kapag in-off gitna ng burst
      
      const roastMessage = getRandomUniqueRoast();
      await api.sendMessage(roastMessage, threadID);
      
      await sleep(5000); // Strict 5-second delay (Anti-FB Ban)
    }
  } catch (err) {
    // Silent fail on error to keep engine stable
  } finally {
    activeQueues.delete(threadID); // Unlock thread for next trigger
  }
};

// ===== COMMAND RUN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const sub = (args[0] || "").toLowerCase();
  const data = loadData();

  // BOT ADMIN CHECK ONLY
  const adminList = global.config.ADMINBOT || global.config.NDH || [];
  const isAdmin = adminList.includes(senderID.toString());

  // KAPAG HINDI ADMIN O MALI ANG COMMAND = SILENT IGNORE
  if (!isAdmin) return;

  if (sub === "on") {
    const expires = Date.now() + 24 * 60 * 60 * 1000;
    data.expires = expires;
    data.activatedBy = senderID;
    data.activatedAt = Date.now();
    saveData(data);

    return api.sendMessage(
      `🔥 GLOBAL AUTO-ROAST (WALANG PATAYAN MODE): ON\n\n` +
      `⏱ Interval: 5 seconds per lapag\n` +
      `🛡 Anti-Spam Queue: ACTIVE (Kaya ang malalang spam)\n` +
      `⏳ Duration: 24 Hours\n` +
      `👑 Admin authorized session.`,
      threadID,
      messageID
    );
  }

  if (sub === "off") {
    if (isActive()) {
      data.expires = 0;
      saveData(data);
      return api.sendMessage("✅ Global auto-roast turned OFF permanently by Admin.", threadID, messageID);
    }
    return;
  }

  if (sub === "status") {
    const left = getRemaining();
    if (left <= 0) return;

    const hours = Math.floor(left / (1000 * 60 * 60));
    const mins = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
    return api.sendMessage(
      `🔥 Global Auto-roast is ACTIVE\nTime left: ${hours}h ${mins}m\nQueue status: ${activeQueues.has(threadID) ? "BUSY (Lapag Mode)" : "READY"}`,
      threadID,
      messageID
    );
  }

  return; // Silent ignore sa anumang maling subcommand
};
