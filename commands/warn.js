const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning")
        .setRequired(true)
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
    const reason = interaction.options.getString("reason");
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    if (!targetMember) {
      return interaction.reply({
        content: "❌ User not found in this server.",
        ephemeral: true,
      });
    }

    // Prevent self-warn
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You cannot warn yourself!",
        ephemeral: true,
      });
    }

    // Prevent warning the bot
    if (targetUser.id === client.user.id) {
      return interaction.reply({
        content: "❌ You cannot warn me!",
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
          "❌ You cannot warn this user as they have equal or higher roles than you.",
        ephemeral: true,
      });
    }

    try {
      const automodData = client.getAutomodData(interaction.guild.id);

      // Add warning to user's record
      if (!automodData.userWarnings[targetUser.id]) {
        automodData.userWarnings[targetUser.id] = [];
      }

      const warning = {
        reason: reason,
        timestamp: Date.now(),
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
      };

      automodData.userWarnings[targetUser.id].push(warning);
      client.saveAutomodData(interaction.guild.id, automodData);

      // Get current warning count (only active warnings)
      const activeWarnings = automodData.userWarnings[targetUser.id].filter(
        (w) => Date.now() - w.timestamp < automodData.warnSystem.warnExpiry
      );

      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("⚠️ Warning Received")
          .setDescription(
            `You have received a warning in **${interaction.guild.name}**`
          )
          .addFields(
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: interaction.user.tag, inline: true },
            {
              name: "Total Warnings",
              value: `${activeWarnings.length}/${automodData.warnSystem.maxWarnings}`,
              inline: true,
            }
          )
          .setFooter({ text: `Warnings expire after 7 days` })
          .setTimestamp();

        await targetMember.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log(`Could not DM ${targetUser.tag} about warning`);
      }

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor("#ff9900")
        .setTitle("⚠️ User Warned")
        .setDescription(`Successfully warned **${targetUser.tag}**`)
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
            name: "Total Warnings",
            value: `${activeWarnings.length}/${automodData.warnSystem.maxWarnings}`,
            inline: true,
          },
          { name: "Reason", value: reason, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      // Check if escalation is needed
      if (
        activeWarnings.length >= automodData.warnSystem.maxWarnings &&
        automodData.warnSystem.escalation.length > 0
      ) {
        const escalationIndex = Math.min(
          activeWarnings.length - automodData.warnSystem.maxWarnings,
          automodData.warnSystem.escalation.length - 1
        );
        const escalationAction =
          automodData.warnSystem.escalation[escalationIndex];

        successEmbed.addFields({
          name: "⚡ Escalation Triggered",
          value: `User will receive: **${
            escalationAction.charAt(0).toUpperCase() + escalationAction.slice(1)
          }**`,
          inline: false,
        });

        // Execute escalation action
        try {
          switch (escalationAction) {
            case "timeout":
              if (targetMember.moderatable) {
                await targetMember.timeout(
                  10 * 60 * 1000,
                  `Escalation: ${activeWarnings.length} warnings`
                );
                successEmbed.setColor("#ff6600");
              }
              break;

            case "kick":
              if (targetMember.kickable) {
                await targetMember.kick(
                  `Escalation: ${activeWarnings.length} warnings`
                );
                successEmbed.setColor("#ff4444");
              }
              break;

            case "ban":
              if (targetMember.bannable) {
                await targetMember.ban({
                  reason: `Escalation: ${activeWarnings.length} warnings`,
                });
                successEmbed.setColor("#ff0000");
              }
              break;
          }
        } catch (escalationError) {
          console.error("Error executing escalation:", escalationError);
          successEmbed.addFields({
            name: "❌ Escalation Failed",
            value: "Could not execute escalation action due to permissions.",
            inline: false,
          });
        }
      }

      await interaction.reply({ embeds: [successEmbed] });

      // Log to automod channel
      if (automodData.logChannel) {
        const logChannel = interaction.guild.channels.cache.get(
          automodData.logChannel
        );
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#ff9900")
            .setTitle("🔨 Moderation Action: Warning")
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
                name: "Warning Count",
                value: `${activeWarnings.length}/${automodData.warnSystem.maxWarnings}`,
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
      console.error("Error warning user:", error);
      await interaction.reply({
        content: "❌ Failed to warn the user. Please try again.",
        ephemeral: true,
      });
    }
  },
};
