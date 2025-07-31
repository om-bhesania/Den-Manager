const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to timeout")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration (e.g., 10m, 1h, 1d)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(false)
        .setMaxLength(512)
    )
    .setDefaultMemberPermissions(268435456n), // MODERATE_MEMBERS

  async execute(interaction, args, client) {
    // Check permissions
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content:
          "❌ You need **Moderate Members** permission to use this command.",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("user");
    const durationStr = interaction.options.getString("duration");
    const reason =
      interaction.options.getString("reason") || "No reason provided";
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    if (!targetMember) {
      return interaction.reply({
        content: "❌ User not found in this server.",
        ephemeral: true,
      });
    }

    // Prevent self-timeout
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You cannot timeout yourself!",
        ephemeral: true,
      });
    }

    // Prevent timing out the bot
    if (targetUser.id === client.user.id) {
      return interaction.reply({
        content: "❌ You cannot timeout me!",
        ephemeral: true,
      });
    }

    // Check if target is moderatable
    if (!targetMember.moderatable) {
      return interaction.reply({
        content:
          "❌ I cannot timeout this user. They may have higher permissions than me.",
        ephemeral: true,
      });
    }

    // Check role hierarchy
    if (
      targetMember.roles.highest.position >=
      interaction.member.roles.highest.position
    ) {
      return interaction.reply({
        content:
          "❌ You cannot timeout this user as they have equal or higher roles than you.",
        ephemeral: true,
      });
    }

    // Parse duration
    const duration = parseDuration(durationStr);
    if (!duration) {
      return interaction.reply({
        content:
          "❌ Invalid duration format. Use formats like: `10m`, `1h`, `2d`, `1w`\n\n**Examples:**\n• `5m` = 5 minutes\n• `1h` = 1 hour\n• `2d` = 2 days\n• `1w` = 1 week",
        ephemeral: true,
      });
    }

    // Discord timeout limits (max 28 days)
    const maxTimeout = 28 * 24 * 60 * 60 * 1000; // 28 days in milliseconds
    if (duration > maxTimeout) {
      return interaction.reply({
        content: "❌ Timeout duration cannot exceed 28 days.",
        ephemeral: true,
      });
    }

    try {
      // Try to DM the user before timeout
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("⏰ You have been timed out")
          .setDescription(
            `You have been timed out in **${interaction.guild.name}**`
          )
          .addFields(
            { name: "Duration", value: formatDuration(duration), inline: true },
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: interaction.user.tag, inline: true }
          )
          .setTimestamp();

        await targetMember.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log(`Could not DM ${targetUser.tag} about timeout`);
      }

      // Timeout the user
      await targetMember.timeout(duration, reason);

      // Calculate timeout end time
      const endTime = new Date(Date.now() + duration);

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor("#ff9900")
        .setTitle("⏰ User Timed Out")
        .setDescription(`Successfully timed out **${targetUser.tag}**`)
        .addFields(
          {
            name: "User",
            value: `${targetUser} (${targetUser.tag})`,
            inline: true,
          },
          {
            name: "Moderator",
            value: `${interaction.user} (${interaction.user.tag})`,
            inline: true,
          },
          { name: "Duration", value: formatDuration(duration), inline: true },
          {
            name: "Ends At",
            value: `<t:${Math.floor(endTime.getTime() / 1000)}:f>`,
            inline: true,
          },
          { name: "Reason", value: reason, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed] });

      // Log to automod channel if exists
      const automodData = client.getAutomodData(interaction.guild.id);
      if (automodData.logChannel) {
        const logChannel = interaction.guild.channels.cache.get(
          automodData.logChannel
        );
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#ff9900")
            .setTitle("🔨 Moderation Action: Timeout")
            .addFields(
              {
                name: "User",
                value: `${targetUser} (${targetUser.tag})`,
                inline: true,
              },
              {
                name: "Moderator",
                value: `${interaction.user} (${interaction.user.tag})`,
                inline: true,
              },
              {
                name: "Channel",
                value: interaction.channel.toString(),
                inline: true,
              },
              {
                name: "Duration",
                value: formatDuration(duration),
                inline: true,
              },
              {
                name: "Ends At",
                value: `<t:${Math.floor(endTime.getTime() / 1000)}:f>`,
                inline: true,
              },
              { name: "Reason", value: reason, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      console.error("Error timing out user:", error);
      await interaction.reply({
        content:
          "❌ Failed to timeout the user. Please check my permissions and try again.",
        ephemeral: true,
      });
    }
  },
};

// Helper function to parse duration strings
function parseDuration(durationStr) {
  const regex = /^(\d+)([smhdw])$/i;
  const match = durationStr.match(regex);

  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
  };

  return value * multipliers[unit];
}

// Helper function to format duration for display
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) {
    return `${weeks} week${weeks > 1 ? "s" : ""}`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else {
    return `${seconds} second${seconds > 1 ? "s" : ""}`;
  }
}
