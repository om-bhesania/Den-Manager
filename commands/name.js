const { EmbedBuilder } = require("discord.js");
const commandConfig = require("../config/commands.json");

module.exports = {
  name: "name",
  description: "Change bot name (Owner only)",

  async execute(message, args, client) {
    // Check if user is the specific owner
    if (message.author.id !== "710833692490203156") {
      return message.reply("❌ Only the bot owner can use this command!");
    }

    if (args.length === 0) {
      const guildData = client.getGuildData(message.guild.id);
      const currentName = guildData.botConfig.customName || client.user.username;
      
      const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("🤖 Guild Bot Name Management")
        .setDescription(
          `**Usage:** \`!dm name <new_name>\`\n**Example:** \`!dm name Gaming Manager\`\n\n**Current Name:** ${currentName}\n**Server:** ${message.guild.name}\n\n**Note:** This sets the bot name for welcome messages and embeds in this server only.\n**Limit:** Maximum 40 characters (will be truncated to 32 if needed).\n**Important:** The actual bot appearance remains global due to Discord limitations.`
        )
        .setThumbnail(
          client.user.displayAvatarURL({ dynamic: true, size: 128 })
        )
        .setFooter({ text: "Den Manager • Guild Name Management" });

      return message.reply({ embeds: [embed] });
    }

    const newName = args.join(" ");

    // Validate name length (Discord limit is 32, but we'll allow up to 40 for user input)
    if (newName.length < 2 || newName.length > 40) {
      return message.reply(
        "❌ Bot name must be between 2 and 40 characters long!"
      );
    }

    // Truncate to Discord's 32 character limit if needed
    const finalName = newName.length > 32 ? newName.substring(0, 32) : newName;

    // Validate name characters
    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(newName)) {
      return message.reply(
        "❌ Bot name can only contain letters, numbers, spaces, hyphens, underscores, and periods!"
      );
    }

    try {
      const guildData = client.getGuildData(message.guild.id);
      const oldName = guildData.botConfig.customName || client.user.username;
      
      // Store the custom name for this guild
      guildData.botConfig.customName = finalName;
      client.saveGuildData(message.guild.id, guildData);

      const embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("✅ Guild Bot Name Set!")
        .setDescription(
          `**Bot name has been set for this server:**\n\n` +
          `**Name:** ${finalName}\n` +
          `**Server:** ${message.guild.name}\n\n` +
          `*This name will be used in welcome messages and embeds for this server only.*\n` +
          `*Note: The actual bot appearance remains global due to Discord limitations.*`
        )
        .setThumbnail(
          client.user.displayAvatarURL({ dynamic: true, size: 128 })
        )
        .setFooter({ text: "Den Manager • Guild Name Updated" });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error setting guild bot name:", error);

      let errorMessage = "❌ Failed to set guild bot name!";
      if (error.code === 50035) {
        errorMessage = "❌ Invalid name format! Please use a valid username.";
      } else if (error.code === 50013) {
        errorMessage = "❌ Missing permissions to update username!";
      } else if (error.message.includes("rate limit")) {
        errorMessage = "❌ Rate limited! Please wait before trying again.";
      }

      message.reply(errorMessage);
    }
  },
};
