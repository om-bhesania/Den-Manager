const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const commands = [];

// Load setup command
const setupCommand = require("./commands/setup.js");
commands.push(setupCommand.data.toJSON());

// Load reset commands
const resetCommand = require("./commands/resetConfig.js");
commands.push(resetCommand.data.toJSON());

const resetAllCommand = require("./commands/resetAll.js");
commands.push(resetAllCommand.data.toJSON());

// const configCommand = require("./commands/config.js");
// commands.push(configCommand.data.toJSON());

const updateTemplatesCommand = require("./commands/updatetemplates.js");
commands.push(updateTemplatesCommand.data.toJSON());

const purgeCommand = require("./commands/purge.js");
commands.push(purgeCommand.data.toJSON());

const helpCommand = require("./commands/help.js");
commands.push(helpCommand.data.toJSON());

// Load automod/moderation commands
const modsetupCommand = require("./commands/modsetup.js");
commands.push(modsetupCommand.data.toJSON());

const kickCommand = require("./commands/kick.js");
commands.push(kickCommand.data.toJSON());

const banCommand = require("./commands/ban.js");
commands.push(banCommand.data.toJSON());

const warnCommand = require("./commands/warn.js");
commands.push(warnCommand.data.toJSON());

const timeoutCommand = require("./commands/timeout.js");
commands.push(timeoutCommand.data.toJSON());

const addwordCommand = require("./commands/addwords.js");
commands.push(addwordCommand.data.toJSON());

const removewordCommand = require("./commands/removewords.js");
commands.push(removewordCommand.data.toJSON());

const listwordsCommand = require("./commands/listwords.js");
commands.push(listwordsCommand.data.toJSON());

const warningsCommand = require("./commands/warnings.js");
commands.push(warningsCommand.data.toJSON());

const clearwarningsCommand = require("./commands/clearwarnings.js");
commands.push(clearwarningsCommand.data.toJSON());

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // Check if GUILD_ID is provided for instant testing
    if (process.env.GUILD_ID) {
      // For guild-specific commands (instant update)
      const data = await rest.put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID,
          process.env.GUILD_ID
        ),
        { body: commands }
      );
      console.log(
        `Successfully reloaded ${data.length} application (/) commands for guild (instant update).`
      );
    } else {
      // For global commands (will take up to 1 hour to update)
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(
        `Successfully reloaded ${data.length} application (/) commands globally.`
      );
      console.log(
        "Note: Global commands take up to 1 hour to update. Add GUILD_ID to .env for instant testing."
      );
    }
  } catch (error) {
    console.error("Error deploying commands:", error);
  }
})();
