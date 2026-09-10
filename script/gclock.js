const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "gclock",
  version: "1.0.3",
  hasPermission: 0,
  credits: "you",
  description: "Admin-only: set/lock nicknames and lock group chat name.",
  commandCategory: "group",
  usages: "nick all <nickname> | lock gcname | name <group name> | off",
  cooldowns: 3,
  prefix: "/" 
};

const DATA_FILE = path.join(__dirname, "gclock_data.json");

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (err) {
    console.log("Could not load gclock_data.json:", err);
  }
  return {};
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.log("Could not save gclock_data.json:", err);
  }
}

let gclockData = loadData();

function getThreadEntry(threadID) {
  if (!gclockData[threadID]) {
    gclockData[threadID] = {
      nickLocked: false,
      nickName: null,
      nameLocked: false,
      groupName: null,
    };
  }
  return gclockData[threadID];
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const prefix = module.exports.config.prefix || global.config?.PREFIX || "/";
  const entry = getThreadEntry(threadID);

  const allowedAdmins = [
    "61594240921272",
    "61591430164540",
    ...(global.config?.adminBot || [])
  ];
  
  if (!allowedAdmins.includes(senderID)) {
    return api.sendMessage(
      "🚫 Admin-only command. Only bot admins set in the dashboard can use this.",
      threadID,
      messageID
    );
  }

  const sub = args[0] ? args[0].toLowerCase() : null;
  const sub2 = args[1] ? args[1].toLowerCase() : null;

  // Command: /nick all [nickname] O /gclock nick [nickname]
  if (sub === "nick" || (sub === "nick" && sub2 === "all")) {
    const nickStartIndex = sub2 === "all" ? 2 : 1;
    const nickname = args.slice(nickStartIndex).join(" ").trim();
    
    if (!nickname) {
      return api.sendMessage(
        `Usage: ${prefix}nick all <nickname>`,
        threadID,
        messageID
      );
    }

    api.sendMessage("⏳ Setting nickname for everyone, please wait...", threadID);

    api.getThreadInfo(threadID, (err, info) => {
      if (err || !info) {
        return api.sendMessage("❌ Failed to fetch group members.", threadID, messageID);
      }

      const participantIDs = info.participantIDs || info.userInfo?.map(u => u.id) || [];

      let done = 0;
      participantIDs.forEach((uid) => {
        api.changeNickname(nickname, threadID, uid, (nickErr) => {
          done++;
          if (done === participantIDs.length) {
            entry.nickLocked = true;
            entry.nickName = nickname;
            saveData(gclockData);
            api.sendMessage(
              `🔒 Nickname locked to "${nickname}" for everyone in this group.`,
              threadID,
              messageID
            );
          }
        });
      });
    });
    return;
  }

  // Command: /gclock lock gcname O /gclock name [group name]
  if (sub === "lock" && sub2 === "gcname" || sub === "name") {
    const groupName = sub === "lock" ? args.slice(2).join(" ").trim() : args.slice(1).join(" ").trim();

    const applyLock = (finalName) => {
      entry.nameLocked = true;
      entry.groupName = finalName;
      saveData(gclockData);
      api.setTitle(finalName, threadID, () => {
        api.sendMessage(`🔒 Group name locked to "${finalName}".`, threadID, messageID);
      });
    };

    if (groupName) {
      applyLock(groupName);
    } else {
      api.getThreadInfo(threadID, (err, info) => {
        if (err || !info) {
          return api.sendMessage("❌ Failed to fetch current group name.", threadID, messageID);
        }
        applyLock(info.threadName || "Group Chat");
      });
    }
    return;
  }

  // Command: /gclock off
  if (sub === "off") {
    if (sub2 === "nick") {
      entry.nickLocked = false;
      saveData(gclockData);
      return api.sendMessage("🔓 Nickname lock turned off.", threadID, messageID);
    }
    if (sub2 === "name" || sub2 === "gcname") {
      entry.nameLocked = false;
      saveData(gclockData);
      return api.sendMessage("🔓 Group name lock turned off.", threadID, messageID);
    }

    entry.nickLocked = false;
    entry.nameLocked = false;
    saveData(gclockData);
    return api.sendMessage("🔓 Nickname and group name locks turned off.", threadID, messageID);
  }

  return api.sendMessage(
    `Usage:\n` +
    `• ${prefix}nick all <nickname> — set & lock nickname for everyone\n` +
    `• ${prefix}gclock lock gcname — lock current GC name\n` +
    `• ${prefix}gclock name <group name> — set & lock GC name\n` +
    `• ${prefix}gclock off — turn off all locks`,
    threadID,
    messageID
  );
};

module.exports.handleEvent = function ({ api, event }) {
  const { threadID, logMessageType, logMessageData } = event;
  const entry = gclockData[threadID];
  if (!entry) return;

  if (logMessageType === "log:user-nickname" && entry.nickLocked) {
    const changedUserID = logMessageData?.participant_id;
    const newNickname = logMessageData?.nickname;
    if (changedUserID && newNickname !== entry.nickName) {
      api.changeNickname(entry.nickName, threadID, changedUserID, () => {});
    }
  }

  if (logMessageType === "log:thread-name" && entry.nameLocked) {
    const newName = logMessageData?.name;
    if (newName !== entry.groupName) {
      api.setTitle(entry.groupName, threadID, () => {});
    }
  }
};
