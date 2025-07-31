const { REST, Routes } = require("discord.js");
require("dotenv").config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const guildId = "1400152295471054919"; // Your test guild ID

    console.log(`Clearing guild commands for guild ${guildId}...`);

    // Clear all guild commands
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body: [] }
    );

    console.log("✅ Successfully cleared all guild commands!");
    console.log("Now run your global deploy script again.");
  } catch (error) {
    console.error("Error clearing guild commands:", error);
  }
})();
