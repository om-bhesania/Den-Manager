const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const commandConfig = require("../config/commands.json");
const botDefaults = require("../config/botDefaults.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resetall")
    .setDescription("Reset bot name and avatar to original globally")
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
      
      const originalName = botDefaults.botDefaults.name;

      // Reset bot name globally
      await client.user.setUsername(originalName);

      // Reset bot avatar to default globally (only if not null)
      if (botDefaults.botDefaults.avatar !== null) {
        await client.user.setAvatar(botDefaults.botDefaults.avatar);
      }

      const embed = new EmbedBuilder()
        .setColor(botDefaults.colors.success)
        .setTitle("✅ Global Bot Reset Complete!")
        .setDescription(
          `**Bot has been reset globally to original settings:**\n\n` +
          `**Name:** ${originalName}\n` +
          `**Avatar:** Default Discord Avatar\n\n` +
          `*This change affects ALL servers where the bot is present.*`
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: botDefaults.footer.text });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error resetting bot globally:", error);

      let errorMessage = "❌ Failed to reset bot globally!";
      if (error.code === 50035) {
        if (error.message.includes("AVATAR_RATE_LIMIT")) {
          errorMessage = "❌ Avatar rate limited! Please wait 10 minutes before changing avatar again.";
        } else {
          errorMessage = "❌ Invalid name format!";
        }
      } else if (error.code === 50013) {
        errorMessage = "❌ Missing permissions to update bot!";
      } else if (error.message.includes("rate limit")) {
        errorMessage = "❌ Rate limited! Please wait before trying again.";
      }

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, flags: 64 });
      }
    }
  },
}; 