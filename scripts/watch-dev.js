#!/usr/bin/env node

/**
 * Apple Watch Development Helper Script
 * This script helps with Apple Watch development and testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WATCH_SIZES = {
  '41mm': { width: 242, height: 294 },
  '45mm': { width: 272, height: 340 },
  '49mm': { width: 312, height: 390 }
};

function log(message) {
  console.log(`🍎 [Watch Dev] ${message}`);
}

function error(message) {
  console.error(`❌ [Watch Dev] ${message}`);
}

function success(message) {
  console.log(`✅ [Watch Dev] ${message}`);
}

function createWatchTestHTML() {
  const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apple Watch Test - Mirro Social</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #000;
            color: #fff;
            overflow: hidden;
        }
        
        .watch-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #1a1a1a;
        }
        
        .watch-frame {
            width: 272px;
            height: 340px;
            background: #000;
            border-radius: 50px;
            border: 8px solid #333;
            position: relative;
            overflow: hidden;
        }
        
        .watch-screen {
            width: 100%;
            height: 100%;
            border-radius: 42px;
            overflow: hidden;
        }
        
        .size-selector {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 1000;
        }
        
        .size-selector select {
            background: rgba(0,0,0,0.8);
            color: white;
            border: 1px solid #333;
            padding: 8px;
            border-radius: 4px;
        }
        
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div class="size-selector">
        <select id="sizeSelector" onchange="changeWatchSize()">
            <option value="45mm">Apple Watch 45mm</option>
            <option value="41mm">Apple Watch 41mm</option>
            <option value="49mm">Apple Watch Ultra 49mm</option>
        </select>
    </div>
    
    <div class="watch-container">
        <div class="watch-frame" id="watchFrame">
            <div class="watch-screen">
                <iframe src="http://localhost:3000" id="appFrame"></iframe>
            </div>
        </div>
    </div>
    
    <script>
        const SIZES = ${JSON.stringify(WATCH_SIZES)};
        
        function changeWatchSize() {
            const selector = document.getElementById('sizeSelector');
            const frame = document.getElementById('watchFrame');
            const size = SIZES[selector.value];
            
            frame.style.width = size.width + 'px';
            frame.style.height = size.height + 'px';
        }
        
        // Set initial size
        changeWatchSize();
    </script>
</body>
</html>
  `;

  const testPath = path.join(process.cwd(), 'watch-test.html');
  fs.writeFileSync(testPath, testHTML);
  success(`Created watch test file: ${testPath}`);
  return testPath;
}

function checkWatchSupport() {
  log('Checking Apple Watch support...');
  
  const requiredFiles = [
    'styles/watch.css',
    'components/watch-layout.tsx',
    'components/watch-navigation.tsx'
  ];
  
  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(path.join(process.cwd(), file))
  );
  
  if (missingFiles.length > 0) {
    error(`Missing required files: ${missingFiles.join(', ')}`);
    return false;
  }
  
  success('All Apple Watch support files are present');
  return true;
}

function buildForWatch() {
  log('Building app with Apple Watch optimizations...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    success('Build completed successfully');
  } catch (err) {
    error('Build failed');
    process.exit(1);
  }
}

function syncToiOS() {
  log('Syncing to iOS with watchOS support...');
  
  try {
    execSync('npx cap sync ios', { stdio: 'inherit' });
    success('iOS sync completed');
  } catch (err) {
    error('iOS sync failed');
    process.exit(1);
  }
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      checkWatchSupport();
      break;
      
    case 'test':
      const testFile = createWatchTestHTML();
      log(`Open ${testFile} in your browser to test Apple Watch layout`);
      break;
      
    case 'build':
      if (checkWatchSupport()) {
        buildForWatch();
      }
      break;
      
    case 'sync':
      if (checkWatchSupport()) {
        buildForWatch();
        syncToiOS();
      }
      break;
      
    case 'dev':
      log('Starting development server with Apple Watch support...');
      log('The app will be optimized for screens <= 272px width');
      try {
        execSync('npm run dev', { stdio: 'inherit' });
      } catch (err) {
        error('Development server failed to start');
      }
      break;
      
    default:
      console.log(`
🍎 Apple Watch Development Helper

Usage: node scripts/watch-dev.js <command>

Commands:
  check  - Check if all Apple Watch support files are present
  test   - Create a test HTML file to preview watch layout
  build  - Build the app with Apple Watch optimizations
  sync   - Build and sync to iOS with watchOS support
  dev    - Start development server with watch support info

Examples:
  node scripts/watch-dev.js check
  node scripts/watch-dev.js test
  node scripts/watch-dev.js build
  node scripts/watch-dev.js sync
      `);
      break;
  }
}

main();