const { EmbedBuilder } = require("discord.js");
const botDefaults = require("../config/botDefaults.json");

module.exports = {
  name: "guildreset",
  description: "Reset bot name and avatar for this server to default",

  async execute(message, args, client) {
    // Check if user is the specific owner
    if (message.author.id !== "710833692490203156") {
      return message.reply("❌ Only the bot owner can use this command!");
    }

    try {
      const guildData = client.getGuildData(message.guild.id);

      // Reset guild-specific settings
      guildData.botConfig.customName = null | "Den Manager";
      guildData.botConfig.customAvatar = null | "./defaultLogo.png";
      client.saveGuildData(message.guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor(botDefaults.colors.success)
        .setTitle("✅ Guild Bot Settings Reset!")
        .setDescription(
          `**Bot settings have been reset for this server:**\n\n` +
            `**Server:** ${message.guild.name}\n` +
            `**Name:** Default (${botDefaults.botDefaults.name})\n` +
            `**Avatar:** Default Discord Avatar\n\n` +
            `*Bot will now use default settings in this server.*`
        )
        .setThumbnail(
          client.user.displayAvatarURL({ dynamic: true, size: 256 })
        )
        .setFooter({
          text: "Den Manager • Guild Settings Reset",
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        });
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error resetting guild bot settings:", error);
      message.reply("❌ Failed to reset guild bot settings!");
    }
  },
};
