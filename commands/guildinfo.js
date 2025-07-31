const { EmbedBuilder } = require("discord.js");
const botDefaults = require("../config/botDefaults.json");

module.exports = {
  name: "guildinfo",
  description: "Show current guild-specific bot settings",

  async execute(message, args, client) {
    // Check if user is the specific owner
    if (message.author.id !== "710833692490203156") {
      return message.reply("❌ Only the bot owner can use this command!");
    }

    try {
      const guildData = client.getGuildData(message.guild.id);
      const botDisplay = client.getGuildBotDisplay(message.guild.id);

      const embed = new EmbedBuilder()
        .setColor(botDefaults.colors.info)
        .setTitle("🤖 Guild Bot Settings")
        .setDescription(
          `**Current Settings for ${message.guild.name}:**\n\n` +
          `**Bot Name:** ${botDisplay.name}\n` +
          `**Bot Avatar:** ${guildData.botConfig.customAvatar ? "Custom" : "Default"}\n\n` +
          `**Global Bot Name:** ${client.user.username}\n` +
          `**Global Bot Avatar:** Default Discord\n\n` +
          `*Note: Guild-specific settings are used in welcome messages and embeds, but the actual bot appearance is global.*`
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: "Den Manager • Guild Settings Info" });

      if (guildData.botConfig.customAvatar) {
        embed.setImage(guildData.botConfig.customAvatar);
      }

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error showing guild info:", error);
      message.reply("❌ Failed to show guild settings!");
    }
  },
}; 