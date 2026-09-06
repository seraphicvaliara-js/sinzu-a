const fs = require('fs');
const path = require('path');
const login = require('ws3-fca');
const express = require('express');
const app = express();
const chalk = require('chalk');
const bodyParser = require('body-parser');
const script = path.join(__dirname, 'script');
const cron = require('node-cron');
const empty = require('fs-extra');

// --- ANTI-CRASH GLOBAL HANDLERS (WAR-READY) ---
process.on('uncaughtException', (err) => {
  console.error(chalk.red('[CRASHLESS] Uncaught Exception:'), err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('[CRASHLESS] Unhandled Rejection at:'), promise, 'reason:', reason);
});

const config = fs.existsSync('./data') && fs.existsSync('./data/config.json') ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8')) : createConfig();
const dev = fs.existsSync('./dev.json') ? JSON.parse(fs.readFileSync('./dev.json', 'utf8')) : [];

const Utils = new Object({
  commands: new Map(),
  handleEvent: new Map(),
  account: new Map(),
  cooldowns: new Map(),
});

// Initialization ng mga kinakailangang folders at files
if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
if (!fs.existsSync('./data/history.json')) fs.writeFileSync('./data/history.json', '[]', 'utf-8');
if (!fs.existsSync('./data/session')) fs.mkdirSync('./data/session', { recursive: true });
if (!fs.existsSync('./data/database.json')) fs.writeFileSync('./data/database.json', '[]', 'utf-8');

// Safe loading ng commands
if (fs.existsSync(script)) {
  fs.readdirSync(script).forEach((file) => {
    const scripts = path.join(script, file);
    try {
      const stats = fs.statSync(scripts);
      if (stats.isDirectory()) {
        fs.readdirSync(scripts).forEach((subFile) => {
          loadCommand(path.join(scripts, subFile), subFile);
        });
      } else {
        loadCommand(scripts, file);
      }
    } catch (error) {
      console.error(chalk.red(`Error reading script path ${file}: ${error.message}`));
    }
  });
}

function loadCommand(filePath, fileName) {
  try {
    const fileModule = require(filePath);
    const { config, run, handleEvent } = fileModule;
    if (config) {
      const {
        name = [], role = '0', version = '1.0.0', hasPrefix = true, aliases = [], description = '', usage = '', credits = '', cooldown = '5', dev = false
      } = Object.fromEntries(Object.entries(config).map(([key, value]) => [key.toLowerCase(), value]));
      
      const aliasList = Array.isArray(name) ? [...name] : [name];
      if (Array.isArray(aliases)) aliasList.push(...aliases);

      if (run) {
        Utils.commands.set(aliasList, {
          name,
          role,
          run,
          aliases: aliasList,
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
        Utils.handleEvent.set(aliasList, {
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
    console.error(chalk.red(`Error loading command from file ${fileName}: ${error.message}`));
  }
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(express.json());

const routes = [
  { path: '/', file: 'index.html' },
  { path: '/step_by_step_guide', file: 'guide.html' },
  { path: '/online_user', file: 'online.html' },
];

routes.forEach(route => {
  app.get(route.path, (req, res) => {
    try {
      res.sendFile(path.join(__dirname, 'public', route.file));
    } catch (e) {
      res.status(404).send("Page not found");
    }
  });
});

app.get('/info', (req, res) => {
  try {
    const data = Array.from(Utils.account.values()).map(account => ({
      name: account.name,
      profileUrl: account.profileUrl,
      thumbSrc: account.thumbSrc,
      time: account.time
    }));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

app.get('/commands', (req, res) => {
  try {
    const command = new Set();
    const commands = [...Utils.commands.values()].map(({ name }) => (command.add(name), name));
    const handleEvent = [...Utils.handleEvent.values()].map(({ name }) => command.has(name) ? null : (command.add(name), name)).filter(Boolean);
    const role = [...Utils.commands.values()].map(({ role }) => role);
    const aliases = [...Utils.commands.values()].map(({ aliases }) => aliases);
    res.json({ commands, handleEvent, role, aliases });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

app.post('/login', async (req, res) => {
  const { state, commands, prefix, admin } = req.body;
  try {
    if (!state) {
      return res.status(400).json({ error: true, message: 'Missing app state data' });
    }
    const cUser = state.find(item => item.key === 'c_user');
    if (cUser) {
      const existingUser = Utils.account.get(cUser.value);
      if (existingUser) {
        return res.status(400).json({
          error: false,
          message: "Active user session detected; already logged in",
          user: existingUser
        });
      } else {
        try {
          await accountLogin(state, commands, prefix, [admin]);
          return res.status(200).json({
            success: true,
            message: 'Authentication process completed successfully; login achieved.'
          });
        } catch (error) {
          return res.status(400).json({ error: true, message: error.message });
        }
      }
    } else {
      return res.status(400).json({ error: true, message: "Invalid appstate data; missing c_user." });
    }
  } catch (error) {
    return res.status(400).json({ error: true, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(chalk.green(`Server is running at http://localhost:${PORT}`));
});

async function accountLogin(state, enableCommands = [], prefix, admin = []) {
  enableCommands = [
    { commands: Array.from(Utils.commands.values()).map(c => c.name) },
    { handleEvent: Array.from(Utils.handleEvent.values()).map(c => c.name) }
  ];

  return new Promise((resolve) => {
    login({ appState: state }, async (error, api) => {
      if (error) {
        console.error(chalk.red('Login Error:'), error);
        return resolve(false);
      }

      let userid;
      try {
        userid = await api.getCurrentUserID();
      } catch (e) {
        console.error(chalk.red('Failed to get current user ID:'), e.message);
        return resolve(false);
      }

      addThisUser(userid, enableCommands, state, prefix, admin);

      try {
        const userInfo = await api.getUserInfo(userid);
        if (!userInfo || !userInfo[userid]) throw new Error('Account suspended or locked.');
        
        const { name, profileUrl, thumbSrc } = userInfo[userid];
        let historyData = [];
        try {
          historyData = JSON.parse(fs.readFileSync('./data/history.json', 'utf-8'));
        } catch (e) {}
        
        let time = (historyData.find(user => user.userid === userid) || {}).time || 0;
        
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
            Utils.account.set(userid, { ...account, time: account.time + 1 });
          } catch (error) {
            clearInterval(intervalId);
          }
        }, 1000);
      } catch (error) {
        console.error(chalk.red('User Info Fetch Error:'), error.message);
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

      startListening(api, userid, enableCommands, prefix, admin);
      resolve(true);
    });
  });
}

function startListening(api, userid, enableCommands, prefix, admin) {
  try {
    api.listenMqtt(async (error, event) => {
      if (error) {
        console.error(chalk.yellow(`[MQTT Warning] Connection issue on user ${userid}:`), error);
        return;
      }
      if (!event) return;

      try {
        let database = [];
        try {
          database = fs.existsSync('./data/database.json') ? JSON.parse(fs.readFileSync('./data/database.json', 'utf8')) : [];
        } catch (e) { database = []; }

        let adminIDS = database;
        if (event.threadID && !database.some(item => Object.keys(item)[0] === event.threadID)) {
          adminIDS = await createThread(event.threadID, api);
        }

        let historyData = [];
        try {
          historyData = JSON.parse(fs.readFileSync('./data/history.json', 'utf-8'));
        } catch (e) {}

        let blacklist = (historyData.find(b => b.userid === userid) || {}).blacklist || [];
        
        let bodyText = event.body || '';
        let matchedAlias = aliases(bodyText.trim().toLowerCase().split(/ +/).shift());
        let hasPrefix = (bodyText && matchedAlias?.hasPrefix === false) ? '' : prefix;
        
        let [command, ...args] = (bodyText.trim().toLowerCase().startsWith((hasPrefix || '').toLowerCase()) ? 
          bodyText.trim().substring(hasPrefix.length).trim().split(/\s+/) : []);

        if (hasPrefix && matchedAlias?.hasPrefix === false) {
          api.sendMessage(`Invalid usage: This command doesn't need a prefix.`, event.threadID, event.messageID);
          return;
        }

        if (bodyText && matchedAlias?.name) {
          if (matchedAlias.dev && !dev.includes(event.senderID)) {
            return api.sendMessage("You don't have access to this command; developer only.", event.threadID, event.messageID);
          }

          const role = matchedAlias.role ?? 0;
          const isAdmin = config?.[0]?.masterKey?.admin?.includes(event.senderID) || admin.includes(event.senderID);
          
          let threadAdminList = [];
          if (Array.isArray(adminIDS)) {
            const foundThread = adminIDS.find(item => Object.keys(item)[0] === event.threadID);
            if (foundThread) threadAdminList = foundThread[event.threadID] || [];
          }
          const isThreadAdmin = isAdmin || threadAdminList.some(adminUser => adminUser.id === event.senderID);

          if ((role == 1 && !isAdmin) || (role == 2 && !isThreadAdmin) || (role == 3 && !config?.[0]?.masterKey?.admin?.includes(event.senderID))) {
            api.sendMessage(`You don't have permission to use this command.`, event.threadID, event.messageID);
            return;
          }
        }

        if (bodyText && bodyText.toLowerCase().startsWith(prefix.toLowerCase()) && matchedAlias?.name) {
          if (blacklist.includes(event.senderID)) {
            api.sendMessage("You are banned from using this bot.", event.threadID, event.messageID);
            return;
          }
        }

        if (bodyText && matchedAlias?.name) {
          const now = Date.now();
          const name = matchedAlias.name;
          const cooldownKey = `${event.senderID}_${name}_${userid}`;
          const sender = Utils.cooldowns.get(cooldownKey);
          const delay = matchedAlias.cooldown ?? 0;

          if (!sender || (now - sender.timestamp) >= delay * 1000) {
            Utils.cooldowns.set(cooldownKey, { timestamp: now, command: name });
          } else {
            const active = Math.ceil((sender.timestamp + delay * 1000 - now) / 1000);
            api.sendMessage(`Please wait ${active} seconds before using "${name}" again.`, event.threadID, event.messageID);
            return;
          }
        }

        if (bodyText && !command && bodyText.toLowerCase().startsWith(prefix.toLowerCase())) {
          api.sendMessage(`Invalid command. Use ${prefix}help for available commands.`, event.threadID, event.messageID);
          return;
        }

        if (bodyText && command && prefix && bodyText.toLowerCase().startsWith(prefix.toLowerCase()) && !matchedAlias?.name) {
          api.sendMessage(`Invalid command '${command}'. Use ${prefix}help for available commands.`, event.threadID, event.messageID);
          return;
        }

        // Handle Event Execution
        for (const { handleEvent } of Utils.handleEvent.values()) {
          if (handleEvent) {
            try {
              handleEvent({ api, event, enableCommands, admin, prefix, blacklist });
            } catch (err) {
              console.error(chalk.red('Error in handleEvent execution:'), err.message);
            }
          }
        }

        // Command Execution switch
        switch (event.type) {
          case 'message':
          case 'message_reply':
          case 'message_unsend':
          case 'message_reaction':
            if (matchedAlias && matchedAlias.run) {
              try {
                await matchedAlias.run({
                  api,
                  event,
                  args,
                  enableCommands,
                  admin,
                  prefix,
                  blacklist,
                  Utils,
                });
              } catch (runErr) {
                console.error(chalk.red(`Error executing command ${matchedAlias.name}:`), runErr.message);
                api.sendMessage("An error occurred while executing this command.", event.threadID, event.messageID);
              }
            }
            break;
        }
      } catch (innerErr) {
        console.error(chalk.red('Error inside MQTT event handler loop:'), innerErr.message);
      }
    });
  } catch (outerErr) {
    console.error(chalk.red('Fatal listenMqtt error:'), outerErr.message);
  }
}

async function deleteThisUser(userid) {
  try {
    const configFile = './data/history.json';
    if (!fs.existsSync(configFile)) return;
    let configData = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    const sessionFile = path.join('./data/session', `${userid}.json`);
    const index = configData.findIndex(item => item.userid === userid);
    if (index !== -1) configData.splice(index, 1);
    fs.writeFileSync(configFile, JSON.stringify(configData, null, 2));
    if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
  } catch (error) {
    console.error('Error deleting user data:', error.message);
  }
}

async function addThisUser(userid, enableCommands, state, prefix, admin, blacklist) {
  try {
    const configFile = './data/history.json';
    const sessionFolder = './data/session';
    const sessionFile = path.join(sessionFolder, `${userid}.json`);
    
    if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });
    if (fs.existsSync(sessionFile)) return;

    let configData = [];
    if (fs.existsSync(configFile)) {
      configData = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    }
    
    configData.push({
      userid,
      prefix: prefix || "",
      admin: admin || [],
      blacklist: blacklist || [],
      enableCommands,
      time: 0,
    });
    
    fs.writeFileSync(configFile, JSON.stringify(configData, null, 2));
    fs.writeFileSync(sessionFile, JSON.stringify(state));
  } catch (error) {
    console.error('Error adding user:', error.message);
  }
}

function aliases(command) {
  if (!command) return null;
  for (const [keys, value] of Utils.commands.entries()) {
    if (keys.includes(command.toLowerCase())) {
      return value;
    }
  }
  return null;
}

async function main() {
  const cacheFile = './script/cache';
  if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile, { recursive: true });
  const configFile = './data/history.json';
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '[]', 'utf-8');
  
  const sessionFolder = path.join('./data/session');
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });
  
  const adminOfConfig = fs.existsSync('./data') && fs.existsSync('./data/config.json') ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8')) : createConfig();
  
  const restartTime = adminOfConfig[0]?.masterKey?.restartTime || 15;
  cron.schedule(`*/${restartTime} * * * *`, async () => {
    try {
      let history = [];
      if (fs.existsSync('./data/history.json')) {
        history = JSON.parse(fs.readFileSync('./data/history.json', 'utf-8'));
      }
      history.forEach(user => {
        if (!user || typeof user !== 'object') return;
        const update = Utils.account.get(user.userid);
        if (update) user.time = update.time;
      });
      await empty.emptyDir(cacheFile);
      fs.writeFileSync('./data/history.json', JSON.stringify(history, null, 2));
    } catch (e) {
      console.error('Cron job restart error:', e.message);
    }
  });

  try {
    if (fs.existsSync(sessionFolder)) {
      for (const file of fs.readdirSync(sessionFolder)) {
        const filePath = path.join(sessionFolder, file);
        try {
          let historyData = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
          const userIdFromFile = path.parse(file).name;
          const userConfig = historyData.find(item => item.userid === userIdFromFile) || {};
          const { enableCommands, prefix, admin, blacklist } = userConfig;
          const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (state) await accountLogin(state, enableCommands, prefix, admin, blacklist);
        } catch (error) {
          deleteThisUser(path.parse(file).name);
        }
      }
    }
  } catch (error) {
    console.error('Main session loading error:', error.message);
  }
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
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      online: true,
      autoMarkDelivery: false,
      autoMarkRead: false
    }
  }];
  const dataFolder = './data';
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
  fs.writeFileSync('./data/config.json', JSON.stringify(config, null, 2));
  return config;
}

async function createThread(threadID, api) {
  try {
    let database = [];
    if (fs.existsSync('./data/database.json')) {
      database = JSON.parse(fs.readFileSync('./data/database.json', 'utf8'));
    }
    let threadInfo = await api.getThreadInfo(threadID);
    let adminIDs = threadInfo ? threadInfo.adminIDs : [];
    const data = {};
    data[threadID] = adminIDs;
    database.push(data);
    fs.writeFileSync('./data/database.json', JSON.stringify(database, null, 2), 'utf-8');
    return database;
  } catch (error) {
    return [];
  }
}

main();
