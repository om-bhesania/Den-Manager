const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const express = require("express");
const fs = require("fs");
const path = require("path");
const commandConfig = require("./config/commands.json");
const botDefaults = require("./config/botDefaults.json");
const { updateGuildDataTemplates } = require("./utils/guildUtils");
const { redBG } = require("console-log-colors");
const config = require("dotenv");
config.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Express server for uptime monitoring
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Den Manager Bot is alive! 🎮");
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// Commands collection
client.commands = new Collection();

// Load commands from config
function loadCommands() {
  console.log(`📋 Loading ${commandConfig.commands.length} commands...`);
  commandConfig.commands.forEach((cmd) => {
    try {
      const command = require(`./commands/${cmd.file}`);
      client.commands.set(cmd.name, command);
      console.log(`✅ Loaded command: ${cmd.name} (${cmd.type})`);
    } catch (error) {
      console.error(`❌ Failed to load command ${cmd.name}:`, error);
    }
  });
  console.log(`📊 Total commands loaded: ${client.commands.size}`);
}

// Guild data management
function getGuildDataPath(guildId) {
  return path.join(__dirname, "data", `${guildId}.json`);
}

function getGuildData(guildId) {
  const dataPath = getGuildDataPath(guildId);
  if (!fs.existsSync(dataPath)) {
    const defaultData = {
      guildId: guildId,
      setup: {
        welcomeChannel: null,
        roles: [],
        completed: false,
        steps: {
          welcomeChannel: false,
          roles: false,
        },
      },
      welcomeConfig: {
        backgroundImage: null,
        message:
          "Welcome to **{serverName}**! 🎮\n\nWelcome to **{serverName}**, {userMention}! We're excited to have you join our gaming community! 🎉\n\n**Join Date »** {joinDate}\n**Account Age »** {accountAge}\n**Members »** {memberCount}",
      },
    };
    saveGuildData(guildId, defaultData);
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function saveGuildData(guildId, data) {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dataPath = getGuildDataPath(guildId);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Function to create default guild data structure
function createDefaultGuildData(guildId) {
  return {
    guildId: guildId,
    setup: {
      completed: false,
      welcomeChannel: null,
      roles: [],
      steps: {
        welcomeChannel: false,
        roles: false,
      },
    },
    welcomeConfig: {
      message:
        "Welcome to **{serverName}**! 🎮\n\n {userMention}! We're excited to have you join our gaming community! 🎉\n\n**Join Date »»** {joinDate}\n**Account Age »»* {accountAge}\n**Members »»** {memberCount}",
      backgroundImage: "./footer.gif",
    },
    botConfig: {
      customName: null,
      customAvatar: null,
    },
  };
}

// Function to get guild data (with fallback creation)
function getGuildData(guildId) {
  const dataPath = getGuildDataPath(guildId);
  
  if (!fs.existsSync(dataPath)) {
    const defaultData = createDefaultGuildData(guildId);
    saveGuildData(guildId, defaultData);
    return defaultData;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Ensure all required properties exist
    if (!data.setup) {
      data.setup = {
        welcomeChannel: null,
        roles: [],
        completed: false,
        steps: {
          welcomeChannel: false,
          roles: false,
        },
      };
    }

    if (!data.setup.steps) {
      data.setup.steps = {
        welcomeChannel: false,
        roles: false,
      };
    }

    if (!data.welcomeConfig) {
      data.welcomeConfig = {
        backgroundImage: null,
        message: "Welcome to **{serverName}**! 🎮\n\n {userMention}! We're excited to have you join our gaming community! 🎉\n\n**Join Date »** {joinDate}\n**Account Age »** {accountAge}\n**Members »** {memberCount}",
      };
    }
    
    // Ensure botConfig exists (for existing guild data that might not have it)
    if (!data.botConfig) {
      data.botConfig = {
        customName: null,
        customAvatar: null
      };
    }
    
    // Save the updated structure if any properties were missing
    saveGuildData(guildId, data);
    return data;
  } catch (error) {
    console.error(`Error reading guild data for ${guildId}:`, error);
    const defaultData = createDefaultGuildData(guildId);
    saveGuildData(guildId, defaultData);
    return defaultData;
  }
}
// Function to get guild-specific bot display
function getGuildBotDisplay(guildId) {
  const guildData = getGuildData(guildId);
  
  // Check if botConfig exists, if not create default structure
  if (!guildData.botConfig) {
    guildData.botConfig = {
      customName: null,
      customAvatar: null
    };
    // Save the updated structure
    saveGuildData(guildId, guildData);
  }
  
  return {
    name: guildData.botConfig.customName || botDefaults.botDefaults.name,
    avatar: guildData.botConfig.customAvatar || botDefaults.botDefaults.avatar
  };
}

// Make functions globally available
client.getGuildData = getGuildData;
client.saveGuildData = saveGuildData;
client.getGuildBotDisplay = getGuildBotDisplay;

// Bot ready event
client.once("ready", () => {
  console.log(`🚀 ${client.user.tag} is online and ready!`);
  loadCommands();

  // Update existing guild data templates
  updateGuildDataTemplates(client);

  // Check permissions in all guilds
  client.guilds.cache.forEach(guild => {
    checkBotPermissions(guild);
  });

  // Set bot presence with server count
  updatePresence();

  // Update presence every 5 minutes
  setInterval(updatePresence, 5 * 60 * 1000);

  // Debug: List all loaded commands
  console.log(
    `🔍 Loaded commands: ${Array.from(client.commands.keys()).join(", ")}`
  );
});

// Function to update bot presence
function updatePresence() {
  const serverCount = client.guilds.cache.size;
  const totalMembers = client.guilds.cache.reduce(
    (acc, guild) => acc + guild.memberCount,
    0
  );

  const activityName = botDefaults.presence.activity.name
    .replace("{serverCount}", serverCount)
    .replace("{memberCount}", totalMembers);

  client.user.setPresence({
    activities: [
      {
        name: activityName,
        type: botDefaults.presence.activity.type,
      },
    ],
    status: botDefaults.presence.status,
  });
}

// Guild member add event (welcomer)
client.on("guildMemberAdd", async (member) => {
  try {
    const guildData = getGuildData(member.guild.id);

    if (!guildData.setup.completed || !guildData.setup.welcomeChannel) {
      return; // Setup not completed
    }

    const welcomeChannel = member.guild.channels.cache.get(
      guildData.setup.welcomeChannel
    );
    if (!welcomeChannel) return;

    // Auto-assign roles
    if (guildData.setup.roles.length > 0) {
      try {
        // Check if bot has MANAGE_ROLES permission
        if (!member.guild.members.me.permissions.has("ManageRoles")) {
          console.log(`⚠️ Bot doesn't have MANAGE_ROLES permission in ${member.guild.name}`);
          return;
        }

        const rolesToAdd = guildData.setup.roles.filter((roleId) => {
          const role = member.guild.roles.cache.get(roleId);
          if (!role) {
            console.log(`⚠️ Role ${roleId} not found in ${member.guild.name}`);
            return false;
          }
          
          // Check if bot can manage this role
          if (role.position >= member.guild.members.me.roles.highest.position) {
            console.log(`⚠️ Cannot assign role ${role.name} - bot's highest role is lower`);
            return false;
          }
          
          return true;
        });

        if (rolesToAdd.length > 0) {
          await member.roles.add(rolesToAdd);
          console.log(
            `✅ Assigned ${rolesToAdd.length} roles to ${member.user.tag} in ${member.guild.name}`
          );
        } else {
          console.log(`⚠️ No valid roles to assign to ${member.user.tag} in ${member.guild.name}`);
        }
      } catch (error) {
        console.error(`❌ Error assigning roles to ${member.user.tag} in ${member.guild.name}:`, error.message);
        
        // Log specific error details
        if (error.code === 50013) {
          console.log(`   Missing Permissions: Bot needs MANAGE_ROLES permission`);
        } else if (error.code === 50001) {
          console.log(`   Missing Access: Bot doesn't have access to the role`);
        } else if (error.code === 10011) {
          console.log(`   Unknown Role: One of the roles doesn't exist`);
        }
      }
    }

    // Create welcome embed
    const joinDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const accountAge = new Date(member.user.createdAt).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    let welcomeMessage = guildData.welcomeConfig.message
      .replace("{serverName}", member.guild.name)
      .replace("{userMention}", member.toString())
      .replace("{joinDate}", joinDate)
      .replace("{accountAge}", accountAge)
      .replace(
        "{memberCount}",
        `${member.guild.memberCount}${getOrdinalSuffix(
          member.guild.memberCount
        )} member`
      );

    // Get guild-specific bot display
    const botDisplay = client.getGuildBotDisplay(member.guild.id);
    
    // Array of humorous welcome titles
    const humorousTitles = [
      "🎮 A New Player Has Entered The Game!",
      "🚀 Another Victim... I Mean Member!",
      "🎯 Fresh Meat Has Arrived!",
      "⚡ A Wild Player Appears!",
      "🎪 Welcome To The Circus!",
      "🏆 New Challenger Approaches!",
      "🎭 Another Actor Joins The Show!",
      "🎨 Fresh Canvas Has Arrived!",
      "🎪 Step Right Up, New Player!",
      "🎯 Target Acquired - New Member!",
      "🚀 Houston, We Have A New Player!",
      "🎪 The Show Must Go On!",
      "🎮 Player 1 Has Joined!",
      "🎯 Another One Bites The Dust!",
      "🎪 Welcome To The Madness!",
      "🎮 New Player Spawned!",
      "🎯 Fresh Blood In The Server!",
      "🎪 Another Clown Joins The Circus!",
      "🎮 Player Has Entered The Chat!",
      "🎯 New Target Locked On!"
    ];
    
    // Get random humorous title
    const randomTitle = humorousTitles[Math.floor(Math.random() * humorousTitles.length)];
    
    const embed = new EmbedBuilder()
      .setColor(botDefaults.colors.success)
      .setTitle(randomTitle)
      .setDescription(`\n\n${welcomeMessage}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp();

    if (guildData.welcomeConfig.backgroundImage) {
      embed.setImage(guildData.welcomeConfig.backgroundImage);
    }

    embed.setFooter({
      text: `${botDisplay.name} • Gaming Community`,
      iconURL: client.user.displayAvatarURL({ dynamic: true }),
    });

    await welcomeChannel.send({ embeds: [embed] });
    console.log(`✅ Sent welcome message for ${member.user.tag}`);
  } catch (error) {
    console.error("Error in guildMemberAdd event:", error);
  }
});

// Message command handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Handle !dm commands
  if (message.content.startsWith("!dm ")) {
    const args = message.content.slice(4).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    // Check if this command is actually a message command
    const cmdConfig = commandConfig.commands.find(cmd => cmd.name === commandName);
    if (!cmdConfig || cmdConfig.type !== "message") {
      return; // Skip if it's not a message command
    }

    try {
      await command.execute(message, args, client);
    } catch (error) {
      console.error("Error executing command:", error);
      message.reply("❌ There was an error executing that command!");
    }
  }
});

// Slash command handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.log(`❌ Command not found: ${interaction.commandName}`);
    console.log(
      `📋 Available commands: ${Array.from(client.commands.keys()).join(", ")}`
    );
    return;
  }

  try {
    await command.execute(interaction, [], client);
  } catch (error) {
    console.error("Error executing slash command:", error);
    const errorMessage = "❌ There was an error executing this command!";

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, flags: 64 });
      } else {
        await interaction.reply({ content: errorMessage, flags: 64 });
      }
    } catch (replyError) {
      console.error("Failed to send error reply:", replyError);
    }
  }
});

// Helper function for ordinal numbers
function getOrdinalSuffix(number) {
  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return "th";
  }

  switch (lastDigit) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// Helper function to check bot permissions and provide guidance
function checkBotPermissions(guild) {
  const botMember = guild.members.me;
  const missingPermissions = [];
  
  if (!botMember.permissions.has("ManageRoles")) {
    missingPermissions.push("MANAGE_ROLES");
  }
  if (!botMember.permissions.has("SendMessages")) {
    missingPermissions.push("SEND_MESSAGES");
  }
  if (!botMember.permissions.has("EmbedLinks")) {
    missingPermissions.push("EMBED_LINKS");
  }
  
  if (missingPermissions.length > 0) {
    console.log(`⚠️ Bot missing permissions in ${guild.name}: ${missingPermissions.join(", ")}`);
    console.log(`   Please give the bot these permissions: ${missingPermissions.join(", ")}`);
  }
  
  return missingPermissions.length === 0;
}
// Automod data management functions (add these with your other guild data functions)
function getAutomodDataPath(guildId) {
  return path.join(__dirname, "data", "automod", `${guildId}.json`);
}

function getAutomodData(guildId) {
  const dataPath = getAutomodDataPath(guildId);
  if (!fs.existsSync(dataPath)) {
    const defaultData = {
      enabled: false,
      logChannel: null,
      antiFeaturesConfigured: false,
      profanityConfigured: false,
      warningsConfigured: false,
      escalationConfigured: false,
      antiSpam: {
        enabled: false,
        maxMessages: 5,
        timeWindow: 10000, // 10 seconds
        action: "timeout"
      },
      antiLink: {
        enabled: false,
        allowedDomains: ["discord.gg", "discord.com"],
        action: "delete"
      },
      antiCaps: {
        enabled: false,
        maxPercentage: 70,
        minLength: 10,
        action: "warn"
      },
      antiEmoji: {
        enabled: false,
        maxEmojis: 5,
        action: "warn"
      },
      profanityFilter: {
        enabled: false,
        blacklistedWords: [],
        action: "delete"
      },
      warnSystem: {
        enabled: true,
        maxWarnings: 3,
        escalation: ["timeout", "kick", "ban"],
        warnExpiry: 604800000 // 7 days
      },
      userWarnings: {}, // Store user warnings: { userId: [{ reason, timestamp, moderator }] }
      spamTracking: {} // Store spam tracking: { userId: { messages: [], lastReset: timestamp } }
    };
    saveAutomodData(guildId, defaultData);
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch (error) {
    console.error(`Error reading automod data for ${guildId}:`, error);
    const defaultData = getAutomodData(guildId); // This will create default
    return defaultData;
  }
}

function saveAutomodData(guildId, data) {
  const automodDir = path.join(__dirname, "data", "automod");
  if (!fs.existsSync(automodDir)) {
    fs.mkdirSync(automodDir, { recursive: true });
  }
  const dataPath = getAutomodDataPath(guildId);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Make automod functions globally available (add these with your other client functions)
client.getAutomodData = getAutomodData;
client.saveAutomodData = saveAutomodData;

// Automod message handler - ADD THIS AFTER YOUR EXISTING messageCreate EVENT
client.on("messageCreate", async (message) => {
  // Skip if bot message or DM
  if (message.author.bot || !message.guild) return;

  const automodData = getAutomodData(message.guild.id);
  
  // Skip if automod is disabled
  if (!automodData.enabled) return;

  const member = message.member;
  if (!member) return;

  // Skip if user has admin permissions
  if (member.permissions.has("Administrator")) return;

  let violationType = null;
  let shouldDelete = false;
  let actionToTake = null;

  // Anti-Spam Check
  if (automodData.antiSpam.enabled) {
    if (!automodData.spamTracking[message.author.id]) {
      automodData.spamTracking[message.author.id] = {
        messages: [],
        lastReset: Date.now()
      };
    }

    const userSpam = automodData.spamTracking[message.author.id];
    const now = Date.now();

    // Reset tracking if time window passed
    if (now - userSpam.lastReset > automodData.antiSpam.timeWindow) {
      userSpam.messages = [];
      userSpam.lastReset = now;
    }

    userSpam.messages.push(now);

    if (userSpam.messages.length > automodData.antiSpam.maxMessages) {
      violationType = "Anti-Spam";
      actionToTake = automodData.antiSpam.action;
      shouldDelete = true;
    }
  }

  // Anti-Link Check
  if (automodData.antiLink.enabled && !violationType) {
    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    const links = message.content.match(linkRegex);
    
    if (links) {
      const hasDisallowedLink = links.some(link => {
        return !automodData.antiLink.allowedDomains.some(domain => 
          link.toLowerCase().includes(domain.toLowerCase())
        );
      });

      if (hasDisallowedLink) {
        violationType = "Anti-Link";
        actionToTake = automodData.antiLink.action;
        shouldDelete = true;
      }
    }
  }

  // Anti-Caps Check
  if (automodData.antiCaps.enabled && !violationType) {
    if (message.content.length >= automodData.antiCaps.minLength) {
      const capsCount = (message.content.match(/[A-Z]/g) || []).length;
      const capsPercentage = (capsCount / message.content.length) * 100;

      if (capsPercentage > automodData.antiCaps.maxPercentage) {
        violationType = "Anti-Caps";
        actionToTake = automodData.antiCaps.action;
        shouldDelete = true;
      }
    }
  }

  // Anti-Emoji Check
  if (automodData.antiEmoji.enabled && !violationType) {
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic}|<:[^:]+:\d+>|<a:[^:]+:\d+>)/gu;
    const emojis = message.content.match(emojiRegex) || [];

    if (emojis.length > automodData.antiEmoji.maxEmojis) {
      violationType = "Anti-Emoji Spam";
      actionToTake = automodData.antiEmoji.action;
      shouldDelete = true;
    }
  }

  // Profanity Filter Check
  if (automodData.profanityFilter.enabled && !violationType) {
    const messageContent = message.content.toLowerCase();
    const foundBadWord = automodData.profanityFilter.blacklistedWords.find(word => 
      messageContent.includes(word.toLowerCase())
    );

    if (foundBadWord) {
      violationType = "Profanity Filter";
      actionToTake = automodData.profanityFilter.action;
      shouldDelete = true;
    }
  }

  // If violation detected, take action
  if (violationType) {
    // Delete message if needed
    if (shouldDelete) {
      try {
        await message.delete();
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    }

    // Take moderation action
    await handleAutomodAction(message, violationType, actionToTake, automodData);

    // Log the violation
    await logAutomodViolation(message, violationType, actionToTake, automodData);

    // Save updated automod data
    saveAutomodData(message.guild.id, automodData);
  }
});

// Helper function to handle automod actions
async function handleAutomodAction(message, violationType, action, automodData) {
  const member = message.member;
  const guild = message.guild;

  try {
    switch (action) {
      case "warn":
        await addWarning(member, `Automod: ${violationType}`, "Den Manager Bot", automodData);
        
        // Check if user should be escalated
        const warnings = automodData.userWarnings[member.id] || [];
        const activeWarnings = warnings.filter(w => 
          Date.now() - w.timestamp < automodData.warnSystem.warnExpiry
        );

        if (activeWarnings.length >= automodData.warnSystem.maxWarnings) {
          // Escalate based on warning count
          const escalationIndex = Math.min(
            activeWarnings.length - automodData.warnSystem.maxWarnings,
            automodData.warnSystem.escalation.length - 1
          );
          const escalationAction = automodData.warnSystem.escalation[escalationIndex];
          
          await handleAutomodAction(message, `${violationType} (Escalation)`, escalationAction, automodData);
        }
        break;

      case "timeout": 
        if (member.moderatable) {
          await member.timeout(10 * 60 * 1000, `Automod: ${violationType}`); // 10 minutes
        }
        break;

      case "kick":
        if (member.kickable) {
          await member.kick(`Automod: ${violationType}`);
        }
        break;

      case "ban":
        if (member.bannable) {
          await member.ban({ reason: `Automod: ${violationType}` });
        }
        break;

      case "delete":
        // Already handled above
        break;
    }
  } catch (error) {
    console.error(`Error executing automod action ${action}:`, error);
  }
}

// Helper function to add warnings
async function addWarning(member, reason, moderator, automodData) {
  if (!automodData.userWarnings[member.id]) {
    automodData.userWarnings[member.id] = [];
  }

  automodData.userWarnings[member.id].push({
    reason: reason,
    timestamp: Date.now(),
    moderator: moderator
  });

  // Try to DM the user
  try {
    const embed = new EmbedBuilder()
      .setColor("#ff9900")
      .setTitle("⚠️ Warning Received")
      .setDescription(`You have received a warning in **${member.guild.name}**`)
      .addFields(
        { name: "Reason", value: reason, inline: false },
        { name: "Moderator", value: moderator, inline: true }
      )
      .setTimestamp();

    await member.send({ embeds: [embed] });
  } catch (error) {
    console.log(`Could not DM warning to ${member.user.tag}`);
  }
}

// Helper function to log automod violations
async function logAutomodViolation(message, violationType, action, automodData) {
  if (!automodData.logChannel) return;

  const logChannel = message.guild.channels.cache.get(automodData.logChannel);
  if (!logChannel) return;

  try {
    const embed = new EmbedBuilder()
      .setColor("#ff4444")
      .setTitle("🛡️ Automod Violation")
      .addFields(
        { name: "User", value: `${message.author} (${message.author.tag})`, inline: true },
        { name: "Violation", value: violationType, inline: true },
        { name: "Action", value: action.charAt(0).toUpperCase() + action.slice(1), inline: true },
        { name: "Channel", value: message.channel.toString(), inline: true },
        { name: "Message Content", value: message.content.substring(0, 1000) || "*No content*", inline: false }
      )
      .setThumbnail(message.author.displayAvatarURL())
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Error logging automod violation:", error);
  }
}

// Guild join event
client.on("guildCreate", (guild) => {
  console.log(`✅ Joined guild: ${guild.name} (${guild.id})`);
  console.log(`📊 Total guilds: ${client.guilds.cache.size}`);
  
  // Check bot permissions in the new guild
  checkBotPermissions(guild);
});

// Login with bot token
client.login(process.env.DISCORD_TOKEN);
