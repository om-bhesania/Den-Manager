const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the kick")
        .setRequired(false)
        .setMaxLength(512)
    )
    .setDefaultMemberPermissions(2n), // KICK_MEMBERS

  async execute(interaction, args, client) {
    // Check permissions
    if (!interaction.member.permissions.has("KickMembers")) {
      return interaction.reply({
        content: "❌ You need **Kick Members** permission to use this command.",
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

    // Prevent self-kick
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You cannot kick yourself!",
        ephemeral: true,
      });
    }

    // Prevent kicking the bot
    if (targetUser.id === client.user.id) {
      return interaction.reply({
        content: "❌ I cannot kick myself!",
        ephemeral: true,
      });
    }

    // Check if target is kickable
    if (!targetMember.kickable) {
      return interaction.reply({
        content:
          "❌ I cannot kick this user. They may have higher permissions than me.",
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
          "❌ You cannot kick this user as they have equal or higher roles than you.",
        ephemeral: true,
      });
    }

    try {
      // Try to DM the user before kicking
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#ff4444")
          .setTitle("👢 You have been kicked")
          .setDescription(
            `You have been kicked from **${interaction.guild.name}**`
          )
          .addFields(
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: interaction.user.tag, inline: true }
          )
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (error) {
        // User has DMs disabled or blocked the bot
        console.log(`Could not DM ${targetUser.tag} about their kick.`);
      }

      // Kick the user
      await targetMember.kick(reason);

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("✅ User Kicked Successfully")
        .setDescription(
          `**${targetUser.tag}** has been kicked from the server.`
        )
        .addFields(
          {
            name: "User",
            value: `${targetUser.tag} (${targetUser.id})`,
            inline: true,
          },
          { name: "Moderator", value: interaction.user.tag, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp()
        .setFooter({
          text: `Kicked by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("Error kicking user:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error")
        .setDescription(
          "An error occurred while trying to kick the user. Please try again later."
        )
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
