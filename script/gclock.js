const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "gclock",
  version: "1.0.0",
  hasPermission: 0,
  credits: "you",
  description: "Admin-only: set a nickname for everyone in the group + lock it so it auto-reverts if changed. Also lock the group chat name so it can't be changed.",
  commandCategory: "group",
  usages: "nick <nickname> | name <group name> | off nick | off name | off",
  cooldowns: 3,
};

const DATA_FILE = path.join(__dirname, "gclock_data.json");

// Structure: { [threadID]: { nickLocked: bool, nickName: string, nameLocked: bool, groupName: string } }
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
  const sub = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";
  const entry = getThreadEntry(threadID);

  // Bot admin-only — IDs come from the bot dashboard config (global.config.adminBot)
  const adminBot = global.config?.adminBot || [];
  if (!adminBot.includes(senderID)) {
    return api.sendMessage(
      "🚫 Admin-only command. Only bot admins set in the dashboard can use this.",
      threadID,
      messageID
    );
  }

  if (sub === "nick") {
    const nickname = args.slice(1).join(" ").trim();
    if (!nickname) {
      return api.sendMessage(
        `Usage: ${prefix}gclock nick <nickname>`,
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

  if (sub === "name") {
    const groupName = args.slice(1).join(" ").trim();

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
      // No name given — lock whatever the current group name is
      api.getThreadInfo(threadID, (err, info) => {
        if (err || !info) {
          return api.sendMessage("❌ Failed to fetch current group name.", threadID, messageID);
        }
        applyLock(info.threadName || "Group Chat");
      });
    }
    return;
  }

  if (sub === "off") {
    const target = args[1] ? args[1].toLowerCase() : null;

    if (target === "nick") {
      entry.nickLocked = false;
      saveData(gclockData);
      return api.sendMessage("🔓 Nickname lock turned off.", threadID, messageID);
    }
    if (target === "name") {
      entry.nameLocked = false;
      saveData(gclockData);
      return api.sendMessage("🔓 Group name lock turned off.", threadID, messageID);
    }

    // No target — turn both off
    entry.nickLocked = false;
    entry.nameLocked = false;
    saveData(gclockData);
    return api.sendMessage("🔓 Nickname and group name locks turned off.", threadID, messageID);
  }

  return api.sendMessage(
    `Usage:\n${prefix}gclock nick <nickname> — set + lock nickname for everyone\n${prefix}gclock name <group name> — lock group name\n${prefix}gclock off nick | off name | off — turn locks off`,
    threadID,
    messageID
  );
};

// Auto-revert on nickname or group name changes while locked
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
