const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure Den Manager bot for your server")
    .setDefaultMemberPermissions(8n), // Administrator permission

  async execute(interaction, args, client) {
    const guildData = client.getGuildData(interaction.guild.id);

    // Ensure the guild data has the proper structure
    if (!guildData.setup) {
      guildData.setup = {
        welcomeChannel: null,
        roles: [],
        completed: false,
        steps: {
          welcomeChannel: false,
          roles: false,
        },
      };
    }

    if (!guildData.setup.steps) {
      guildData.setup.steps = {
        welcomeChannel: false,
        roles: false,
      };
    }

    // Check which steps are completed
    const steps = guildData.setup.steps;
    let currentStep = "welcomeChannel";

    if (steps.welcomeChannel && !steps.roles) {
      currentStep = "roles";
    } else if (steps.welcomeChannel && steps.roles) {
      currentStep = "completed";
    }

    switch (currentStep) {
      case "welcomeChannel":
        await handleWelcomeChannelStep(interaction, client, guildData);
        break;
      case "roles":
        await handleRolesStep(interaction, client, guildData);
        break;
      case "completed":
        await handleCompletedStep(interaction, client, guildData);
        break;
    }
  },
};

async function handleWelcomeChannelStep(interaction, client, guildData) {
  const channels = interaction.guild.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildText)
    .first(25); // Discord limit

  if (channels.length === 0) {
    return interaction.reply({
      content: "❌ No text channels found in this server!",
      ephemeral: true,
    });
  }

  const options = channels.map((channel) => ({
    label: `#${channel.name}`,
    value: channel.id,
    description: `Channel for welcome messages`,
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("setup_welcome_channel")
    .setPlaceholder("🎮 Select a welcome channel")
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("🎮 Den Manager Setup - Step 1/2")
    .setDescription(
      "**Welcome Channel Setup**\n\nSelect a channel where welcome messages will be sent when new members join your gaming community!"
    )
    .setFooter({ text: "Den Manager • Step 1 of 2" });

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  // Handle the selection
  const filter = (i) =>
    i.customId === "setup_welcome_channel" && i.user.id === interaction.user.id;

  try {
    const response = await interaction.followUp({
      content: "Waiting for channel selection...",
      ephemeral: true,
    });

    const collectorFilter = (i) =>
      i.customId === "setup_welcome_channel" &&
      i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter: collectorFilter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      const channelId = i.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);

      guildData.setup.welcomeChannel = channelId;
      guildData.setup.steps.welcomeChannel = true;
      client.saveGuildData(interaction.guild.id, guildData);

      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("#00ff88")
            .setTitle("✅ Welcome Channel Set!")
            .setDescription(
              `Welcome messages will be sent to ${channel}\n\nNow let's set up auto-roles! Use \`/setup\` again to continue.`
            )
            .setFooter({ text: "Den Manager • Step 1 Complete" }),
        ],
        components: [],
      });

      collector.stop();
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        interaction.editReply({
          content: "⏰ Setup timed out. Please run `/setup` again.",
          components: [],
        });
      }
    });
  } catch (error) {
    console.error("Error in welcome channel setup:", error);
  }
}

async function handleRolesStep(interaction, client, guildData) {
  const roles = interaction.guild.roles.cache
    .filter((role) => !role.managed && role.name !== "@everyone")
    .first(25); // Discord limit

  if (roles.length === 0) {
    return interaction.reply({
      content: "❌ No assignable roles found in this server!",
      ephemeral: true,
    });
  }

  const options = roles.map((role) => ({
    label: role.name,
    value: role.id,
    description: `Auto-assign this role to new members`,
    emoji: "🎮",
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("setup_roles")
    .setPlaceholder("🎮 Select roles to auto-assign")
    .addOptions(options)
    .setMinValues(0)
    .setMaxValues(Math.min(roles.length, 25));

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("🎮 Den Manager Setup - Step 2/2")
    .setDescription(
      "**Auto-Role Setup**\n\nSelect roles that will be automatically assigned to new members when they join your gaming community!\n\n*You can select multiple roles or none at all.*"
    )
    .setFooter({ text: "Den Manager • Step 2 of 2" });

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  // Handle the selection
  const collectorFilter = (i) =>
    i.customId === "setup_roles" && i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({
    filter: collectorFilter,
    time: 60000,
  });

  collector.on("collect", async (i) => {
    const selectedRoles = i.values || [];
    const roleNames = selectedRoles.map((roleId) => {
      const role = interaction.guild.roles.cache.get(roleId);
      return role ? role.name : "Unknown Role";
    });

    guildData.setup.roles = selectedRoles;
    guildData.setup.steps.roles = true;
    guildData.setup.completed = true;
    client.saveGuildData(interaction.guild.id, guildData);

    const rolesList =
      roleNames.length > 0
        ? roleNames.map((name) => `• ${name}`).join("\n")
        : "• None selected";

    await i.update({
      embeds: [
        new EmbedBuilder()
          .setColor("#00ff88")
          .setTitle("🎉 Setup Complete!")
          .setDescription(
            `**Den Manager is now configured!**\n\n**Welcome Channel:** <#${guildData.setup.welcomeChannel}>\n**Auto-Roles:**\n${rolesList}\n\n**Available Commands:**\n• \`!dm test\` - Send a test welcome message\n• \`!dm bg <image_url>\` - Set welcome background image`
          )
          .setFooter({ text: "Den Manager • Ready to Welcome!" }),
      ],
      components: [],
    });

    collector.stop();
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction.editReply({
        content: "⏰ Setup timed out. Please run `/setup` again.",
        components: [],
      });
    }
  });
}

async function handleCompletedStep(interaction, client, guildData) {
  const welcomeChannel = interaction.guild.channels.cache.get(
    guildData.setup.welcomeChannel
  );
  const roleNames = guildData.setup.roles.map((roleId) => {
    const role = interaction.guild.roles.cache.get(roleId);
    return role ? role.name : "Unknown Role";
  });

  const rolesList =
    roleNames.length > 0
      ? roleNames.map((name) => `• ${name}`).join("\n")
      : "• None";

  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("🎮 Den Manager Configuration")
    .setDescription(
      `**Current Settings:**\n\n**Welcome Channel:** ${
        welcomeChannel || "Not set"
      }\n**Auto-Roles:**\n${rolesList}\n\n**Available Commands:**\n• \`!dm test\` - Send a test welcome message\n• \`!dm bg <image_url>\` - Set welcome background image`
    )
    .setFooter({ text: "Den Manager • Already Configured" });

  const reconfigureButton = new ButtonBuilder()
    .setCustomId("reconfigure_setup")
    .setLabel("🔄 Reconfigure")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(reconfigureButton);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  // Handle reconfiguration
  const collectorFilter = (i) =>
    i.customId === "reconfigure_setup" && i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({
    filter: collectorFilter,
    time: 60000,
  });

  collector.on("collect", async (i) => {
    // Reset setup progress
    guildData.setup.steps = {
      welcomeChannel: false,
      roles: false,
    };
    guildData.setup.completed = false;
    client.saveGuildData(interaction.guild.id, guildData);

    await i.update({
      embeds: [
        new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("🔄 Reconfiguring...")
          .setDescription(
            "Setup has been reset. Use `/setup` again to reconfigure Den Manager."
          )
          .setFooter({ text: "Den Manager • Reset Complete" }),
      ],
      components: [],
    });

    collector.stop();
  });
}
