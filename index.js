const { spawn } = require("child_process");
const path = require('path');

const SCRIPT_FILE = "auto.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

// BINAGO: dinagdagan ng crash-loop protection — kung sunod-sunod na
// nagkakarash agad-agad (hal. may syntax error), hindi na tuluy-tuloy na
// mag-re-restart nang walang tigil (na puwedeng maubos ang CPU/memory ng
// hosting mo). May exponential backoff at max restart count bago mag-alert.
let restartCount = 0;
let lastCrashTime = Date.now();
const MAX_RESTARTS_BEFORE_COOLDOWN = 5;
const CRASH_WINDOW_MS = 60000; // 1 minuto — kung 5 crashes sa loob ng 1 minuto, considered crash loop
const COOLDOWN_MS = 30000; // 30 segundong hintay bago subukan ulit pagkatapos ng crash loop

function start() {
    console.log(`[watchdog] Sinisimulan ang ${SCRIPT_FILE}...`);

    const main = spawn("node", [SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    // BAGONG: hinuhuli na ngayon ang spawn errors (hal. hindi mahanap ang
    // "node" binary) — dati wala nito, kaya kung mag-error dito, tahimik na
    // mamamatay ang watcher mismo nang walang paalam.
    main.on("error", (err) => {
        console.error("[watchdog] Hindi ma-spawn ang child process:", err.message);
        scheduleRestart();
    });

    // BINAGO: dating `exitCode === 1` lang ang nirerestart. Ang problema:
    // kapag pinatay ng OS ang process sa pamamagitan ng signal (hal. SIGKILL
    // dahil sa out-of-memory), NULL ang exitCode at nasa `signal` parameter
    // makikita ang dahilan — hindi ito nasasakop ng dating code, kaya
    // tahimik na namamatay ang bot sa mga ganitong pagkakataon.
    // Ngayon, i-re-restart ang bot sa ANUMANG exit maliban sa sadyang
    // "clean stop" (exit code 0 na walang signal — ibig sabihin sinadya
    // talagang itigil, hal. sa pamamagitan ng graceful shutdown command).
    main.on("close", (exitCode, signal) => {
        if (exitCode === 0 && !signal) {
            console.log("[watchdog] Main process exited cleanly (code 0). Hindi na ire-restart.");
            return;
        }

        if (signal) {
            console.log(`[watchdog] Main process natapos dahil sa signal: ${signal}. Nire-restart...`);
        } else {
            console.log(`[watchdog] Main process exited with code ${exitCode}. Nire-restart...`);
        }

        scheduleRestart();
    });
}

function scheduleRestart() {
    const now = Date.now();

    // Kung malayo na ang huling crash (lumagpas na sa crash window), i-reset
    // ang counter — hindi na ito considered part ng parehong crash loop.
    if (now - lastCrashTime > CRASH_WINDOW_MS) {
        restartCount = 0;
    }
    lastCrashTime = now;
    restartCount++;

    if (restartCount > MAX_RESTARTS_BEFORE_COOLDOWN) {
        console.error(
            `[watchdog] ${restartCount} crashes sa loob ng maikling panahon — malamang may` +
            ` paulit-ulit na error (hal. syntax error) sa ${SCRIPT_FILE}. Maghihintay ng ` +
            `${COOLDOWN_MS / 1000}s bago subukan ulit para hindi mapuno ng crash loop ang logs/resources.`
        );
        setTimeout(() => {
            restartCount = 0;
            start();
        }, COOLDOWN_MS);
        return;
    }

    // Maikling delay bago mag-restart — iniiwasan ang instant crash-restart
    // loop na puwedeng magpabigat sa CPU kung sobrang bilis ang paulit-ulit
    // na pagkakarash.
    setTimeout(start, 2000);
}

start();

