module.exports = {
  config: {
    name: "nickall",
    version: "1.0.0",
    role: 0, // Palitan ng 1 o 2 kung gusto mo ay admin/owner lang ang pwede mag-command
    author: "YourName",
    description: "Binabago ang nickname ng lahat ng miyembro sa GC",
    usages: "[bagong nickname]",
    cooldown: 5
  },

  onRun: async ({ api, event, args }) => {
    const { threadID } = event;
    const newNickname = args.join(" ");

    if (!newNickname) {
      return api.sendMessage("⚠️ Mangyaring maglagay ng bagong nickname. Halimbawa: /nickall VIP Member", threadID);
    }

    try {
      // Kunin ang info ng thread kasama ang listahan ng mga partisipante
      const threadInfo = await api.getThreadInfo(threadID);
      const participantIDs = threadInfo.participantIDs;

      api.sendMessage(`⏳ Sinisimulan nang palitan ang nickname ng ${participantIDs.length} na miyembro...`, threadID);

      // Loop para baguhin ang nickname ng bawat isa
      for (const userID of participantIDs) {
        await api.changeNickname(newNickname, threadID, userID);
      }

      return api.sendMessage(`✅ Tagumpay na nabago ang nickname ng lahat sa: "${newNickname}"`, threadID);
    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ May naganap na error habang binabago ang mga nickname. Siguraduhing admin ang bot.", threadID);
    }
  }
};
