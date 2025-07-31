const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "h",
  description: "Show all available commands and their descriptions",
  type: "message",
  file: "helpmsg.js",
  permissions: [],

  async execute(message, args, client) {
    try {
      // Load commands configuration
      const commandsConfig = require("../config/commands.json");
      const commands = commandsConfig.commands;

      // Separate commands by type
      const slashCommands = commands.filter(cmd => cmd.type === "slash");
      const messageCommands = commands.filter(cmd => cmd.type === "message");

      // Create main help embed
      const helpEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("🤖 Den Manager Help")
        .setDescription(
          "Welcome to **Den Manager**! Here are all the available commands:\n\n" +
          "**Slash Commands** (use `/command`)\n" +
          "**Message Commands** (use `!dm command`)\n\n" +
          "Click the buttons below to view specific command categories."
        )
        .addFields(
          {
            name: "📊 Statistics",
            value: `• **${slashCommands.length}** Slash Commands\n• **${messageCommands.length}** Message Commands\n• **${commands.length}** Total Commands`,
            inline: true,
          },
          {
            name: "🎮 Features",
            value: "• Welcome Messages\n• Auto-Roles\n• Bot Customization\n• Server Management",
            inline: true,
          }
        )
        .setFooter({
          text: "Den Manager • Gaming Community",
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      // Create buttons for different categories
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("help_slash")
          .setLabel("Slash Commands")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔧"),
        new ButtonBuilder()
          .setCustomId("help_message")
          .setLabel("Message Commands")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("💬"),
        new ButtonBuilder()
          .setCustomId("help_admin")
          .setLabel("Admin Commands")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("⚙️"),
        new ButtonBuilder()
          .setCustomId("help_owner")
          .setLabel("Owner Commands")
          .setStyle(ButtonStyle.Success)
          .setEmoji("👑")
      );

      const helpMessage = await message.reply({
        embeds: [helpEmbed],
        components: [row],
      });

            // Create collector for button interactions
      const filter = (i) => i.user && i.user.id === message.author.id;
      const collector = message.channel.createMessageComponentCollector({
        filter,
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (i) => {
        try {
          // For message commands, we need to handle the interaction differently
          // Instead of deferUpdate, we'll update the original message
          let embed;

          switch (i.customId) {
            case "help_slash":
              embed = createSlashCommandsEmbed(slashCommands);
              break;
            case "help_message":
              embed = createMessageCommandsEmbed(messageCommands);
              break;
            case "help_admin":
              embed = createAdminCommandsEmbed(commands);
              break;
            case "help_owner":
              embed = createOwnerCommandsEmbed(commands);
              break;
            case "help_main":
              embed = helpEmbed;
              break;
            default:
              console.log(`Unknown button interaction: ${i.customId}`);
              return;
          }

          // Add back button for all cases except "help_main"
          let components = [];
          if (i.customId !== "help_main") {
            const backRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("help_main")
                .setLabel("Back to Main")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("🏠")
            );
            components = [backRow];
          } else {
            // For "help_main", show all category buttons
            components = [row];
          }

          // Update the original message instead of trying to edit the interaction
          await helpMessage.edit({
            embeds: [embed],
            components: components,
          });

        } catch (error) {
          console.error("Error handling button interaction:", error);
          // Send a new message if editing fails
          try {
            await message.channel.send({
              content: "❌ An error occurred while processing your selection. Please try `!dm h` again.",
              flags: 64
            });
          } catch (sendError) {
            console.error("Error sending error message:", sendError);
          }
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time") {
          const timeoutEmbed = new EmbedBuilder()
            .setColor("#6c757d")
            .setTitle("⏰ Help Session Expired")
            .setDescription("The help session has timed out. Use `!dm h` again if needed.")
            .setTimestamp();

          try {
            helpMessage.edit({
              embeds: [timeoutEmbed],
              components: [],
            });
          } catch (editError) {
            console.error("Error editing timeout message:", editError);
            // If editing fails, send a new message
            try {
              message.channel.send({
                embeds: [timeoutEmbed],
                components: [],
              });
            } catch (sendError) {
              console.error("Error sending timeout message:", sendError);
            }
          }
        }
      });

    } catch (error) {
      console.error("Error in help command:", error);
      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error")
        .setDescription("An error occurred while loading the help menu.")
        .setTimestamp();

      await message.reply({
        embeds: [errorEmbed],
        components: [],
      });
    }
  },
};

// Helper functions to create category-specific embeds
function createSlashCommandsEmbed(slashCommands) {
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("🔧 Slash Commands")
    .setDescription("Use these commands with `/command`");

  const fields = slashCommands.map(cmd => ({
    name: `/${cmd.name}`,
    value: `${cmd.description}\n**Permissions:** ${cmd.permissions.join(", ")}`,
    inline: false,
  }));

  embed.addFields(fields);
  return embed;
}

function createMessageCommandsEmbed(messageCommands) {
  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("💬 Message Commands")
    .setDescription("Use these commands with `!dm command`");

  const fields = messageCommands.map(cmd => ({
    name: `!dm ${cmd.name}`,
    value: `${cmd.description}\n**Permissions:** ${cmd.permissions.join(", ")}`,
    inline: false,
  }));

  embed.addFields(fields);
  return embed;
}

function createAdminCommandsEmbed(commands) {
  const adminCommands = commands.filter(cmd => 
    cmd.permissions.includes("ADMINISTRATOR") || 
    cmd.permissions.includes("MANAGE_MESSAGES")
  );

  const embed = new EmbedBuilder()
    .setColor("#ff9900")
    .setTitle("⚙️ Admin Commands")
    .setDescription("Commands for server administrators");

  const fields = adminCommands.map(cmd => ({
    name: cmd.type === "slash" ? `/${cmd.name}` : `!dm ${cmd.name}`,
    value: `${cmd.description}\n**Permissions:** ${cmd.permissions.join(", ")}`,
    inline: false,
  }));

  embed.addFields(fields);
  return embed;
}

function createOwnerCommandsEmbed(commands) {
  const ownerCommands = commands.filter(cmd => 
    cmd.permissions.includes("OWNER")
  );

  const embed = new EmbedBuilder()
    .setColor("#ff4444")
    .setTitle("👑 Owner Commands")
    .setDescription("Commands for bot owner only");

  const fields = ownerCommands.map(cmd => ({
    name: cmd.type === "slash" ? `/${cmd.name}` : `!dm ${cmd.name}`,
    value: `${cmd.description}\n**Permissions:** ${cmd.permissions.join(", ")}`,
    inline: false,
  }));

  embed.addFields(fields);
  return embed;
} 