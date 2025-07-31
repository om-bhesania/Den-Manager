const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modsetup")
    .setDescription("Configure automod and moderation tools for your server")
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

    const automodData = client.getAutomodData(interaction.guild.id);

    // Determine current step
    let currentStep = "enable";

    if (automodData.enabled !== undefined && automodData.logChannel !== null) {
      currentStep = "antifeatures";
    }
    if (automodData.antiSpam.enabled !== undefined) {
      currentStep = "profanity";
    }
    if (automodData.profanityFilter.enabled !== undefined) {
      currentStep = "warnings";
    }
    if (automodData.warnSystem.maxWarnings !== 3) {
      currentStep = "escalation";
    }
    if (automodData.warnSystem.escalation.length > 0) {
      currentStep = "completed";
    }

    switch (currentStep) {
      case "enable":
        await handleEnableStep(interaction, client, automodData);
        break;
      case "antifeatures":
        await handleAntiFeaturesStep(interaction, client, automodData);
        break;
      case "profanity":
        await handleProfanityStep(interaction, client, automodData);
        break;
      case "warnings":
        await handleWarningsStep(interaction, client, automodData);
        break;
      case "escalation":
        await handleEscalationStep(interaction, client, automodData);
        break;
      case "completed":
        await handleCompletedStep(interaction, client, automodData);
        break;
    }
  },
};

// Step 1: Enable Automod + Log Channel
async function handleEnableStep(interaction, client, automodData) {
  const channels = interaction.guild.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildText)
    .first(25);

  if (channels.length === 0) {
    return interaction.reply({
      content: "❌ No text channels found in this server!",
      ephemeral: true,
    });
  }

  const channelOptions = channels.map((channel) => ({
    label: `#${channel.name}`,
    value: channel.id,
    description: `Channel for moderation logs`,
  }));

  const enableSelect = new StringSelectMenuBuilder()
    .setCustomId("modsetup_enable")
    .setPlaceholder("🛡️ Enable or Disable Automod")
    .addOptions([
      {
        label: "Enable Automod",
        value: "enable",
        description: "Turn on automod features",
        emoji: "✅",
      },
      {
        label: "Disable Automod",
        value: "disable",
        description: "Turn off automod features",
        emoji: "❌",
      },
    ]);

  const channelSelect = new StringSelectMenuBuilder()
    .setCustomId("modsetup_log_channel")
    .setPlaceholder("📋 Select a moderation log channel")
    .addOptions(channelOptions);

  const enableRow = new ActionRowBuilder().addComponents(enableSelect);
  const channelRow = new ActionRowBuilder().addComponents(channelSelect);

  const embed = new EmbedBuilder()
    .setColor("#ff4444")
    .setTitle("🛡️ Moderation Setup - Step 1/5")
    .setDescription(
      "**Automod Configuration**\n\nFirst, enable or disable automod, then select a channel where moderation logs will be sent."
    )
    .setFooter({ text: "Den Manager • Step 1 of 5" });

  await interaction.reply({
    embeds: [embed],
    components: [enableRow, channelRow],
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 120000,
  });

  let enableSelected = false;
  let channelSelected = false;

  collector.on("collect", async (i) => {
    if (i.customId === "modsetup_enable") {
      const enabled = i.values[0] === "enable";
      automodData.enabled = enabled;
      enableSelected = true;

      await i.update({
        embeds: [
          embed.setDescription(
            `**Automod Configuration**\n\n✅ **Automod:** ${
              enabled ? "Enabled" : "Disabled"
            }\n${channelSelected ? "✅" : "⏳"} **Log Channel:** ${
              channelSelected
                ? `<#${automodData.logChannel}>`
                : "Please select a channel"
            }`
          ),
        ],
        components: [enableRow, channelRow],
      });

      if (enableSelected && channelSelected) {
        client.saveAutomodData(interaction.guild.id, automodData);
        collector.stop("completed");
      }
    }

    if (i.customId === "modsetup_log_channel") {
      const channelId = i.values[0];
      automodData.logChannel = channelId;
      channelSelected = true;

      await i.update({
        embeds: [
          embed.setDescription(
            `**Automod Configuration**\n\n${
              enableSelected ? "✅" : "⏳"
            } **Automod:** ${
              enableSelected
                ? automodData.enabled
                  ? "Enabled"
                  : "Disabled"
                : "Please enable/disable"
            }\n✅ **Log Channel:** <#${channelId}>`
          ),
        ],
        components: [enableRow, channelRow],
      });

      if (enableSelected && channelSelected) {
        client.saveAutomodData(interaction.guild.id, automodData);
        collector.stop("completed");
      }
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "completed") {
      interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#00ff88")
            .setTitle("✅ Step 1 Complete!")
            .setDescription(
              `**Automod:** ${
                automodData.enabled ? "Enabled" : "Disabled"
              }\n**Log Channel:** <#${
                automodData.logChannel
              }>\n\nRun \`/modsetup\` again to continue with anti-features configuration.`
            )
            .setFooter({ text: "Den Manager • Step 1 Complete" }),
        ],
        components: [],
      });
    } else {
      interaction.editReply({
        content: "⏰ Setup timed out. Please run `/modsetup` again.",
        components: [],
      });
    }
  });
}

// Step 2: Anti-Features Configuration
async function handleAntiFeaturesStep(interaction, client, automodData) {
  const featuresSelect = new StringSelectMenuBuilder()
    .setCustomId("modsetup_antifeatures")
    .setPlaceholder("🛡️ Select anti-features to enable")
    .setMinValues(0)
    .setMaxValues(4)
    .addOptions([
      {
        label: "Anti-Spam",
        value: "spam",
        description: "Prevent message spam (5 messages in 10 seconds)",
        emoji: "🚫",
      },
      {
        label: "Anti-Link",
        value: "link",
        description: "Block unauthorized links",
        emoji: "🔗",
      },
      {
        label: "Anti-Caps",
        value: "caps",
        description: "Prevent excessive caps (70% threshold)",
        emoji: "🔠",
      },
      {
        label: "Anti-Emoji Spam",
        value: "emoji",
        description: "Limit emoji usage (max 5 per message)",
        emoji: "😀",
      },
    ]);

  const row = new ActionRowBuilder().addComponents(featuresSelect);

  const embed = new EmbedBuilder()
    .setColor("#ff4444")
    .setTitle("🛡️ Moderation Setup - Step 2/5")
    .setDescription(
      "**Anti-Features Configuration**\n\nSelect which anti-features you want to enable. You can select multiple or none.\n\n**Current Settings:**\n• Anti-Spam: Action = Timeout\n• Anti-Link: Action = Delete\n• Anti-Caps: Action = Warning\n• Anti-Emoji: Action = Warning"
    )
    .setFooter({ text: "Den Manager • Step 2 of 5" });

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) =>
      i.customId === "modsetup_antifeatures" &&
      i.user.id === interaction.user.id,
    time: 120000,
  });

  collector.on("collect", async (i) => {
    const selectedFeatures = i.values || [];

    // Reset all features first
    automodData.antiSpam.enabled = false;
    automodData.antiLink.enabled = false;
    automodData.antiCaps.enabled = false;
    automodData.antiEmoji.enabled = false;

    // Enable selected features
    selectedFeatures.forEach((feature) => {
      switch (feature) {
        case "spam":
          automodData.antiSpam.enabled = true;
          break;
        case "link":
          automodData.antiLink.enabled = true;
          break;
        case "caps":
          automodData.antiCaps.enabled = true;
          break;
        case "emoji":
          automodData.antiEmoji.enabled = true;
          break;
      }
    });

    client.saveAutomodData(interaction.guild.id, automodData);

    const enabledFeatures =
      selectedFeatures.length > 0
        ? selectedFeatures
            .map((f) => `• ${f.charAt(0).toUpperCase() + f.slice(1)}`)
            .join("\n")
        : "• None selected";

    await i.update({
      embeds: [
        new EmbedBuilder()
          .setColor("#00ff88")
          .setTitle("✅ Step 2 Complete!")
          .setDescription(
            `**Enabled Anti-Features:**\n${enabledFeatures}\n\nRun \`/modsetup\` again to continue with profanity filter setup.`
          )
          .setFooter({ text: "Den Manager • Step 2 Complete" }),
      ],
      components: [],
    });

    collector.stop();
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction.editReply({
        content: "⏰ Setup timed out. Please run `/modsetup` again.",
        components: [],
      });
    }
  });
}

// Step 3: Profanity Filter
async function handleProfanityStep(interaction, client, automodData) {
  const enableButton = new ButtonBuilder()
    .setCustomId("profanity_enable")
    .setLabel("Enable Profanity Filter")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅");

  const disableButton = new ButtonBuilder()
    .setCustomId("profanity_disable")
    .setLabel("Disable Profanity Filter")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("❌");

  const addWordsButton = new ButtonBuilder()
    .setCustomId("profanity_words")
    .setLabel("Add Blacklisted Words")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("📝");

  const row = new ActionRowBuilder().addComponents(
    enableButton,
    disableButton,
    addWordsButton
  );

  const embed = new EmbedBuilder()
    .setColor("#ff4444")
    .setTitle("🛡️ Moderation Setup - Step 3/5")
    .setDescription(
      "**Profanity Filter Configuration**\n\nEnable or disable the profanity filter, and add words to the blacklist.\n\n**Action:** Delete message + Warning"
    )
    .setFooter({ text: "Den Manager • Step 3 of 5" });

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 120000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "profanity_enable") {
      automodData.profanityFilter.enabled = true;
      client.saveAutomodData(interaction.guild.id, automodData);

      await i.update({
        embeds: [
          embed.setDescription(
            `**Profanity Filter Configuration**\n\n✅ **Status:** Enabled\n**Blacklisted Words:** ${automodData.profanityFilter.blacklistedWords.length} words\n**Action:** Delete message + Warning`
          ),
        ],
        components: [row],
      });
    }

    if (i.customId === "profanity_disable") {
      automodData.profanityFilter.enabled = false;
      client.saveAutomodData(interaction.guild.id, automodData);

      await i.update({
        embeds: [
          embed.setDescription(
            `**Profanity Filter Configuration**\n\n❌ **Status:** Disabled\n**Blacklisted Words:** ${automodData.profanityFilter.blacklistedWords.length} words\n**Action:** Delete message + Warning`
          ),
        ],
        components: [row],
      });
    }

    if (i.customId === "profanity_words") {
      const modal = new ModalBuilder()
        .setCustomId("profanity_modal")
        .setTitle("Add Blacklisted Words");

      const wordsInput = new TextInputBuilder()
        .setCustomId("words_input")
        .setLabel("Blacklisted Words (comma separated)")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("word1, word2, word3, etc...")
        .setRequired(false)
        .setMaxLength(1000);

      const actionRow = new ActionRowBuilder().addComponents(wordsInput);
      modal.addComponents(actionRow);

      await i.showModal(modal);

      try {
        const modalSubmit = await i.awaitModalSubmit({ time: 300000 });
        const wordsText = modalSubmit.fields.getTextInputValue("words_input");

        if (wordsText.trim()) {
          const newWords = wordsText
            .split(",")
            .map((word) => word.trim().toLowerCase())
            .filter((word) => word);
          automodData.profanityFilter.blacklistedWords = [
            ...new Set([
              ...automodData.profanityFilter.blacklistedWords,
              ...newWords,
            ]),
          ];
          client.saveAutomodData(interaction.guild.id, automodData);
        }

        await modalSubmit.update({
          embeds: [
            new EmbedBuilder()
              .setColor("#00ff88")
              .setTitle("✅ Step 3 Complete!")
              .setDescription(
                `**Profanity Filter:** ${
                  automodData.profanityFilter.enabled ? "Enabled" : "Disabled"
                }\n**Blacklisted Words:** ${
                  automodData.profanityFilter.blacklistedWords.length
                } words\n\nRun \`/modsetup\` again to continue with warning system setup.`
              )
              .setFooter({ text: "Den Manager • Step 3 Complete" }),
          ],
          components: [],
        });

        collector.stop();
      } catch (error) {
        console.error("Modal timeout or error:", error);
      }
    }
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction.editReply({
        content: "⏰ Setup timed out. Please run `/modsetup` again.",
        components: [],
      });
    }
  });
}

// Step 4: Warning Count Configuration
async function handleWarningsStep(interaction, client, automodData) {
  const warningSelect = new StringSelectMenuBuilder()
    .setCustomId("modsetup_warnings")
    .setPlaceholder("⚠️ Select number of warnings before escalation")
    .addOptions([
      {
        label: "1 Warning",
        value: "1",
        description: "Escalate after 1 warning",
      },
      {
        label: "2 Warnings",
        value: "2",
        description: "Escalate after 2 warnings",
      },
      {
        label: "3 Warnings",
        value: "3",
        description: "Escalate after 3 warnings (default)",
      },
      {
        label: "4 Warnings",
        value: "4",
        description: "Escalate after 4 warnings",
      },
      {
        label: "5 Warnings",
        value: "5",
        description: "Escalate after 5 warnings",
      },
    ]);

  const row = new ActionRowBuilder().addComponents(warningSelect);

  const embed = new EmbedBuilder()
    .setColor("#ff4444")
    .setTitle("🛡️ Moderation Setup - Step 4/5")
    .setDescription(
      "**Warning System Configuration**\n\nSelect how many warnings a user should receive before escalation actions are taken.\n\n**Current:** 3 warnings (default)"
    )
    .setFooter({ text: "Den Manager • Step 4 of 5" });

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) =>
      i.customId === "modsetup_warnings" && i.user.id === interaction.user.id,
    time: 120000,
  });

  collector.on("collect", async (i) => {
    const warningCount = parseInt(i.values[0]);
    automodData.warnSystem.maxWarnings = warningCount;
    client.saveAutomodData(interaction.guild.id, automodData);

    await i.update({
      embeds: [
        new EmbedBuilder()
          .setColor("#00ff88")
          .setTitle("✅ Step 4 Complete!")
          .setDescription(
            `**Warning Threshold:** ${warningCount} warning${
              warningCount > 1 ? "s" : ""
            }\n\nUsers will receive escalation actions after ${warningCount} warning${
              warningCount > 1 ? "s" : ""
            }.\n\nRun \`/modsetup\` again to configure escalation actions.`
          )
          .setFooter({ text: "Den Manager • Step 4 Complete" }),
      ],
      components: [],
    });

    collector.stop();
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction.editReply({
        content: "⏰ Setup timed out. Please run `/modsetup` again.",
        components: [],
      });
    }
  });
}

// Step 5: Escalation Configuration
async function handleEscalationStep(interaction, client, automodData) {
  const escalationSelect = new StringSelectMenuBuilder()
    .setCustomId("modsetup_escalation")
    .setPlaceholder("🔨 Select escalation actions (in order)")
    .setMinValues(1)
    .setMaxValues(3)
    .addOptions([
      {
        label: "Timeout",
        value: "timeout",
        description: "Timeout the user for 10 minutes",
        emoji: "⏰",
      },
      {
        label: "Kick",
        value: "kick",
        description: "Kick the user from the server",
        emoji: "👢",
      },
      {
        label: "Ban",
        value: "ban",
        description: "Permanently ban the user",
        emoji: "🔨",
      },
    ]);

  const row = new ActionRowBuilder().addComponents(escalationSelect);

  const embed = new EmbedBuilder()
    .setColor("#ff4444")
    .setTitle("🛡️ Moderation Setup - Step 5/5")
    .setDescription(
      "**Escalation Actions Configuration**\n\nSelect the actions to take when users exceed the warning threshold. Actions will be applied in the order selected.\n\n**Example:** If you select Timeout → Kick → Ban:\n• First escalation: Timeout\n• Second escalation: Kick\n• Third escalation: Ban"
    )
    .setFooter({ text: "Den Manager • Step 5 of 5" });

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) =>
      i.customId === "modsetup_escalation" && i.user.id === interaction.user.id,
    time: 120000,
  });

  collector.on("collect", async (i) => {
    const selectedActions = i.values;
    automodData.warnSystem.escalation = selectedActions;
    client.saveAutomodData(interaction.guild.id, automodData);

    const actionsList = selectedActions
      .map(
        (action, index) =>
          `${index + 1}. ${action.charAt(0).toUpperCase() + action.slice(1)}`
      )
      .join("\n");

    await i.update({
      embeds: [
        new EmbedBuilder()
          .setColor("#00ff88")
          .setTitle("🎉 Moderation Setup Complete!")
          .setDescription(
            `**🛡️ Automod Configuration Complete!**\n\n**Status:** ${
              automodData.enabled ? "Enabled" : "Disabled"
            }\n**Log Channel:** <#${
              automodData.logChannel
            }>\n**Warning Threshold:** ${
              automodData.warnSystem.maxWarnings
            } warnings\n**Escalation Actions:**\n${actionsList}\n\n**Available Commands:**\n• \`/kick @user reason:<content>\`\n• \`/ban @user reason:<content>\`\n• \`/warn @user reason:<content>\`\n• \`/timeout @user duration:<time> reason:<content>\`\n• \`/addword <word>\` - Add to blacklist\n• \`/removeword <word>\` - Remove from blacklist`
          )
          .setFooter({ text: "Den Manager • Setup Complete!" }),
      ],
      components: [],
    });

    collector.stop();
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      interaction.editReply({
        content: "⏰ Setup timed out. Please run `/modsetup` again.",
        components: [],
      });
    }
  });
}

// Completed Step - Show current configuration
async function handleCompletedStep(interaction, client, automodData) {
  const logChannel = interaction.guild.channels.cache.get(
    automodData.logChannel
  );

  const antiFeatures = [];
  if (automodData.antiSpam.enabled) antiFeatures.push("Anti-Spam");
  if (automodData.antiLink.enabled) antiFeatures.push("Anti-Link");
  if (automodData.antiCaps.enabled) antiFeatures.push("Anti-Caps");
  if (automodData.antiEmoji.enabled) antiFeatures.push("Anti-Emoji");

  const escalationList = automodData.warnSystem.escalation
    .map(
      (action, index) =>
        `${index + 1}. ${action.charAt(0).toUpperCase() + action.slice(1)}`
    )
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("🛡️ Current Moderation Configuration")
    .setDescription(
      `**Status:** ${
        automodData.enabled ? "✅ Enabled" : "❌ Disabled"
      }\n**Log Channel:** ${logChannel || "Not set"}\n\n**Anti-Features:** ${
        antiFeatures.length > 0 ? antiFeatures.join(", ") : "None"
      }\n**Profanity Filter:** ${
        automodData.profanityFilter.enabled
          ? `Enabled (${automodData.profanityFilter.blacklistedWords.length} words)`
          : "Disabled"
      }\n\n**Warning System:**\n• Threshold: ${
        automodData.warnSystem.maxWarnings
      } warnings\n• Escalation Actions:\n${escalationList}`
    )
    .setFooter({ text: "Den Manager • Already Configured" });

  const reconfigureButton = new ButtonBuilder()
    .setCustomId("reconfigure_modsetup")
    .setLabel("🔄 Reconfigure")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(reconfigureButton);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) =>
      i.customId === "reconfigure_modsetup" &&
      i.user.id === interaction.user.id,
    time: 60000,
  });

  collector.on("collect", async (i) => {
    // Reset to default values for reconfiguration
    const resetData = {
      enabled: false,
      logChannel: null,
      antiSpam: {
        enabled: false,
        maxMessages: 5,
        timeWindow: 10000,
        action: "timeout",
      },
      antiLink: {
        enabled: false,
        allowedDomains: ["discord.gg", "discord.com"],
        action: "delete",
      },
      antiCaps: {
        enabled: false,
        maxPercentage: 70,
        minLength: 10,
        action: "warn",
      },
      antiEmoji: { enabled: false, maxEmojis: 5, action: "warn" },
      profanityFilter: {
        enabled: false,
        blacklistedWords: automodData.profanityFilter.blacklistedWords,
        action: "delete",
      },
      warnSystem: {
        enabled: true,
        maxWarnings: 3,
        escalation: [],
        warnExpiry: 604800000,
      },
      userWarnings: automodData.userWarnings || {},
      spamTracking: {},
    };

    client.saveAutomodData(interaction.guild.id, resetData);

    await i.update({
      embeds: [
        new EmbedBuilder()
          .setColor("#ff9900")
          .setTitle("🔄 Reconfiguring...")
          .setDescription(
            "Moderation setup has been reset. Use `/modsetup` again to reconfigure your moderation system."
          )
          .setFooter({ text: "Den Manager • Reset Complete" }),
      ],
      components: [],
    });

    collector.stop();
  });
}
