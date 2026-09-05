const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sleeping",
  version: "5.0.0",
  hasPermission: 1,
  credits: "you",
  description: "Toggle sleeping mode autoreply on/off — 'Uncle Dags mode' na random na street/rap-vibe na reply, pero magre-reply lang habang nasa loob ng 'magdamag' na oras (default 10PM-6AM). Persistent at kayang sumabay kahit mabilis magmessage ang mga tao.",
  commandCategory: "fun",
  usages: "[on/off]",
  cooldowns: 3,
};

// ==== I-ADJUST DITO ANG ORAS NG "MAGDAMAG" MODE (24-hour format) ====
const NIGHT_START_HOUR = 22; // 10PM
const NIGHT_END_HOUR = 6;    // 6AM
// =====================================================================

// Persistent storage — naka-save sa JSON file, kaya hindi mawawala kahit mag-restart ang bot
const DATA_FILE = path.join(__dirname, "sleeping_data.json");

function loadThreads() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.log("Hindi ma-load ang sleeping_data.json:", err);
  }
  return new Set();
}

function saveThreads(threadsSet) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...threadsSet]), "utf8");
  } catch (err) {
    console.log("Hindi ma-save ang sleeping_data.json:", err);
  }
}

let sleepingThreads = loadThreads();

// Kinukuha kung nasa loob ba tayo ng "magdamag" na oras ngayon (hal. 10PM-6AM),
// support sa oras na lumalampas sa hatinggabi papuntang susunod na araw
function isNightTime() {
  const currentHour = new Date().getHours();
  if (NIGHT_START_HOUR > NIGHT_END_HOUR) {
    // Lumalampas sa hatinggabi (hal. 22 papuntang 6)
    return currentHour >= NIGHT_START_HOUR || currentHour < NIGHT_END_HOUR;
  }
  return currentHour >= NIGHT_START_HOUR && currentHour < NIGHT_END_HOUR;
}

// English "roast"-style lines — silly at hindi personal, walang totoong
// insult tungkol sa itsura, pamilya, o iba pang sensitive na bagay,
// generic burns lang na parang meme-roast
const sleepingReplies = [
  "You have the confidence of a WiFi signal stuck at one bar.",
  "You're the human version of a buffering video.",
  "Your vibe is giving 1% battery and no charger in sight.",
  "You're proof that autocorrect gives up sometimes too.",
  "You're the \"loading...\" screen of conversations.",
  "You bring the energy of a printer that's out of ink.",
  "You're like a plot twist nobody asked for.",
  "Certified plot armor, but for awkward moments.",
  "You're the group chat's silent alarm.",
  "You move like Google Maps recalculating.",
  "You're the human version of \"please hold.\"",
  "You have main character energy but side character luck.",
  "You're the reason autocorrect needs a coffee break.",
  "You're proof screenshots exist for a reason.",
  "You're basically a pop-up ad nobody clicked \"allow\" on.",
  "You've got main quest energy stuck on a side mission.",
  "You're the \"seen\" without a reply, personified.",
  "You're the human version of low battery mode.",
  "You bring \"buffering\" energy to every conversation.",
  "You're a plot twist that even the writer didn't expect.",
  "You're the reason \"read receipts\" were invented.",
  "You're basically a Wi-Fi router that needs a reset.",
  "You've got the aura of an unskippable ad.",
  "You're the human embodiment of \"please wait.\"",
  "You move with the confidence of dial-up internet.",
  "You're the group project partner who \"will do it later.\"",
  "You're the human version of a browser with 47 tabs open.",
  "You're proof that some notifications should just be muted.",
  "You're basically autocorrect's worst nightmare.",
  "You've got the timing of a text message from 2019.",
  "You're the human version of \"this page isn't loading.\"",
  "You bring chaos like a Bluetooth speaker that won't pair.",
  "You're the reason group chats have a mute button.",
  "You're the human version of a printer jam.",
  "You've got the reliability of a phone at 3% battery.",
  "You're basically a rerun nobody asked to watch again.",
  "You're the human version of \"connection unstable.\"",
  "You bring drama like a soap opera cliffhanger.",
  "You're proof spellcheck sometimes just gives up.",
  "You're the human version of an ad you can't skip.",
  "You've got the energy of a doorbell that only rings once.",
  "You're basically a text that says \"we need to talk.\"",
  "You're the human version of a slow elevator.",
  "You bring suspense like a cliffhanger episode finale.",
  "You've got the vibe of a phone call nobody answers.",
  "You're the human version of \"system update required.\"",
  "You're basically the reason \"do not disturb\" exists.",
  "You've got the charm of a captcha that won't verify.",
  "You're the human version of a GPS recalculating route.",
  "You bring mystery like an unread message from last year.",
  "You're basically the human version of \"battery saver mode.\"",
  "You've got the punctuality of a delayed flight.",
  "You're the human version of a pop quiz nobody studied for.",
  "You bring chaos like autoplay on a Monday morning.",
  "You're the human version of \"your call is important to us.\"",
  "You've got the vibe of a Wi-Fi password nobody remembers.",
  "You're basically the plot hole in every story.",
  "You bring suspense like a \"typing...\" bubble that disappears.",
  "You're the human version of a browser crash mid-essay.",
  "You've got the reliability of a free trial that auto-renews.",
  "You're the human version of \"please try again later.\"",
  "You bring drama like a cliffhanger season finale.",
  "You're basically the reason spam filters exist.",
  "You've got the timing of a text seen but never replied.",
  "You're the human version of an app that needs an update.",
  "You bring chaos like a group chat at 2 AM.",
  "You're basically the human version of \"signal lost.\"",
  "You've got the mystery of an anonymous poll response.",
  "You're the human version of a Wi-Fi extender that doesn't help.",
  "You bring suspense like a \"he's typing\" that stops abruptly.",
  "You're basically a plot twist nobody clapped for.",
  "You've got the vibe of an ad that plays before the ad.",
  "You're the human version of a \"loading, please wait\" bar stuck at 99%.",
  "You bring drama like autocorrect changing your whole sentence.",
  "You're basically the reason \"snooze\" buttons exist.",
  "You've got the punctuality of a bus that's always five minutes late.",
  "You're the human version of a phone that restarts mid-call.",
  "You bring chaos like a printer that prints one page at a time, slowly.",
  "You're basically the human version of \"please verify you're not a robot.\"",
  "You've got the reliability of a charger cable that only works at one angle.",
  "You're the human version of a text sent to the wrong group chat.",
  "You bring suspense like a \"this conversation has been deleted\" notice.",
  "You're basically the human version of \"your download has been paused.\"",
  "You've got the mystery of a caller ID that just says \"Unknown.\"",
  "You're the human version of an elevator that skips your floor.",
  "You bring drama like a plot twist revealed in the trailer.",
  "You're basically the reason \"read at 2:03 AM\" exists.",
  "You've got the timing of a joke that lands a week late.",
  "You're the human version of a screen that won't rotate.",
  "You bring chaos like autoplay starting a video you didn't pick.",
  "You're basically the human version of \"checking for updates.\"",
  "You've got the vibe of a message left on \"delivered\" forever.",
  "You're the human version of a router blinking orange.",
  "You bring suspense like a cliffhanger with no season two.",
  "You're basically the reason \"mute notifications\" was invented.",
  "You've got the punctuality of a microwave that beeps five times late.",
  "You're the human version of a video call that freezes on your worst angle.",
  "You bring drama like a group chat argument over nothing.",
  "You're basically the human version of \"this link has expired.\"",
  "You've got the mystery of a text that says \"we should talk\" with no context."
];

// Kumuha ng random reply na hindi parehas sa huling isinend, para hindi kagad
// paulit-ulit kahit mabilis magmessage — mas natural ang randomness
const lastReplyByThread = new Map();

function getRandomReply(threadID) {
  let reply;
  const lastReply = lastReplyByThread.get(threadID);
  do {
    reply = sleepingReplies[Math.floor(Math.random() * sleepingReplies.length)];
  } while (reply === lastReply && sleepingReplies.length > 1);
  lastReplyByThread.set(threadID, reply);
  return reply;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const option = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";

  // === ADMIN-ONLY CHECK ===
  // Tanging mga group admin ng GC (o bot admin, kung meron) ang makakagamit ng command na ito
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    // BINAGO: sinasakop na ngayon ang dalawang posibleng format ng adminIDs
    // mula sa ws3-fca (minsan array ng objects na {id: '123'}, minsan array
    // ng plain strings na '123' lang depende sa version) — dati isang format
    // lang ang hawak, kaya nagfa-fail ang check kung iba ang format na
    // ibinabalik ng library version mo.
    const rawAdminIDs = threadInfo.adminIDs || [];
    const groupAdmins = rawAdminIDs.map((a) => (typeof a === "object" ? a.id : a));

    // BINAGO: tamang path na ngayon papunta sa bot-wide admins — dating
    // "global.config?.ADMINBOT" na hindi umiiral sa structure ng config mo.
    // Ayon sa auto.js mo, nasa "config[0].masterKey.admin" ito nakatago.
    const botAdmins = global.config?.[0]?.masterKey?.admin || [];

    const isGroupAdmin = groupAdmins.map(String).includes(String(senderID));
    const isBotAdmin = botAdmins.map(String).includes(String(senderID));

    if (!isGroupAdmin && !isBotAdmin) {
      return api.sendMessage(
        "🚫 Admin lang ng grupo (o bot admin) ang pwedeng gumamit ng command na ito.",
        threadID,
        messageID
      );
    }
  } catch (err) {
    return api.sendMessage("❌ Hindi ma-verify ang admin status. Subukan ulit.", threadID, messageID);
  }
  // === END ADMIN-ONLY CHECK ===

  if (option === "on") {
    sleepingThreads.add(threadID);
    saveThreads(sleepingThreads);
    return api.sendMessage(
      `🥷 Naka-ON na ang Uncle Dags mode dito, permanente ito hangga't hindi mo in-off.\n` +
      `🌙 Magre-reply lang ito habang "magdamag" (${NIGHT_START_HOUR}:00 - ${NIGHT_END_HOUR}:00), tahimik ito sa umaga't hapon.`,
      threadID,
      messageID
    );
  }

  if (option === "off") {
    sleepingThreads.delete(threadID);
    saveThreads(sleepingThreads);
    return api.sendMessage("🌙 Naka-OFF na ang Uncle Dags mode.", threadID, messageID);
  }

  return api.sendMessage(
    `Gamitin: ${prefix}sleeping on | ${prefix}sleeping off\n` +
    `Aactive lang ito habang magdamag (${NIGHT_START_HOUR}:00 - ${NIGHT_END_HOUR}:00).`,
    threadID,
    messageID
  );
};

// Hindi ito naka-await sa sendMessage — kaya hindi nagba-block ang susunod na
// event kahit sabay-sabay o sunod-sunod na magmessage ang mga tao sa GC.
module.exports.handleEvent = function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!sleepingThreads.has(threadID)) return;
  if (!body) return;
  if (senderID === api.getCurrentUserID()) return;
  if (!isNightTime()) return; // Tahimik lang kung araw pa/gabi pero hindi pa "magdamag" oras

  const randomReply = getRandomReply(threadID);
  api.sendMessage(randomReply, threadID);
};
