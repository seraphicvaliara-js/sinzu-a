const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "attack",
  version: "4.2.0",
  hasPermission: 0,
  credits: "you",
  description: "Toggle attack mode autoreply on/off — saktong bardagulan at banat lines gamit ang / prefix.",
  commandCategory: "fun",
  usages: "[on/off]",
  cooldowns: 3,
};

const DATA_FILE = path.join(__dirname, "attack_data.json");

function loadThreads() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.log("Hindi ma-load ang attack_data.json:", err);
  }
  return new Set();
}

function saveThreads(threadsSet) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...threadsSet]), "utf8");
  } catch (err) {
    console.log("Hindi ma-save ang attack_data.json:", err);
  }
}

let attackThreads = loadThreads();

const attackReplies = [
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
  "DOG KAHET MAG LUMPASAY KA SA HARAP KO DI KA MAKAKATAKAS",
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
  "HOY UTOT MO, AMOY PIGSA NA DI PA RIN NAGBABAGO YAN",
  "KAHIT ANONG DIET MO KUNG MUKHA KA NAMANG TAMBAY NA TINALBOS, WALANG NANGYARI",
  "DAPAT SAYO ITALI SA PUNO NG SAGING PARA MAY silbi ka namang hayop ka",
  "DI KA PA NGA NAKAKA-RECOVER SA KATATABA, BINIGWASAN NA KITA NG REALITY CHECK",
  "ISA KA PANG HINAYUPAK NA AKALA MO GWAPO PERO MUKHA KANG TAPAT NG LPG",
  "HINDI KA NGA LUMABAN PERO YUNG HININGA MO PUMATAY NA NG ISANG BARANGAY",
  "BAGO KA MAGMATAPANG DIYAN, PULUTIN MO MUNA YUNG INTEGRIDAD MONG NAIWAN SA KANAL",
  "PAG IKAW TUMAKBO, AKALA MO LGU TRUCK NA NAWPRENO SA SIKIP NG DAAN",
  "MAGHANDA KA NA KASI KASAMA KA NA SA LISTAHAN NG MGA TANGANG WALANG GAGAMUTIN"
];

const lastReplyByThread = new Map();

function getRandomReply(threadID) {
  let reply;
  const lastReply = lastReplyByThread.get(threadID);
  do {
    reply = attackReplies[Math.floor(Math.random() * attackReplies.length)];
  } while (reply === lastReply && attackReplies.length > 1);
  lastReplyByThread.set(threadID, reply);
  return reply;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";

  if (option === "on") {
    attackThreads.add(threadID);
    saveThreads(attackThreads);
    return api.sendMessage(
      "⚔️ Naka-ON na ang Attack Mode! Awtomatikong babardagulan ito sa bawat message.",
      threadID,
      messageID
    );
  }

  if (option === "off") {
    attackThreads.delete(threadID);
    saveThreads(attackThreads);
    return api.sendMessage("🛡️ Naka-OFF na ang Attack Mode.", threadID, messageID);
  }

  return api.sendMessage(
    `Gamitin: ${prefix}attack on | ${prefix}attack off`,
    threadID,
    messageID
  );
};

module.exports.handleEvent = function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!attackThreads.has(threadID)) return;
  if (!body) return;
  if (senderID === api.getCurrentUserID()) return;

  const randomReply = getRandomReply(threadID);
  api.sendMessage(randomReply, threadID);
};
