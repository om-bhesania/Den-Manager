const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const commandConfig = require("../config/commands.json");
const botDefaults = require("../config/botDefaults.json");
const { updateGuildDataTemplates } = require("../utils/guildUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("updatetemplates")
    .setDescription("Update all guild data templates to use correct format")
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
      // Defer the reply to prevent timeout
      await interaction.deferReply({ flags: 64 });

      // Update templates
      updateGuildDataTemplates(client);

      const embed = new EmbedBuilder()
        .setColor(botDefaults.colors.success)
        .setTitle("✅ Templates Updated!")
        .setDescription(
          "All guild data templates have been updated to use the correct format.\n\n" +
          "**Changes made:**\n" +
          "• `${serverName}` → `{serverName}`\n" +
          "• `{serverName}` → `{serverName}`\n\n" +
          "Welcome messages should now display server names correctly!"
        )
        .setFooter({ text: "Den Manager • Templates Updated" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error updating templates:", error);
      await interaction.editReply({
        content: "❌ Failed to update templates!",
        flags: 64
      });
    }
  },
}; 