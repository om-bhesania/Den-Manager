const { EmbedBuilder } = require("discord.js");
const commandConfig = require("../config/commands.json");

module.exports = {
  name: "avatar",
  description: "Change bot avatar (Owner only)",

  async execute(message, args, client) {
    // Check if user is the specific owner
    if (message.author.id !== "710833692490203156") {
      return message.reply("❌ Only the bot owner can use this command!");
    }

    if (args.length === 0) {
      const guildData = client.getGuildData(message.guild.id);
      const currentAvatar =
        guildData.botConfig.customAvatar || "Default Discord Avatar";

      const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("🤖 Guild Bot Avatar Management")
        .setDescription(
          `**Usage:** \`!dm avatar <image_url>\`\n**Example:** \`!dm avatar https://example.com/avatar.png\`\n\n**Current Avatar:** ${currentAvatar}\n**Server:** ${message.guild.name}\n\n**Note:** This sets the bot avatar for welcome messages and embeds in this server only.\n**Important:** The actual bot appearance remains global due to Discord limitations.`
        )
        .setThumbnail(
          client.user.displayAvatarURL({ dynamic: true, size: 256 })
        )
        .setFooter({ text: "Den Manager • Guild Avatar Management" });

      return message.reply({ embeds: [embed] });
    }

    let avatarUrl = args[0];

    // Check if it's an attachment
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (
        attachment.contentType &&
        attachment.contentType.startsWith("image/")
      ) {
        avatarUrl = attachment.url;
      }
    }

    // Validate image URL
    if (!isValidImageUrl(avatarUrl)) {
      return message.reply(
        "❌ Please provide a valid image URL or attach an image (jpg, jpeg, png, gif, webp)!"
      );
    }

    try {
      const guildData = client.getGuildData(message.guild.id);

      // Store the custom avatar for this guild
      guildData.botConfig.customAvatar = avatarUrl;
      client.saveGuildData(message.guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("✅ Guild Bot Avatar Set!")
        .setDescription(
          `**Bot avatar has been set for this server:**\n\n` +
            `**Server:** ${message.guild.name}\n` +
            `**Avatar URL:** ${avatarUrl}\n\n` +
            `*This avatar will be used in welcome messages and embeds for this server only.*\n` +
            `*Note: The actual bot appearance remains global due to Discord limitations.*`
        )
        .setThumbnail(avatarUrl)
        .setFooter({ text: "Den Manager • Guild Avatar Updated" });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error setting guild bot avatar:", error);

      let errorMessage = "❌ Failed to set guild bot avatar!";
      if (error.code === 50035) {
        errorMessage =
          "❌ Invalid image format or size! Please use a valid image under 8MB.";
      } else if (error.code === 50013) {
        errorMessage = "❌ Missing permissions to update avatar!";
      }

      message.reply(errorMessage);
    }
  },
};

function isValidImageUrl(url) {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const pathname = parsedUrl.pathname.toLowerCase();

    return (
      validExtensions.some((ext) => pathname.endsWith(ext)) ||
      (pathname.includes("/") &&
        (parsedUrl.hostname.includes("discord") ||
          parsedUrl.hostname.includes("imgur") ||
          parsedUrl.hostname.includes("gyazo") ||
          parsedUrl.hostname.includes("cdn")))
    );
  } catch {
    return false;
  }
}
