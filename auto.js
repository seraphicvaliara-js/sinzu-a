const fs = require('fs');
const path = require('path');
const login = require('ws3-fca');
const express = require('express');
const app = express();
const chalk = require('chalk');
const bodyParser = require('body-parser');
const script = path.join(__dirname, 'script');
const cron = require('node-cron');

// ==== Config / bootstrap ====
const config = fs.existsSync('./data') && fs.existsSync('./data/config.json')
  ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8'))
  : createConfig();

const dev = fs.existsSync('./dev.json') ? JSON.parse(fs.readFileSync('./dev.json', 'utf8')) : [];

const Utils = new Object({
  commands: new Map(),
  handleEvent: new Map(),
  account: new Map(),
  cooldowns: new Map(),
});

// I-track ang reconnect attempts kada userid, para may exponential backoff
const reconnectAttempts = new Map();
const MAX_RECONNECT_DELAY_MS = 60000; // 1 minute max delay sa pagitan ng retries

// Itala kung kailan sinimulan ang server, para may basehan ang uptime counter
const SERVER_START_TIME = Date.now();

// ==== URL monitor/pinger — "self-uptime" para sa ibang links ====
const MONITOR_FILE = path.join(__dirname, 'data', 'monitored_urls.json');
const PING_INTERVAL_MS = 5 * 60 * 1000; // tuwing 5 minuto

function loadMonitoredUrls() {
  try {
    if (fs.existsSync(MONITOR_FILE)) {
      return JSON.parse(fs.readFileSync(MONITOR_FILE, 'utf8'));
    }
  } catch (err) {
    console.log('Could not load monitored_urls.json:', err.message || err);
  }
  return [];
}

function saveMonitoredUrls(list) {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(MONITOR_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.log('Could not save monitored_urls.json:', err.message || err);
  }
}

let monitoredUrls = loadMonitoredUrls();

async function pingUrl(entry) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(entry.url, { signal: controller.signal });
    clearTimeout(timeout);
    entry.lastPing = Date.now();
    entry.lastStatus = res.status;
    entry.online = res.ok;
  } catch (err) {
    entry.lastPing = Date.now();
    entry.lastStatus = null;
    entry.online = false;
  }
}

async function pingAllMonitoredUrls() {
  for (const entry of monitoredUrls) {
    await pingUrl(entry);
  }
  saveMonitoredUrls(monitoredUrls);
}

pingAllMonitoredUrls();
setInterval(pingAllMonitoredUrls, PING_INTERVAL_MS);

// ==== Command/handleEvent loader ====
if (fs.existsSync(script)) {
  fs.readdirSync(script).forEach((file) => {
    const scripts = path.join(script, file);
    let stats;
    try {
      stats = fs.statSync(scripts);
    } catch (err) {
      console.error(chalk.red(`Skipping ${file}: ${err.message}`));
      return;
    }

    const loadFile = (fullPath, fileName) => {
      try {
        const { config: cmdConfig, run, handleEvent } = require(fullPath);
        if (!cmdConfig) return;
        const {
          name = [], role = '0', version = '1.0.0', hasPrefix = true, aliases = [],
          description = '', usage = '', credits = '', cooldown = '5', dev: devOnly = false
        } = Object.fromEntries(Object.entries(cmdConfig).map(([key, value]) => [key.toLowerCase(), value]));
        aliases.push(name);

        if (run) {
          Utils.commands.set(aliases, {
            name, role, run, aliases, description, usage, version,
            hasPrefix: cmdConfig.hasPrefix, credits, cooldown, dev: devOnly
          });
        }
        if (handleEvent) {
          Utils.handleEvent.set(aliases, {
            name, handleEvent, role, description, usage, version,
            hasPrefix: cmdConfig.hasPrefix, credits, cooldown, dev: devOnly
          });
        }
      } catch (error) {
        console.error(chalk.red(`Error installing command from file ${fileName}: ${error.message}`));
      }
    };

    if (stats.isDirectory()) {
      fs.readdirSync(scripts).forEach((subFile) => {
        loadFile(path.join(scripts, subFile), subFile);
      });
    } else {
      loadFile(scripts, file);
    }
  });
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(express.json());

const routes = [
  { path: '/', file: 'index.html' },
  { path: '/step_by_step_guide', file: 'guide.html' },
  { path: '/online_user', file: 'online.html' },
  { path: '/uptime_page', file: 'uptime.html' },
];
routes.forEach(route => {
  app.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', route.file));
  });
});

// ==== Health / monitor endpoints ====

app.get('/ping', (req, res) => {
  res.status(200).send('Alive po!');
});

app.get('/info', (req, res) => {
  const data = Array.from(Utils.account.values()).map(account => ({
    name: account.name,
    profileUrl: account.profileUrl,
    thumbSrc: account.thumbSrc,
    time: account.time
  }));
  res.json(JSON.parse(JSON.stringify(data, null, 2)));
});

app.get('/commands', (req, res) => {
  const command = new Set();
  const commands = [...Utils.commands.values()].map(({ name }) => (command.add(name), name));
  const handleEvent = [...Utils.handleEvent.values()].map(({ name }) => command.has(name) ? null : (command.add(name), name)).filter(Boolean);
  const role = [...Utils.commands.values()].map(({ role }) => (command.add(role), role));
  const aliases = [...Utils.commands.values()].map(({ aliases }) => (command.add(aliases), aliases));
  res.json(JSON.parse(JSON.stringify({ commands, handleEvent, role, aliases }, null, 2)));
});

app.post('/monitor', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: true, message: 'Maglagay ng valid na URL (dapat nagsisimula sa http:// o https://).' });
  }

  const alreadyExists = monitoredUrls.some(entry => entry.url === url);
  if (alreadyExists) {
    return res.status(400).json({ error: true, message: "Naka-monitor na ang URL na 'to." });
  }

  const newEntry = { url, addedAt: Date.now(), lastPing: null, lastStatus: null, online: null };
  monitoredUrls.push(newEntry);
  saveMonitoredUrls(monitoredUrls);
  pingUrl(newEntry).then(() => saveMonitoredUrls(monitoredUrls));

  res.status(200).json({ success: true, message: 'Naidagdag na sa monitor list.', entry: newEntry });
});

app.get('/monitor', (req, res) => {
  res.json({ urls: monitoredUrls, pingIntervalMs: PING_INTERVAL_MS });
});

app.post('/monitor/remove', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: true, message: 'Missing url' });
  }
  const before = monitoredUrls.length;
  monitoredUrls = monitoredUrls.filter(entry => entry.url !== url);
  if (monitoredUrls.length === before) {
    return res.status(400).json({ error: true, message: 'Walang nahanap na ganoong URL sa monitor list.' });
  }
  saveMonitoredUrls(monitoredUrls);
  res.status(200).json({ success: true, message: 'Naalis na sa monitor list.' });
});

app.get('/uptime', (req, res) => {
  const uptimeMs = Date.now() - SERVER_START_TIME;
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const onlineAccounts = Array.from(Utils.account.values()).map(account => ({
    name: account.name,
    profileUrl: account.profileUrl,
    thumbSrc: account.thumbSrc,
  }));

  res.json({
    startTime: SERVER_START_TIME,
    uptimeMs,
    uptimeFormatted: `${hours} hours ${minutes} minutes ${seconds} seconds`,
    onlineCount: onlineAccounts.length,
    onlineAccounts,
  });
});

// ==== Login ====
//
// BINAGO (2026): tinanggal na ang "Active user session detected; already
// logged in" na naka-block dati. Ngayon, sa TUWING magpapadala ka ng
// appstate sa /login, agad itong lo-login — kahit may existing session na
// para sa parehong account. Kung may dati nang session ang account na 'yon,
// awtomatiko itong ia-alis muna (kasama yung dating listener/session file)
// bago ipasok yung bagong appstate. Walang na-block na request, walang
// kailangang i-force manually — diretso lang talaga itong nagre-refresh.
app.post('/login', async (req, res) => {
  const { state, commands, prefix, admin } = req.body;

  try {
    if (!state || !Array.isArray(state)) {
      throw new Error('Missing or invalid app state data');
    }
    const cUser = state.find(item => item.key === 'c_user');
    if (!cUser) {
      return res.status(400).json({
        error: true,
        message: "There's an issue with the appstate data; it's invalid."
      });
    }

    // Kung may existing session/listener na para dito, i-clean muna bago
    // mag-login gamit ang bagong appstate — para laging "fresh" ang login
    // sa bawat pagpasok ng appstate, kahit paulit-ulit na parehong account.
    await cleanupExistingSession(cUser.value);

    const normalizedAdmin = Array.isArray(admin) ? admin : (admin ? [admin] : []);

    try {
      await accountLogin(state, commands, prefix, normalizedAdmin);
      res.status(200).json({
        success: true,
        message: 'Authentication process completed successfully; login achieved.'
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: true, message: error.message });
    }
  } catch (error) {
    return res.status(400).json({
      error: true,
      message: error.message || "There's an issue with the appstate data; it's invalid."
    });
  }
});

app.post('/logout', async (req, res) => {
  const { userid } = req.body;
  if (!userid) {
    return res.status(400).json({ error: true, message: 'Missing userid' });
  }
  if (!Utils.account.has(userid)) {
    return res.status(400).json({ error: true, message: "Walang active session ang userid na 'to." });
  }
  await cleanupExistingSession(userid);
  res.status(200).json({ success: true, message: 'Na-logout na. Pwede nang mag-login ulit.' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// ==== Global error safety net ====
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception (hindi na papatayin ang process):', error);
});

// Graceful shutdown — para sa modern hosting (Render/Railway) na nagpapadala
// ng SIGTERM bago i-restart/i-redeploy ang service. Hinahayaan tapusin ng
// server ang kasalukuyang requests bago talagang mamatay.
function gracefulShutdown(signal) {
  console.log(`Natanggap ang ${signal}, magsasara nang maayos...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // Kung hindi nagsara sa loob ng 10s, sapilitan nang lumabas
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==== Core login logic ====

async function cleanupExistingSession(userid) {
  const account = Utils.account.get(userid);
  if (account?.stopListening) {
    try {
      account.stopListening();
    } catch (err) {
      // Hindi kritikal kung nabigo — ipagpapatuloy pa rin ang cleanup
    }
  }
  if (account?.keepAliveId) clearInterval(account.keepAliveId);
  if (account?.intervalId) clearInterval(account.intervalId);

  Utils.account.delete(userid);
  reconnectAttempts.delete(userid);
  await deleteThisUser(userid);
}

async function accountLogin(state, enableCommands = [], prefix, admin = []) {
  return new Promise((resolve, reject) => {
    login({ appState: state }, async (error, api) => {
      if (error) {
        reject(error);
        return;
      }

      const userid = await api.getCurrentUserID();
      addThisUser(userid, enableCommands, state, prefix, admin);

      try {
        const userInfo = await api.getUserInfo(userid);
        if (!userInfo || !userInfo[userid]?.name || !userInfo[userid]?.profileUrl || !userInfo[userid]?.thumbSrc) {
          throw new Error('Unable to locate the account; it appears to be in a suspended or locked state.');
        }
        const { name, profileUrl, thumbSrc } = userInfo[userid];

        const history = fs.existsSync('./data/history.json')
          ? JSON.parse(fs.readFileSync('./data/history.json', 'utf-8'))
          : [];
        let time = (history.find(user => user.userid === userid) || {}).time || 0;

        const intervalId = setInterval(() => {
          const account = Utils.account.get(userid);
          if (!account) {
            clearInterval(intervalId);
            return;
          }
          Utils.account.set(userid, { ...account, time: account.time + 1 });
        }, 1000);

        // Light keep-alive — maliit na read-only request paminsan-minsan
        // (tuwing 10 minuto) para hindi mag-idle-timeout ang session,
        // hindi para mag-spam ng activity.
        const keepAliveId = setInterval(async () => {
          try {
            if (!Utils.account.has(userid)) {
              clearInterval(keepAliveId);
              return;
            }
            await api.getCurrentUserID();
          } catch (err) {
            // Ang aktwal na reconnect logic ay nasa listenMqtt error handler.
          }
        }, 10 * 60 * 1000);

        Utils.account.set(userid, {
          name, profileUrl, thumbSrc, time,
          intervalId, keepAliveId,
          stopListening: null, // ise-set pagkatapos ma-start ang listener
        });
      } catch (error) {
        reject(error);
        return;
      }

      api.setOptions({
        listenEvents: config[0].fcaOption.listenEvents,
        logLevel: config[0].fcaOption.logLevel,
        updatePresence: config[0].fcaOption.updatePresence,
        selfListen: config[0].fcaOption.selfListen,
        forceLogin: config[0].fcaOption.forceLogin,
        online: config[0].fcaOption.online,
        autoMarkDelivery: config[0].fcaOption.autoMarkDelivery,
        autoMarkRead: config[0].fcaOption.autoMarkRead,
      });

      // Banayad na throttle sa sendMessage — pinaghihiwa-hiwalay ng random
      // 300–900ms delay ang sunud-sunod na sends, para mas natural ang
      // pacing sa halip na sabay-sabay na burst.
      const originalSendMessage = api.sendMessage.bind(api);
      let sendQueue = Promise.resolve();
      api.sendMessage = (...sendArgs) => {
        sendQueue = sendQueue.then(() => new Promise((resolve) => {
          const delay = 300 + Math.floor(Math.random() * 600);
          setTimeout(() => {
            try {
              originalSendMessage(...sendArgs);
            } catch (err) {
              console.error('Error sa throttled sendMessage:', err);
            }
            resolve();
          }, delay);
        }));
        return sendQueue;
      };

      try {
        const listenEmitter = api.listenMqtt(async (error, event) => {
          if (error) {
            if (error === 'Connection closed.') {
              console.error(`Error during API listen: ${error}`, userid);
              attemptReconnect(userid, enableCommands, prefix, admin);
              return;
            }

            // Kung checkpoint/restricted/locked ang error, IHINTO ang bot
            // dito — huwag mag-retry loop, para hindi lalong magpataas ng
            // suspicion sa isang naka-checkpoint na account.
            const errMsg = (typeof error === 'string' ? error : error?.error || JSON.stringify(error) || '').toLowerCase();
            const isAccountRestricted = /checkpoint|suspicious|locked|disabled|restricted|verify your identity/.test(errMsg);
            if (isAccountRestricted) {
              console.error(
                `[ACCOUNT FLAGGED] Ang account ${userid} ay mukhang may security checkpoint/restriction sa Facebook. ` +
                `Hindi na susubukan ulit i-reconnect nang otomatiko — mangangailangan ito ng manual na pag-login/pag-verify ` +
                `sa browser bago ito magamit ulit. Error detail: ${errMsg}`
              );
              await cleanupExistingSession(userid);
              return;
            }

            console.log(error);
            return;
          }

          let database = fs.existsSync('./data/database.json')
            ? JSON.parse(fs.readFileSync('./data/database.json', 'utf8'))
            : await createDatabase();
          let data = Array.isArray(database) ? database.find(item => Object.keys(item)[0] === event?.threadID) : {};
          let adminIDS = data ? database : await createThread(event.threadID, api);
          let blacklist = (JSON.parse(fs.readFileSync('./data/history.json', 'utf-8')).find(b => b.userid === userid) || {}).blacklist || [];
          let hasPrefix = (event.body && aliases((event.body || '')?.trim().toLowerCase().split(/ +/).shift())?.hasPrefix == false) ? '' : prefix;
          let [command, ...args] = ((event.body || '').trim().toLowerCase().startsWith((hasPrefix || '').toLowerCase())
            ? (event.body || '').trim().substring((hasPrefix || '').length).trim().split(/\s+/).map(arg => arg.trim())
            : []);

          if (hasPrefix && aliases(command)?.hasPrefix === false) {
            api.sendMessage(`Invalid usage this command doesn't need a prefix`, event.threadID, event.messageID);
            return;
          }

          if (event.body && aliases(command)?.name) {
            const isDevOnly = aliases(command)?.dev;
            if (isDevOnly && !dev.includes(event.senderID)) {
              return api.sendMessage("You dont have access to this command, you need to be a developer.", event.threadID, event.messageID);
            }

            const role = aliases(command)?.role ?? 0;
            const isAdmin = config?.[0]?.masterKey?.admin?.includes(event.senderID) || admin.includes(event.senderID);
            const isThreadAdmin = isAdmin || ((Array.isArray(adminIDS) ? adminIDS.find(a => Object.keys(a)[0] === event.threadID) : {})?.[event.threadID] || []).some(a => a.id === event.senderID);

            if ((role == 1 && !isAdmin) || (role == 2 && !isThreadAdmin) || (role == 3 && !config?.[0]?.masterKey?.admin?.includes(event.senderID))) {
              api.sendMessage(`You don't have permission to use this command.`, event.threadID, event.messageID);
              return;
            }
          }

          if (event.body && prefix && event.body?.toLowerCase().startsWith(prefix.toLowerCase()) && aliases(command)?.name) {
            if (blacklist.includes(event.senderID)) {
              api.sendMessage("We're sorry, but you've been banned from using bot. If you believe this is a mistake or would like to appeal, please contact one of the bot admins for further assistance.", event.threadID, event.messageID);
              return;
            }
          }

          if (event.body && aliases(command)?.name) {
            const now = Date.now();
            const name = aliases(command)?.name;
            const sender = Utils.cooldowns.get(`${event.senderID}_${name}_${userid}`);
            const delay = aliases(command)?.cooldown ?? 0;
            if (!sender || (now - sender.timestamp) >= delay * 1000) {
              Utils.cooldowns.set(`${event.senderID}_${name}_${userid}`, { timestamp: now, command: name });
            } else {
              const active = Math.ceil((sender.timestamp + delay * 1000 - now) / 1000);
              api.sendMessage(`Please wait ${active} seconds before using the "${name}" command again.`, event.threadID, event.messageID);
              return;
            }
          }

          if (event.body && !command && prefix && event.body?.toLowerCase().startsWith(prefix.toLowerCase())) {
            api.sendMessage(`Invalid command please use ${prefix}help to see the list of available commands.`, event.threadID, event.messageID);
            return;
          }

          if (event.body && command && prefix && event.body?.toLowerCase().startsWith(prefix.toLowerCase()) && !aliases(command)?.name) {
            api.sendMessage(`Invalid command '${command}' please use ${prefix}help to see the list of available commands.`, event.threadID, event.messageID);
            return;
          }

          for (const { handleEvent, name } of Utils.handleEvent.values()) {
            if (handleEvent && name && (
              (enableCommands[1]?.handleEvent || []).includes(name) || (enableCommands[0]?.commands || []).includes(name)
            )) {
              handleEvent({ api, event, enableCommands, admin, prefix, blacklist });
            }
          }

          switch (event.type) {
            case 'message':
            case 'message_reply':
            case 'message_unsend':
            case 'message_reaction':
              if (enableCommands[0]?.commands?.includes(aliases(command?.toLowerCase())?.name)) {
                await ((aliases(command?.toLowerCase())?.run || (() => {}))({
                  api, event, args, enableCommands, admin, prefix, blacklist, Utils,
                }));
              }
              break;
          }
        });

        // Naitala ang paraan para itigil ang listener kapag kinailangan
        // (hal. sa /logout o sa pag-force-login ulit gamit ang bagong appstate).
        const account = Utils.account.get(userid);
        if (account) {
          Utils.account.set(userid, {
            ...account,
            stopListening: () => {
              try {
                if (listenEmitter && typeof listenEmitter.stopListening === 'function') {
                  listenEmitter.stopListening();
                }
              } catch (err) {
                // ok lang kung walang stopListening method ang fork mo
              }
            },
          });
        }

        reconnectAttempts.delete(userid);
      } catch (error) {
        console.error('Error during API listen, outside of listen', userid, error.message || error);
        attemptReconnect(userid, enableCommands, prefix, admin);
        return;
      }

      resolve();
    });
  });
}

// Auto-reconnect na may exponential backoff (1s, 2s, 4s, ... max 60s).
// Pagkatapos ng 10 sunod-sunod na kabiguan, aalisin bilang invalid.
function attemptReconnect(userid, enableCommands, prefix, admin) {
  const attempts = (reconnectAttempts.get(userid) || 0) + 1;
  reconnectAttempts.set(userid, attempts);

  if (attempts > 10) {
    console.error(`Sumuko na sa pag-reconnect para kay ${userid} pagkatapos ng ${attempts} tries. Aalisin na ang session.`);
    cleanupExistingSession(userid);
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, attempts - 1), MAX_RECONNECT_DELAY_MS);
  console.log(`Susubukan ulit ikonekta si ${userid} sa loob ng ${delay / 1000}s (attempt ${attempts})`);

  setTimeout(async () => {
    try {
      const sessionFile = path.join('./data/session', `${userid}.json`);
      if (!fs.existsSync(sessionFile)) {
        console.error(`Walang nahanap na session file para kay ${userid}, hindi na maituloy ang reconnect.`);
        reconnectAttempts.delete(userid);
        return;
      }
      const state = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      await accountLogin(state, enableCommands, prefix, admin);
    } catch (error) {
      console.error(`Nabigo ang reconnect attempt para kay ${userid}:`, error.message || error);
      attemptReconnect(userid, enableCommands, prefix, admin);
    }
  }, delay);
}

async function deleteThisUser(userid) {
  const configFile = './data/history.json';
  if (!fs.existsSync(configFile)) return;
  let historyData = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  const sessionFile = path.join('./data/session', `${userid}.json`);
  const index = historyData.findIndex(item => item.userid === userid);
  if (index !== -1) historyData.splice(index, 1);
  fs.writeFileSync(configFile, JSON.stringify(historyData, null, 2));
  try {
    fs.unlinkSync(sessionFile);
  } catch (error) {
    // ok lang kung wala nang file
  }
}

async function addThisUser(userid, enableCommands, state, prefix, admin, blacklist) {
  const configFile = './data/history.json';
  const sessionFolder = './data/session';
  const sessionFile = path.join(sessionFolder, `${userid}.json`);

  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '[]', 'utf-8');

  const historyData = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  const existingIndex = historyData.findIndex(item => item.userid === userid);
  const entry = {
    userid,
    prefix: prefix || "",
    admin: admin || [],
    blacklist: blacklist || [],
    enableCommands,
    time: existingIndex !== -1 ? historyData[existingIndex].time || 0 : 0,
  };

  if (existingIndex !== -1) {
    historyData[existingIndex] = entry;
  } else {
    historyData.push(entry);
  }

  fs.writeFileSync(configFile, JSON.stringify(historyData, null, 2));
  fs.writeFileSync(sessionFile, JSON.stringify(state));
}

function aliases(command) {
  const found = Array.from(Utils.commands.entries()).find(([commands]) => commands.includes(command?.toLowerCase()));
  return found ? found[1] : null;
}

async function main() {
  const cacheFile = './script/cache';
  if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile, { recursive: true });

  const configFile = './data/history.json';
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '[]', 'utf-8');
  const historyConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

  const sessionFolder = path.join('./data/session');
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });

  const adminOfConfig = fs.existsSync('./data') && fs.existsSync('./data/config.json')
    ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8'))
    : createConfig();

  // Cache-clearing/history-save cron — hindi na pinapatay ang process,
  // panatilihing buhay at naka-connect ang bot habang nililinis ang cache.
  cron.schedule(`*/${adminOfConfig[0].masterKey.restartTime} * * * *`, async () => {
    try {
      const history = JSON.parse(fs.readFileSync('./data/history.json', 'utf-8'));
      history.forEach(user => {
        if (!user || typeof user !== 'object') return;
        const update = Utils.account.get(user.userid);
        if (update) user.time = update.time;
      });

      // I-clear ang cache folder nang manu-mano (walang fs-extra dependency).
      for (const file of fs.readdirSync(cacheFile)) {
        const filePath = path.join(cacheFile, file);
        fs.rmSync(filePath, { recursive: true, force: true });
      }

      fs.writeFileSync('./data/history.json', JSON.stringify(history, null, 2));
      console.log('Cache cleared at history na-save — walang na-restart na process.');
    } catch (error) {
      console.error('Error sa scheduled cache cleanup (hindi papatayin ang process):', error);
    }
  });

  try {
    for (const file of fs.readdirSync(sessionFolder)) {
      const filePath = path.join(sessionFolder, file);
      try {
        const { enableCommands, prefix, admin } = historyConfig.find(item => item.userid === path.parse(file).name) || {};
        const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (enableCommands) await accountLogin(state, enableCommands, prefix, admin);
      } catch (error) {
        console.error(`Hindi na-restore ang session ng ${path.parse(file).name}, tatanggalin:`, error.message || error);
        await deleteThisUser(path.parse(file).name);
      }
    }
  } catch (error) {
    console.error('Error sa pag-restore ng mga session:', error.message || error);
  }
}

function createConfig() {
  const configData = [{
    masterKey: {
      admin: [],
      devMode: false,
      database: false,
      restartTime: 15,
    },
    fcaOption: {
      forceLogin: true,
      listenEvents: true,
      logLevel: "silent",
      updatePresence: true,
      selfListen: true,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      online: true,
      autoMarkDelivery: false,
      autoMarkRead: false
    }
  }];
  const dataFolder = './data';
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
  fs.writeFileSync('./data/config.json', JSON.stringify(configData, null, 2));
  return configData;
}

async function createThread(threadID, api) {
  try {
    const dbFile = './data/database.json';
    const database = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile, 'utf8')) : [];
    const threadInfo = await api.getThreadInfo(threadID);
    const adminIDs = threadInfo ? threadInfo.adminIDs : [];
    const data = {};
    data[threadID] = adminIDs;
    database.push(data);
    fs.writeFileSync(dbFile, JSON.stringify(database, null, 2), 'utf-8');
    return database;
  } catch (error) {
    console.log(error.message || error);
    return [];
  }
}

async function createDatabase() {
  const dataDir = './data';
  const dbFile = './data/database.json';
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify([]));
  return [];
}

main();
