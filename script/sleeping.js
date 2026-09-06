const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sleeping",
  version: "4.2.0",
  role: 0,
  aliases: [],
  credits: "you",
  description: "Toggle sleeping mode autoreply on/off — random street/rap-vibe na reply sa bawat message. Admin only.",
  usage: "[on/off] [thread id]",
  cooldown: 3,
};

// Persistent storage
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

// Random replies (marami na)
const sleepingReplies = [
  "Wow, another life-changing message. Truly.",
  "Did you type that with your eyes closed?",
  "Bold of you to hit send on that one.",
  "That message really said 'I have nothing better to do.'",
  "Legendary typing skills. Legendary nonsense too.",
  "You types like autocorrect gave up halfway.",
  "Somewhere, a period is missing you.",
  "That was... a choice.",
  "Breaking news: nobody asked, yet here we are.",
  "Your keyboard deserves a break after that.",
  "Certified chaos, 10/10 confidence though.",
  "That message aged like milk in the sun.",
  "You really pressed send and thought 'yeah, this is it.'",
  "Somewhere a grammar teacher just felt a disturbance.",
  "Impressive. Not in a good way, but impressive.",
  "That take was so bold it needs a warning label.",
  "You typed that with main character energy, respect.",
  "Reading that took years off my patience.",
  "That's one way to start a conversation, I guess.",
  "Confidence: 100. Accuracy: still loading.",
  "That message just applied for 'most random' award.",
  "Not gonna lie, that was a plot twist nobody needed.",
  "You cooked... something. Not sure what though.",
  "Someone give this person a filter, please.",
  "That energy is unmatched, unfortunately.",
  "Bro really woke up and chose violence... against grammar.",
  "That message just failed the vibe check hard.",
  "I'm not mad, I'm just disappointed. And a little confused.",
  "You typed that like the WiFi was about to die.",
  "Main character syndrome is strong with this one.",
  "Somewhere in the world, a brain cell just left the group chat.",
  "That was the digital equivalent of tripping over air.",
  "Respect the confidence. Question the execution.",
  "You just dropped the conversational equivalent of a wet sock.",
  "I'm gonna pretend I didn't see that for both our sakes.",
  "That message needs a 'this is fine' dog meme.",
  "You really said that out loud... digitally.",
  "The audacity is loud and the logic is quiet.",
  "Somewhere a therapist just got a new client.",
  "That take was so cold it needs a jacket.",
  "You typed like you were late for a meeting with chaos.",
  "Not the worst thing I've read today, but it's trying.",
  "This message has the same energy as a participation trophy.",
  "You just speedran 'how to lose the plot'.",
  "I'm impressed you managed to hit send with that much nonsense.",
  "That was less of a message and more of a cry for help.",
  "The group chat just collectively aged 5 years.",
  "You cooked and still managed to burn the kitchen.",
  "Somewhere, silence is begging to come back.",
  "That energy belongs in a deleted scene.",
  "You really thought that was the one, huh?",
  "I'm not saying it was bad... but the floor is lava and you're standing on it.",
  "That message just asked for a refund on common sense.",
  "Bold strategy. Let's see if it pays off. (It won't.)",
  "You just invented a new way to waste pixels.",
];

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

// Check kung admin (mula sa dashboard / session)
function isAdmin(senderID, adminList = []) {
  if (!senderID) return false;

  if (Array.isArray(adminList) && adminList.includes(senderID)) {
    return true;
  }

  try {
    if (global.config?.[0]?.masterKey?.admin?.includes(senderID)) {
      return true;
    }
  } catch (e) {}

  return false;
}

module.exports.run = async function ({ api, event, args, admin, prefix }) {
  const { threadID, messageID, senderID } = event;
  const usedPrefix = prefix || global.config?.PREFIX || "/";

  // Strict admin only — kung hindi admin, ignore completely
  if (!isAdmin(senderID, admin)) return;

  const option = args[0] ? args[0].toLowerCase() : null;
  const targetThreadID = args[1] ? args[1].trim() : threadID;

  try {
    if (option === "on") {
      sleepingThreads.add(targetThreadID);
      saveThreads(sleepingThreads);
      return api.sendMessage(
        `🥷 Naka-ON na ang sleeping mode sa thread ${targetThreadID}.\n(Permanente hanggang i-off mo)`,
        threadID,
        messageID
      );
    }

    if (option === "off") {
      sleepingThreads.delete(targetThreadID);
      saveThreads(sleepingThreads);
      return api.sendMessage(
        `🌙 Naka-OFF na ang sleeping mode sa thread ${targetThreadID}.`,
        threadID,
        messageID
      );
    }

    return api.sendMessage(
      `Gamitin:\n\( {usedPrefix}sleeping on [thread id]\n \){usedPrefix}sleeping off [thread id]\n\n(Kung walang thread id, gagamitin ang current thread)`,
      threadID,
      messageID
    );
  } catch (err) {
    console.log("Error sa sleeping command:", err);
  }
};

module.exports.handleEvent = function ({ api, event }) {
  try {
    const { threadID, senderID, body } = event;

    if (!sleepingThreads.has(threadID)) return;
    if (!body) return;
    if (senderID === api.getCurrentUserID()) return;

    const randomReply = getRandomReply(threadID);
    api.sendMessage(randomReply, threadID).catch((err) => {
      console.log("Hindi naipadala ang autoreply:", err);
    });
  } catch (err) {
    console.log("Error sa sleeping handleEvent:", err);
  }
};
