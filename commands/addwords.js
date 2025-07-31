const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addword")
    .setDescription("Add a word to the profanity blacklist")
    .addStringOption((option) =>
      option
        .setName("word")
        .setDescription("The word to add to the blacklist")
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
        content: "❌ Please provide a valid word to add to the blacklist.",
        ephemeral: true,
      });
    }

    // Prevent adding very short words that might cause false positives
    if (word.length < 2) {
      return interaction.reply({
        content:
          "❌ Words must be at least 2 characters long to prevent false positives.",
        ephemeral: true,
      });
    }

    try {
      const automodData = client.getAutomodData(interaction.guild.id);

      // Check if word already exists
      if (automodData.profanityFilter.blacklistedWords.includes(word)) {
        return interaction.reply({
          content: `❌ The word "**${word}**" is already in the blacklist.`,
          ephemeral: true,
        });
      }

      // Add word to blacklist
      automodData.profanityFilter.blacklistedWords.push(word);
      client.saveAutomodData(interaction.guild.id, automodData);

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("✅ Word Added to Blacklist")
        .setDescription(
          `Successfully added "**${word}**" to the profanity blacklist.`
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
          { name: "Added By", value: interaction.user.tag, inline: true }
        )
        .setFooter({
          text: "Use /removeword to remove words from the blacklist",
        })
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      // Log to automod channel if exists
      if (automodData.logChannel) {
        const logChannel = interaction.guild.channels.cache.get(
          automodData.logChannel
        );
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#00ff88")
            .setTitle("📝 Blacklist Updated")
            .setDescription(`Word added to profanity blacklist`)
            .addFields(
              { name: "Word Added", value: `"**${word}**"`, inline: true },
              {
                name: "Added By",
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
      console.error("Error adding word to blacklist:", error);
      await interaction.reply({
        content:
          "❌ Failed to add the word to the blacklist. Please try again.",
        ephemeral: true,
      });
    }
  },
};
