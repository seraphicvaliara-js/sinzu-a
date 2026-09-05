const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "bot",
  version: "3.0.0",
  hasPermission: 0, // Inalis ang strict framework restriction para hindi mag-error sa dashboard
  credits: "you",
  description: "Auto-reply at Thread Ignore Controller",
  commandCategory: "admin",
  usages: "[on/off]",
  cooldowns: 0, // WALANG COOLDOWN
};

const OFF_DATA_FILE = path.join(__dirname, "bot_data.json");
const AUTOREPLY_DATA_FILE = path.join(__dirname, "bot_autoreply_data.json");

function loadSet(file) {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.log(`Could not load ${file}:`, err);
  }
  return new Set();
}

function saveSet(file, set) {
  try {
    fs.writeFileSync(file, JSON.stringify([...set]), "utf8");
  } catch (err) {
    console.log(`Could not save ${file}:`, err);
  }
}

let botOffThreads = loadSet(OFF_DATA_FILE);
let botAutoReplyThreads = loadSet(AUTOREPLY_DATA_FILE);

global.botOffThreads = botOffThreads;

// Listahan ng mga asar replies
const genericReplies = [
  "EH KONG PILAYAN KITA NGAYON MAY MAGAGAWA KA BA ASK LANG BAWAL MAGALIT HA",
  "PAG KINOTONGAN KITA JAN MAMEMEET UP MO SI SAN PEDRO",
  "BASAGAN KO NANG BOTE YANG ULO MONG BABUY KA",
  "EH KONG SIPAEN KUYANG NOO MONG MALAPAD",
  "PAG INUPPERCUT KITA JAN MAKIKITA MO SI KAMATAYAN",
  "EH KONG ILUBOG KITA SA LUPA RIGHT NOW KAKAYANIN MOBA",
  "EH YONG PAPA MONG BALDADO PAG TINADYAKAN KO YAN TAMO SA KABAONG BAGSAK NYAN",
  "ENOMEN MO NGA MODTAKELS KO HOY ASO",
  "SA SUBRANG HABA NANG BABA MO PWEDE NA GAWIN PANG SELF DEFENSE EH",
  "PAG SINUNTOK KO MUKA MO MAGIGING KAMUKA MO SI BOSS ATAN",
  "ANOMPAKE KO SA OPINYON MO HA",
  "PAG SINIPA KO BACKBONE MO MAKAKATULOG KA",
  "HALOS KATIMBANG MONA YONG TATLONG ELEPANTE SA SUBRANG BIGAT MO EH",
  "RAMDAM KO KABADO KA AHH SUBRA TABA KASI EHH",
  "EH KAHIT ISANG DUSENANG BABOY MAS MATABA KA PA RIN E",
  "KAHIT ISPAMMIN MOKO RIGHT NOW HINDI AKO MAWAWALA SKL LANG NMN",
  "WAGMUKO BINIBIRO JAN BAKA LECHONIN KITANG YUBABSKIE KA",
  "EH PATI TIMBANGAN MASISIRA SA SUBRANG TABA MONG HAUPKA",
  "PATI YELO SA FREEZER FINOODTRIP MONG YUBAB KA AHH",
  "EH KONG PATABAAN LANG YONG LABANAN MATAGAL KA NA PANALO",
  "WAGMUKO DAGANAN HUY BALYENA YARN",
  "PWEDE MATULOG BASTA MAGTYPE KA AHAHAHA",
  "AYT PAGOD NA PAGOD KA NA DOG AH EH KASO DI AKO MAWAWALA",
  "NAGHIHINGALO KA NA AHH MAG NEBULIZER KA JAN PERO BAWAL MAWALA HA",
  "KANTUTEN KUYANG MAMA MO SA HARAP MO GAGUKA",
  "EH KONG SAKSAKIN KITA NANG ICE PICK JAN MAY MAGAGAWA KABA",
  "PAG TINADYAKAN KO SPINAL CORD MO MAGIGISING KA TALAGA",
  "GILITAN KITA NANG LEEG JAN ASUKA HAHAHAHAHA",
  "EH KONG IPOKPOK KOTONG MARTILYO SA ULO MO RIGHT NOW",
  "PAG SINIPA KO LEEG MO JAN AHAHAHAHAHA",
  "BAKA HINGALIN KA JAN AH DIBDIBAN KITA HAHAHAHAHA",
  "DOG KAHET MAG LUMPASAY KA SA HARAP KO DI KA MAKAKATAKAS"
];

const lastReplyByThread = new Map();

function getRandomGenericReply(threadID) {
  let reply;
  const lastReply = lastReplyByThread.get(threadID);
  do {
    reply = genericReplies[Math.floor(Math.random() * genericReplies.length)];
  } while (reply === lastReply && genericReplies.length > 1);
  lastReplyByThread.set(threadID, reply);
  return reply;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";

  // INALIS ANG LAHAT NG ADMIN CHECKING ERROR:
  // Direkta nang gagana ang command kapag in-execute mo.

  if (option === "off") {
    botAutoReplyThreads.delete(threadID);
    saveSet(AUTOREPLY_DATA_FILE, botAutoReplyThreads);

    botOffThreads.add(threadID);
    global.botOffThreads = botOffThreads;
    saveSet(OFF_DATA_FILE, botOffThreads);

    return api.sendMessage(
      "🔴 Naka-OFF na ang bot dito. Naka-stop na ang auto-reply.",
      threadID,
      messageID
    );
  }

  if (option === "on") {
    botOffThreads.delete(threadID);
    global.botOffThreads = botOffThreads;
    saveSet(OFF_DATA_FILE, botOffThreads);

    botAutoReplyThreads.add(threadID);
    saveSet(AUTOREPLY_DATA_FILE, botAutoReplyThreads);

    return api.sendMessage(
      "🟢 Naka-ON na ang bot dito — mag-aauto-reply na sa lahat ng papasok na message.",
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    `Usage: ${prefix}bot on | ${prefix}bot off`,
    threadID,
    messageID
  );
};

module.exports.handleEvent = function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!botAutoReplyThreads.has(threadID)) return;
  if (!body) return;
  if (senderID === api.getCurrentUserID()) return;

  const randomReply = getRandomGenericReply(threadID);
  
  // Safe Mabilis na Interval (500ms - 1000ms): Mabilis sumagot per message pero hindi agad naha-catch ng FB spam filter.
  const safeFastDelay = 500 + Math.floor(Math.random() * 500);

  setTimeout(() => {
    try {
      api.sendTypingIndicator?.(threadID);
    } catch (err) {}

    api.sendMessage(randomReply, threadID);
  }, safeFastDelay);
};
