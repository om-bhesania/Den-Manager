const { greenBG, yellowBG } = require("console-log-colors");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "test",
  description: "Send a test welcome message",

  async execute(message, args, client) {
    // Check if user has administrator permissions
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(
        "❌ You need Administrator permissions to use this command!"
      );
    }

    const guildData = client.getGuildData(message.guild.id);

    if (!guildData.setup.completed || !guildData.setup.welcomeChannel) {
      return message.reply(
        "❌ Please complete the setup first using `/setup` command!"
      );
    }

    const welcomeChannel = message.guild.channels.cache.get(
      guildData.setup.welcomeChannel
    );
    if (!welcomeChannel) {
      return message.reply(
        "❌ Welcome channel not found! Please run `/setup` again."
      );
    }

    try {
      // Create test welcome embed using the command author as test user
      const testUser = message.author;
      const joinDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const accountAge = new Date(testUser.createdAt).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );
      const guildName = message.guild.name
      console.log(greenBG(guildName))
      let welcomeMessage = guildData.welcomeConfig.message
        .replace("{serverName}", guildName)
        .replace("{userMention}", testUser.toString())
        .replace("{joinDate}", joinDate)
        .replace("{accountAge}", accountAge)
        .replace(
          "{memberCount}",
          `${message.guild.memberCount}${getOrdinalSuffix(
            message.guild.memberCount
          )} member`
        );

      const embed = new EmbedBuilder()
        .setColor("#ff9900") // Orange color to indicate it's a test
        .setTitle(`🧪 TEST: Welcome ${testUser.username}! 🎮`)
        .setDescription(welcomeMessage)
        .setThumbnail(testUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp();

      if (guildData.welcomeConfig.backgroundImage) {
        embed.setImage(guildData.welcomeConfig.backgroundImage);
      }

      // Get guild-specific bot display
      const botDisplay = client.getGuildBotDisplay(message.guild.id);
      
      embed.setFooter({
        text: `${botDisplay.name} • Gaming Community • TEST MESSAGE`,
        iconURL: message.guild.iconURL({ dynamic: true }),
      });

      await welcomeChannel.send({
        content: "🧪 **This is a test welcome message:**",
        embeds: [embed],
      });

      // Confirm to the user
      await message.reply(`✅ Test welcome message sent to ${welcomeChannel}!`);
    } catch (error) {
      console.error("Error sending test welcome message:", error);
      message.reply(
        "❌ Failed to send test welcome message. Please check bot permissions!"
      );
    }
  },
};

// Helper function for ordinal numbers
function getOrdinalSuffix(number) {
  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return "th";
  }

  switch (lastDigit) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
