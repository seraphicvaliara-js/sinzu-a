const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "banat",
  version: "14.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Ethereal Serenity - Ultimate Auto-Roast & Auto-React Engine for Admin 61594240921272",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /banat on — I-ON ang global auto-banat + haha react\n" +
    "• /banat on @mention — I-lockdown at banatan ang partikular na target\n" +
    "• /banat off — Patayin ang Banat Engine",
  cooldowns: 2
};

// HARDCODED ADMIN ID
const ADMIN_ID = "61594240921272";

const DATA_PATH = path.join(__dirname, "banat_config.json");
const activeQueues = new Set();
const lastMessageTimes = new Map();

// 100+ BANAT LINES INCLUDING DUMMYLANDIA & TRASH TALK SPECIALS
const BANAT_LISTS = [
  "Bakit ka galit? Pangit ka na nga, mainitin pa ulo mo! 🗿",
  "Paki-mabilis mag-type, nabubulok na 'yung replies mo sa bagal.",
  "Dami mong sinabi pero walang may paki. Next kalaban please! 😴",
  "Lakas mo mag-reply pero mukha ka namang ekstra sa sarili mong buhay.",
  "Type nang type, akala mo naman may punto. Ulitin mo nga, 'di ko naintindihan kabobohan mo.",
  "Magkano load mo paps? Sayang lang data mo sa ganyang klaseng argumento. 📉",
  "Nawawala ka na sa wisyo ah, paki-restart muna ng utak mo bago ka humarap sa 'kin.",
  "Ilang oras mo pinag-isipan 'yan? Kasi mukhang 2 seconds lang pinagdaanan ng utak mo.",
  "Umiiyak ka na ba d'yan sa likod ng screen? Sige lang, ilabas mo lang 'yan. 😭",
  "Keyboard warrior sa chat pero sa personal kulang na lang lumuhod.",
  "Ganyan ba talaga kapag talo na? Nag-iimbento na lang ng mga sinasabi?",
  "Pang-grade 1 'yang linyahan mo paps, taasan mo naman nang konti.",
  "Luh, nagalit na siya! Haha paki-pula pa ng mukha mo, baka sakaling manalo ka.",
  "Subukan mo uli, baka sa pang-100 na subok mo magkaroon na ng sense 'yang pinagsasabi mo. 💀",
  "Sana physical memory na lang 'yang utak mo para madaling i-upgrade, sobrang kulang eh.",
  "Mas mabilis pa mag-load 'yung 2G network kaysa sa pagproseso ng utak mo.",
  "Tahimik ka na lang kapag wala kang maipagmamalaki, nakakahiya ka eh. 🤫",
  "Ano 'yan, ensayo mo na 'yan sa pagiging ewan o natural talent mo talaga?",
  "Reply ka pa, gustong-gusto mo talagang napapahiya rito 'no?",
  "Wag ka nang lumaban, para kang nagtatapon ng hangin sa pader. 👋",
  "Lakas mag-tapang sa chat pero 'pag tinawagan biglang offline. 😂",
  "Nanginginig na ba 'yang daliri mo? Dami mong typo ah!",
  "Hindi ka nakakatuwa, nakakaawa ka na paps.",
  "Utak mo parang buffering, 99% na stock pa rin.",
  "Sino nagturo sayo mag-chat? Balik mo na load niya, nasayang lang.",
  "Huwag ka masyadong mag-alala, balang araw magkakaroon ka rin ng sense.",
  "Ganyan ba talaga kapag kapos sa pansin? Nagpapapansin sa gc?",
  "Parang wala ka namang sinasabi, ingay mo lang pakinggan.",
  "Tigilan mo na 'yan, baka maputulan ka pa ng ugat sa leeg.",
  "I-off mo na data mo, nakakahiya ka na masyado.",
  "Kung sa bagay, d'yan ka naman magaling... sa pagiging ewan. 🤡",
  "Nakikita mo ba 'yang mga sinasabi mo o pumipikit ka na lang habang nag-ta-type?",
  "Sana all maraming libreng oras para maging abnormal.",
  "Sayang 'yung space sa server para sa mga reply mong walang kwenta.",
  "Huy gising! Baka akala mo panalo ka na sa lagay na 'yan?",
  "Parang sirang plaka, paulit-ulit na lang 'yang rebuttals mo.",
  "Wala ka na bang ibang maipukol? Nao-olats ka na oh.",
  "Mukha kang ewan d'yan, swear.",
  "Iiyak na 'yan! Iiyak na 'yan! 🤏",
  "Kahit aso ko hindi matutuwa sa banat mo eh.",
  "Ano raw? Paki-translate sa wikang may utak.",
  "Isang malaking LOL para sa usapan natin ngayon. 😆",
  "Tago ka muna, palamig ka muna ng ulo baka masunog 'yang kilay mo.",
  "Sakit sa mata ng mga reply mo, paki-delete na lang.",
  "Kala mo naman kina-cool mo 'yang reply mo eh 'no?",
  "May award ba sa pinakamababang IQ? Baka ikaw manalo ngayon.",
  "Pasensya ka na ah, 'di kita kayang patulan nang seryoso, nakakatawa ka kasi.",
  "Baka gusto mong magpa-consult muna bago ka mag-chat uli?",
  "Walang epekto 'yang banat mo, sinusubukan mo ba ako o pinalalata mo lang sarili mo?",
  "Cringe paps, sobrang cringe.",
  "Alam mo 'yung pakiramdam ng napapahiya? Ganyan na ganyan ka ngayon.",
  "Sige pa, ipaglaban mo pa 'yang maling paniniwala mo.",
  "Hindi pa ba napapagod 'yang daliri mo sa pag-type ng walang kwenta?",
  "Pa-cute ka lang pero walang binatog.",
  "May free trial ba 'yang utak mo? Baka expired na kasi.",
  "Puro ka hangin, wala ka namang maipakitang ibuga.",
  "Next topic please, nabubulok na 'tong argument mo.",
  "Tawa kami sayo rito sa kabilang screen, tuloy mo lang!",
  "Subukan mo kayang mag-isip muna bago mag-click ng send?",
  "Lakas ng loob, mahina naman sa banatan.",
  "Hahahahaha wala ka na bang maisip?",
  "Pinipilit mo talagang maging relevant 'no?",
  "Parang kape na pinalamig, wala nang lasa 'yang banat mo.",
  "Sige lang, mag-react ka pa, d'yan ka naman magaling.",
  "Sino nagpapasahod sayo para mag-mukhang ewan dito?",
  "Kaya pala tahimik sa bahay niyo, nandito ka pala nagkakalat.",
  "Akala ko ba matapang ka? Bakit paulit-ulit na lang linyahan mo?",
  "Goodluck na lang sayo paps, kailangan mo ng maraming tulong.",
  "Ilan ba kayong nag-iisip d'yan? Para kasing kalahati lang gumagana.",
  "Gusto mo ng medalya sa kabobohan?",
  "Kung puyat ka lang, matulog ka na. Nakakaawa ka na kasi.",
  "Chat ka nang chat, 'di ka naman pinapansin sa bahay niyo.",
  "Bagsak ka na sa exam, bagsak ka pa rito sa banatan. 📉",
  "Luh siya, feeling hero sa sariling kwento.",
  "Sana man lang kahit konting sense nilagay mo sa reply mo.",
  "Walang kakwenta-kwenta, prangkahan lang.",
  "Nag-iingay ka lang para mapansin ka eh 'no?",
  "Galit na galit, gusto manakit? Kaso hanggang chat ka lang.",
  "Luh, napipikon na siya! Pa-kiss nga para kumalma ka. 😘",
  "Huwag ka nang pumalag, mas lalo ka lang nagmumukhang ewan.",
  "Ang hangin naman dito, may nag-re-reply kasing puro hangin lang laman.",
  "Kahit sinong makakabasa nito, ikaw 'yung pagtatawanan.",
  "I-log out mo na 'yang dummy mo, gabi na. May pasok ka pa bukas.",
  "Lakas mag-troll sa dummy account, takot naman ipakita ang tunay na mukha! 🤡",
  "Ilang dummy account pa ba gagamitin mo bago ka matutong mag-argumento?",
  "RPW warrior amputa, paki-drop nga tunay na profile mo kung matapang ka.",
  "Dummylandia royalty ka ba? Bakit parang hari ka ng kabobohan doon?",
  "Troll account na nga lang gamit mo, olats ka pa rin sa usapan? Aba matindi.",
  "Dummylandia trashtalker starter pack: galit, puyat, at walang ambag sa lipunan. 🗿",
  "Paki-tag 'yung main account mo, ipapahiya natin doon para damay ang pamilya.",
  "Sabi ng dummy account mo 'matapang' daw siya, kaso nahuli kong iyakin.",
  "Cringe mo paps, bumalik ka na lang sa RPW doon ka mag-drama. 🎭",
  "Chat war champion daw siya sa Dummylandia... panalo sa ingay, talo sa punto.",
  "Gawa ka uli ng 10 accounts, i-mention mo sarili mo para magmukhang marami kayo.",
  "Troll lang kaya mong gawin kasi 'di ka kayang seryosohin ng mga tao sa paligid mo.",
  "Puro ka banat, kaso mas mabilis pa mag-expire 'yang account mo kaysa sa validity ng utak mo.",
  "GG Dummylandia warrior! Ulitin mo uli bukas kapag may bago ka nang script. 👋🔥"
];

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[BANAT-ENGINE] Load error:", err);
  }
  return { active: false, targetID: null, targetName: null };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[BANAT-ENGINE] Save error:", err);
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===== EVENT HANDLER =====
module.exports.handleEvent = async function ({ api, event }) {
  if (!event || event.type !== "message" || !event.body) return;

  const { threadID, messageID, senderID, body } = event;
  const cleanBody = body.trim();

  // Huwag pansinin ang mga command prefix at sariling message ng bot
  if (cleanBody.startsWith("/") || cleanBody.startsWith("!") || cleanBody.startsWith(".")) return;
  if (senderID === api.getCurrentUserID()) return;

  const data = loadData();
  if (!data.active) return;

  // KAPAG MAY TARGET: Kung hindi ang target ang nag-chat, i-bypass
  if (data.targetID && senderID !== data.targetID) return;

  // 1. AUTO HAHA REACT (😆) REKTA SA CHAT NG TARGET / KALABAN
  api.setMessageReaction("😆", messageID, (err) => {
    if (err) console.error("[HAHA-REACT Error]:", err);
  }, true);

  // 2. DYNAMIC SPAM DETECTION
  const now = Date.now();
  const lastTime = lastMessageTimes.get(senderID) || 0;
  const timeDiff = now - lastTime;
  lastMessageTimes.set(senderID, now);

  // Kapag nag-chat nang mabilis (mas mababa sa 1.5s), 5s interval. Kapag normal, 2-3s interval.
  const isSpamming = timeDiff < 1500;
  const delayMs = isSpamming ? 5000 : Math.floor(Math.random() * 1000) + 2000;

  // 3. AUTO BANAT REPLY
  if (activeQueues.has(threadID)) return;
  activeQueues.add(threadID);

  try {
    const repeatCount = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < repeatCount; i++) {
      if (!loadData().active) break;

      const chosenText = BANAT_LISTS[Math.floor(Math.random() * BANAT_LISTS.length)];
      
      let payload = chosenText;
      if (data.targetID && data.targetName) {
        payload = {
          body: `🔥 @${data.targetName} ${chosenText}`,
          mentions: [{ id: data.targetID, tag: `@${data.targetName}` }]
        };
      }

      api.sendMessage(payload, threadID, (err) => {
        if (err) console.error("[BANAT Send Error]:", err);
      });

      await sleep(delayMs);
    }
  } catch (err) {
    console.error("[BANAT-ENGINE Event Error]:", err);
  } finally {
    activeQueues.delete(threadID);
  }
};

// ===== COMMAND RUN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;
  const sub = (args[0] || "").toLowerCase().trim();

  // STRICT ADMIN ACCESS CONTROL (Hardcoded Owner ID: 61594240921272)
  if (senderID.toString() !== ADMIN_ID) {
    return api.sendMessage(`🚫 Admin access required (Owner: sinzu / ID: ${ADMIN_ID}).`, threadID, messageID);
  }

  const data = loadData();

  // COMMAND: /banat off
  if (sub === "off") {
    data.active = false;
    data.targetID = null;
    data.targetName = null;
    saveData(data);
    return api.sendMessage("🕧🕧 [ GAME OVER ] BANAT ENGINE & HAHA-REACT IS NOW OFF! 🤝", threadID, messageID);
  }

  // COMMAND: /banat on O /banat on @mention
  if (sub === "on") {
    const mentionedKeys = Object.keys(mentions || {});

    data.active = true;

    if (mentionedKeys.length > 0) {
      const targetID = mentionedKeys[0];
      const targetName = mentions[targetID].replace("@", "");
      data.targetID = targetID;
      data.targetName = targetName;
      saveData(data);

      return api.sendMessage(
        `👑 [ BANAT + HAHA REACT ACTIVATED ]\n\n` +
        `🎯 Target: ${mentions[targetID]}\n` +
        `🔥 Status: LOCKED ON TARGET\n` +
        `😆 Auto-React: Direct sa chat ng kalaban\n` +
        `⚡ Dynamic Interval: 5s (Spam Mode) / 2-3s (Normal Mode)\n` +
        `👑 Authorized Admin: sinzu (${ADMIN_ID})`,
        threadID,
        messageID
      );
    } else {
      data.targetID = null;
      data.targetName = null;
      saveData(data);

      return api.sendMessage(
        `👑 [ GLOBAL BANAT + HAHA REACT ACTIVATED ]\n\n` +
        `🌐 Mode: Global (Lahat ng mag-chat)\n` +
        `😆 Auto-React: Direct sa chat ng nag-send\n` +
        `⚡ Dynamic Interval: 5s (Spam Mode) / 2-3s (Normal Mode)\n` +
        `👑 Authorized Admin: sinzu (${ADMIN_ID})`,
        threadID,
        messageID
      );
    }
  }

  // DEFAULT HELP MENU
  return api.sendMessage(
    `👑👑 OWNER: sinzu (${ADMIN_ID}) 👑👑\n` +
    `📌 PAANO GAMITIN:\n\n` +
    `• /banat on (Global mode - lahat ng mag-chat sa GC babanatan at lalagyan ng react)\n` +
    `• /banat on @mention (Target mode - ire-lockdown ang isang specific user)\n` +
    `• /banat off (I-OFF ang bot)`,
    threadID,
    messageID
  );
};
