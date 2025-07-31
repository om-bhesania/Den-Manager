const { REST, Routes } = require("discord.js");
require("dotenv").config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Checking global commands...");

    // Get global commands
    const globalCommands = await rest.get(
      Routes.applicationCommands(process.env.CLIENT_ID)
    );

    console.log(`Found ${globalCommands.length} global commands:`);
    globalCommands.forEach((cmd) => {
      console.log(`- ${cmd.name}: ${cmd.description}`);
    });

    // Check if purge command exists globally
    const purgeCommand = globalCommands.find((cmd) => cmd.name === "purge");
    if (purgeCommand) {
      console.log("\n✅ Purge command is registered globally!");
      console.log(
        "Default permissions:",
        purgeCommand.default_member_permissions
      );
    } else {
      console.log("\n❌ Purge command is NOT registered globally!");
    }
  } catch (error) {
    console.error("Error checking commands:", error);
  }
})();
