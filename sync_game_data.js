import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_NAME = 'AssetRipper-CLI.exe';
const cliPath = path.join(__dirname, CLI_NAME);
const targetProjectDir = path.join(__dirname, 'RippedProject');
const exportDestDir = path.join(__dirname, 'game_asset_export', 'ExportedProject');

console.log('=== ODD REALM DATABASE SYNC UTILITY ===\n');

// 1. Check if AssetRipper-CLI.exe exists
if (!fs.existsSync(cliPath)) {
  console.error(`ERROR: ${CLI_NAME} not found in the root directory!`);
  console.log('\nTo resolve this:');
  console.log('1. Go to: https://github.com/AssetRipper/AssetRipper/releases');
  console.log('2. Download the Windows CLI zip (e.g. AssetRipper_win_x64.zip or CLI release)');
  console.log(`3. Extract and copy "AssetRipper-CLI.exe" directly into this folder:`);
  console.log(`   ${__dirname}\n`);
  process.exit(1);
}

// 2. Auto-detect Odd Realm Data Path
const drives = ['C', 'D', 'E', 'F', 'G', 'H'];
let gameDataPath = null;

for (const d of drives) {
  const p1 = `${d}:\\Program Files (x86)\\Steam\\steamapps\\common\\Odd Realm\\OddRealm_Data`;
  if (fs.existsSync(p1)) {
    gameDataPath = p1;
    break;
  }
  const p2 = `${d}:\\Steam\\steamapps\\common\\Odd Realm\\OddRealm_Data`;
  if (fs.existsSync(p2)) {
    gameDataPath = p2;
    break;
  }
}

if (!gameDataPath) {
  console.warn('WARNING: Could not auto-detect Odd Realm installation path.');
  console.log('Please make sure Odd Realm is installed via Steam on one of your drives.');
  console.log('Defaulting to standard Steam path on E: drive...');
  gameDataPath = 'E:\\Program Files (x86)\\Steam\\steamapps\\common\\Odd Realm\\OddRealm_Data';
}

console.log(`Detected Game Data: ${gameDataPath}`);

if (!fs.existsSync(gameDataPath)) {
  console.error(`ERROR: Game data folder does not exist at ${gameDataPath}`);
  console.log('Please verify your Odd Realm Steam installation.');
  process.exit(1);
}

// 3. Prep directory states
if (fs.existsSync(targetProjectDir)) {
  console.log('Cleaning up old temporary RippedProject folder...');
  fs.rmSync(targetProjectDir, { recursive: true, force: true });
}

// 4. Spawn AssetRipper CLI
console.log('\nRunning AssetRipper-CLI (This will take 1-2 minutes, please wait)...');
const ripper = spawn(cliPath, [gameDataPath], { cwd: __dirname });

ripper.stdout.on('data', (data) => {
  const output = data.toString().trim();
  // Filter logs to keep terminal output clean
  if (output.includes('Exporting') || output.includes('Completed') || output.includes('Finished') || output.includes('ripped')) {
    console.log(`[AssetRipper] ${output}`);
  }
});

ripper.stderr.on('data', (data) => {
  console.warn(`[AssetRipper Warn] ${data.toString().trim()}`);
});

ripper.on('close', (code) => {
  if (code !== 0) {
    console.error(`\nAssetRipper-CLI exited with error code: ${code}`);
    cleanupTempFolders();
    process.exit(1);
  }

  console.log('\nAssetRipper completed successfully. Harvesting assets...');
  try {
    harvestAssets();
    console.log('Harvesting completed. Rebuilding database...');
    rebuildDatabase();
  } catch (err) {
    console.error('Error during asset harvesting/bundling:', err);
  } finally {
    cleanupTempFolders();
  }
});

function harvestAssets() {
  // Ensure destination folders exist
  const destDataDir = path.join(exportDestDir, 'Assets', 'Resources_moved', 'Data');
  fs.mkdirSync(destDataDir, { recursive: true });

  const destArtDir = path.join(exportDestDir, 'Assets', 'Resources_moved', 'art', 'terrain');
  fs.mkdirSync(destArtDir, { recursive: true });

  const destIconsDir = path.join(__dirname, 'game_asset_export', 'item icons');
  fs.mkdirSync(destIconsDir, { recursive: true });

  // Locate resources inside ripped project
  // AssetRipper puts files in "RippedProject/Assets/Resources_moved" or "RippedProject/Assets/Resources"
  let srcResourcesDir = path.join(targetProjectDir, 'Assets', 'Resources_moved');
  if (!fs.existsSync(srcResourcesDir)) {
    srcResourcesDir = path.join(targetProjectDir, 'Assets', 'Resources');
  }

  if (!fs.existsSync(srcResourcesDir)) {
    throw new Error(`Could not find exported Assets/Resources or Assets/Resources_moved folder inside RippedProject.`);
  }

  // 1. Copy Data folders (Items, Blocks, Tooltips, Attacks, BlockVisuals)
  const dataSubFolders = ['Items', 'Blocks', 'Tooltips', 'Attacks', 'BlockVisuals'];
  const srcDataDir = path.join(srcResourcesDir, 'Data');

  if (fs.existsSync(srcDataDir)) {
    dataSubFolders.forEach(sub => {
      const srcSub = path.join(srcDataDir, sub);
      const destSub = path.join(destDataDir, sub);
      if (fs.existsSync(srcSub)) {
        fs.mkdirSync(destSub, { recursive: true });
        copyFilesRecursive(srcSub, destSub);
        console.log(`Copied metadata folder: ${sub}`);
      }
    });
  }

  // 2. Copy Art/terrain/tx_terrain_atlas.png
  const srcAtlas = path.join(srcResourcesDir, 'art', 'terrain', 'tx_terrain_atlas.png');
  const destAtlas = path.join(destArtDir, 'tx_terrain_atlas.png');
  if (fs.existsSync(srcAtlas)) {
    fs.copyFileSync(srcAtlas, destAtlas);
    console.log('Copied terrain atlas texture.');
  }

  // 3. Copy icons (AssetRipper puts extracted sprites/icons in Assets/Resources/art/icons/ or Sprites/)
  const srcIcons = path.join(srcResourcesDir, 'art', 'icons');
  if (fs.existsSync(srcIcons)) {
    const files = fs.readdirSync(srcIcons);
    let copiedIcons = 0;
    files.forEach(file => {
      if (file.toLowerCase().endsWith('.png')) {
        fs.copyFileSync(path.join(srcIcons, file), path.join(destIconsDir, file));
        copiedIcons++;
      }
    });
    console.log(`Copied ${copiedIcons} game icons.`);
  }
}

function copyFilesRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  
  if (fs.lstatSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyFilesRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function rebuildDatabase() {
  try {
    console.log('Compiling database...');
    execSync('node build_database.js', { stdio: 'inherit', cwd: __dirname });
    console.log('\nDatabase compiled successfully! Database explorer updated.');
  } catch (err) {
    console.error('Failed to execute build_database.js:', err.message);
  }
}

function cleanupTempFolders() {
  if (fs.existsSync(targetProjectDir)) {
    console.log('\nCleaning up temporary RippedProject folder to save disk space...');
    try {
      fs.rmSync(targetProjectDir, { recursive: true, force: true });
      console.log('Cleanup completed successfully.');
    } catch (err) {
      console.warn(`Warning: Could not remove temporary RippedProject directory: ${err.message}`);
    }
  }
}
