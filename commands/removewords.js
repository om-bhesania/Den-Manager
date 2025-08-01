const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removeword")
    .setDescription("Remove a word from the profanity blacklist")
    .addStringOption((option) =>
      option
        .setName("word")
        .setDescription("The word to remove from the blacklist")
        .setRequired(true)
        .setMaxLength(50)
    )
    .setDefaultMemberPermissions(16n), // MANAGE_CHANNELS

  async execute(interaction, args, client) {
    // Check permissions
    if (
      !interaction.member.permissions.has(["ManageChannels", "ManageRoles"])
    ) {
      return interaction.reply({
        content:
          "❌ You need **Manage Channels** and **Manage Roles** permissions to use this command.",
        ephemeral: true,
      });
    }

    const word = interaction.options.getString("word").toLowerCase().trim();

    if (!word || word.length === 0) {
      return interaction.reply({
        content: "❌ Please provide a valid word to remove from the blacklist.",
        ephemeral: true,
      });
    }

    try {
      const automodData = client.getAutomodData(interaction.guild.id);

      // Check if word exists in blacklist
      const wordIndex =
        automodData.profanityFilter.blacklistedWords.indexOf(word);
      if (wordIndex === -1) {
        return interaction.reply({
          content: `❌ The word "**${word}**" is not in the blacklist.`,
          ephemeral: true,
        });
      }

      // Remove word from blacklist
      automodData.profanityFilter.blacklistedWords.splice(wordIndex, 1);
      client.saveAutomodData(interaction.guild.id, automodData);

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor("#ff9900")
        .setTitle("🗑️ Word Removed from Blacklist")
        .setDescription(
          `Successfully removed "**${word}**" from the profanity blacklist.`
        )
        .addFields(
          {
            name: "Total Blacklisted Words",
            value: `${automodData.profanityFilter.blacklistedWords.length}`,
            inline: true,
          },
          {
            name: "Profanity Filter Status",
            value: automodData.profanityFilter.enabled
              ? "✅ Enabled"
              : "❌ Disabled",
            inline: true,
          },
          { name: "Removed By", value: interaction.user.tag, inline: true }
        )
        .setFooter({ text: "Use /addword to add words to the blacklist" })
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      // Log to automod channel if exists
      if (automodData.logChannel) {
        const logChannel = interaction.guild.channels.cache.get(
          automodData.logChannel
        );
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#ff9900")
            .setTitle("📝 Blacklist Updated")
            .setDescription(`Word removed from profanity blacklist`)
            .addFields(
              { name: "Word Removed", value: `"**${word}**"`, inline: true },
              {
                name: "Removed By",
                value: `${interaction.user} (${interaction.user.tag})`,
                inline: true,
              },
              {
                name: "Total Words",
                value: `${automodData.profanityFilter.blacklistedWords.length}`,
                inline: true,
              }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      console.error("Error removing word from blacklist:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "❌ Failed to remove the word from the blacklist. Please try again.",
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content:
            "❌ Failed to remove the word from the blacklist. Please try again.",
          ephemeral: true,
        });
      }
    }
  },
};
