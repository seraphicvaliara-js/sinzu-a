const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "banat",
  version: "16.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Auto-Banat Engine - 100+ Savage Trashtalk Array",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /banat on — I-ON ang global auto-banat\n" +
    "• /banat on @mention — I-target ang isang tao\n" +
    "• /banat off — Patayin ang Banat Engine",
  cooldowns: 2
};

// Admin ID Configuration
const ADMIN_IDS = ["61594240921272", "61591430164540"];
const DATA_PATH = path.join(__dirname, "banat_config.json");

// Mga Prefix na ginagamit ng mga bot
const PREFIXES = ["/", "!", ".", "?", "-", "$", "#"];

const userSpamTimers = new Map();

// LISTAHAN NG MGA PANG-ASAR AT TRASHTALK BANAT (100+ SELECTION)
const TRASHTALK_BANAT = [
  // MGA REQUEST MO:
  "hahahahaha sira social life mo saken tabaka\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "mag dasal ka latin baka siguro mawala pa ako\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "pag hindi mo na kaya mag quit dummy ka na ha\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "e sabe ko naman sayo pag lambuten ka wag kana pumalag\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pag kakalabanin mo ako dapat may anim na immortality ka\n\n—.GG/SLEEPIN4LGNG💫💤💤",

  // 100 DAGDAG NA PANG-ASAR BANAT:
  "Ilang beses ka ba iniluwal ng nanay mo para maging ganyang katanga?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Masyado kang maingay pero sa totoong buhay palamunin ka lang naman\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Subukan mong mag-isip bago mag-type, nakakahiya sa mga neuron mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Hindi ka pambato rito, bumalik ka na lang sa pambatang chatroom\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "I-sell mo na lang 'yang phone mo, hindi mo man lang nagagamit utak mo habang nagta-type\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Napakalakas ng amats mo sa sarili mo pero kahit alikabok walang takot sa 'yo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kahit anong banat mo, halatang walang nagmamahal sa 'yo sa bahay niyo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Mukha kang resibo ng panis na ulam sa sobrang walang katuturan ng linya mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "I-clear cache mo muna 'yang utak mo bago ka humarap sa 'kin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Iiyak ka na ba? Sige lang, bibigyan kita ng tissue pagkatapos kita durugin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Hindi ko na kailangang mag-effort, ikaw mismo nagpapahiya sa sarili mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Nawawalan na ng gana ang bot sa 'yo, sobrang bagal mong mag-isip\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Ganyan ba talaga kapag kulang sa aruga? Laging nagpapapansin sa gc?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Umiyak ka na lang sa unan mo kaysa mag-spam ka ng walang kwentang chat\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kahit mag-agaw buhay ka rito, hindi mo mababago na pang-free wifi ka lang\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Mag-enroll ka muna sa daycare para matuto ka ng tamang argumento\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sobrang bagal mong mag-reply, nagpa-consult ka pa ba sa attorney bago mag-type?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Suko ka na boy, kitang-kita sa bawat chat mo na umiiyak ka na sa kabilang screen\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Mas may silbi pa ang sirang electric fan kaysa sa mga hirit mong panis\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Wag kang umasa, background character ka lang sa kuwento ko\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pumikit ka na lang at magpanaginip na nanalo ka, dun ka lang may pag-asa\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kahit mag-lotion ka ng gluta, mananatili pa ring madilim ang kinabukasan mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sobrang basura ng chat mo, kailangan na kitang i-recycle sa basurahan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Para kang lag na internet connection, nakakairita at walang pakinabang\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sino nagpapalabas sa 'yo mula sa kulungan? Paki-ibalik nga 'to sa isolation\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Nag-type ka pa nang mahaba, hindi mo rin naman naipaglaban ang dignidad mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Anong pakiramdam ng laging talo sa bawat palitan ng salita?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kahit gumamit ka ng AI, hindi pa rin maiisahan ang level ng trashtalk ko\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Bawasan ang yabang kung kahit pag-type ng maayos hindi mo magawa\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Ang ingay-ingay mo pero sa personal siguradong nakatitig ka lang sa sapatos mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Umiiyak na 'yang daliri mo sa kakatype, wala pa ring epekto\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Isang malaking L ka lang sa buhay, kahit saan ka pumunta talunan ka\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Huwag ka nang sumubok, ginagawa mo lang katawa-tawa ang sarili mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Saan mo nakuha 'yang kapal ng mukha mo? Naka-sale ba 'yan dyan sa inyo?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Napakadaling pasayahin ng utak mo, simpleng pagkatalo lang nagagalit ka na\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Tigilan mo na 'yang kaka-chat, baka pagalitan ka pa ng magulang mo sa ingay mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Wala kang binatbat, kahit bumuo ka pa ng sandatahan laban sa 'kin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sino ka nga ulit? Ah, 'yong palagi na lang basag tuwing sumasagot\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Wag kang masyadong confident, mukha ka namang ekstra sa sarili mong buhay\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Nag-iwan ka lang ng bakas ng kapangitan sa bawat chat na pinapadala mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Huminga ka muna ng malalim, baka mabilaukan ka sa sarili mong amoy\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sa sobrang babaw ng utak mo, kahit langgam hindi malulunod dyan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Iba rin ang kapal ng mukha mo no? Talo na, tuloy pa rin sa kalokohan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Subukan mo magpa-brain scan, baka may naiwan pang alikabok sa loob\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Ganyan ba kapag ginawang laruan nung bata pa? Parang sira ang pag-iisip\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pang-pantasya lang 'yang mga sinasabi mo, gisingin mo muna ang sarili mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Lumayas ka na rito bago pa kita burahin sa listahan ng mga tao\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Magpalit ka ng account, sira na ang reputasyon mo sa pangalan na 'yan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kahit anong armor isuot mo, punit-punit ka pa rin sa 'kin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Walang epekto 'yang pagse-send mo ng maraming messages, para ka lang langaw\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sabi ng nanay mo matulog ka na raw, nagkakalat ka lang sa social media\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Isang malaking abala ka lang sa sangkatauhan sa totoo lang\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kahit mag-ipon ka ng resibo, ikaw pa rin ang dehado sa huli\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kung kahinaan ang pag-uusapan, ikaw ang pinakamagandang halimbawa\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Paano mo natitiis ang sarili mo araw-araw sa ganyang katangahan?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Ano na naman 'yang kalokohan mo? Nakakairita na ang kababawan mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Gawin mong produktibo ang araw mo, wag 'yong nagpapahiya ka rito\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Hindi ka nakakatuwa, nakakaawa ka lang tingnan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Walang lugar rito ang mga mahihina ang loob na katulad mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pumunta ka sa gilid at doon ka mag-muni muni sa mga pagkakamali mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Ilang beses ka ba naunted para maging ganyan ka-desperado?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sayang ang kuryente at load mo para sa wala mong kwentang hirit\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Mukha kang sirang plaka, paulit-ulit na lang na kalokohan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Maglinis ka na lang ng kwarto mo kaysa nagpapakabobo ka rito\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Wala kang originality, kinopya mo lang ba 'yan sa tabi-tabi?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Iba ang amoy ng kabiguan mo, umaabot hanggang dito sa screen ko\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Mas maganda pa siguro buhay mo kung matututo kang manahimik\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Hindi kita patutulugin sa bawat linyang ibabagsak ko sa 'yo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pa-cute ka pa dyan, hindi ka naman bagay maging bida\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kulang ka sa pansin no? Eto pansin, tapos umalis ka na\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "May award ka ba sa pagiging pinakamababaw na tao sa gc?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Subukan mo mang lumaban, parang pusa lang na nagwawala sa gilid\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Masyadong mababa ang standards mo kaya ganyan ka mag-isip\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Hindi ko na kailangan ng sandata, mismong kamangmangan mo gigiba sa 'yo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pakitapon na 'yang pride mo sa basurahan, hindi bagay sa 'yo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Umiiyak ka na ba sa kabilang linya? Ramdam ko ang panginginig mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sige lang, maging masaya ka lang sa kakaunting attention na ibinibigay ko\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Magpalit ka muna ng diaper bago ka mag-reyna/hari ng trashtalk\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Parang papel na basang-basa ang katayuan mo ngayon\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Ano ba 'yang utak mo, naka-airplane mode ba palagi?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Huwag ka nang magpakatraydor sa sarili mo, alam mong talo ka na\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Ilan pang sampal sa katotohanan ang kailangan mo para tumigil ka?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Siguro masayang-masaya ka na sa napakababaw mong tagumpay no?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "I-deactivate mo na 'yang account mo, wala nang nagmamahal dyan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "I-block mo na lang ako para hindi ka na masaktan araw-araw\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Para kang traffic sa EDSA, nakaka-stress at walang patutunguhan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Lahat ng sinasabi mo lumilipad lang sa hangin, walang pumapansin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Isip bata ka pa rin kahit anong taon na, hindi ka na lumaki\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Umuwi ka na, nag-aalala na ang pamilya mo sa ginagawa mong katangahan\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Subukan mong maging kapaki-pakinabang kahit isang beses lang sa buhay mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Akala mo ba kinaganda/kinagwapo mo 'yang pagiging maingay mo?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Wala kang kwentang kalaban, mas exciting pa makipag-chat sa pader\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kahit saang anggulo tignan, luging-lugi ka talaga sa 'kin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Wag ka nang mag-pumiglas, mas lalo ka lang nagmumukhang kaawa-awa\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Mag-aral ka muna bago ka pumasok sa pakikipag-debate sa 'kin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Isang malaking biro lang ang buong pagkatao mo rito\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "I-log out mo na 'yan, oras na para tanggapin mo ang pagkatalo mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Sayang ang space sa screen sa mga walang katuturan mong text\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Kahit kailan hindi ka magiging lebel ko, tandaan mo 'yan sa utak mo\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Game over ka na boy, pumasok ka na lang sa kwarto at matulog\n\n—.GG/SLEEPIN4LGNG💫💤💤"
];

// MGA RESPO KANGA KAPAG NUMERO O SPAM
const NUMBER_INTERCEPT_RESPONSES = [
  "🛑 Kakabilang mo, hindi mo napansing tulog ka na pala sa 'kin\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "📊 Ilang counting pa ba ang kailangan mo para marealize mong wala kang epekto?\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "💤 Putol 'yang bilang mo, umuwi ka na at humiga\n\n—.GG/SLEEPIN4LGNG💫💤💤"
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

function isCountingOrNumberSpam(text) {
  const clean = text.trim();
  return /^\d+$/.test(clean) || /^#?\d+[\.\-\)]?$/.test(clean);
}

function getHumanDelay() {
  return Math.floor(Math.random() * 1000) + 2000;
}

// ===== EVENT HANDLER =====
module.exports.handleEvent = async function ({ api, event }) {
  if (!event || event.type !== "message" || !event.body) return;

  const { threadID, messageID, senderID, body } = event;
  const cleanBody = body.trim();
  const isSenderAdmin = ADMIN_IDS.includes(senderID.toString());

  // Huwag pansinin ang sariling chat ng bot
  if (senderID === api.getCurrentUserID()) return;

  // Suriin kung nag-mula sa command / may prefix
  const isCommand = PREFIXES.some((p) => cleanBody.startsWith(p));

  // ABSOLUTE IGNORE: Kapag HINDI Admin at nag-type ng command
  if (!isSenderAdmin && isCommand) {
    if (userSpamTimers.has(senderID)) {
      clearTimeout(userSpamTimers.get(senderID));
      userSpamTimers.delete(senderID);
    }
    return; // Agad na titigil at walang anumang ireresponde
  }

  // Kung Admin naman at command ang itinype, i-ignore sa event handler para sa module.run mag-process
  if (isSenderAdmin && isCommand) return;

  const data = loadData();
  if (!data.active) return;

  // Kung may naka-target at hindi siya ang nag-chat, ignore
  if (data.targetID && senderID !== data.targetID) return;

  // Anti-Spam Buffer logic
  if (userSpamTimers.has(senderID)) {
    clearTimeout(userSpamTimers.get(senderID));
  }

  const timer = setTimeout(async () => {
    userSpamTimers.delete(senderID);

    try {
      let chosenText;

      if (isCountingOrNumberSpam(cleanBody)) {
        chosenText = NUMBER_INTERCEPT_RESPONSES[Math.floor(Math.random() * NUMBER_INTERCEPT_RESPONSES.length)];
      } else {
        chosenText = TRASHTALK_BANAT[Math.floor(Math.random() * TRASHTALK_BANAT.length)];
      }

      let payload = chosenText;
      if (data.targetID && data.targetName) {
        payload = {
          body: `@${data.targetName} ${chosenText}`,
          mentions: [{ id: data.targetID, tag: `@${data.targetName}` }]
        };
      }

      api.sendMessage(payload, threadID, (err, info) => {
        if (err) return console.error("[BANAT Send Error]:", err);

        if (info && info.messageID) {
          api.setMessageReaction("💫", info.messageID, (reactErr) => {
            if (reactErr) console.error("[SLEEP-REACT Error]:", reactErr);
          }, true);
        }
      }, messageID);

    } catch (err) {
      console.error("[BANAT-ENGINE Event Error]:", err);
    }
  }, getHumanDelay());

  userSpamTimers.set(senderID, timer);
};

// ===== COMMAND RUN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;

  // ABSOLUTE IGNORE: Kapag hindi Admin ang nag-execute ng /banat command
  if (!ADMIN_IDS.includes(senderID.toString())) {
    return; // Walang reply, walang error message, walang kahit ano.
  }

  const sub = (args[0] || "").toLowerCase().trim();
  const data = loadData();

  if (sub === "off") {
    data.active = false;
    data.targetID = null;
    data.targetName = null;
    saveData(data);
    return api.sendMessage("—.GG/SLEEPIN4LGNG💫💤💤 [ OFF ]", threadID, messageID);
  }

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
        `—.GG/SLEEPIN4LGNG💫💤💤 ACTIVATED\n\n` +
        `🎯 Target: ${mentions[targetID]}\n` +
        `💫 Auto-React: 💫 reaction\n` +
        `⏳ Duration: Infinite\n` +
        `⚡ Anti-Spam: Active (2-3s Delay)\n` +
        `👑 Admin: Authorized`,
        threadID,
        messageID
      );
    } else {
      data.targetID = null;
      data.targetName = null;
      saveData(data);

      return api.sendMessage(
        `—.GG/SLEEPIN4LGNG💫💤💤 GLOBAL ACTIVATED\n\n` +
        `🌐 Mode: Global\n` +
        `💫 Auto-React: 💫 reaction\n` +
        `⏳ Duration: Infinite\n` +
        `⚡ Anti-Spam: Active (2-3s Delay)\n` +
        `👑 Admin: Authorized`,
        threadID,
        messageID
      );
    }
  }

  return api.sendMessage(
    `👑 SLEEPIN4LGNG ENGINE\n\n` +
    `• /banat on\n` +
    `• /banat on @mention\n` +
    `• /banat off`,
    threadID,
    messageID
  );
};
