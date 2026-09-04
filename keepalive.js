// keepalive.js — self-ping mechanism para hindi matulog ang bot sa mga free-tier
// hosting (Render, atbp.) na natutulog after ilang minuto ng walang traffic.
// Idagdag ito bilang dagdag na proteksyon KASABAY ng UptimeRobot (hindi kapalit) —
// dalawang layer, mas malaki ang chance na hindi matulog ang bot.

const https = require('https');
const http = require('http');

// Palitan ito ng totoong public URL ng Render app mo (o env var kung meron ka na)
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || 'https://YOUR-APP-NAME.onrender.com';
const PING_INTERVAL_MS = 4 * 60 * 1000; // kada 4 minuto — mas maiksi sa 15-min sleep timer ng Render

function selfPing() {
  const url = `${SELF_URL}/ping`;
  const client = url.startsWith('https') ? https : http;

  client.get(url, (res) => {
    console.log(`[keepalive] Self-ping OK — status ${res.statusCode} sa ${new Date().toLocaleTimeString()}`);
  }).on('error', (err) => {
    // Hindi kailangan ipatay ang bot kapag nabigo ang ping — susubukan lang ulit
    // sa susunod na interval. Log lang ang error.
    console.error('[keepalive] Nabigo ang self-ping (susubukan ulit sa susunod):', err.message);
  });
}

function startKeepAlive() {
  console.log(`[keepalive] Sinimulan ang self-ping kada ${PING_INTERVAL_MS / 60000} minuto papunta sa ${SELF_URL}/ping`);
  setInterval(selfPing, PING_INTERVAL_MS);
}

module.exports = { startKeepAlive };
