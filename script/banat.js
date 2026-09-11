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

// Admin ID Configuration (Kasama na ang 61594251452411)
const ADMIN_IDS = ["61594240921272", "61591430164540", "61593900495161", "61594251452411"];
const DATA_PATH = path.join(__dirname, "banat_config.json");

// Mga Prefix na ginagamit ng mga bot
const PREFIXES = ["/", "!", ".", "?", "-", "$", "#"];

const userSpamTimers = new Map();

// LISTAHAN NG MGA PANG-ASAR (English Jargon, HF Words, & Toxic Slang)
const TRASHTALK_BANAT = [
  // ORIGINAL MANDATORY BANATS:
  "hahahahaha sira social life mo saken tabaka\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "mag dasal ka latin baka siguro mawala pa ako\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "pag hindi mo na kaya mag quit dummy ka na ha\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "e sabe ko naman sayo pag lambuten ka wag kana pumalag\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Pag kakalabanin mo ako dapat may anim na immortality ka\n\n—.GG/SLEEPIN4LGNG💫💤💤",

  // ENGLISH JARGON & HIGH-FREQUENCY SLANG BANATS:
  "Your existential irrelevance is genuinely astounding bro, go touch some organic vegetation\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Lmao imagine manifesting this much cognitive dissonance in a public chat room, literally mid\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your intellectual capacity is severely underperforming, kindly log off and recalculate your life choices\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Stop barking, your logical fallacies are giving everyone here a severe migraine\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Bro is yapping with zero factual foundation, go fix your abysmal attention span\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your pseudo-intellectual banter is highly redundant and lacks basic cognitive coherence\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Imagine having such an embarrassing lack of self-awareness, go upgrade your outdated processor\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your arguments are completely void of substance, pure background noise at this point\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Lmfao bro is experiencing catastrophic ego dissolution over a text message, sit down NPC\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "The level of desperation in your syntax is utterly hilarious, take a deep breath\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "You're literally projecting your internal insecurities with maximum velocity, go touch grass\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your verbal output is mathematically insignificant to my existence, try harder kid\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Bro is malding so hard his blood pressure is spiking through the monitor\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your entire personality seems to suffer from chronic emotional volatility, go get some therapy\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Lmao zero aura, zero eloquence, pure sub-par commentary from a certified dummy account\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your cognitive capabilities are operating at a severe deficit today, log off for your own good\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Stop typing, your atrocious vocabulary is polluting the bandwidth of this thread\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Bro thinks he's imposing, but he's just exhibiting micro-aggression with zero impact\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your argument is a textbook definition of utter irrelevance, go read a dictionary\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Hahahaha keep typing paragraphs, your emotional instability is highly entertaining\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your cognitive delay is mathematically measurable, kindly recalibrate your braincells\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Bro is emitting severe NPC behavior with zero developmental progression\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Imagine relying on hyperbole because your fundamental logic is structurally compromised\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your presence here is an absolute detriment to the overall quality of conversation\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Lmao your pathetic attempts at intellectual dominance are completely laughable\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Your argumentative architecture has collapsed under the weight of your own incompetence\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Bro is genuinely struggling with basic comprehension, someone send this dummy back to primary school\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "The statistical probability of you saying something intelligent is virtually zero\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "Stop wasting my processing power with your low-tier, uninspired drivel\n\n—.GG/SLEEPIN4LGNG💫💤💤"
];

// MGA RESPO KAPAG NUMERO O SPAM
const NUMBER_INTERCEPT_RESPONSES = [
  "🛑 Your numerical enumeration will not compensate for your lack of cognitive substance\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "📊 Keep counting all you want, your input remains mathematically irrelevant\n\n—.GG/SLEEPIN4LGNG💫💤💤",
  "💤 Sequential spamming won't elevate your abysmal standing in this discussion\n\n—.GG/SLEEPIN4LGNG💫💤💤"
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
