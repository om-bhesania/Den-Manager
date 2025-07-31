const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "bg",
  description: "Set background image for welcome messages",

  async execute(message, args, client) {
    // Check if user has administrator permissions
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(
        "❌ You need Administrator permissions to use this command!"
      );
    }

    const guildData = client.getGuildData(message.guild.id);

    if (!guildData.setup.completed) {
      return message.reply(
        "❌ Please complete the setup first using `/setup` command!"
      );
    }

    // Check if image URL is provided
    if (args.length === 0) {
      const currentBg = guildData.welcomeConfig.backgroundImage;
      const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("🖼️ Welcome Background Image")
        .setDescription(
          `**Current Background:** ${
            currentBg ? "Set" : "Not set"
          }\n\n**Usage:** \`!dm bg <image_url>\`\n**Example:** \`!dm bg https://example.com/image.png\`\n\n**To remove:** \`!dm bg remove\``
        )
        .setFooter({ text: "Den Manager • Background Configuration" });

      if (currentBg) {
        embed.setImage(currentBg);
      }

      return message.reply({ embeds: [embed] });
    }

    const imageUrl = args[0];

    // Handle remove command
    if (imageUrl.toLowerCase() === "remove") {
      guildData.welcomeConfig.backgroundImage = null;
      client.saveGuildData(message.guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor("#ff9900")
        .setTitle("🗑️ Background Removed")
        .setDescription("Welcome background image has been removed.")
        .setFooter({ text: "Den Manager • Background Updated" });

      return message.reply({ embeds: [embed] });
    }

    // Validate image URL
    if (!isValidImageUrl(imageUrl)) {
      return message.reply(
        "❌ Please provide a valid image URL (jpg, jpeg, png, gif, webp)!"
      );
    }

    try {
      // Test if the image URL is accessible
      const fetch = require("node-fetch");
      const response = await fetch(imageUrl, { method: "HEAD" });

      if (!response.ok) {
        return message.reply(
          "❌ Unable to access the image URL. Please check if the URL is correct and publicly accessible!"
        );
      }

      // Save the background image URL
      guildData.welcomeConfig.backgroundImage = imageUrl;
      client.saveGuildData(message.guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("✅ Background Image Updated!")
        .setDescription(
          "Welcome message background has been updated successfully!"
        )
        .setImage(imageUrl)
        .setFooter({ text: "Den Manager • Background Updated" });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error setting background image:", error);

      // If fetch fails, still save the URL (maybe it's a valid URL but fetch failed)
      guildData.welcomeConfig.backgroundImage = imageUrl;
      client.saveGuildData(message.guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor("#ff9900")
        .setTitle("⚠️ Background Image Set (Warning)")
        .setDescription(
          "Background image URL has been saved, but we couldn't verify if it's accessible. Please test with `!dm test` to ensure it works correctly."
        )
        .setFooter({ text: "Den Manager • Background Updated" });

      await message.reply({ embeds: [embed] });
    }
  },
};

function isValidImageUrl(url) {
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
