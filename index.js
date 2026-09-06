const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_FILE = "auto.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

// ========== CONFIG ==========
const MAX_RESTARTS_BEFORE_COOLDOWN = 6;
const CRASH_WINDOW_MS = 90 * 1000;          // 90 seconds
const BASE_DELAY_MS = 2500;                 // starting delay
const MAX_DELAY_MS = 60 * 1000;             // max 1 minute backoff
const COOLDOWN_MS = 45 * 1000;              // cooldown after too many crashes

let restartCount = 0;
let lastCrashTime = Date.now();
let currentDelay = BASE_DELAY_MS;
let isRestarting = false;

function log(msg, type = "info") {
  const time = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  const prefix = type === "error" ? "❌" : type === "warn" ? "⚠️" : "🔄";
  console.log(`[${time}] [watchdog] ${prefix} ${msg}`);
}

function start() {
  if (isRestarting) return;
  isRestarting = true;

  log(`Starting ${SCRIPT_FILE}...`);

  const main = spawn("node", [SCRIPT_PATH], {
    cwd: __dirname,
    stdio: "inherit",
    shell: false,          // mas safe
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  main.on("error", (err) => {
    log(`Failed to spawn process: ${err.message}`, "error");
    scheduleRestart("spawn_error");
  });

  main.on("close", (code, signal) => {
    isRestarting = false;

    // Clean exit (code 0 + no signal) → huwag i-restart
    if (code === 0 && !signal) {
      log("Main process exited cleanly (code 0). Not restarting.");
      return;
    }

    const reason = signal
      ? `killed by signal ${signal}`
      : `exited with code ${code}`;

    log(`Process ${reason}. Scheduling restart...`, "warn");
    scheduleRestart(reason);
  });
}

function scheduleRestart(reason = "unknown") {
  const now = Date.now();

  // Reset counter kung matagal na ang last crash
  if (now - lastCrashTime > CRASH_WINDOW_MS) {
    restartCount = 0;
    currentDelay = BASE_DELAY_MS;
  }

  lastCrashTime = now;
  restartCount++;

  // Exponential backoff
  currentDelay = Math.min(currentDelay * 1.6, MAX_DELAY_MS);

  if (restartCount > MAX_RESTARTS_BEFORE_COOLDOWN) {
    log(
      `\( {restartCount} crashes detected in short time ( \){reason}). ` +
      `Entering cooldown for ${COOLDOWN_MS / 1000}s to protect resources.`,
      "error"
    );

    setTimeout(() => {
      restartCount = 0;
      currentDelay = BASE_DELAY_MS;
      start();
    }, COOLDOWN_MS);
    return;
  }

  log(`Restarting in \( {(currentDelay / 1000).toFixed(1)}s (attempt # \){restartCount})...`);
  setTimeout(start, currentDelay);
}

// Catch errors sa watchdog mismo
process.on("uncaughtException", (err) => {
  log(`Watchdog uncaughtException: ${err.message}`, "error");
});

process.on("unhandledRejection", (reason) => {
  log(`Watchdog unhandledRejection: ${reason}`, "error");
});

// Start
start();
