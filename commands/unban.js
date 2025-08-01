const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .addStringOption((option) =>
      option
        .setName("user_id")
        .setDescription("The user ID to unban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the unban")
        .setRequired(false)
        .setMaxLength(512)
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

    const userId = interaction.options.getString("user_id");
    const reason = interaction.options.getString("reason") || "No reason provided";

    // Validate user ID format
    if (!/^\d{17,19}$/.test(userId)) {
      return interaction.reply({
        content: "❌ Invalid user ID format. Please provide a valid Discord user ID.",
        ephemeral: true,
      });
    }

    try {
      // Check if user is actually banned
      const bans = await interaction.guild.bans.fetch();
      const bannedUser = bans.get(userId);

      if (!bannedUser) {
        return interaction.reply({
          content: "❌ This user is not banned from this server.",
          ephemeral: true,
        });
      }

      // Unban the user
      await interaction.guild.members.unban(userId, reason);

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("✅ User Unbanned")
        .setDescription(`Successfully unbanned **${bannedUser.user.tag}**`)
        .addFields(
          {
            name: "User",
            value: `${bannedUser.user.tag} (${userId})`,
            inline: true,
          },
          {
            name: "Unbanned By",
            value: `${interaction.user.tag}`,
            inline: true,
          },
          { name: "Reason", value: reason, inline: false }
        )
        .setThumbnail(bannedUser.user.displayAvatarURL())
        .setTimestamp();

      // Create confirmation buttons for invite
      const inviteButton = new ButtonBuilder()
        .setCustomId("send_invite")
        .setLabel("📨 Send Invite")
        .setStyle(ButtonStyle.Primary);

      const skipButton = new ButtonBuilder()
        .setCustomId("skip_invite")
        .setLabel("⏭️ Skip")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(inviteButton, skipButton);

      await interaction.reply({
        embeds: [successEmbed],
        components: [row],
      });

      // Handle button interactions
      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "send_invite") {
          try {
            // Create a permanent invite
            const invite = await interaction.channel.createInvite({
              maxAge: 0, // Permanent
              maxUses: 0, // Unlimited uses
              unique: false,
              reason: `Invite for unbanned user ${bannedUser.user.tag}`,
            });

            // Try to DM the unbanned user
            try {
              const dmEmbed = new EmbedBuilder()
                .setColor("#00ff00")
                .setTitle("✅ You have been unbanned")
                .setDescription(
                  `You have been unbanned from **${interaction.guild.name}**`
                )
                .addFields(
                  { name: "Reason", value: reason, inline: false },
                  {
                    name: "Invite Link",
                    value: `[Click here to rejoin the server](${invite.url})`,
                    inline: false,
                  }
                )
                .setTimestamp();

              await bannedUser.user.send({ embeds: [dmEmbed] });

              const inviteSentEmbed = new EmbedBuilder()
                .setColor("#00ff00")
                .setTitle("📨 Invite Sent")
                .setDescription(`Invite link has been sent to **${bannedUser.user.tag}**`)
                .addFields(
                  {
                    name: "Invite Link",
                    value: invite.url,
                    inline: false,
                  }
                )
                .setTimestamp();

              await i.update({
                embeds: [inviteSentEmbed],
                components: [],
              });
            } catch (dmError) {
              // If DM fails, show the invite link to the moderator
              const inviteEmbed = new EmbedBuilder()
                .setColor("#ff9900")
                .setTitle("📨 Invite Created")
                .setDescription(`Could not DM **${bannedUser.user.tag}**, but invite link is ready`)
                .addFields(
                  {
                    name: "Invite Link",
                    value: invite.url,
                    inline: false,
                  },
                  {
                    name: "Note",
                    value: "You can copy and send this invite link to the user manually.",
                    inline: false,
                  }
                )
                .setTimestamp();

              await i.update({
                embeds: [inviteEmbed],
                components: [],
              });
            }
          } catch (inviteError) {
            console.error("Error creating invite:", inviteError);
            const errorEmbed = new EmbedBuilder()
              .setColor("#ff0000")
              .setTitle("❌ Error Creating Invite")
              .setDescription("Failed to create invite link. The user has been unbanned successfully.")
              .setTimestamp();

            await i.update({
              embeds: [errorEmbed],
              components: [],
            });
          }
        }

        if (i.customId === "skip_invite") {
          const skipEmbed = new EmbedBuilder()
            .setColor("#999999")
            .setTitle("⏭️ Invite Skipped")
            .setDescription("User has been unbanned successfully. No invite link was sent.")
            .setTimestamp();

          await i.update({
            embeds: [skipEmbed],
            components: [],
          });
        }

        collector.stop();
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          interaction.editReply({
            content: "⏰ Invite option timed out. User has been unbanned successfully.",
            embeds: [],
            components: [],
          });
        }
      });

      // Log to automod channel if exists
      const automodData = client.getAutomodData(interaction.guild.id);
      if (automodData.logChannel) {
        const logChannel = interaction.guild.channels.cache.get(
          automodData.logChannel
        );
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("🔨 Moderation Action: Unban")
            .addFields(
              {
                name: "User",
                value: `${bannedUser.user.tag} (${userId})`,
                inline: true,
              },
              {
                name: "Moderator",
                value: `${interaction.user.tag}`,
                inline: true,
              },
              {
                name: "Channel",
                value: interaction.channel.toString(),
                inline: true,
              },
              { name: "Reason", value: reason, inline: false }
            )
            .setThumbnail(bannedUser.user.displayAvatarURL())
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      console.error("Error unbanning user:", error);

      let errorMessage = "❌ Failed to unban the user. ";
      if (error.code === 10013) {
        errorMessage += "User not found.";
      } else if (error.code === 50013) {
        errorMessage += "I don't have permission to unban this user.";
      } else {
        errorMessage += "Please check my permissions and try again.";
      }

      // Check if interaction has already been replied to
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: errorMessage,
          ephemeral: true,
        });
      }
    }
  },
}; 