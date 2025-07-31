const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const commandConfig = require("../config/commands.json");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("View and edit bot configuration")
    .setDefaultMemberPermissions(8n), // Administrator permission

  async execute(interaction, args, client) {
    // Check if user is owner
    if (!commandConfig.ownerIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Only the bot owner can use this command!",
        flags: 64
      });
    }

    try {
      const botDefaults = require("../config/botDefaults.json");
      
      const embed = new EmbedBuilder()
        .setColor(botDefaults.colors.info)
        .setTitle("⚙️ Bot Configuration")
        .setDescription(
          `**Current Bot Defaults:**\n\n` +
          `**Name:** ${botDefaults.botDefaults.name}\n` +
          `**Avatar:** ${botDefaults.botDefaults.avatar ? "Custom" : "Default Discord"}\n` +
          `**Status:** ${botDefaults.presence.status}\n` +
          `**Activity:** ${botDefaults.presence.activity.name}\n\n` +
          `**Colors:**\n` +
          `• Success: ${botDefaults.colors.success}\n` +
          `• Warning: ${botDefaults.colors.warning}\n` +
          `• Error: ${botDefaults.colors.error}\n` +
          `• Info: ${botDefaults.colors.info}\n\n` +
          `**Footer:** ${botDefaults.footer.text}`
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: botDefaults.footer.text });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("edit_name")
            .setLabel("Edit Name")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("edit_avatar")
            .setLabel("Edit Avatar")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("edit_colors")
            .setLabel("Edit Colors")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("reset_defaults")
            .setLabel("Reset to Defaults")
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.reply({ 
        embeds: [embed], 
        components: [row],
        flags: 64
      });

      // Handle button interactions
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter, 
        time: 60000 
      });

      collector.on("collect", async (i) => {
        if (i.customId === "edit_name") {
          await i.reply({ 
            content: "📝 To edit the bot name, use `!dm name <new_name>` command.", 
            flags: 64
          });
        } else if (i.customId === "edit_avatar") {
          await i.reply({ 
            content: "🖼️ To edit the bot avatar, use `!dm avatar <image_url>` command.", 
            flags: 64
          });
        } else if (i.customId === "edit_colors") {
          await i.reply({ 
            content: "🎨 Colors can be edited in the `config/botDefaults.json` file.", 
            flags: 64
          });
        } else if (i.customId === "reset_defaults") {
          await i.reply({ 
            content: "🔄 Use `/reset` to reset bot name/avatar to defaults.", 
            flags: 64
          });
        }
      });

    } catch (error) {
      console.error("Error in config command:", error);
      await interaction.reply({
        content: "❌ There was an error loading the configuration!",
        flags: 64
      });
    }
  },
}; 