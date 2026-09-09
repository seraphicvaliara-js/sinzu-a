const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "banat",
  version: "11.0.0",
  hasPermission: 0,
  credits: "sinzu",
  description: "Auto-Banat Engine with Haha Auto-React (Restricted to Admin 61594240921272)",
  usePrefix: true,
  commandCategory: "Fun",
  usages:
    "• /banat on — I-ON ang global auto-banat + haha react\n" +
    "• /banat on @mention — I-target ang isang tao gamit ang auto-banat + haha react\n" +
    "• /banat off — Patayin ang Banat Engine",
  cooldowns: 2
};

const ADMIN_ID = "61594240921272";
const DATA_PATH = path.join(__dirname, "banat_config.json");
const activeQueues = new Set();

const BANAT_LISTS = [
  "Fast hand ka pala ah? Bilis mag-type pero bagal mag-isip! ⚡",
  "Pabilisan ba ng daliri 'to o pabilisan magmukhang ewan?",
  "Bilisan mo pa, baka sakaling mahabol ng bilis mo 'yung IQ mo!",
  "Kumag mode: speed 100, utak 0!",
  "Demon mode ka d'yan, mukha ka namang abnormal na tikbalang! 👹",
  "Impyerno pa lang sumusuko na sa ka-abnormalan mo.",
  "Lakas mag-demon form pero sa totoong buhay takot sa ipis.",
  "Abnormal vibes ka talaga, paki-check muna sarili sa salamin.",
  "Walang tigil 'to hanggang sa sumuko 'yang keyboard mo! 💀",
  "Tuloy-tuloy ang bombardment, walang pahinga para sa mga pabuhat!",
  "Hanggang sa huling patak ng data mo, di ka tatantanan!",
  "Dire-diretsong kamatayan ng dignidad mo rito sa chat!",
  "Papatayan na lang ng gana mag-reply kasi nakakaantok ka. ⚰️",
  "Gusto mo nang patayan? Patayin mo na lang data mo, libre pa.",
  "Laban o bawi? Kaso sa simula pa lang patay ka na sa usapan.",
  "Walang buhay 'yang punto mo, paki-libing na lang.",
  "Kahit anghel mawawalan ng bait kapag nakipag-chat sayo. 😇❌",
  "Bumagsak ka ba mula sa langit kasi hindi ka rin nila matagalan doon?",
  "Kamukha mo anghel... 'yung nasunog nung nahulog sa lupa.",
  "Goodbye sa bait at pasensya dahil sa mga sinasabi mo."
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

  if (cleanBody.startsWith("/") || cleanBody.startsWith("!") || cleanBody.startsWith(".")) return;
  if (senderID === api.getCurrentUserID()) return;

  const data = loadData();
  if (!data.active) return;

  // KAPAG MAY TARGET: Kung hindi ang target ang nag-chat, ibale-wala
  if (data.targetID && senderID !== data.targetID) return;

  // 1. AUTO HAHA REACT (😆)
  api.setMessageReaction("😆", messageID, (err) => {
    if (err) console.error("[HAHA-REACT Error]:", err);
  }, true);

  // 2. AUTO BANAT REPLY
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

      await sleep(1500);
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

  // STRICT ADMIN CHECK (Gamit ang ID mo: 61594240921272)
  if (senderID.toString() !== ADMIN_ID) {
    return api.sendMessage("🚫 Admin access required (Owner: sinzu / ID: 61594240921272).", threadID, messageID);
  }

  const data = loadData();

  // PAG-OFF
  if (sub === "off") {
    data.active = false;
    data.targetID = null;
    data.targetName = null;
    saveData(data);
    return api.sendMessage("🕧🕧 [ GAME OVER ] BANAT ENGINE & HAHA-REACT IS NOW OFF! 🤝", threadID, messageID);
  }

  // PAG-ON (/banat on o /banat on @mention)
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
        `😆 Auto-React: HAHA REACT (😆)\n` +
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
        `😆 Auto-React: HAHA REACT (😆)\n` +
        `👑 Authorized Admin: sinzu (${ADMIN_ID})`,
        threadID,
        messageID
      );
    }
  }

  // DEFAULT HELP / INSTRUCTION
  return api.sendMessage(
    `👑👑 OWNER: sinzu (${ADMIN_ID}) 👑👑\n` +
    `📌 PAANO GAMITIN:\n\n` +
    `• /banat on (Global mode - lahat babanatan at naka-haha react)\n` +
    `• /banat on @mention (Target mode - partikular na tao lang)\n` +
    `• /banat off (I-OFF ang bot)`,
    threadID,
    messageID
  );
};
