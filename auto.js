const fs = require('fs');
const path = require('path');
const login = require('ws3-fca');
const express = require('express');
const app = express();
const chalk = require('chalk');
const bodyParser = require('body-parser');
const script = path.join(__dirname, 'script');
const cron = require('node-cron');
const config = fs.existsSync('./data') && fs.existsSync('./data/config.json') ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8')) : createConfig();
const dev = JSON.parse(fs.readFileSync('./dev.json'));
const Utils = new Object({
  commands: new Map(),
  handleEvent: new Map(),
  account: new Map(),
  cooldowns: new Map(),
});

// ==== BAGONG: I-track ang reconnect attempts kada userid, para may exponential backoff ====
const reconnectAttempts = new Map();
const MAX_RECONNECT_DELAY_MS = 60000; // 1 minute max delay sa pagitan ng retries

fs.readdirSync(script).forEach((file) => {
  const scripts = path.join(script, file);
  const stats = fs.statSync(scripts);
  if (stats.isDirectory()) {
    fs.readdirSync(scripts).forEach((file) => {
      try {
        const {
          config,
          run,
          handleEvent
        } = require(path.join(scripts, file));
        if (config) {
          const {
            name = [], role = '0', version = '1.0.0', hasPrefix = true, aliases = [], description = '', usage = '', credits = '', cooldown = '5', dev = false
          } = Object.fromEntries(Object.entries(config).map(([key, value]) => [key.toLowerCase(), value]));
          aliases.push(name);
          if (run) {
            Utils.commands.set(aliases, {
              name,
              role,
              run,
              aliases,
              description,
              usage,
              version,
              hasPrefix: config.hasPrefix,
              credits,
              cooldown,
              dev
            });
          }
          if (handleEvent) {
            Utils.handleEvent.set(aliases, {
              name,
              handleEvent,
              role,
              description,
              usage,
              version,
              hasPrefix: config.hasPrefix,
              credits,
              cooldown,
              dev
            });
          }
        }
      } catch (error) {
        console.error(chalk.red(`Error installing command from file ${file}: ${error.message}`));
      }
    });
  } else {
    try {
      const {
        config,
        run,
        handleEvent
      } = require(scripts);
      if (config) {
        const {
          name = [], role = '0', version = '1.0.0', hasPrefix = true, aliases = [], description = '', usage = '', credits = '', cooldown = '5', dev = false
        } = Object.fromEntries(Object.entries(config).map(([key, value]) => [key.toLowerCase(), value]));
        aliases.push(name);
        if (run) {
          Utils.commands.set(aliases, {
            name,
            role,
            run,
            aliases,
            description,
            usage,
            version,
            hasPrefix: config.hasPrefix,
            credits,
            cooldown,
            dev
          });
        }
        if (handleEvent) {
          Utils.handleEvent.set(aliases, {
            name,
            handleEvent,
            role,
            description,
            usage,
            version,
            hasPrefix: config.hasPrefix,
            credits,
            cooldown,
            dev
          });
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error installing command from file ${file}: ${error.message}`));
    }
  }
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(express.json());
const routes = [{
  path: '/',
  file: 'index.html'
}, {
  path: '/step_by_step_guide',
  file: 'guide.html'
}, {
  path: '/online_user',
  file: 'online.html'
}, ];
routes.forEach(route => {
  app.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', route.file));
  });
});

// ==== BAGONG: /ping endpoint para sa UptimeRobot o kahit anong keep-alive monitor ====
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
  const commands = [...Utils.commands.values()].map(({
    name
  }) => (command.add(name), name));
  const handleEvent = [...Utils.handleEvent.values()].map(({
    name
  }) => command.has(name) ? null : (command.add(name), name)).filter(Boolean);
  const role = [...Utils.commands.values()].map(({
    role
  }) => (command.add(role), role));
  const aliases = [...Utils.commands.values()].map(({
    aliases
  }) => (command.add(aliases), aliases));
  res.json(JSON.parse(JSON.stringify({
    commands,
    handleEvent,
    role,
    aliases
  }, null, 2)));
});

// BINAGO: dinagdagan ng "force" option — kung may existing session na at
// force:true ang ipinasa, i-clear muna ang lumang session bago mag-login
// ulit, sa halip na basta i-block palagi. Ito ang nag-aayos sa "Active
// user session detected" na palaging lumalabas kahit gusto mo lang
// i-reactivate/i-refresh ang parehong account.
app.post('/login', async (req, res) => {
  const {
    state,
    commands,
    prefix,
    admin,
    force
  } = req.body;
  try {
    if (!state) {
      throw new Error('Missing app state data');
    }
    const cUser = state.find(item => item.key === 'c_user');
    if (!cUser) {
      return res.status(400).json({
        error: true,
        message: "There's an issue with the appstate data; it's invalid."
      });
    }

    const existingUser = Utils.account.get(cUser.value);

    if (existingUser && !force) {
      console.log(`User ${cUser.value} is already logged in`);
      return res.status(400).json({
        error: false,
        message: "Active user session detected; already logged in. Mag-'/logout' muna kung gusto mong i-reset, o magpadala ng 'force: true' sa request na 'to para i-refresh.",
        user: existingUser
      });
    }

    // Kung may existing session at pinilit (force) i-refresh, alisin muna
    // ang luma bago mag-login ulit gamit ang bagong state.
    if (existingUser && force) {
      Utils.account.delete(cUser.value);
      await deleteThisUser(cUser.value);
    }

    try {
      // BINAGO: hindi na basta i-wrap sa [admin] — kung array na, gamitin na direkta,
      // kung hindi, saka lang i-wrap. Iniiwasan ang nested array bug na sumisira sa
      // .includes() check sa ibaba pagdating ng admin permission checks.
      const normalizedAdmin = Array.isArray(admin) ? admin : (admin ? [admin] : []);
      await accountLogin(state, commands, prefix, normalizedAdmin);
      res.status(200).json({
        success: true,
        message: 'Authentication process completed successfully; login achieved.'
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({
        error: true,
        message: error.message
      });
    }
  } catch (error) {
    return res.status(400).json({
      error: true,
      message: "There's an issue with the appstate data; it's invalid."
    });
  }
});

// ==== BAGONG: /logout endpoint — para maalis ang stuck/existing session ====
// Gamitin ito bago mag-login ulit kung gusto mong palitan o i-reset ang
// session ng isang account nang hindi kailangang mag-force sa /login.
app.post('/logout', async (req, res) => {
  const { userid } = req.body;
  if (!userid) {
    return res.status(400).json({
      error: true,
      message: "Missing userid"
    });
  }
  if (!Utils.account.has(userid)) {
    return res.status(400).json({
      error: true,
      message: "Walang active session ang userid na 'to."
    });
  }
  Utils.account.delete(userid);
  await deleteThisUser(userid);
  res.status(200).json({
    success: true,
    message: "Na-logout na. Pwede nang mag-login ulit."
  });
});

// BINAGO: tinama ang port mismatch — dating naka-listen sa 3000 pero ang log message
// ay nagsasabing 5000. Gumamit din ng process.env.PORT para compatible sa mga host
// (Render, atbp.) na nagbibigay ng sariling PORT env variable.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// BINAGO: dinagdagan ng uncaughtException handler — dati unhandledRejection lang
// ang na-cacatch, pero ang mga uncaught synchronous errors ay puwede pa ring
// magpabagsak sa buong Node process. Ngayon, naka-log na lang ito, hindi na
// kina-crash ang server.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception (hindi na papatayin ang process):', error);
});

async function accountLogin(state, enableCommands = [], prefix, admin = []) {
  return new Promise((resolve, reject) => {
    login({
      appState: state
    }, async (error, api) => {
      if (error) {
        reject(error);
        return;
      }
      const userid = await api.getCurrentUserID();
      addThisUser(userid, enableCommands, state, prefix, admin);
      try {
        const userInfo = await api.getUserInfo(userid);
        if (!userInfo || !userInfo[userid]?.name || !userInfo[userid]?.profileUrl || !userInfo[userid]?.thumbSrc) throw new Error('Unable to locate the account; it appears to be in a suspended or locked state.');
        const {
          name,
          profileUrl,
          thumbSrc
        } = userInfo[userid];
        let time = (JSON.parse(fs.readFileSync('./data/history.json', 'utf-8')).find(user => user.userid === userid) || {}).time || 0;
        Utils.account.set(userid, {
          name,
          profileUrl,
          thumbSrc,
          time: time
        });
        const intervalId = setInterval(() => {
          try {
            const account = Utils.account.get(userid);
            if (!account) throw new Error('Account not found');
            Utils.account.set(userid, {
              ...account,
              time: account.time + 1
            });
          } catch (error) {
            clearInterval(intervalId);
            return;
          }
        }, 1000);
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
      try {
        var listenEmitter = api.listenMqtt(async (error, event) => {
          if (error) {
            if (error === 'Connection closed.') {
              console.error(`Error during API listen: ${error}`, userid);
              // BINAGO: sa halip na tahimik lang mag-log at hayaang patay na ang
              // listener, susubukan na ngayon mag-reconnect gamit ang naka-save
              // na session, may exponential backoff para hindi mag-spam ng
              // login attempts kung talagang invalid na ang session.
              attemptReconnect(userid, enableCommands, prefix, admin);
              return;
            }
            console.log(error);
            return;
          }
          let database = fs.existsSync('./data/database.json') ? JSON.parse(fs.readFileSync('./data/database.json', 'utf8')) : createDatabase();
          let data = Array.isArray(database) ? database.find(item => Object.keys(item)[0] === event?.threadID) : {};
          let adminIDS = data ? database : createThread(event.threadID, api);
          let blacklist = (JSON.parse(fs.readFileSync('./data/history.json', 'utf-8')).find(blacklist => blacklist.userid === userid) || {}).blacklist || [];
          let hasPrefix = (event.body && aliases((event.body || '')?.trim().toLowerCase().split(/ +/).shift())?.hasPrefix == false) ? '' : prefix;
          let [command, ...args] = ((event.body || '').trim().toLowerCase().startsWith(hasPrefix?.toLowerCase()) ? (event.body || '').trim().substring(hasPrefix?.length).trim().split(/\s+/).map(arg => arg.trim()) : []);
          if (hasPrefix && aliases(command)?.hasPrefix === false) {
            api.sendMessage(`Invalid usage this command doesn't need a prefix`, event.threadID, event.messageID);
            return;
          }
          if (event.body && aliases(command)?.name) {
            const isDevOnly = aliases(command)?.dev;
            if (isDevOnly) {
              if (!dev.includes(event.senderID)) {
                return api.sendMessage("You dont have access to this command, you need to be a developer.", event.threadID, event.messageID)
              }
            }
            const role = aliases(command)?.role ?? 0;
            const isAdmin = config?.[0]?.masterKey?.admin?.includes(event.senderID) || admin.includes(event.senderID);
            const isThreadAdmin = isAdmin || ((Array.isArray(adminIDS) ? adminIDS.find(admin => Object.keys(admin)[0] === event.threadID) : {})?.[event.threadID] || []).some(admin => admin.id === event.senderID);
            if ((role == 1 && !isAdmin) || (role == 2 && !isThreadAdmin) || (role == 3 && !config?.[0]?.masterKey?.admin?.includes(event.senderID))) {
              api.sendMessage(`You don't have permission to use this command.`, event.threadID, event.messageID);
              return;
            }
          }
          if (event.body && event.body?.toLowerCase().startsWith(prefix.toLowerCase()) && aliases(command)?.name) {
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
              Utils.cooldowns.set(`${event.senderID}_${name}_${userid}`, {
                timestamp: now,
                command: name
              });
            } else {
              const active = Math.ceil((sender.timestamp + delay * 1000 - now) / 1000);
              api.sendMessage(`Please wait ${active} seconds before using the "${name}" command again.`, event.threadID, event.messageID);
              return;
            }
          }
          if (event.body && !command && event.body?.toLowerCase().startsWith(prefix.toLowerCase())) {
            api.sendMessage(`Invalid command please use ${prefix}help to see the list of available commands.`, event.threadID, event.messageID);
            return;
          }
          if (event.body && command && prefix && event.body?.toLowerCase().startsWith(prefix.toLowerCase()) && !aliases(command)?.name) {
            api.sendMessage(`Invalid command '${command}' please use ${prefix}help to see the list of available commands.`, event.threadID, event.messageID);
            return;
          }
          for (const {
              handleEvent,
              name
            }
            of Utils.handleEvent.values()) {
            if (handleEvent && name && (
                (enableCommands[1].handleEvent || []).includes(name) || (enableCommands[0].commands || []).includes(name))) {
              handleEvent({
                api,
                event,
                enableCommands,
                admin,
                prefix,
                blacklist
              });
            }
          }
          switch (event.type) {
            case 'message':
            case 'message_reply':
            case 'message_unsend':
            case 'message_reaction':
              if (enableCommands[0].commands.includes(aliases(command?.toLowerCase())?.name)) {
                await ((aliases(command?.toLowerCase())?.run || (() => {}))({
                  api,
                  event,
                  args,
                  enableCommands,
                  admin,
                  prefix,
                  blacklist,
                  Utils,
                }));
              }
              break;
          }
        });
        // BINAGO: nagtagumpay na kumonekta, i-reset ang reconnect attempt counter
        reconnectAttempts.delete(userid);
      } catch (error) {
        console.error('Error during API listen, outside of listen', userid);
        // BINAGO: sa halip na agad burahin ang user session (deleteThisUser), subukan
        // muna mag-reconnect. Tanging kapag paulit-ulit na talagang nabibigo (invalid
        // na session) saka lang ito permanenteng aalisin — nasa attemptReconnect logic.
        attemptReconnect(userid, enableCommands, prefix, admin);
        return;
      }
      resolve();
    });
  });
}

// ==== BAGONG FUNCTION: auto-reconnect na may exponential backoff ====
// Sa halip na basta sumuko at burahin ang session pagka-disconnect, sinusubukan
// muna nitong mag-reconnect gamit ang parehong naka-save na appstate. Kada
// kabiguan, dumodoble ang hintay (1s, 2s, 4s, 8s...) hanggang sa max na 1 minuto,
// para hindi ito mag-spam ng login requests kung talagang patay na ang session.
// Pagkatapos ng 10 sunod-sunod na kabiguan, saka lang aalisin ang session bilang
// invalid (malamang naka-logout na o na-ban ang account sa Facebook mismo).
function attemptReconnect(userid, enableCommands, prefix, admin) {
  const attempts = (reconnectAttempts.get(userid) || 0) + 1;
  reconnectAttempts.set(userid, attempts);

  if (attempts > 10) {
    console.error(`Sumuko na sa pag-reconnect para kay ${userid} pagkatapos ng ${attempts} tries. Aalisin na ang session.`);
    Utils.account.delete(userid);
    deleteThisUser(userid);
    reconnectAttempts.delete(userid);
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
  let config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  const sessionFile = path.join('./data/session', `${userid}.json`);
  const index = config.findIndex(item => item.userid === userid);
  if (index !== -1) config.splice(index, 1);
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  try {
    fs.unlinkSync(sessionFile);
  } catch (error) {
    console.log(error);
  }
}
async function addThisUser(userid, enableCommands, state, prefix, admin, blacklist) {
  const configFile = './data/history.json';
  const sessionFolder = './data/session';
  const sessionFile = path.join(sessionFolder, `${userid}.json`);
  if (fs.existsSync(sessionFile)) return;
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  config.push({
    userid,
    prefix: prefix || "",
    admin: admin || [],
    blacklist: blacklist || [],
    enableCommands,
    time: 0,
  });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  fs.writeFileSync(sessionFile, JSON.stringify(state));
}

function aliases(command) {
  const aliases = Array.from(Utils.commands.entries()).find(([commands]) => commands.includes(command?.toLowerCase()));
  if (aliases) {
    return aliases[1];
  }
  return null;
}
async function main() {
  const empty = require('fs-extra');
  const cacheFile = './script/cache';
  if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile);
  const configFile = './data/history.json';
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '[]', 'utf-8');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  const sessionFolder = path.join('./data/session');
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);
  const adminOfConfig = fs.existsSync('./data') && fs.existsSync('./data/config.json') ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8')) : createConfig();

  // BINAGO: ito dating pumapatay sa buong process (`process.exit(1)`) kada
  // `restartTime` minutes — ito mismo ang dahilan kung bakit "namamatay" ang
  // bot kung walang process manager (PM2, atbp.) na nagre-restart agad.
  // Ngayon, ginagawa lang nito ang layunin ng cache-clearing at pag-save ng
  // history nang hindi pinapatay ang server — mananatiling buhay at naka-
  // connect ang bot habang nililinis pa rin ang cache paminsan-minsan.
  cron.schedule(`*/${adminOfConfig[0].masterKey.restartTime} * * * *`, async () => {
    try {
      const history = JSON.parse(fs.readFileSync('./data/history.json', 'utf-8'));
      history.forEach(user => {
        if (!user || typeof user !== 'object') return;
        const update = Utils.account.get(user.userid);
        if (update) user.time = update.time;
      });
      await empty.emptyDir(cacheFile);
      await fs.writeFileSync('./data/history.json', JSON.stringify(history, null, 2));
      console.log('Cache cleared at history na-save — walang na-restart na process.');
    } catch (error) {
      console.error('Error sa scheduled cache cleanup (hindi papatayin ang process):', error);
    }
  });

  try {
    for (const file of fs.readdirSync(sessionFolder)) {
      const filePath = path.join(sessionFolder, file);
      try {
        const {
          enableCommands,
          prefix,
          admin,
          blacklist
        } = config.find(item => item.userid === path.parse(file).name) || {};
        const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (enableCommands) await accountLogin(state, enableCommands, prefix, admin);
      } catch (error) {
        deleteThisUser(path.parse(file).name);
      }
    }
  } catch (error) {}
}

function createConfig() {
  const config = [{
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
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64",
      online: true,
      autoMarkDelivery: false,
      autoMarkRead: false
    }
  }];
  const dataFolder = './data';
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);
  fs.writeFileSync('./data/config.json', JSON.stringify(config, null, 2));
  return config;
}
async function createThread(threadID, api) {
  try {
    const database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
    let threadInfo = await api.getThreadInfo(threadID);
    let adminIDs = threadInfo ? threadInfo.adminIDs : [];
    const data = {};
    data[threadID] = adminIDs
    database.push(data);
    await fs.writeFileSync('./data/database.json', JSON.stringify(database, null, 2), 'utf-8');
    return database;
  } catch (error) {
    console.log(error);
  }
}
async function createDatabase() {
  const data = './data';
  const database = './data/database.json';
  if (!fs.existsSync(data)) {
    fs.mkdirSync(data, {
      recursive: true
    });
  }
  if (!fs.existsSync(database)) {
    fs.writeFileSync(database, JSON.stringify([]));
  }
  return database;
}
main()
