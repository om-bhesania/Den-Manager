const fs = require('fs');
const path = require('path');

console.log('🔄 Starting help deployment...');

try {
  // Read commands configuration
  const commandsPath = path.join(__dirname, 'config', 'commands.json');
  const commandsConfig = JSON.parse(fs.readFileSync(commandsPath, 'utf8'));
  
  console.log(`📋 Found ${commandsConfig.commands.length} commands in configuration`);
  
  // Validate commands structure
  const validCommands = commandsConfig.commands.filter(cmd => {
    const isValid = cmd.name && cmd.description && cmd.type && cmd.file && cmd.permissions;
    if (!isValid) {
      console.log(`⚠️  Skipping invalid command: ${JSON.stringify(cmd)}`);
    }
    return isValid;
  });
  
  console.log(`✅ Validated ${validCommands.length} commands`);
  
  // Check if help command exists in commands directory
  const helpCommandPath = path.join(__dirname, 'commands', 'help.js');
  if (!fs.existsSync(helpCommandPath)) {
    console.log('❌ Help command not found! Please create commands/help.js first.');
    process.exit(1);
  }
  
  // Generate help content summary
  const helpSummary = {
    totalCommands: validCommands.length,
    slashCommands: validCommands.filter(cmd => cmd.type === 'slash').length,
    messageCommands: validCommands.filter(cmd => cmd.type === 'message').length,
    adminCommands: validCommands.filter(cmd => 
      cmd.permissions.includes('ADMINISTRATOR') || 
      cmd.permissions.includes('MANAGE_MESSAGES')
    ).length,
    ownerCommands: validCommands.filter(cmd => 
      cmd.permissions.includes('OWNER')
    ).length,
    lastUpdated: new Date().toISOString()
  };
  
  // Save help summary to a file for reference
  const helpSummaryPath = path.join(__dirname, 'config', 'help-summary.json');
  fs.writeFileSync(helpSummaryPath, JSON.stringify(helpSummary, null, 2));
  
  console.log('📊 Help Summary:');
  console.log(`   • Total Commands: ${helpSummary.totalCommands}`);
  console.log(`   • Slash Commands: ${helpSummary.slashCommands}`);
  console.log(`   • Message Commands: ${helpSummary.messageCommands}`);
  console.log(`   • Admin Commands: ${helpSummary.adminCommands}`);
  console.log(`   • Owner Commands: ${helpSummary.ownerCommands}`);
  console.log(`   • Last Updated: ${helpSummary.lastUpdated}`);
  
  // Verify all command files exist
  const missingFiles = [];
  validCommands.forEach(cmd => {
    const filePath = path.join(__dirname, 'commands', cmd.file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(cmd.file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.log('⚠️  Missing command files:');
    missingFiles.forEach(file => console.log(`   • ${file}`));
  } else {
    console.log('✅ All command files exist');
  }
  
  // Check for duplicate commands
  const commandNames = validCommands.map(cmd => cmd.name);
  const duplicates = commandNames.filter((name, index) => commandNames.indexOf(name) !== index);
  
  if (duplicates.length > 0) {
    console.log('⚠️  Duplicate command names found:');
    duplicates.forEach(name => console.log(`   • ${name}`));
  } else {
    console.log('✅ No duplicate command names');
  }
  
  console.log('✅ Help deployment completed successfully!');
  console.log('💡 The help command will now display all available commands from commands.json');
  
} catch (error) {
  console.error('❌ Error during help deployment:', error.message);
  process.exit(1);
} 