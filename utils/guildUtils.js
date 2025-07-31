const fs = require("fs");
const path = require("path");

// Function to get guild name from guild ID
function getGuildNameFromId(client, guildId) {
  const guild = client.guilds.cache.get(guildId);
  return guild ? guild.name : `Guild ${guildId}`;
}

// Function to update all existing guild data files to use correct template
function updateGuildDataTemplates(client) {
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) return;

  const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
  
  files.forEach(file => {
    const filePath = path.join(dataDir, file);
    const guildData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    
    // Check if the message template needs updating
    if (guildData.welcomeConfig && guildData.welcomeConfig.message) {
      const message = guildData.welcomeConfig.message;
      
      // Replace any old templates with the correct one
      let updated = false;
      let newMessage = message;
      
      // Replace ${serverName} with {serverName}
      if (message.includes("${serverName}")) {
        newMessage = message.replace(/\${serverName}/g, "{serverName}");
        updated = true;
      }
      
      // Replace {serverName} with {serverName}
      if (message.includes("{serverName}")) {
        newMessage = message.replace(/{serverName}/g, "{serverName}");
        updated = true;
      }
      
      if (updated) {
        guildData.welcomeConfig.message = newMessage;
        fs.writeFileSync(filePath, JSON.stringify(guildData, null, 2));
        console.log(`✅ Updated template in ${file}`);
      }
    }
  });
}

module.exports = {
  getGuildNameFromId,
  updateGuildDataTemplates
}; 