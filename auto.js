const fs = require('fs');
const path = require('path');
const login = require('ws3-fca');
const express = require('express');
const app = express();
const chalk = require('chalk');
const bodyParser = require('body-parser');
const script = path.join(__dirname, 'script');
const cron = require('node-cron');

// ---------------------------------------------------------------------------
// Safe JSON helpers
// ---------------------------------------------------------------------------
function safeReadJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw || !raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(chalk.red(`[safeReadJSON] Hindi mabasa ang ${filePath}: ${err.message}`));
    return fallback;
  }
}

function safeWriteJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(chalk.red(`[safeWriteJSON] Hindi maisulat ang ${filePath}: ${err.message}`));
    return false;
  }
}

// ---------------------------------------------------------------------------
// Safe Send + simple per-thread rate limit
// ---------------------------------------------------------------------------
const sendQueue = new Map(); // threadID -> lastSend timestamp

function safeSend(api, message, threadID, messageID) {
  if (!api || !threadID) return;

  const now = Date.now();
  const last = sendQueue.get(threadID) || 0;
  const minDelay = 800; // minimum 800ms between messages sa same thread

  if (now - last < minDelay) {
    setTimeout(() => safeSend(api, message, threadID, messageID), minDelay - (now - last) + 50);
    return;
  }

  sendQueue.set(threadID, now);

  try {
    const result = api.sendMessage(message, threadID, messageID);
    if (result && typeof result.catch === 'function') {
      result.catch((err) => {
        console.error(chalk.red(`[safeSend] Hindi naipadala sa ${threadID}: ${err?.message || err}`));
      });
    }
    return result;
  } catch (err) {
    console.error(chalk.red(`[safeSend] Exception: ${err.message}`));
  }
}

// ---------------------------------------------------------------------------
// Config & Utils
// ---------------------------------------------------------------------------
const config = fs.existsSync('./data') && fs.existsSync('./data/config.json')
  ? safeReadJSON('./data/config.json', null) || createConfig()
  : createConfig();

const dev = safeReadJSON('./dev.json', []);

const Utils = {
  commands: new Map(),
  handleEvent: new Map(),
  account: new Map(),
  cooldowns: new Map(),
};

// Ensure folders exist early
if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
if (!fs.existsSync('./data/history.json')) fs.writeFileSync('./data/history.json', '[]', 'utf-8');
if (!fs.existsSync('./data/session')) fs.mkdirSync('./data/session', { recursive: true });
if (!fs.existsSync('./data/database.json')) fs.writeFileSync('./data/database.json', '[]', 'utf-8');

// ---------------------------------------------------------------------------
// Command loader
// ---------------------------------------------------------------------------
function registerModule(scriptPath, file) {
  try {
    const { config: cfg, run, handleEvent } = require(scriptPath);
    if (!cfg) return;

    const {
      name = [],
      role = '0',
      version = '1.0.0',
      hasPrefix = true,
      aliases = [],
      description = '',
      usage = '',
      credits = '',
      cooldown = '5',
      dev: devOnly = false,
    } = Object.fromEntries(Object.entries(cfg).map(([key, value]) => [key.toLowerCase(), value]));

    const finalAliases = Array.isArray(aliases) ? [...aliases] : [aliases];
    finalAliases.push(name);

    if (run) {
      Utils.commands.set(finalAliases, {
        name, role, run, aliases: finalAliases, description, usage, version,
        hasPrefix: cfg.hasPrefix, credits, cooldown, dev: devOnly,
      });
    }
    if (handleEvent) {
      Utils.handleEvent.set(finalAliases, {
        name, handleEvent, role, description, usage, version,
        hasPrefix: cfg.hasPrefix, credits, cooldown, dev: devOnly,
      });
    }
  } catch (error) {
    console.error(chalk.red(`Error installing command from file ${file}: ${error.message}`));
  }
}

try {
  fs.readdirSync(script).forEach((file) => {
    const scripts = path.join(script, file);
    let stats;
    try {
      stats = fs.statSync(scripts);
    } catch (err) {
      console.error(chalk.red(`Hindi ma-stat ang ${scripts}: ${err.message}`));
      return;
    }
    if (stats.isDirectory()) {
      try {
        fs.readdirSync(scripts).forEach((inner) => registerModule(path.join(scripts, inner), inner));
      } catch (err) {
        console.error(chalk.red(`Hindi ma-basa ang folder ${scripts}: ${err.message}`));
      }
    } else {
      registerModule(scripts, file);
    }
  });
} catch (err) {
  console.error(chalk.red(`Hindi ma-load ang script folder: ${err.message}`));
}

// ---------------------------------------------------------------------------
// Express routes
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(express.json());

const routes = [
  { path: '/', file: 'index.html' },
  { path: '/step_by_step_guide', file: 'guide.html' },
  { path: '/online_user', file: 'online.html' },
];

routes.forEach((route) => {
  app.get(route.path, (req, res) => {
    try {
      res.sendFile(path.join(__dirname, 'public', route.file));
    } catch (err) {
      res.status(500).json({ error: true, message: 'Hindi ma-serve ang page.' });
    }
  });
});

app.get('/info', (req, res) => {
  try {
    const data = Array.from(Utils.account.values()).map((account) => ({
      name: account.name,
      profileUrl: account.profileUrl,
      thumbSrc: account.thumbSrc,
      time: account.time,
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.get('/commands', (req, res) => {
  try {
    const command = new Set();
    const commands = [...Utils.commands.values()].map(({ name }) => (command.add(name), name));
    const handleEvent = [...Utils.handleEvent.values()]
      .map(({ name }) => (command.has(name) ? null : (command.add(name), name)))
      .filter(Boolean);
    const role = [...Utils.commands.values()].map(({ role }) => (command.add(role), role));
    const aliases = [...Utils.commands.values()].map(({ aliases }) => (command.add(aliases), aliases));
    res.json({ commands, handleEvent, role, aliases });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { state, commands, prefix, admin } = req.body || {};
  try {
    if (!state) {
      return res.status(400).json({ error: true, message: 'Missing app state data' });
    }
    const cUser = Array.isArray(state) ? state.find((item) => item.key === 'c_user') : null;
    if (!cUser) {
      return res.status(400).json({ error: true, message: "There's an issue with the appstate data; it's invalid." });
    }
    const existingUser = Utils.account.get(cUser.value);
    if (existingUser) {
      console.log(`User ${cUser.value} is already logged in`);
      return res.status(400).json({
        error: false,
        message: 'Active user session detected; already logged in',
        user: existingUser,
      });
    }
    try {
      await accountLogin(state, commands, prefix, [admin]);
      res.status(200).json({ success: true, message: 'Authentication process completed successfully; login achieved.' });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: true, message: error.message });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: true, message: "There's an issue with the appstate data; it's invalid." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(chalk.green(`Server is running at http://localhost:${PORT}`));
});

// ---------------------------------------------------------------------------
// Global error handlers (hindi agad mag-crash)
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Promise Rejection:'), reason);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  // Hayaan ang watchdog (index.js) ang mag-decide kung kailangan i-restart
});

// ---------------------------------------------------------------------------
// Account Login + robust MQTT listener
// ---------------------------------------------------------------------------
async function accountLogin(state, enableCommands = [], prefix, admin = []) {
  enableCommands = [
    { commands: Array.from(Utils.commands.values()).map((c) => c.name) },
    { handleEvent: Array.from(Utils.handleEvent.values()).map((c) => c.name) },
  ];

  return new Promise((resolve, reject) => {
    login({ appState: state }, async (error, api) => {
      if (error) {
        reject(error);
        return;
      }

      let userid;
      try {
        userid = await api.getCurrentUserID();
        addThisUser(userid, enableCommands, state, prefix, admin);
      } catch (err) {
        reject(err);
        return;
      }

      try {
        const userInfo = await api.getUserInfo(userid);
        if (!userInfo || !userInfo[userid]?.name || !userInfo[userid]?.profileUrl || !userInfo[userid]?.thumbSrc) {
          throw new Error('Unable to locate the account; it appears to be in a suspended or locked state.');
        }
        const { name, profileUrl, thumbSrc } = userInfo[userid];
        const history = safeReadJSON('./data/history.json', []);
        const time = (Array.isArray(history) ? history.find((u) => u.userid === userid) : null)?.time || 0;
        Utils.account.set(userid, { name, profileUrl, thumbSrc, time });

        const intervalId = setInterval(() => {
          try {
            const account = Utils.account.get(userid);
            if (!account) {
              clearInterval(intervalId);
              return;
            }
            Utils.account.set(userid, { ...account, time: account.time + 1 });
          } catch (err) {
            clearInterval(intervalId);
          }
        }, 1000);
      } catch (error) {
        reject(error);
        return;
      }

      try {
        api.setOptions({
          listenEvents: config[0]?.fcaOption?.listenEvents ?? true,
          logLevel: config[0]?.fcaOption?.logLevel ?? 'silent',
          updatePresence: config[0]?.fcaOption?.updatePresence ?? true,
          selfListen: config[0]?.fcaOption?.selfListen ?? true,
          forceLogin: config[0]?.fcaOption?.forceLogin ?? true,
          online: config[0]?.fcaOption?.online ?? true,
          autoMarkDelivery: config[0]?.fcaOption?.autoMarkDelivery ?? false,
          autoMarkRead: config[0]?.fcaOption?.autoMarkRead ?? false,
        });
      } catch (err) {
        console.error(chalk.red(`Hindi ma-set ang API options: ${err.message}`));
      }

      // Start robust listener
      startListening(api, userid, prefix, admin, enableCommands);

      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Robust MQTT Listener with retry
// ---------------------------------------------------------------------------
function startListening(api, userid, prefix, admin, enableCommands) {
  let mqttRetryCount = 0;
  const MAX_MQTT_RETRIES = 10;

  const listen = () => {
    try {
      api.listenMqtt(async (error, event) => {
        try {
          if (error) {
            console.error(chalk.red(`[listenMqtt error] ${userid}:`), error);
            mqttRetryCount++;

            if (mqttRetryCount >= MAX_MQTT_RETRIES) {
              console.error(chalk.red(`Too many MQTT errors for ${userid}. Removing session...`));
              Utils.account.delete(userid);
              deleteThisUser(userid);
              return;
            }

            const delay = 6000 + mqttRetryCount * 2500;
            console.log(chalk.yellow(`Reconnecting MQTT for ${userid} in ${Math.round(delay / 1000)}s (attempt ${mqttRetryCount})...`));
            setTimeout(listen, delay);
            return;
          }

          // Successful message → reset retry counter
          mqttRetryCount = 0;
          if (!event) return;

          const threadID = event.threadID;
          const senderID = event.senderID;

          const database = safeReadJSON('./data/database.json', []);
          let data = Array.isArray(database) ? database.find((item) => Object.keys(item)[0] === threadID) : null;
          let adminIDS = database;
          if (!data && threadID) {
            adminIDS = await createThread(threadID, api).catch((err) => {
              console.error(chalk.red(`Hindi ma-create ang thread record: ${err.message}`));
              return database;
            });
          }

          const history = safeReadJSON('./data/history.json', []);
          const blacklist = (Array.isArray(history) ? history.find((b) => b.userid === userid) : null)?.blacklist || [];

          const body = event.body || '';
          const hasPrefix = (body && aliases(body.trim().toLowerCase().split(/ +/).shift())?.hasPrefix === false) ? '' : prefix;
          const [command, ...args] = (body.trim().toLowerCase().startsWith((hasPrefix || '').toLowerCase())
            ? body.trim().substring((hasPrefix || '').length).trim().split(/\s+/).map((a) => a.trim())
            : []);

          if (hasPrefix && aliases(command)?.hasPrefix === false) {
            safeSend(api, "Invalid usage this command doesn't need a prefix", threadID, event.messageID);
            return;
          }

          if (body && aliases(command)?.name) {
            const isDevOnly = aliases(command)?.dev;
            if (isDevOnly && !dev.includes(senderID)) {
              safeSend(api, 'You dont have access to this command, you need to be a developer.', threadID, event.messageID);
              return;
            }

            const role = aliases(command)?.role ?? 0;
            const isAdmin = config?.[0]?.masterKey?.admin?.includes(senderID) || admin.includes(senderID);
            const isThreadAdmin = isAdmin || ((Array.isArray(adminIDS) ? adminIDS.find((a) => Object.keys(a)[0] === threadID) : null)?.[threadID] || [])
              .some((a) => a.id === senderID);

            if ((role == 1 && !isAdmin) || (role == 2 && !isThreadAdmin) || (role == 3 && !config?.[0]?.masterKey?.admin?.includes(senderID))) {
              safeSend(api, "You don't have permission to use this command.", threadID, event.messageID);
              return;
            }
          }

          if (body && body.toLowerCase().startsWith((prefix || '').toLowerCase()) && aliases(command)?.name) {
            if (blacklist.includes(senderID)) {
              safeSend(api, "We're sorry, but you've been banned from using bot. If you believe this is a mistake or would like to appeal, please contact one of the bot admins for further assistance.", threadID, event.messageID);
              return;
            }
          }

          if (body && aliases(command)?.name) {
            const now = Date.now();
            const name = aliases(command)?.name;
            const sender = Utils.cooldowns.get(`\( {senderID}_ \){name}_${userid}`);
            const delay = aliases(command)?.cooldown ?? 0;
            if (!sender || (now - sender.timestamp) >= delay * 1000) {
              Utils.cooldowns.set(`\( {senderID}_ \){name}_${userid}`, { timestamp: now, command: name });
            } else {
              const active = Math.ceil((sender.timestamp + delay * 1000 - now) / 1000);
              safeSend(api, `Please wait \( {active} seconds before using the " \){name}" command again.`, threadID, event.messageID);
              return;
            }
          }

          if (body && !command && prefix && body.toLowerCase().startsWith(prefix.toLowerCase())) {
            safeSend(api, `Invalid command please use ${prefix}help to see the list of available commands.`, threadID, event.messageID);
            return;
          }

          if (body && command && prefix && body.toLowerCase().startsWith(prefix.toLowerCase()) && !aliases(command)?.name) {
            safeSend(api, `Invalid command '${command}' please use ${prefix}help to see the list of available commands.`, threadID, event.messageID);
            return;
          }

          // Handle events
          for (const { handleEvent, name } of Utils.handleEvent.values()) {
            if (handleEvent && name && ((enableCommands[1].handleEvent || []).includes(name) || (enableCommands[0].commands || []).includes(name))) {
              try {
                handleEvent({ api, event, enableCommands, admin, prefix, blacklist });
              } catch (err) {
                console.error(chalk.red(`Error sa handleEvent '${name}': ${err.message}`));
              }
            }
          }

          // Commands
          switch (event.type) {
            case 'message':
            case 'message_reply':
            case 'message_unsend':
            case 'message_reaction': {
              const matched = aliases(command?.toLowerCase());
              if (matched && enableCommands[0].commands.includes(matched.name)) {
                try {
                  await (matched.run || (() => {}))({
                    api, event, args, enableCommands, admin, prefix, blacklist, Utils,
                  });
                } catch (err) {
                  console.error(chalk.red(`Error sa command '${matched.name}': ${err.message}`));
                }
              }
              break;
            }
            default:
              break;
          }
        } catch (outerErr) {
          console.error(chalk.red(`[listenMqtt handler error] ${userid}:`), outerErr);
        }
      });
    } catch (err) {
      console.error(chalk.red(`Failed to start listenMqtt for ${userid}: ${err.message}`));
    }
  };

  listen();
}

// ---------------------------------------------------------------------------
// User management helpers
// ---------------------------------------------------------------------------
async function deleteThisUser(userid) {
  const configFile = './data/history.json';
  const history = safeReadJSON(configFile, []);
  const sessionFile = path.join('./data/session', `${userid}.json`);
  const index = history.findIndex((item) => item.userid === userid);
  if (index !== -1) history.splice(index, 1);
  safeWriteJSON(configFile, history);
  try {
    if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
  } catch (error) {
    console.error(chalk.red(`Hindi matanggal ang session file: ${error.message}`));
  }
}

async function addThisUser(userid, enableCommands, state, prefix, admin, blacklist) {
  const configFile = './data/history.json';
  const sessionFolder = './data/session';
  const sessionFile = path.join(sessionFolder, `${userid}.json`);
  if (fs.existsSync(sessionFile)) return;

  const history = safeReadJSON(configFile, []);
  history.push({
    userid,
    prefix: prefix || '',
    admin: admin || [],
    blacklist: blacklist || [],
    enableCommands,
    time: 0,
  });
  safeWriteJSON(configFile, history);
  try {
    fs.writeFileSync(sessionFile, JSON.stringify(state));
  } catch (err) {
    console.error(chalk.red(`Hindi maisulat ang session file: ${err.message}`));
  }
}

function aliases(command) {
  if (!command) return null;
  const found = Array.from(Utils.commands.entries()).find(([commands]) => commands.includes(command.toLowerCase()));
  return found ? found[1] : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  try {
    const empty = require('fs-extra');
    const cacheFile = './script/cache';
    if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile, { recursive: true });

    const configFile = './data/history.json';
    if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '[]', 'utf-8');
    const history = safeReadJSON(configFile, []);

    const sessionFolder = path.join('./data/session');
    if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });

    const adminOfConfig = fs.existsSync('./data') && fs.existsSync('./data/config.json')
      ? safeReadJSON('./data/config.json', null) || createConfig()
      : createConfig();

    const restartTime = adminOfConfig?.[0]?.masterKey?.restartTime || 15;
    cron.schedule(`*/${restartTime} * * * *`, async () => {
      try {
        const currentHistory = safeReadJSON('./data/history.json', []);
        currentHistory.forEach((user) => {
          if (!user || typeof user !== 'object') return;
          if (user.time === undefined || user.time === null || isNaN(user.time)) user.time = 0;
          const update = Utils.account.get(user.userid);
          if (update) user.time = update.time;
        });
        await empty.emptyDir(cacheFile);
        safeWriteJSON('./data/history.json', currentHistory);
      } catch (err) {
        console.error(chalk.red(`Error sa scheduled restart cleanup: ${err.message}`));
      } finally {
        process.exit(1); // watchdog will restart
      }
    });

    for (const file of fs.readdirSync(sessionFolder)) {
      const filePath = path.join(sessionFolder, file);
      try {
        const record = history.find((item) => item.userid === path.parse(file).name) || {};
        const { enableCommands, prefix, admin, blacklist } = record;
        const state = safeReadJSON(filePath, null);
        if (enableCommands && state) {
          await accountLogin(state, enableCommands, prefix, admin, blacklist);
        }
      } catch (error) {
        console.error(chalk.red(`Hindi ma-relogin ang session ${file}: ${error.message}`));
        deleteThisUser(path.parse(file).name);
      }
    }
  } catch (err) {
    console.error(chalk.red(`Fatal error sa main(): ${err.message}`));
  }
}

function createConfig() {
  const cfg = [{
    masterKey: {
      admin: [],
      devMode: false,
      database: false,
      restartTime: 15,
    },
    fcaOption: {
      forceLogin: true,
      listenEvents: true,
      logLevel: 'silent',
      updatePresence: true,
      selfListen: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      online: true,
      autoMarkDelivery: false,
      autoMarkRead: false,
    },
  }];
  const dataFolder = './data';
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
  safeWriteJSON('./data/config.json', cfg);
  return cfg;
}

async function createThread(threadID, api) {
  try {
    const database = safeReadJSON('./data/database.json', []);
    const threadInfo = await api.getThreadInfo(threadID);
    const adminIDs = threadInfo ? threadInfo.adminIDs : [];
    const data = {};
    data[threadID] = adminIDs;
    database.push(data);
    safeWriteJSON('./data/database.json', database);
    return database;
  } catch (error) {
    console.error(chalk.red(`Hindi makuha ang thread info para sa ${threadID}: ${error.message}`));
    return safeReadJSON('./data/database.json', []);
  }
}

function createDatabase() {
  const dataFolder = './data';
  const databaseFile = './data/database.json';
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
  if (!fs.existsSync(databaseFile)) fs.writeFileSync(databaseFile, JSON.stringify([]));
  return databaseFile;
}

main();
