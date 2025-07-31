const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Den Manager Deployment...\n');

async function runDeployment() {
  try {
    // Step 1: Deploy help system
    console.log('📋 Step 1: Deploying help system...');
    await runScript('deploy-help.js');
    
    // Step 2: Deploy commands
    console.log('\n🔧 Step 2: Deploying commands...');
    await runScript('deploy-commands.js');
    
    console.log('\n✅ Deployment completed successfully!');
    console.log('🎉 All commands and help system are now ready to use.');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    
    console.log(`   Running: ${scriptName}`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`   ✅ ${scriptName} completed successfully`);
        resolve();
      } else {
        console.error(`   ❌ ${scriptName} failed with code ${code}`);
        reject(new Error(`${scriptName} failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`   ❌ Error running ${scriptName}:`, error.message);
      reject(error);
    });
  });
}

// Run the deployment
runDeployment(); 