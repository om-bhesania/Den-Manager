const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a specified number of messages from the channel")
    .addIntegerOption((option) =>
      option
        .setName("count")
        .setDescription(
          "Number of messages to delete (1-100). Leave empty to delete maximum allowed (100)"
        )
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const count = interaction.options.getInteger("count"); // Optional count
    const isDeleteAll = !count; // If no count provided, delete all

    // Check if user has manage messages permission
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
    ) {
      return interaction.reply({
        content:
          '❌ You need the "Manage Messages" permission to use this command!',
        ephemeral: true,
      });
    }

    // Check if bot has manage messages permission
    if (
      !interaction.guild.members.me.permissions.has(
        PermissionFlagsBits.ManageMessages
      )
    ) {
      return interaction.reply({
        content:
          '❌ I need the "Manage Messages" permission to delete messages!',
        ephemeral: true,
      });
    }

    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setColor("#ff9900")
      .setTitle("🗑️ Confirm Message Deletion")
      .setDescription(
        isDeleteAll
          ? `Are you sure you want to delete **ALL messages** from ${interaction.channel}?\n\n⚠️ **This will delete every message in this channel!**`
          : `Are you sure you want to delete **${count}** message${
              count === 1 ? "" : "s"
            } from ${interaction.channel}?`
      )
      .addFields(
        {
          name: "⚠️ Warning",
          value: "This action cannot be undone!",
          inline: false,
        },
        {
          name: "📝 Note",
          value: isDeleteAll
            ? "This will attempt to delete ALL messages in the channel. Messages older than 14 days cannot be bulk deleted due to Discord limitations."
            : "Messages older than 14 days cannot be bulk deleted due to Discord limitations.",
          inline: false,
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // Create confirmation buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("purge_confirm")
        .setLabel("Yes, Delete")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️"),
      new ButtonBuilder()
        .setCustomId("purge_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌")
    );

    // Send confirmation message
    await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true,
    });

    // Create collector for button interactions
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 30000, // 30 seconds timeout
    });

    collector.on("collect", async (i) => {
      if (i.customId === "purge_confirm") {
        try {
          // Fetch messages to delete
          const messages = await interaction.channel.messages.fetch({
            limit: count || 100, // Use 100 if no count specified
          });

          // Filter out messages older than 14 days
          const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
          const messagesToDelete = messages.filter(
            (msg) => msg.createdTimestamp > twoWeeksAgo
          );
          const oldMessages = messages.size - messagesToDelete.size;

          if (messagesToDelete.size === 0) {
            const errorEmbed = new EmbedBuilder()
              .setColor("#ff0000")
              .setTitle("❌ Unable to Delete Messages")
              .setDescription(
                "All messages in the specified range are older than 14 days and cannot be bulk deleted."
              )
              .setTimestamp();

                      await i.editReply({
            embeds: [errorEmbed],
            components: [],
          });
          return;
          }

          // Delete messages
          await interaction.channel.bulkDelete(messagesToDelete, true);

          // Create success embed
          const successEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("✅ Messages Deleted Successfully")
            .setDescription(
              `Successfully deleted **${messagesToDelete.size}** message${
                messagesToDelete.size === 1 ? "" : "s"
              } from ${interaction.channel}.`
            )
            .setFooter({
              text: `Deleted by ${interaction.user.username}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();

          if (oldMessages > 0) {
            successEmbed.addFields({
              name: "⚠️ Note",
              value: `${oldMessages} message${oldMessages === 1 ? "" : "s"} ${
                oldMessages === 1 ? "was" : "were"
              } skipped (older than 14 days).`,
              inline: false,
            });
          }

          await i.editReply({
            embeds: [successEmbed],
            components: [],
          });
        } catch (error) {
          console.error("Error deleting messages:", error);

          const errorEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("❌ Error Deleting Messages")
            .setDescription(
              "An error occurred while trying to delete messages. Please check my permissions and try again."
            )
            .setTimestamp();

          await i.editReply({
            embeds: [errorEmbed],
            components: [],
          });
        }
      } else if (i.customId === "purge_cancel") {
        try {
          const cancelEmbed = new EmbedBuilder()
            .setColor("#6c757d")
            .setTitle("❌ Operation Cancelled")
            .setDescription("Message deletion has been cancelled.")
            .setTimestamp();

          await i.editReply({
            embeds: [cancelEmbed],
            components: [],
          });
        } catch (error) {
          console.error("Error cancelling purge:", error);
        }
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        const timeoutEmbed = new EmbedBuilder()
          .setColor("#6c757d")
          .setTitle("⏰ Confirmation Timeout")
          .setDescription(
            "Confirmation timed out. Message deletion has been cancelled."
          )
          .setTimestamp();

        interaction.editReply({
          embeds: [timeoutEmbed],
          components: [],
        }).catch(console.error);
      }
    });
  },
};
