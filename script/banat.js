const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sinzu",
  version: "20.1.0",
  hasPermission: 2, // Admin Only Permission
  credits: "sinzu",
  description: "Fast Response Engine (Per-Thread / Admin Only / No Emoji Reactions)",
  usePrefix: true,
  commandCategory: "Admin",
  usages: "/sinzu on | off | status | add <text> | listlines",
  cooldowns: 2
};

// Admin ID Configuration
const ADMIN_IDS = [
  "61593900495161",
  "61594251452411",
  "61593919965251",
  "61594535751028"
];

const DATA_PATH = path.join(__dirname, "sinzu_data.json");
const PREFIXES = ["/", "!", ".", "?", "-", "$", "#"];

// SENO RESPONSES LIST
const DEFAULT_SENO_LINES = [
  "nawala na si seno", "kumain na si seno", "umalis na si seno", "dumating na si seno",
  "natulog na si seno", "gumising na si seno", "naligo na si seno", "bumangon na si seno",
  "umupo na si seno", "tumayo na si seno", "lumabas na si seno", "pumasok na si seno",
  "umuwi na si seno", "naglakad na si seno", "tumakbo na si seno", "huminto na si seno",
  "nagsimula na si seno", "natapos na si seno", "naglaro na si seno", "nagpahinga na si seno",
  "nagsulat na si seno", "nagbasa na si seno", "nagsalita na si seno", "tumahimik na si seno",
  "natawa na si seno", "umiyak na si seno", "ngumiti na si seno", "nag-isip na si seno",
  "nakalimot na si seno", "naalala na si seno", "naghanap na si seno", "nakita na si seno",
  "nagtago na si seno", "nahuli na si seno", "nakawala na si seno", "nahulog na si seno",
  "umakyat na si seno", "bumaba na si seno", "tumalon na si seno", "lumangoy na si seno",
  "tumawid na si seno", "bumalik na si seno", "nagpaalam na si seno", "nakipag-usap na si seno",
  "nakinig na si seno", "sumagot na si seno", "nagtanong na si seno", "nagdesisyon na si seno",
  "nagbago na si seno", "nagpatuloy na si seno", "naghintay na si seno", "nagmadali na si seno",
  "nauna na si seno", "sumunod na si seno", "naiwan na si seno", "nakabalik na si seno",
  "nakauwi na si seno", "nakalabas na si seno", "nakapasok na si seno", "nakaupo na si seno",
  "nakahiga na si seno", "nakabangon na si seno", "nakapahinga na si seno", "nakangiti na si seno",
  "nakatawa na si seno", "nakaiyak na si seno", "nakapagsalita na si seno", "nakapagsulat na si seno",
  "nakabasa na si seno", "nakakita na si seno", "nakarinig na si seno", "nakahawak na si seno",
  "nakakuha na si seno", "nakapagbigay na si seno", "nakapagtago na si seno", "nakahanap na si seno",
  "nakaisip na si seno", "nakapili na si seno", "nakapagdesisyon na si seno", "nakapaghanda na si seno",
  "nakapagtapos na si seno", "nakapaglaro na si seno", "nakapunta na si seno", "nakasakay na si seno",
  "nakababa na si seno", "nakasampa na si seno", "nakatawid na si seno", "nakalakad na si seno",
  "nakatakbo na si seno", "nakatalon na si seno", "nakalangoy na si seno", "nakahinto na si seno",
  "nakapagsimula na si seno", "nakapagpatuloy na si seno", "nakapaghintay na si seno", "nakapagpaalam na si seno",
  "nakipagkita na si seno", "nakipaglaro na si seno", "nakipagtulungan na si seno", "nakipagkaibigan na si seno",
  "nakipagbati na si seno", "nakipag-usap na si seno", "nakipagkwentuhan na si seno", "nagbiro na si seno",
  "nagpatawa na si seno", "nagulat na si seno", "natakot na si seno", "nag-alala na si seno",
  "naging masaya na si seno", "naging malungkot na si seno", "naging tahimik na si seno", "naging abala na si seno",
  "naging handa na si seno", "naging pagod na si seno", "naging gutom na si seno", "naging busog na si seno",
  "naging antok na si seno", "naging gising na si seno", "nagutom na si seno", "nabusog na si seno",
  "nauhaw na si seno", "uminom na si seno", "naghugas na si seno", "nagsipilyo na si seno",
  "nagbihis na si seno", "nagpalit na si seno", "nagsuklay na si seno", "nag-ayos na si seno",
  "nagluto na si seno", "naghanda na si seno", "naghain na si seno", "nagtimpla na si seno",
  "nagkape na si seno", "nagbaon na si seno", "namili na si seno", "bumili na si seno",
  "nagbayad na si seno", "nag-ipon na si seno", "gumastos na si seno", "nagtrabaho na si seno",
  "nag-aral na si seno", "nagpraktis na si seno", "nagsanay na si seno", "nag-ensayo na si seno",
  "nagturo na si seno", "natuto na si seno", "nagtapos na si seno", "pumasok na si seno",
  "nag-review na si seno", "nakapasa na si seno", "bumagsak na si seno", "nag-exam na si seno",
  "nag-quiz na si seno", "nag-report na si seno", "nag-present na si seno", "nagpasa na si seno",
  "nagdrawing na si seno", "nagkulay na si seno", "nagdisenyo na si seno", "nag-edit na si seno",
  "nag-type na si seno", "nag-print na si seno", "nag-save na si seno", "nag-download na si seno",
  "nag-upload na si seno", "nag-send na si seno", "nag-reply na si seno", "nag-chat na si seno",
  "nag-text na si seno", "tumawag na si seno", "nag-video call na si seno", "nag-online na si seno",
  "nag-offline na si seno", "nag-post na si seno", "nag-comment na si seno", "nag-like na si seno",
  "nag-share na si seno", "nag-follow na si seno", "nag-unfollow na si seno", "nag-subscribe na si seno",
  "nag-scroll na si seno", "nag-search na si seno", "nag-click na si seno", "nag-open na si seno",
  "nag-close na si seno", "nag-refresh na si seno", "nag-update na si seno", "nag-install na si seno",
  "nag-uninstall na si seno", "nag-restart na si seno", "nag-charge na si seno", "na-lowbat na si seno",
  "nag-on na si seno", "nag-off na si seno", "nag-connect na si seno", "nag-disconnect na si seno",
  "nag-record na si seno", "nag-picture na si seno", "nag-video na si seno", "nag-selfie na si seno",
  "nag-filter na si seno", "nag-delete na si seno", "nag-copy na si seno", "nag-paste na si seno",
  "nag-receive na si seno", "nag-check na si seno", "nag-verify na si seno", "nag-confirm na si seno",
  "nag-cancel na si seno", "nag-report na si seno", "nag-block na si seno", "nag-unblock na si seno",
  "nag-mute na si seno", "nag-unmute na si seno", "nag-invite na si seno", "nag-accept na si seno",
  "nag-decline na si seno", "nag-join na si seno", "nag-leave na si seno", "nag-create na si seno",
  "nag-change na si seno", "nag-set na si seno", "nag-reset na si seno", "nag-load na si seno",
  "nag-play na si seno", "nag-pause na si seno", "nag-stop na si seno", "nag-skip na si seno",
  "nag-rewind na si seno", "nag-forward na si seno", "nag-kanta na si seno", "sumayaw na si seno",
  "tumugtog na si seno", "nag-rap na si seno", "nag-perform na si seno", "nag-vlog na si seno",
  "nag-stream na si seno", "nag-live na si seno", "nag-game na si seno", "nag-rank na si seno",
  "nag-grind na si seno", "nag-farm na si seno", "nag-level up na si seno", "nag-win na si seno",
  "nag-lose na si seno", "nag-draw na si seno", "nag-carry na si seno", "nag-clutch na si seno",
  "nag-push na si seno", "nag-defend na si seno", "nag-attack na si seno", "nag-rotate na si seno",
  "nag-lobby na si seno", "nag-queue na si seno", "nag-match na si seno", "nag-quit na si seno",
  "nag-respawn na si seno", "nag-unlock na si seno", "nag-upgrade na si seno", "nag-equip na si seno",
  "nag-customize na si seno", "nag-set up na si seno", "nag-test na si seno", "nag-debug na si seno",
  "nag-code na si seno", "nag-build na si seno", "nag-deploy na si seno", "nag-host na si seno",
  "nag-run na si seno", "nag-fix na si seno", "nag-patch na si seno", "nag-scan na si seno",
  "nag-backup na si seno", "nag-restore na si seno", "nag-sync na si seno", "nag-link na si seno",
  "nag-register na si seno", "nag-sign up na si seno", "nag-sign in na si seno", "nag-login na si seno",
  "nag-logout na si seno", "nag-create profile na si seno", "nag-edit profile na si seno",
  "nag-change name na si seno", "nag-upload pfp na si seno", "nag-change pfp na si seno",
  "nag-set bio na si seno", "nag-edit bio na si seno", "nag-add friend na si seno",
  "nag-remove friend na si seno", "nag-follow ulit si seno", "nag-message na si seno",
  "nag-react na si seno", "nag-repost na si seno", "nag-story na si seno", "nag-view story na si seno",
  "nag-delete story na si seno", "nag-save post na si seno", "nag-unsave post na si seno",
  "nag-pin post na si seno", "nag-unpin post na si seno", "nag-tag na si seno", "nag-mention na si seno",
  "nag-browse na si seno", "nag-explore na si seno", "nag-discover na si seno", "nag-check feed na si seno",
  "nag-refresh feed na si seno", "nag-open notification na si seno", "nag-clear notification na si seno",
  "nag-check inbox na si seno", "nag-clear inbox na si seno", "nag-accept request na si seno",
  "nag-decline request na si seno", "nag-send request na si seno", "nag-cancel request na si seno",
  "nag-create group na si seno", "nag-join group na si seno", "nag-leave group na si seno",
  "nag-invite sa group si seno", "nag-chat sa group si seno", "nag-send message na si seno",
  "nag-delete message na si seno", "nag-pin message na si seno", "nag-unpin message na si seno",
  "nag-react sa message si seno", "nag-reply sa message si seno", "nag-forward message na si seno",
  "nag-search message na si seno", "nag-archive chat na si seno", "nag-unarchive chat na si seno",
  "nag-mute chat na si seno", "nag-unmute chat na si seno", "nag-block user na si seno",
  "nag-unblock user na si seno", "nag-report user na si seno", "nag-check profile na si seno",
  "nag-view profile na si seno", "nag-follow page na si seno", "nag-like page na si seno",
  "nag-create page na si seno", "nag-edit page na si seno", "nag-post sa page si seno",
  "nag-delete post si seno", "nag-share post si seno", "nag-invite ng friends si seno",
  "nag-accept invite si seno", "nag-decline invite si seno", "nag-open app na si seno",
  "nag-close app na si seno", "nag-launch app na si seno", "nag-exit app na si seno",
  "nag-restart app na si seno", "nag-update app na si seno", "nag-install app na si seno",
  "nag-uninstall app na si seno", "nag-clear cache si seno", "nag-check settings si seno",
  "nag-change settings si seno", "nag-save settings si seno", "nag-reset settings si seno",
  "nag-enable na si seno", "nag-disable na masi seno", "nag-turn on na si seno",
  "nag-turn off na si seno", "nag-activate na si seno", "nag-deactivate na si seno",
  "nag-lock na si seno", "nag-unlock na si seno", "nag-secure na si seno", "nag-protect na si seno",
  "nag-check status na si seno", "nag-change status na si seno", "nag-set status na si seno",
  "nag-clear status na si seno", "nag-update status na si seno", "nag-post status na si seno",
  "nag-view status na si seno", "nag-delete status na si seno", "nag-check story na si seno",
  "nag-post story na si seno", "nag-view story na si seno", "nag-react sa story si seno",
  "nag-reply sa story si seno", "nag-share story na si seno", "nag-open link na si seno",
  "nag-copy link na si seno", "nag-share link na si seno", "nag-check link na si seno",
  "nag-send link na si seno", "nag-receive link na si seno", "nag-open file na si seno",
  "nag-send file na si seno", "nag-receive file na si seno", "nag-download file na si seno",
  "nag-upload file na si seno", "nag-delete file na si seno", "nag-save file na si seno",
  "nag-open photo na si seno", "nag-send photo na si seno", "nag-receive photo na si seno",
  "nag-delete photo na si seno", "nag-save photo na si seno", "nag-open video na si seno",
  "nag-send video na si seno", "nag-receive video na si seno", "nag-delete video na si seno",
  "nag-save video na si seno", "nag-open music na si seno", "nag-send music na si seno",
  "nag-receive music na si seno", "nag-delete music na si seno", "nag-save music na si seno",
  "nagbukas na si seno", "nagsara na si seno", "nagpakita na si seno", "nandito na si seno",
  "nandoon na si seno", "papunta na si seno", "pauwi na si seno", "paalis na si seno",
  "darating na si seno", "nakarating na si seno", "naghihintay na si seno", "naghahanda na si seno",
  "nagtatrabaho na si seno", "nag-aaral na si seno", "nagpapahinga na si seno", "naglalaro na si seno",
  "kumakain na si seno", "umiinom na si seno", "natutulog na si seno", "gumigising na si seno",
  "naliligo na si seno", "nagbibihis na si seno", "naglalakad na si seno", "tumatakbo na si seno",
  "nagsasalita na si seno", "nakikinig na si seno", "tumatawa na si seno", "umiiyak na si seno",
  "ngumingiti na si seno", "nag-iisip na si seno", "naghahanap na si seno", "nagtatago na si seno",
  "naghihintay na si seno", "nagmamadali na si seno", "nagsisimula na si seno", "nagpapatuloy na si seno",
  "humihinto na si seno", "bumabalik na si seno", "umaalis na si seno", "dumarating na si seno",
  "umaakyat na si seno", "bumababa na si seno", "tumatalon na si seno", "lumalangoy na si seno",
  "lumilipad na si seno", "tumatawid na si seno", "nagpapasalamat na si seno", "humihingi na si seno",
  "nagbibigay na si seno", "tumatanggap na si seno", "nagtitiwala na si seno", "umaasa na si seno",
  "nangangarap na si seno", "nagpaplano na si seno", "nagpapasya na si seno", "nagbabago na si seno",
  "nagsusumikap na si seno", "nagtagumpay na si seno", "nakamit na ni seno", "nakakuha na si seno",
  "nahanap na ni seno", "napili na ni seno", "natapos na ni seno", "nagsara na si seno",
  "nagpaalam na si seno", "nagkita na sina seno", "nagbati na si seno", "nag-usap na si seno",
  "nagkasundo na si seno", "nagplano na si seno", "nagbalik na si seno", "nagwagi na si seno",
  "natalo na si seno", "nakaraos na si seno", "nakaligtas na si seno", "nakabangon na si seno",
  "nakapagpahinga na si seno", "nakapaghanda na si seno", "nakapag-aral na si seno", "nakapagtrabaho na si seno",
  "nakapaglaro na si seno", "nakapaglakbay na si seno", "nakauwi na rin si seno"
];

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
      if (!parsed.roasts || parsed.roasts.length === 0) {
        parsed.roasts = DEFAULT_SENO_LINES;
      }
      if (!parsed.activeThreads) {
        parsed.activeThreads = [];
      }
      return parsed;
    }
  } catch {}
  return { activeThreads: [], roasts: DEFAULT_SENO_LINES };
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function isThreadActive(threadID) {
  const data = loadData();
  return Array.isArray(data.activeThreads) && data.activeThreads.includes(threadID.toString());
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getRandomDelay(min = 3000, max = 4000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const lastResponseTime = new Map();

// ===== EVENT HANDLER =====
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body, messageID } = event;

  // Gagana lang kapag naka-ON sa GC na ito at hindi message ng bot
  if (!isThreadActive(threadID) || senderID === api.getCurrentUserID()) return;

  const cleanBody = (body || "").trim();
  const isSenderAdmin = ADMIN_IDS.includes(senderID.toString());
  const isCommand = PREFIXES.some((p) => cleanBody.startsWith(p));

  if (isSenderAdmin && isCommand) return;

  const now = Date.now();
  const lastTime = lastResponseTime.get(threadID) || 0;
  const currentCooldown = getRandomDelay(3000, 4000);

  if (now - lastTime < currentCooldown) return; 

  lastResponseTime.set(threadID, now);

  try {
    const data = loadData();
    const roastsList = data.roasts && data.roasts.length > 0 ? data.roasts : DEFAULT_SENO_LINES;

    const randomRoast = roastsList[Math.floor(Math.random() * roastsList.length)];

    // 3 - 4 seconds delay bago mag-reply
    const fastDelay = getRandomDelay(3000, 4000);
    await sleep(fastDelay);

    // Reply text message (WALANG EMOJI REACTION)
    api.sendMessage(randomRoast, threadID, null, messageID);

  } catch (error) {
    console.error("Sinzu Engine Error:", error);
  }
};

// ===== COMMAND HANDLER (ADMIN ONLY) =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  if (!ADMIN_IDS.includes(senderID.toString())) {
    return api.sendMessage("⚠️ ADMIN ONLY: Walang kang permiso para gumamit ng command na ito.", threadID, messageID);
  }

  const sub = (args[0] || "").toLowerCase();
  const data = loadData();
  const tID = threadID.toString();

  if (sub === "on") {
    if (!data.activeThreads.includes(tID)) {
      data.activeThreads.push(tID);
      saveData(data);
    }
    return api.sendMessage("⚡ Sinzu Engine: ACTIVATED dito sa GC (3-4s Delay | No Auto React)", threadID, messageID);
  }

  if (sub === "off") {
    data.activeThreads = data.activeThreads.filter((id) => id !== tID);
    saveData(data);
    return api.sendMessage("🛑 Sinzu Engine: DEACTIVATED dito sa GC", threadID, messageID);
  }

  if (sub === "status") {
    const activeHere = isThreadActive(tID);
    return api.sendMessage(
      `📊 Engine Status (This GC): ${activeHere ? "ACTIVE ♾️" : "INACTIVE"}\n` +
      `⏱️ Delay Speed: Fast (3s - 4s)\n` +
      `🚫 Auto React: DISABLED\n` +
      `📜 Total Seno Lines: ${(data.roasts || DEFAULT_SENO_LINES).length}`,
      threadID,
      messageID
    );
  }

  if (sub === "add") {
    const customLine = args.slice(1).join(" ");
    if (!customLine) {
      return api.sendMessage("❌ Paki-lagay ang line na idadagdag.", threadID, messageID);
    }

    if (!data.roasts) data.roasts = DEFAULT_SENO_LINES;
    data.roasts.push(customLine);
    saveData(data);

    return api.sendMessage(`✅ Naidagdag sa lines:\n"${customLine}"`, threadID, messageID);
  }

  if (sub === "listlines") {
    const list = data.roasts || DEFAULT_SENO_LINES;
    let msg = `📜 Seno Lines (${list.length}):\n\n`;
    list.slice(0, 50).forEach((line, index) => {
      msg += `${index + 1}. ${line}\n`;
    });
    if (list.length > 50) {
      msg += `\n...at may ${list.length - 50} pang lines.`;
    }
    return api.sendMessage(msg, threadID, messageID);
  }

  return api.sendMessage(
    "Sinzu Admin Commands:\n" +
    "/sinzu on — Paandarin sa GC na ito\n" +
    "/sinzu off — Patayin sa GC na ito\n" +
    "/sinzu status — Tingnan ang status\n" +
    "/sinzu add <text> — Magdagdag ng line\n" +
    "/sinzu listlines — Tingnan ang mga lines",
    threadID,
    messageID
  );
};
