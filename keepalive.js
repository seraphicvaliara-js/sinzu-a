// keepalive.js — robust self-ping mechanism
// Para hindi matulog ang bot sa free-tier hosting (Render, Railway, etc.)
// Gamitin kasama ng UptimeRobot para double protection.

const https = require('https');
const http = require('http');

const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || 'https://YOUR-APP-NAME.onrender.com';
const PING_INTERVAL_MS = 3 * 60 * 1000;      // 3 minutes (mas safe sa 15-min sleep)
const MAX_CONSECUTIVE_FAILS = 8;             // after this, longer backoff
const REQUEST_TIMEOUT_MS = 12000;            // 12s timeout per ping

let consecutiveFails = 0;
let currentInterval = PING_INTERVAL_MS;
let intervalId = null;
let isRunning = false;

function log(msg, type = 'info') {
  const time = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '🔄';
  console.log(`[${time}] [keepalive] ${prefix} ${msg}`);
}

function selfPing() {
  if (!SELF_URL || SELF_URL.includes('YOUR-APP-NAME')) {
    log('SELF_URL is not set properly. Skipping ping.', 'warn');
    return;
  }

  const url = `\( {SELF_URL.replace(/\/ \)/, '')}/ping`;
  const client = url.startsWith('https') ? https : http;

  const req = client.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
    // Drain response para hindi mag-hang
    res.on('data', () => {});
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        if (consecutiveFails > 0) {
          log(`Recovered after ${consecutiveFails} fails. Status: ${res.statusCode}`);
        } else {
          log(`Self-ping OK — status ${res.statusCode}`);
        }
        consecutiveFails = 0;
        currentInterval = PING_INTERVAL_MS;
      } else {
        handleFail(`Unexpected status ${res.statusCode}`);
      }
    });
  });

  req.on('timeout', () => {
    req.destroy();
    handleFail('Request timed out');
  });

  req.on('error', (err) => {
    handleFail(err.message);
  });
}

function handleFail(reason) {
  consecutiveFails++;
  log(`Ping failed (${reason}). Consecutive fails: ${consecutiveFails}`, 'error');

  // Exponential-ish backoff when failing a lot
  if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
    currentInterval = Math.min(currentInterval * 1.5, 10 * 60 * 1000); // max 10 min
    log(`Too many fails. Slowing down to every ${(currentInterval / 60000).toFixed(1)} min`, 'warn');
  }
}

function startKeepAlive() {
  if (isRunning) {
    log('Keepalive is already running.', 'warn');
    return;
  }
  isRunning = true;

  log(`Started self-ping every ${PING_INTERVAL_MS / 60000} min → ${SELF_URL}/ping`);

  // First ping after short delay (para hindi magsabay sa startup)
  setTimeout(selfPing, 15000);

  intervalId = setInterval(() => {
    selfPing();
  }, currentInterval);

  // Dynamic interval adjuster (re-check every minute if we need to change timing)
  setInterval(() => {
    if (intervalId && consecutiveFails === 0 && currentInterval !== PING_INTERVAL_MS) {
      clearInterval(intervalId);
      currentInterval = PING_INTERVAL_MS;
      intervalId = setInterval(selfPing, currentInterval);
      log('Back to normal 3-minute interval');
    }
  }, 60 * 1000);
}

function stopKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  log('Keepalive stopped.');
}

// Catch unexpected errors so keepalive itself never crashes the bot
process.on('uncaughtException', (err) => {
  // Don't let keepalive errors kill the process
  if (err && err.message && err.message.includes('keepalive')) {
    log(`Caught internal error: ${err.message}`, 'error');
  }
});

module.exports = { startKeepAlive, stopKeepAlive, selfPing };
