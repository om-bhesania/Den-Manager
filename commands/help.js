const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands and their descriptions"),

  async execute(interaction, args, client) {
    // Defer the reply to prevent timeout
    await interaction.deferReply({ flags: 64 });

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
          iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }),
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

      await interaction.editReply({
        embeds: [helpEmbed],
        components: [row],
      });

      // Create collector for button interactions
      const filter = (i) => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (i) => {
        await i.deferUpdate();

        let embed;
        let components = [];

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
            components = [row];
            break;
        }

        // Add back button
        const backRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("help_main")
            .setLabel("Back to Main")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("🏠")
        );

        try {
          await i.editReply({
            embeds: [embed],
            components: components.length > 0 ? components : [backRow],
          });
        } catch (editError) {
          // If editReply fails, try followUp
          await i.followUp({
            embeds: [embed],
            components: components.length > 0 ? components : [backRow],
            flags: 64
          });
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time") {
          const timeoutEmbed = new EmbedBuilder()
            .setColor("#6c757d")
            .setTitle("⏰ Help Session Expired")
            .setDescription("The help session has timed out. Use `/help` again if needed.")
            .setTimestamp();

                  try {
          interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
          });
        } catch (editError) {
          // If editReply fails, try followUp
          interaction.followUp({
            embeds: [timeoutEmbed],
            components: [],
            flags: 64
          }).catch(console.error);
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

      await interaction.editReply({
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