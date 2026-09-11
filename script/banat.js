const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "banat",
  version: "22.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Auto-Banat Engine (works in Private Message & Group)",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /banat on — I-on ang auto-banat\n" +
    "• /banat on @mention — I-target ang isang tao\n" +
    "• /banat off — I-off ang engine",
  cooldowns: 1
};

// Admin ID Configuration
const ADMIN_IDS = ["61594382484622", "61594173182956"];
const DATA_PATH = path.join(__dirname, "banat_config.json");
const PREFIXES = ["/", "!", ".", "?", "-", "$", "#"];

const userSpamTimers = new Map();

// LISTAHAN NG TRASHTALK BANAT (Over-Complicated English Jargon & Toxic Slang)
const TRASHTALK_BANAT = [
  "hahahahaha sira social life mo saken tabaka\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "mag dasal ka latin baka siguro mawala pa ako\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "pag hindi mo na kaya mag quit dummy ka na ha\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "e sabe ko naman sayo pag lambuten ka wag kana pumalag\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pag kakalabanin mo ako dapat may anim na immortality ka\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "your existential irrelevance is genuinely astounding bro, go touch some organic vegetation\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "lmao imagine manifesting this much cognitive dissonance in a public chat room, literally mid\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "your intellectual capacity is severely underperforming, kindly log off and recalculate your life choices\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "stop barking, your logical fallacies are giving everyone here a severe migraine\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "bro is yapping with zero factual foundation, go fix your abysmal attention span\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "your pseudo-intellectual banter is highly redundant and lacks basic cognitive coherence\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "imagine having such an embarrassing lack of self-awareness, go upgrade your outdated processor\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "your arguments are completely void of substance, pure background noise at this point\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "lmfao bro is experiencing catastrophic ego dissolution over a text message, sit down NPC\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "the level of desperation in your syntax is utterly hilarious, take a deep breath\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "you're literally projecting your internal insecurities with maximum velocity, go touch grass\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "your verbal output is mathematically insignificant to my existence, try harder kid\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "bro is malding so hard his blood pressure is spiking through the monitor\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "your entire personality seems to suffer from chronic emotional volatility, go get some therapy\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "lmao zero aura, zero eloquence, pure sub-par commentary from a certified dummy account\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "your cognitive capabilities are operating at a severe deficit today, log off for your own good\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "stop typing, your atrocious vocabulary is polluting the bandwidth of this thread\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "bro thinks he's imposing, but he's just exhibiting micro-aggression with zero impact\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "your argument is a textbook definition of utter irrelevance, go read a dictionary\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "hahahaha keep typing paragraphs, your emotional instability is highly entertaining\n\n—.GG/SLEEPIN4LGNG💫💤💤"
];

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    }
  } catch (err) {
    console.error("[BANAT-ENGINE] Load error:", err);
  }
  return { active: false, banatEnabled: true, targetID: null, targetName: null };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[BANAT-ENGINE] Save error:", err);
  }
}

// ===== EVENT HANDLER =====
module.exports.handleEvent = async function ({ api, event }) {
  if (!event || event.type !== "message" || !event.body) return;

  const { threadID, messageID, senderID, body } = event;
  const cleanBody = body.trim();

  // Huwag tumugon sa sariling message ng bot
  if (senderID === api.getCurrentUserID()) return;

  // Ignore commands
  const isCommand = PREFIXES.some((p) => cleanBody.startsWith(p));
  if (isCommand) {
    if (userSpamTimers.has(senderID)) {
      clearTimeout(userSpamTimers.get(senderID));
      userSpamTimers.delete(senderID);
    }
    return;
  }

  const data = loadData();

  // Kapag naka-off ang engine → walang banat
  if (!data.active || !data.banatEnabled) return;

  // Kung may target, tumugon lang sa target
  if (data.targetID && senderID !== data.targetID) return;

  // Clear previous timer
  if (userSpamTimers.has(senderID)) {
    clearTimeout(userSpamTimers.get(senderID));
  }

  const timer = setTimeout(async () => {
    userSpamTimers.delete(senderID);

    try {
      const chosenText = TRASHTALK_BANAT[Math.floor(Math.random() * TRASHTALK_BANAT.length)];

      let payload = chosenText;

      // Kung may target, i-mention siya
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
  }, Math.floor(Math.random() * 1000) + 2000); // 2-3 seconds delay

  userSpamTimers.set(senderID, timer);
};

// ===== COMMAND RUN =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;

  // Admin check
  if (!ADMIN_IDS.includes(senderID.toString())) {
    return;
  }

  const sub = (args[0] || "").toLowerCase().trim();
  const data = loadData();

  if (sub === "off") {
    data.active = false;
    data.banatEnabled = false;
    data.targetID = null;
    data.targetName = null;
    saveData(data);
    return api.sendMessage("—.GG/SLEEPIN4LGNG💫💤💤 [ OFF ]", threadID, messageID);
  }

  if (sub === "on") {
    data.active = true;
    data.banatEnabled = true;

    const mentionedKeys = Object.keys(mentions || {});

    if (mentionedKeys.length > 0) {
      const targetID = mentionedKeys[0];
      const targetName = mentions[targetID].replace("@", "");
      data.targetID = targetID;
      data.targetName = targetName;
    } else {
      data.targetID = null;
      data.targetName = null;
    }

    saveData(data);

    return api.sendMessage(
      data.targetID
        ? `—.GG/SLEEPIN4LGNG💫💤💤 [ ON ] → Target: @${data.targetName}`
        : `—.GG/SLEEPIN4LGNG💫💤💤 [ ON ]`,
      threadID,
      messageID
    );
  }

  // Help message
  return api.sendMessage(
    `👑 SLEEPIN4LGNG BANAT ENGINE\n\n` +
    `• /banat on\n` +
    `• /banat on @mention\n` +
    `• /banat off`,
    threadID,
    messageID
  );
};
