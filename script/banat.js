const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "banat",
  version: "13.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Auto-Banat Engine with Anti-Spam Buffer, Number Counter Interceptor, and No Time Limit",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /banat on — I-ON ang global auto-banat\n" +
    "• /banat on @mention — I-target ang isang tao\n" +
    "• /banat off — Patayin ang Banat Engine",
  cooldowns: 2
};

const ADMIN_ID = "61594240921272";
const DATA_PATH = path.join(__dirname, "banat_config.json");

// Memory map para sa Anti-Spam timer per user
const userSpamTimers = new Map();

const PHILOSOPHICAL_BANAT = [
  "Your argument possesses the structural integrity of a philosophical premise that collapsed before reaching its own conclusion. 🏛️🏚️",
  "I would challenge your reasoning, but I fear that would constitute an unfair intellectual advantage. 🧠📉",
  "Your interpretation of reality appears to be an unfortunate negotiation between ignorance and excessive confidence. 🤡✨",
  "Even Socrates would have stopped asking questions after realizing there was nothing intellectually recoverable here. 🗿❌",
  "Your theory is fascinating in the same way a logical contradiction is fascinating: mostly because it should not exist. 🌀❓",
  "I admire your confidence; it is remarkably independent from evidence, coherence, or epistemic responsibility. 🎯🕳️",
  "If ignorance were an academic discipline, you would apparently be defending a doctoral dissertation. 🎓🗑️",
  "Your conclusion arrived with tremendous confidence considering its premises never actually left the station. 🚂💨",
  "I attempted to understand your philosophy, but every conceptual pathway eventually terminated in intellectual negligence. 🚷🕳️",
  "Your argument is not controversial; it is merely insufficiently acquainted with reality. 🌍🚫",
  "Nietzsche would probably call your worldview nihilistic, but even nihilism requires more substance than this. 📜💨",
  "Your logic resembles a philosophical Möbius strip: endlessly circulating without ever arriving at a meaningful point. 🔄🤷‍♂️",
  "I would call your statement profound, but profundity requires descending beneath the surface first. 🌊🪨",
  "You have successfully transformed an absence of knowledge into an impressive display of certainty. 🏆🤦‍♂️",
  "Your reasoning has all the sophistication of a syllogism written during a power outage. 🕯️❌",
  "Kant spent his life examining the limits of human reason. Apparently, you decided to demonstrate them personally. 📖🧱",
  "Your epistemology seems to operate on the revolutionary principle that being convinced is equivalent to being correct. 💡🚫",
  "I have seen stronger premises in arguments made by people who had not yet discovered punctuation. 📝💥",
  "Your worldview is remarkably ambitious for something constructed almost entirely from assumptions. 🏰🎈",
  "You don't possess an unpopular opinion; you possess an underdeveloped one. 🐣🛑",
  "Your argument desperately wants to become philosophy, but unfortunately it remains merely vocabulary arranged with confidence. 🎭📜",
  "If Aristotle encountered this reasoning, he might invent an entirely new category called 'unfortunate syllogism.' 🏛️🤦",
  "Your intellectual framework has more gaps than a metaphysical theory written on disappearing ink. 🖊️💨",
  "I understand your perspective. I simply cannot locate the evidence that would justify understanding it as correct. 🔍🕳️",
  "Your confidence is genuinely impressive considering your argument has been empirically unemployed since its conception. 📉🛑",
  "Descartes said, 'I think, therefore I am.' Your reasoning appears to have skipped directly from 'I am' to 'therefore I am correct.' 💭🤷‍♂️",
  "Your philosophical position demonstrates an extraordinary commitment to conclusions liberated from premises. 🕊️⛓️",
  "I would deconstruct your argument, but it appears to have already dismantled itself. 🧩💥",
  "Your reasoning is not circular; it is an entire philosophical amusement park dedicated to going nowhere. 🎡🎪",
  "The tragedy of your argument is not that it is controversial, but that it believes controversy is a substitute for validity. 🎭❌",
  "Your statement has the linguistic appearance of intelligence without the inconvenient burden of actually containing it. 🗣️🫧",
  "I suspect your philosophy was developed by repeatedly confusing intuition with evidence. 🔮📉",
  "Your conceptual framework is so fragile that one reasonable question could cause an ontological catastrophe. 🏗️💥",
  "You speak as though certainty were a form of evidence. Unfortunately, reality did not approve that methodological revision. 📜🛑",
  "Your argument could benefit from Occam’s razor, although I suspect it would simply remove everything. 🪒💨",
  "Hume would question your assumptions; I would question why your assumptions were invited to the discussion. 🚪👋",
  "Your reasoning contains enough logical fallacies to qualify as an introductory course in what not to do. 📚⚠️",
  "You have achieved something remarkable: a conclusion that contradicts its premises while somehow sounding proud of itself. 🦚🤡",
  "Your argument is an epistemological house of cards wearing a suit. 🃏👔",
  "I appreciate your attempt at intellectual discourse, although discourse generally requires two participants capable of producing coherent propositions. 🗣️🎙️",
  "Your opinion is not necessarily wrong because it is unpopular; it is wrong because its foundations appear to have been constructed from decorative nonsense. 🎨🗑️",
  "You have mistaken rhetorical confidence for philosophical rigor, and the distinction is doing considerable damage to your argument. 📢💥",
  "Your reasoning resembles an academic paper whose references were replaced with vibes. 📄✨",
  "If logic were a language, your argument would be communicating entirely through mistranslation. 🗣️❌",
  "Your thesis has an impressive amount of terminology for something with almost no discernible thesis. 📚🕳️",
  "I would ask you to substantiate that claim, but I suspect the evidence is currently experiencing an existential crisis. 🕵️‍♂️🌀",
  "Your argument is intellectually ambitious in the same way a paper airplane is aeronautically ambitious. ✈️📄",
  "You have somehow managed to make ignorance sound like a personal philosophical doctrine. 📜🤡",
  "Your interpretation of the world appears to have been assembled from assumptions that never survived peer review. 🔬🚮",
  "There is something almost poetic about your confidence: it persists despite every available indication that it should not. 🎭📉",
  "Your philosophy appears to confuse complexity with intelligence, which explains why every sentence arrives wearing unnecessary academic clothing. 🧥🧠",
  "Even your contradictions seem uncertain about what they are contradicting. ❓🔄",
  "Your premises are so questionable that Socrates would probably respond by simply staring at you. 🗿👁️",
  "You don't need a counterargument; your argument already contains its own rebuttal. 🪞💥",
  "Your intellectual methodology appears to be 'assert first, rationalize later.' 🎯🏹",
  "I have encountered better epistemological foundations in arguments written on bathroom walls. 🧱🎨",
  "Your conclusion is impressively definitive for something supported by absolutely nothing definitive. 🏛️💨",
  "Your argument demonstrates the fascinating phenomenon of intellectual overconfidence surviving without intellectual infrastructure. 🏗️🕳️",
  "You speak of facts with the enthusiasm of someone who has recently discovered that facts exist but has not yet learned how to locate them. 🔎🤷‍♂️",
  "Your reasoning has the philosophical depth of a puddle and the confidence of an ocean. 🌊🕳️",
  "If William Shakespeare reviewed your argument, he might finally understand why silence is sometimes the superior literary device. 🎭🤫",
  "Your statement is so conceptually confused that even a dictionary would request clarification. 📖❓",
  "You have mistaken having an explanation for having a valid explanation. 🗣️❌",
  "Your argument does not merely lack nuance; it appears to have declared war upon nuance itself. ⚔️🧠",
  "The sheer confidence with which you present unsupported claims is almost enough to distract from the fact that they remain unsupported. 🎪✨",
  "Your intellectual framework appears to have been constructed backward: conclusion first, justification whenever convenient. 🔁🏗️",
  "Your theory is an extraordinary example of how terminology can be used to camouflage an absence of substance. 🎭📦",
  "I would call your argument sophisticated, but sophistication without coherence is merely elaborate confusion. 🎩🌀",
  "Your reasoning has the consistency of a philosopher arguing with his own reflection and somehow losing. 🪞🥊",
  "Your perspective is fascinating because it demonstrates how certainty can survive completely independently of understanding. 🧠🕳️",
  "You have produced an argument so semantically inflated that removing the jargon would leave approximately three confused words. 🎈📍",
  "Your philosophical vocabulary is impressive; unfortunately, vocabulary and comprehension are separate phenomena. 📚🗣️",
  "I cannot determine whether your argument is intentionally paradoxical or simply unaware of its own contradictions. 🌀🤷‍♂️",
  "Your premises have apparently entered witness protection because I cannot find them anywhere in your conclusion. 🕵️‍♂️📜",
  "You treat logical consistency as though it were an optional subscription service. 💳❌",
  "Your argument has the rare quality of sounding profound until someone actually examines what you said. 🔬💨",
  "If intellectual humility were currency, your argument would currently be bankrupt. 💸🧠",
  "Your theory does not challenge conventional wisdom; it merely challenges conventional literacy. 📖❌",
  "You have achieved a remarkable synthesis of arrogance, ambiguity, and unsupported inference. 🏆🤡",
  "Your reasoning would make an excellent philosophical specimen for researchers studying the consequences of excessive certainty. 🔬📉",
  "I would engage with your argument seriously, but seriousness requires something here that your premises have conspicuously failed to provide. 🎭🚫",
  "Your conclusion appears to have escaped from a completely different argument and wandered into this conversation by accident. 🏃‍♂️💨",
  "Your understanding of causality is so creative that reality itself would probably request editorial revisions. 📝🌍",
  "You have constructed an intellectual labyrinth where every path leads back to the same unsupported assertion. 🌀🧱",
  "Your argument is not deep; it is simply difficult to understand because clarity was apparently excluded from the methodology. 🌫️📜",
  "Your reasoning possesses the fascinating ability to become less convincing every time it is explained. 📉🗣️",
  "You seem to regard disagreement as evidence of persecution rather than an invitation to reconsider your premises. 🛡️🤡",
  "Your argument has enough rhetorical decoration to make an empty room look intellectually furnished. 🛋️💨",
  "Even your hypothetical scenarios require more suspension of disbelief than most works of fiction. 🦄📚",
  "Your interpretation of logic appears to be highly theoretical, particularly because it has never been observed in practice. 🧪💥",
  "You speak with the authority of an encyclopedia and reason with the reliability of a fortune cookie. 🥠📖",
  "Your philosophical position is remarkably resilient; no amount of evidence appears capable of making contact with it. 🛡️🧠",
  "You have confused intellectual independence with intellectual isolation. 🏝️🛑",
  "Your argument is a magnificent demonstration that sophisticated vocabulary cannot compensate for primitive reasoning. 🎩🦴",
  "I would dismantle your thesis, but doing so would be less a debate and more an archaeological excavation. ⛏️🗿",
  "Your reasoning has reached such an advanced stage of abstraction that it has successfully detached itself from reality. 🎈☁️",
  "The problem with your argument is not its complexity; it is that complexity appears to be doing all the intellectual labor. ⚙️💨",
  "You possess an extraordinary talent for turning simple questions into unnecessarily complicated demonstrations of misunderstanding. 🌀📢",
  "Your claim sounds almost revolutionary until one notices that it is merely incorrect with unusually expensive vocabulary. 🏷️💸",
  "I understand that you consider this a theory, but calling an unsupported conclusion a theory does not magically promote it into an intellectual achievement. 🪄📜"
];

const NUMBER_INTERCEPT_RESPONSES = [
  "🛑 Putol ang bilang mo. Tigil mo na 'yang resibo, hindi ‘yan gagana rito. 🚫",
  "📊 Akala mo makakabuo ka ng 1-100? Cut off agad 'yang counting sequence mo. ✂️",
  "🤡 Subukan mo pang mag-spam ng numero, sirang-sira pa rin 'yang bilang mo. 🛑",
  "📉 Stop right there. Grounded ang counting attempts mo dito. ❌"
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

// Check kung ang message ay purong numero, 1-100 counting pattern, o dummy resibo
function isCountingOrNumberSpam(text) {
  const clean = text.trim();
  // RegEx para ma-detect kung puro number o pattern na #1, 1., 2.. etc.
  return /^\d+$/.test(clean) || /^#?\d+[\.\-\)]?$/.test(clean);
}

// Random delay na 2 to 3 seconds (Human Speed)
function getHumanDelay() {
  return Math.floor(Math.random() * 1000) + 2000;
}

// ===== EVENT HANDLER =====
module.exports.handleEvent = async function ({ api, event }) {
  if (!event || event.type !== "message" || !event.body) return;

  const { threadID, messageID, senderID, body } = event;
  const cleanBody = body.trim();

  // Huwag mag-reply sa commands o sa sariling message ng bot
  if (cleanBody.startsWith("/") || cleanBody.startsWith("!") || cleanBody.startsWith(".")) return;
  if (senderID === api.getCurrentUserID()) return;

  const data = loadData();
  if (!data.active) return;

  // Kung may naka-target at hindi iyon ang nag-send, huwag mag-reply
  if (data.targetID && senderID !== data.targetID) return;

  // Anti-Spam Buffer: Burahin ang nakalipas na timer para hindi sumabay sa nag-i-spam
  if (userSpamTimers.has(senderID)) {
    clearTimeout(userSpamTimers.get(senderID));
  }

  // Maghintay muna matapos mag-type/spam ang tao bago lumapag ang bot
  const timer = setTimeout(async () => {
    userSpamTimers.delete(senderID);

    try {
      let chosenText;

      // Kapag nagbibilang o nagse-send ng resibo/numero -> Puputulin ang bilang
      if (isCountingOrNumberSpam(cleanBody)) {
        chosenText = NUMBER_INTERCEPT_RESPONSES[Math.floor(Math.random() * NUMBER_INTERCEPT_RESPONSES.length)];
      } else {
        chosenText = PHILOSOPHICAL_BANAT[Math.floor(Math.random() * PHILOSOPHICAL_BANAT.length)];
      }

      let payload = chosenText;
      if (data.targetID && data.targetName) {
        payload = {
          body: `🔥 @${data.targetName} ${chosenText}`,
          mentions: [{ id: data.targetID, tag: `@${data.targetName}` }]
        };
      }

      api.sendMessage(payload, threadID, (err, info) => {
        if (err) return console.error("[BANAT Send Error]:", err);

        if (info && info.messageID) {
          api.setMessageReaction("😆", info.messageID, (reactErr) => {
            if (reactErr) console.error("[HAHA-REACT Error]:", reactErr);
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
  const sub = (args[0] || "").toLowerCase().trim();

  if (senderID.toString() !== ADMIN_ID) {
    return api.sendMessage("🚫 Admin access required (Owner: sinzu / ID: 61594240921272).", threadID, messageID);
  }

  const data = loadData();

  if (sub === "off") {
    data.active = false;
    data.targetID = null;
    data.targetName = null;
    saveData(data);
    return api.sendMessage("🕧 [ GAME OVER ] BANAT ENGINE IS NOW OFF!", threadID, messageID);
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
        `👑 [ INTELLECTUAL ROAST ACTIVATED ]\n\n` +
        `🎯 Target: ${mentions[targetID]}\n` +
        `😆 Auto-React: On bot's own message\n` +
        `⏳ Duration: NO TIME LIMIT (Infinite)\n` +
        `⚡ Anti-Spam: Idle-trigger Delay (2-3s)\n` +
        `🔢 Counter Interceptor: Active\n` +
        `👑 Admin: sinzu`,
        threadID,
        messageID
      );
    } else {
      data.targetID = null;
      data.targetName = null;
      saveData(data);

      return api.sendMessage(
        `👑 [ GLOBAL INTELLECTUAL ROAST ACTIVATED ]\n\n` +
        `🌐 Mode: Global\n` +
        `😆 Auto-React: On bot's own message\n` +
        `⏳ Duration: NO TIME LIMIT (Infinite)\n` +
        `⚡ Anti-Spam: Idle-trigger Delay (2-3s)\n` +
        `🔢 Counter Interceptor: Active\n` +
        `👑 Admin: sinzu`,
        threadID,
        messageID
      );
    }
  }

  return api.sendMessage(
    `👑 OWNER: sinzu (${ADMIN_ID})\n\n` +
    `• /banat on\n` +
    `• /banat on @mention\n` +
    `• /banat off`,
    threadID,
    messageID
  );
};

