# 🎮 Den Manager Bot

A powerful Discord bot for managing gaming communities with automated welcome messages, auto-role assignment, and customizable features.

## ✨ Features

- **🎯 Smart Welcome System**: Gaming-themed welcome messages with custom backgrounds
- **🎭 Auto-Role Assignment**: Automatically assign roles to new members
- **⚙️ Easy Setup**: Interactive setup process with step tracking
- **🖼️ Custom Backgrounds**: Set custom background images for welcome messages
- **🧪 Test Commands**: Test your configuration before going live
- **👑 Owner Controls**: Change bot name and avatar across servers
- **📊 Guild-Specific Data**: Each server has its own configuration
- **🔄 Uptime Monitoring**: Built-in Express server for hosting platforms

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 16.0.0 or higher
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))

### 2. Installation

```bash
# Clone or download the bot files
# Navigate to the bot directory
cd den-manager-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configuration

Edit `.env` file:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
PORT=3000
```

### 4. Deploy Slash Commands

```bash
# Deploy commands globally (takes up to 1 hour)
node deploy-commands.js
```

### 5. Start the Bot

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

## 🎮 Commands

### Slash Commands
- `/setup` - Configure the bot for your server (Admin only)

### Message Commands (Admin)
- `!dm test` - Send a test welcome message
- `!dm bg <image_url>` - Set welcome background image
- `!dm bg remove` - Remove welcome background

### Owner Commands
- `!dm avatar <image_url>` - Change bot avatar
- `!dm name <new_name>` - Change bot name

## ⚙️ Setup Process

1. **Invite the bot** to your server with Administrator permissions
2. **Run `/setup`** to start configuration
3. **Step 1**: Select welcome channel
4. **Step 2**: Choose auto-assign roles
5. **Test**: Use `!dm test` to verify everything works
6. **Customize**: Set background with `!dm bg <url>`

## 📁 File Structure

```
den-manager-bot/
├── index.js              # Main bot file
├── deploy-commands.js     # Command deployment script
├── package.json          # Dependencies
├── .env.example          # Environment template
├── config/
│   └── commands.json     # Command configuration
├── commands/
│   ├── setup.js         # Setup command
│   ├── test.js          # Test welcome command
│   ├── bg.js            # Background command
│   ├── avatar.js        # Avatar command
│   └── name.js          # Name command
└── data/                # Guild-specific JSON files
    ├── guild1.json
    ├── guild2.json
    └── ...
```

## 🔧 Configuration Files

### Guild Data Structure
Each server gets its own JSON file in `/data/` folder:

```json
{
  "guildId": "123456789",
  "setup": {
    "welcomeChannel": "channel_id",
    "roles": ["role_id_1", "role_id_2"],
    "completed": true,
    "steps": {
      "welcomeChannel": true,
      "roles": true
    }
  },
  "welcomeConfig": {
    "backgroundImage": "https://example.com/bg.png",
    "message": "Welcome to **${serverName}**! 🎮..."
  }
}
```

## 🎨 Welcome Message Variables

- `${serverName}` - Server name
- `{userMention}` - User mention (@user)
- `{joinDate}` - Current date/time
- `{accountAge}` - User account creation date
- `{memberCount}` - Server member count with ordinal (1st, 2nd, etc.)

## 🔐 Permissions Required

### Bot Permissions
- View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Manage Roles (for auto-role assignment)

### User Permissions
- **Setup/Test/Background**: Administrator
- **Owner Commands**: Must be in `ownerIds` array in config

## 🌐 Hosting

The bot includes an Express server for uptime monitoring, making it compatible with platforms like:
- Heroku
- Railway
- Render
- Replit
- Any Node.js hosting platform

## 🛠️ Customization

### Adding New Commands
1. Create command file in `/commands/` folder
2. Add entry to `/config/commands.json`
3. Follow the existing command structure

### Modifying Welcome Message
Edit the `welcomeConfig.message` in guild data or modify the default in `index.js`

### Changing Colors/Styling
Modify embed colors in command files:
- Green: `#00ff88` (success)
- Orange: `#ff9900` (warning/test)
- Red: `#ff4444` (error)

## 🐛 Troubleshooting

### Common Issues

1. **Commands not showing**: Run `deploy-commands.js` and wait up to 1 hour
2. **Permission errors**: Ensure bot has Administrator permissions
3. **Welcome not working**: Check bot can access welcome channel
4. **Roles not assigning**: Verify bot's role is higher than assigned roles

### Debug Mode
Set `NODE_ENV=development` for additional console logging.

## 📝 Support

- Check the console for error messages
- Ensure all permissions are correctly set
- Verify environment variables are correct
- Make sure Node.js version is 16+ 

## 🎉 Features Coming Soon

- Custom welcome message templates
- Member count milestones
- Welcome DMs
- Advanced role assignment rules
- Moderation features

---

**Den Manager** - Built for gaming communities, powered by Discord.js v14