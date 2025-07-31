const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to check warnings for")
        .setRequired(true)
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
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    if (!targetMember) {
      return interaction.reply({
        content: "❌ User not found in this server.",
        ephemeral: true,
      });
    }

    try {
      const automodData = client.getAutomodData(interaction.guild.id);
      const userWarnings = automodData.userWarnings[targetUser.id] || [];

      if (userWarnings.length === 0) {
        const noWarningsEmbed = new EmbedBuilder()
          .setColor("#00ff88")
          .setTitle("📋 User Warnings")
          .setDescription(`**${targetUser.tag}** has no warnings.`)
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: "Total Warnings", value: "0", inline: true },
            { name: "Active Warnings", value: "0", inline: true },
            { name: "Status", value: "✅ Clean Record", inline: true }
          )
          .setTimestamp();

        return interaction.reply({
          embeds: [noWarningsEmbed],
          ephemeral: true,
        });
      }

      // Filter active warnings (not expired)
      const activeWarnings = userWarnings.filter(
        (warning) =>
          Date.now() - warning.timestamp < automodData.warnSystem.warnExpiry
      );

      // Sort warnings by timestamp (newest first)
      const sortedWarnings = userWarnings.sort(
        (a, b) => b.timestamp - a.timestamp
      );

      const embed = new EmbedBuilder()
        .setColor(
          activeWarnings.length >= automodData.warnSystem.maxWarnings
            ? "#ff4444"
            : "#ff9900"
        )
        .setTitle("📋 User Warnings")
        .setDescription(`Warning history for **${targetUser.tag}**`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          {
            name: "Total Warnings",
            value: `${userWarnings.length}`,
            inline: true,
          },
          {
            name: "Active Warnings",
            value: `${activeWarnings.length}/${automodData.warnSystem.maxWarnings}`,
            inline: true,
          },
          {
            name: "Status",
            value:
              activeWarnings.length >= automodData.warnSystem.maxWarnings
                ? "⚠️ At Threshold"
                : "✅ Below Threshold",
            inline: true,
          }
        )
        .setFooter({ text: `Warnings expire after 7 days` })
        .setTimestamp();

      // Add warning details (limit to 10 most recent warnings to avoid embed limits)
      const warningsToShow = sortedWarnings.slice(0, 10);

      if (warningsToShow.length > 0) {
        const warningsList = warningsToShow
          .map((warning, index) => {
            const isActive =
              Date.now() - warning.timestamp <
              automodData.warnSystem.warnExpiry;
            const timeAgo = Math.floor(
              (Date.now() - warning.timestamp) / (1000 * 60 * 60 * 24)
            ); // days ago
            const timeDisplay =
              timeAgo === 0
                ? "Today"
                : `${timeAgo} day${timeAgo > 1 ? "s" : ""} ago`;
            const status = isActive ? "🟢" : "🔴";

            return `${status} **${index + 1}.** ${
              warning.reason
            }\n└ *${timeDisplay} by ${warning.moderator}*`;
          })
          .join("\n\n");

        embed.addFields({
          name: `Recent Warnings (${warningsToShow.length}${
            sortedWarnings.length > 10 ? ` of ${sortedWarnings.length}` : ""
          })`,
          value:
            warningsList.length > 1024
              ? warningsList.substring(0, 1020) + "..."
              : warningsList,
          inline: false,
        });
      }

      // Add legend
      embed.addFields({
        name: "Legend",
        value: "🟢 Active Warning | 🔴 Expired Warning",
        inline: false,
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error fetching user warnings:", error);
      await interaction.reply({
        content: "❌ Failed to retrieve user warnings. Please try again.",
        ephemeral: true,
      });
    }
  },
};
