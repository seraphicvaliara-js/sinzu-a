const express = require('express');
const fs = require('fs');
const path = require('path');
const login = require('fca-project-orion'); // Palitan ng gamit mong FCA package kung iba (hal. fca-unofficial)

const app = express();
const PORT = process.env.PORT || 3000;
const APPSTATE_PATH = path.join(__dirname, 'appstate.json');

app.use(express.json());
app.use(express.static('public')); // Para sa frontend dashboard files

let activeApi = null;
let activeBotInfo = null;
let startTime = Date.now();

// Utility function para i-format ang Uptime
function getUptime() {
  const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours} hours ${minutes} minutes ${seconds} seconds`;
}

// Function para simulan ang bot session
function startBotSession(appStateData) {
  // Stop ang lumang listener/session kung may umiiral man
  if (activeApi && typeof activeApi.logout === 'function') {
    try { activeApi.logout(); } catch (e) { console.log("Logging out previous session..."); }
  }

  login({ appState: appStateData }, (err, api) => {
    if (err) {
      console.error("❌ Failed to log in with appstate:", err);
      activeBotInfo = null;
      return;
    }

    activeApi = api;
    startTime = Date.now(); // Reset uptime para sa bagong session

    // Save updated appstate back to root file
    fs.writeFileSync(APPSTATE_PATH, JSON.stringify(api.getAppState(), null, 2));
    console.log("✅ Bot Session successfully started and appstate saved to root!");

    // Kunin ang profile info ng kasalukuyang bot
    const currentUserID = api.getCurrentUserID();
    api.getUserInfo(currentUserID, (err, ret) => {
      if (!err && ret[currentUserID]) {
        activeBotInfo = {
          name: ret[currentUserID].name,
          profileUrl: `https://www.facebook.com/profile.php?id=${currentUserID}`,
          thumbSrc: ret[currentUserID].thumbSrc || ''
        };
      }
    });

    // Main Bot Listener Loop
    api.listenMqtt((err, message) => {
      if (err) {
        console.error("MQTT Listener Error:", err);
        return;
      }
      
      // Dito ilalagay ang command handler logic mo
      if (message.type === "message" && message.body) {
        if (message.body.toLowerCase() === "ping") {
          api.sendMessage("Pong! Bot is active.", message.threadID);
        }
      }
    });
  });
}

// API Endpoint: Pag-register o Input ng bagong account mula sa Dashboard
app.post('/api/register', (req, res) => {
  const { appstate } = req.body;

  if (!appstate) {
    return res.status(400).json({ success: false, message: "Missing appstate input." });
  }

  try {
    let parsedState;
    if (typeof appstate === 'string') {
      parsedState = JSON.parse(appstate);
    } else {
      parsedState = appstate;
    }

    // 1. Burahin/I-overwrite ang lumang session file sa root
    if (fs.existsSync(APPSTATE_PATH)) {
      fs.unlinkSync(APPSTATE_PATH);
    }

    // 2. Isulat ang bagong session sa root folder
    fs.writeFileSync(APPSTATE_PATH, JSON.stringify(parsedState, null, 2));

    // 3. I-start agad ang bagong session
    startBotSession(parsedState);

    return res.json({ 
      success: true, 
      message: "Old session removed! New session is now active and saved." 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Invalid Appstate format: " + error.message 
    });
  }
});

// API Endpoint: Kunin ang kasalukuyang Active Session Status para sa Dashboard UI
app.get('/api/status', (req, res) => {
  if (!activeApi || !activeBotInfo) {
    return res.json({ active: false, message: "No active bot session." });
  }

  return res.json({
    active: true,
    name: activeBotInfo.name,
    profileUrl: activeBotInfo.profileUrl,
    avatar: activeBotInfo.thumbSrc,
    uptime: getUptime()
  });
});

// Auto-load sa server launch / restart
if (fs.existsSync(APPSTATE_PATH)) {
  console.log("🔍 Saved appstate found in root. Auto-connecting bot...");
  try {
    const rawData = fs.readFileSync(APPSTATE_PATH, 'utf8');
    const savedState = JSON.parse(rawData);
    startBotSession(savedState);
  } catch (err) {
    console.error("Corrupted appstate.json file, please re-register on dashboard.");
  }
} else {
  console.log("⚠️ No saved appstate.json found in root. Waiting for dashboard input...");
}

app.listen(PORT, () => {
  console.log(`🚀 Dashboard Server running on http://localhost:${PORT}`);
});
