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
// Keepalive (self-ping)
// ---------------------------------------------------------------------------
const https = require('https');
const http = require('http');

const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || 'https://YOUR-APP-NAME.onrender.com';
const PING_INTERVAL_MS = 3 * 60 * 1000;
const MAX_CONSECUTIVE_FAILS = 8;
const REQUEST_TIMEOUT_MS = 12000;

let consecutiveFails = 0;
let currentInterval = PING_INTERVAL_MS;
let keepaliveIntervalId = null;
let keepaliveRunning = false;

function keepaliveLog(msg, type = 'info') {
  const time = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '🔄';
  console.log(`[${time}] [keepalive] ${prefix} ${msg}`);
}

function selfPing() {
  if (!SELF_URL || SELF_URL.includes('YOUR-APP-NAME')) {
    keepaliveLog('SELF_URL is not set properly. Skipping ping.', 'warn');
    return;
  }

  const url = `\( {SELF_URL.replace(/\/ \)/, '')}/ping`;
  const client = url.startsWith('https') ? https : http;

  const req = client.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
    res.on('data', () => {});
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        if (consecutiveFails > 0) {
          keepaliveLog(`Recovered after ${consecutiveFails} fails. Status: ${res.statusCode}`);
        } else {
          keepaliveLog(`Self-ping OK — status ${res.statusCode}`);
        }
        consecutiveFails = 0;
        currentInterval = PING_INTERVAL_MS;
      } else {
        handlePingFail(`Unexpected status ${res.statusCode}`);
      }
    });
  });

  req.on('timeout', () => {
    req.destroy();
    handlePingFail('Request timed out');
  });

  req.on('error', (err) => {
    handlePingFail(err.message);
  });
}

function handlePingFail(reason) {
  consecutiveFails++;
  keepaliveLog(`Ping failed (${reason}). Consecutive fails: ${consecutiveFails}`, 'error');
  if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
    currentInterval = Math.min(currentInterval * 1.5, 10 * 60 * 1000);
    keepaliveLog(`Too many fails. Slowing down to every ${(currentInterval / 60000).toFixed(1)} min`, 'warn');
  }
}

function startKeepAlive() {
  if (keepaliveRunning) return;
  keepaliveRunning = true;

  keepaliveLog(`Started self-ping every ${PING_INTERVAL_MS / 60000} min → ${SELF_URL}/ping`);
  setTimeout(selfPing, 15000);

  keepaliveIntervalId = setInterval(selfPing, currentInterval);

  setInterval(() => {
    if (keepaliveIntervalId && consecutiveFails === 0 && currentInterval !== PING_INTERVAL_MS) {
      clearInterval(keepaliveIntervalId);
      currentInterval = PING_INTERVAL_MS;
      keepaliveIntervalId = setInterval(selfPing, currentInterval);
      keepaliveLog('Back to normal 3-minute interval');
    }
  }, 60 * 1000);
}

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
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(chalk.red(`[safeWriteJSON] Hindi maisulat ang ${filePath}: ${err.message}`));
    return false;
  }
}

// ---------------------------------------------------------------------------
// Safe Send + rate limit
// ---------------------------------------------------------------------------
const sendQueue = new Map();

function safeSend(api, message, threadID, messageID) {
  if (!api || !threadID) return;

  const now = Date.now();
  const last = sendQueue.get(threadID) || 0;
  const minDelay = 900;

  if (now - last < minDelay) {
    setTimeout(() => safeSend(api, message, threadID, messageID), minDelay - (now - last) + 80);
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

// Ensure folders
if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
if (!fs.existsSync('./data/history.json')) fs.writeFileSync('./data/history.json', '[]', 'utf-8');
if (!fs.existsSync('./data/session')) fs.mkdirSync('./data/session', { recursive: true });
if (!fs.existsSync('./data/database.json')) fs.writeFileSync('./data/database.json', '[]', 'utf-8');

// ---------------------------------------------------------------------------
// Command loader
// ---------------------------------------------------------------------------
function registerModule(scriptPath, file) {
  try {
    delete require.cache[require.resolve(scriptPath)];
    const mod = require(scriptPath);
    const cfg = mod.config;
    const run = mod.run;
    const handleEvent = mod.handleEvent;

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
    if (Array.isArray(name)) finalAliases.push(...name);
    else finalAliases.push(name);

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
        fs.readdirSync(scripts).forEach((inner) => {
          if (inner.endsWith('.js')) registerModule(path.join(scripts, inner), inner);
        });
      } catch (err) {
        console.error(chalk.red(`Hindi ma-basa ang folder ${scripts}: ${err.message}`));
      }
    } else if (file.endsWith('.js')) {
      registerModule(scripts, file);
    }
  });
  console.log(chalk.green(`[loader] Loaded ${Utils.commands.size} commands, ${Utils.handleEvent.size} events`));
} catch (err) {
  console.error(chalk.red(`Hindi ma-load ang script folder: ${err.message}`));
}

// ---------------------------------------------------------------------------
// Express
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

// Keepalive ping endpoint
app.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
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
    const role = [...Utils.commands.values()].map(({ role }) => role);
    const aliases = [...Utils.commands.values()].map(({ aliases }) => aliases);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(chalk.green(`Server is running at http://localhost:${PORT}`));
});

// ---------------------------------------------------------------------------
// Global error handlers
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Promise Rejection:'), reason);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
});

// ---------------------------------------------------------------------------
// Account Login
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

      startListening(api, userid, prefix, admin, enableCommands);
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Robust MQTT Listener
// ---------------------------------------------------------------------------
function startListening(api, userid, prefix, admin, enableCommands) {
  let mqttRetryCount = 0;
  const MAX_MQTT_RETRIES = 12;

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

            const delay = Math.min(5000 + mqttRetryCount * 2000, 45000);
            console.log(chalk.yellow(`Reconnecting MQTT for ${userid} in ${Math.round(delay / 1000)}s (attempt ${mqttRetryCount})...`));
            setTimeout(listen, delay);
            return;
          }

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

          // Cooldown
          if (body && aliases(command)?.name) {
            const now = Date.now();
            const name = aliases(command)?.name;
            const key = `\( {senderID}_ \){name}_${userid}`;
            const sender = Utils.cooldowns.get(key);
            const delay = Number(aliases(command)?.cooldown) || 0;

            if (!sender || (now - sender.timestamp) >= delay * 1000) {
              Utils.cooldowns.set(key, { timestamp: now, command: name });
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
                await handleEvent({ api, event, enableCommands, admin, prefix, blacklist });
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
      setTimeout(listen, 8000);
    }
  };

  listen();
}

// ---------------------------------------------------------------------------
// User helpers
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
    fs.writeFileSync(sessionFile, JSON.stringify
