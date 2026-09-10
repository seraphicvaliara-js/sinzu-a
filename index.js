const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_FILE = "auto.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

// ========== WATCHDOG CONFIG ==========
const MAX_RESTARTS_BEFORE_COOLDOWN = 8;
const CRASH_WINDOW_MS = 120 * 1000;        // 2 minutes window
const BASE_DELAY_MS = 2000;                // starting delay
const MAX_DELAY_MS = 90 * 1000;            // max 1.5 min backoff
const COOLDOWN_MS = 60 * 1000;             // 1 min cooldown after too many crashes

let restartCount = 0;
let lastCrashTime = Date.now();
let currentDelay = BASE_DELAY_MS;
let isRestarting = false;
let mainProcess = null;
let consecutiveCleanExits = 0;

function log(msg, type = "info") {
  const time = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  const prefix =
    type === "error" ? "❌" :
    type === "warn"  ? "⚠️" :
    type === "success" ? "✅" : "🔄";
  console.log(`[${time}] [watchdog] ${prefix} ${msg}`);
}

function start() {
  if (isRestarting) return;
  isRestarting = true;

  log(`Starting ${SCRIPT_FILE}...`);

  mainProcess = spawn("node", [SCRIPT_PATH], {
    cwd: __dirname,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  mainProcess.on("error", (err) => {
    log(`Failed to spawn process: ${err.message}`, "error");
    isRestarting = false;
    scheduleRestart("spawn_error");
  });

  mainProcess.on("close", (code, signal) => {
    isRestarting = false;
    mainProcess = null;

    // Clean exit
    if (code === 0 && !signal) {
      consecutiveCleanExits++;
      log(`Main process exited cleanly (code 0). Clean exits: ${consecutiveCleanExits}`);
      
      if (consecutiveCleanExits >= 5) {
        log("Too many clean exits in a row. Waiting longer before restart...", "warn");
        setTimeout(start, 15000);
        consecutiveCleanExits = 0;
        return;
      }
      setTimeout(start, 3000);
      return;
    }

    consecutiveCleanExits = 0;
    const reason = signal
      ? `killed by signal ${signal}`
      : `exited with code ${code}`;

    log(`Process ${reason}. Scheduling restart...`, "warn");
    scheduleRestart(reason);
  });
}

function scheduleRestart(reason = "unknown") {
  const now = Date.now();

  if (now - lastCrashTime > CRASH_WINDOW_MS) {
    restartCount = 0;
    currentDelay = BASE_DELAY_MS;
  }

  lastCrashTime = now;
  restartCount++;

  currentDelay = Math.min(Math.floor(currentDelay * 1.7), MAX_DELAY_MS);

  if (restartCount > MAX_RESTARTS_BEFORE_COOLDOWN) {
    log(
      `${restartCount} crashes detected in short time (${reason}). ` +
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

  log(`Restarting in ${(currentDelay / 1000).toFixed(1)}s (attempt #${restartCount})...`);
  setTimeout(start, currentDelay);
}

// ========== GLOBAL CATCHERS & SILENCE INJECTOR ==========
// Bino-block ang anumang "Invalid command" error logging/output sa console
process.on("uncaughtException", (err) => {
  if (err.message && err.message.includes("Invalid command")) return;
  log(`Watchdog uncaughtException: ${err.message}`, "error");
});

process.on("unhandledRejection", (reason) => {
  if (reason && reason.toString().includes("Invalid command")) return;
  log(`Watchdog unhandledRejection: ${reason}`, "error");
});

// Graceful shutdown
process.on("SIGINT", () => {
  log("Received SIGINT. Shutting down gracefully...", "warn");
  if (mainProcess) {
    mainProcess.kill("SIGTERM");
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("Received SIGTERM. Shutting down gracefully...", "warn");
  if (mainProcess) {
    mainProcess.kill("SIGTERM");
  }
  process.exit(0);
});

// Start Bot Engine Watchdog
log("Watchdog started. Protecting auto.js with absolute command silence...", "success");
start();
