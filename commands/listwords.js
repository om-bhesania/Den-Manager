const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("listwords")
    .setDescription("List all blacklisted words")
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

    try {
      const automodData = client.getAutomodData(interaction.guild.id);
      const blacklistedWords = automodData.profanityFilter.blacklistedWords;

      if (blacklistedWords.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("📝 Profanity Blacklist")
          .setDescription("No words are currently blacklisted.")
          .addFields({
            name: "Profanity Filter Status",
            value: automodData.profanityFilter.enabled
              ? "✅ Enabled"
              : "❌ Disabled",
            inline: true,
          })
          .setFooter({ text: "Use /addword to add words to the blacklist" })
          .setTimestamp();

        return interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
      }

      // Split words into chunks for multiple embeds if needed (Discord has field value limits)
      const wordsPerPage = 20;
      const totalPages = Math.ceil(blacklistedWords.length / wordsPerPage);
      const currentPage = 1; // For now, just show first page

      const startIndex = (currentPage - 1) * wordsPerPage;
      const endIndex = Math.min(
        startIndex + wordsPerPage,
        blacklistedWords.length
      );
      const wordsToShow = blacklistedWords.slice(startIndex, endIndex);

      // Create censored version for display (replace middle characters with *)
      const censoredWords = wordsToShow.map((word) => {
        if (word.length <= 3) {
          return word[0] + "*".repeat(word.length - 1);
        } else {
          return word[0] + "*".repeat(word.length - 2) + word[word.length - 1];
        }
      });

      const embed = new EmbedBuilder()
        .setColor("#ff4444")
        .setTitle("📝 Profanity Blacklist")
        .setDescription(
          `Showing ${wordsToShow.length} of ${blacklistedWords.length} blacklisted words`
        )
        .addFields(
          {
            name: "Profanity Filter Status",
            value: automodData.profanityFilter.enabled
              ? "✅ Enabled"
              : "❌ Disabled",
            inline: true,
          },
          {
            name: "Total Words",
            value: `${blacklistedWords.length}`,
            inline: true,
          },
          { name: "Action", value: "Delete message + Warning", inline: true }
        )
        .setFooter({
          text: `Page ${currentPage} of ${totalPages} • Words are censored for display`,
        })
        .setTimestamp();

      // Add words in chunks to avoid field value limits
      const wordsText = censoredWords
        .map((word, index) => `${startIndex + index + 1}. ${word}`)
        .join("\n");

      if (wordsText.length <= 1024) {
        embed.addFields({
          name: "Blacklisted Words",
          value: wordsText,
          inline: false,
        });
      } else {
        // Split into multiple fields if too long
        const chunks = [];
        let currentChunk = "";

        censoredWords.forEach((word, index) => {
          const line = `${startIndex + index + 1}. ${word}\n`;
          if (currentChunk.length + line.length > 1024) {
            chunks.push(currentChunk);
            currentChunk = line;
          } else {
            currentChunk += line;
          }
        });

        if (currentChunk) chunks.push(currentChunk);

        chunks.forEach((chunk, index) => {
          embed.addFields({
            name: index === 0 ? "Blacklisted Words" : "Continued...",
            value: chunk,
            inline: false,
          });
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

      // If there are more pages, could add pagination buttons here in the future
      if (totalPages > 1) {
        // For now, just mention there are more words
        await interaction.followUp({
          content: `📄 **Note:** Only showing first ${wordsPerPage} words. Total: ${blacklistedWords.length} words.`,
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error listing blacklisted words:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "❌ Failed to retrieve the blacklisted words. Please try again.",
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content:
            "❌ Failed to retrieve the blacklisted words. Please try again.",
          ephemeral: true,
        });
      }
    }
  },
};
