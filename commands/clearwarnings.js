const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear all warnings for a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to clear warnings for")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for clearing warnings")
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
    const reason =
      interaction.options.getString("reason") || "No reason provided";
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
        return interaction.reply({
          content: `❌ **${targetUser.tag}** has no warnings to clear.`,
          ephemeral: true,
        });
      }

      // Count active warnings
      const activeWarnings = userWarnings.filter(
        (warning) =>
          Date.now() - warning.timestamp < automodData.warnSystem.warnExpiry
      );

      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor("#ff9900")
        .setTitle("⚠️ Confirm Warning Clearance")
        .setDescription(
          `Are you sure you want to clear all warnings for **${targetUser.tag}**?`
        )
        .addFields(
          {
            name: "User",
            value: `${targetUser} (${targetUser.tag})`,
            inline: true,
          },
          {
            name: "Total Warnings",
            value: `${userWarnings.length}`,
            inline: true,
          },
          {
            name: "Active Warnings",
            value: `${activeWarnings.length}`,
            inline: true,
          },
          {
            name: "Moderator",
            value: `${interaction.user} (${interaction.user.tag})`,
            inline: true,
          },
          { name: "Reason", value: reason, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setFooter({ text: "This action cannot be undone!" })
        .setTimestamp();

      // Create confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId("confirm_clear_warnings")
        .setLabel("✅ Confirm")
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId("cancel_clear_warnings")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(
        confirmButton,
        cancelButton
      );

      await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        ephemeral: true,
      });

      // Handle button interactions
      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "confirm_clear_warnings") {
          // Clear all warnings for the user
          delete automodData.userWarnings[targetUser.id];
          client.saveAutomodData(interaction.guild.id, automodData);

          // Create success embed
          const successEmbed = new EmbedBuilder()
            .setColor("#00ff88")
            .setTitle("✅ Warnings Cleared")
            .setDescription(
              `Successfully cleared all warnings for **${targetUser.tag}**`
            )
            .addFields(
              {
                name: "User",
                value: `${targetUser} (${targetUser.tag})`,
                inline: true,
              },
              {
                name: "Warnings Cleared",
                value: `${userWarnings.length}`,
                inline: true,
              },
              {
                name: "Cleared By",
                value: `${interaction.user} (${interaction.user.tag})`,
                inline: true,
              },
              { name: "Reason", value: reason, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

          await i.update({
            embeds: [successEmbed],
            components: [],
          });

                     // Try to DM the user
           try {
             const dmEmbed = new EmbedBuilder()
               .setColor("#00ff88")
               .setTitle("✅ Warnings Cleared")
               .setDescription(
                 `Your warnings have been cleared in **${interaction.guild.name}**`
               )
               .addFields(
                 { name: "Reason", value: reason, inline: false }
               )
               .setTimestamp();

             await targetMember.send({ embeds: [dmEmbed] });
           } catch (dmError) {
             // Only log if it's a genuine DM failure (user blocked bot or has DMs disabled)
             if (dmError.code === 50007) { // Cannot send DM to this user
               console.log(
                 `Could not DM ${targetUser.tag} about warning clearance`
               );
             } else {
               console.log(`DM attempt for ${targetUser.tag} failed with error: ${dmError.message}`);
             }
           }

          // Log to automod channel if exists
          if (automodData.logChannel) {
            const logChannel = interaction.guild.channels.cache.get(
              automodData.logChannel
            );
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor("#00ff88")
                .setTitle("🔨 Moderation Action: Warnings Cleared")
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
                    name: "Warnings Cleared",
                    value: `${userWarnings.length}`,
                    inline: true,
                  },
                  { name: "Reason", value: reason, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

              await logChannel.send({ embeds: [logEmbed] });
            }
          }

          collector.stop();
        }

        if (i.customId === "cancel_clear_warnings") {
          const cancelEmbed = new EmbedBuilder()
            .setColor("#999999")
            .setTitle("❌ Action Cancelled")
            .setDescription("Warning clearance has been cancelled.")
            .setTimestamp();

          await i.update({
            embeds: [cancelEmbed],
            components: [],
          });

          collector.stop();
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          interaction.editReply({
            content: "⏰ Confirmation timed out. Warning clearance cancelled.",
            embeds: [],
            components: [],
          });
        }
      });
    } catch (error) {
      console.error("Error clearing user warnings:", error);
      
      // Check if interaction has already been replied to
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Failed to clear user warnings. Please try again.",
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: "❌ Failed to clear user warnings. Please try again.",
          ephemeral: true,
        });
      }
    }
  },
};
