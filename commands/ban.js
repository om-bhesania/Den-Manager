const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false)
        .setMaxLength(512)
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_days")
        .setDescription("Number of days of messages to delete (0-7)")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
    .setDefaultMemberPermissions(4n), // BAN_MEMBERS

  async execute(interaction, args, client) {
    // Check permissions
    if (!interaction.member.permissions.has("BanMembers")) {
      return interaction.reply({
        content: "❌ You need **Ban Members** permission to use this command.",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") || 0;
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    // Prevent self-ban
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You cannot ban yourself!",
        ephemeral: true,
      });
    }

    // Prevent banning the bot
    if (targetUser.id === client.user.id) {
      return interaction.reply({
        content: "❌ I cannot ban myself!",
        ephemeral: true,
      });
    }

    // Check if user is in the server
    if (targetMember) {
      // Check if target is bannable
      if (!targetMember.bannable) {
        return interaction.reply({
          content:
            "❌ I cannot ban this user. They may have higher permissions than me.",
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
            "❌ You cannot ban this user as they have equal or higher roles than you.",
          ephemeral: true,
        });
      }
    }

    try {
      // Try to DM the user before banning (only if they're in the server)
      if (targetMember) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("🔨 You have been banned")
            .setDescription(
              `You have been banned from **${interaction.guild.name}**`
            )
            .addFields(
              { name: "Reason", value: reason, inline: false },
              { name: "Moderator", value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

          await targetMember.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`Could not DM ${targetUser.tag} about ban`);
        }
      }

      // Ban the user
      await interaction.guild.members.ban(targetUser, {
        reason: reason,
        deleteMessageDays: deleteDays,
      });

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("🔨 User Banned")
        .setDescription(`Successfully banned **${targetUser.tag}**`)
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
            name: "Messages Deleted",
            value: `${deleteDays} days`,
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
            .setColor("#ff0000")
            .setTitle("🔨 Moderation Action: Ban")
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
                name: "Messages Deleted",
                value: `${deleteDays} days`,
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
      console.error("Error banning user:", error);

      let errorMessage = "❌ Failed to ban the user. ";
      if (error.code === 10013) {
        errorMessage += "User not found.";
      } else if (error.code === 50013) {
        errorMessage += "I don't have permission to ban this user.";
      } else {
        errorMessage += "Please check my permissions and try again.";
      }

      await interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  },
};
