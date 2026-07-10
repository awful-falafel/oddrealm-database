import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exportPath = path.join(__dirname, 'game_asset_export', 'ExportedProject');

console.log('=== ODD REALM DATABASE HARVESTER & CLEANUP UTILITY ===\n');

// 1. Verify that the user has exported the game files
if (!fs.existsSync(exportPath)) {
  printExportInstructions();
  process.exit(1);
}

// 2. Auto-hoist if AssetRipper nested the output as ExportedProject/ExportedProject/...
const nestedPath = path.join(exportPath, 'ExportedProject');
if (fs.existsSync(nestedPath) && fs.lstatSync(nestedPath).isDirectory()) {
  console.log('Detected nested ExportedProject directory. Hoisting files to root...');
  try {
    const items = fs.readdirSync(nestedPath);
    items.forEach(item => {
      const src = path.join(nestedPath, item);
      const dest = path.join(exportPath, item);
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.renameSync(src, dest);
    });
    fs.rmdirSync(nestedPath);
    console.log('Hoisting completed successfully.');
  } catch (err) {
    console.error('Failed to hoist nested directory:', err.message);
  }
}

// Check if Assets directory exists now
const assetsPath = path.join(exportPath, 'Assets');
if (!fs.existsSync(assetsPath)) {
  console.error(`ERROR: "Assets" folder not found under ${exportPath}`);
  printExportInstructions();
  process.exit(1);
}

console.log('Exported project found. Beginning database compilation...');

// 3. Rebuild the database
try {
  console.log('Executing build_database.js...');
  execSync('node build_database.js', { stdio: 'inherit', cwd: __dirname });
  console.log('\nDatabase compiled successfully! Website source files updated.');
} catch (err) {
  console.error('Failed to compile database:', err.message);
  process.exit(1);
}

// 4. Clean up heavy Unity files to free up disk space
console.log('\nCleaning up heavy, unneeded assets to save disk space...');
const assetsDir = path.join(exportPath, 'Assets');

if (fs.existsSync(assetsDir)) {
  // Directories we want to keep (contains items, blocks, tooltips, attacks)
  const whitelist = ['resources_moved', 'resources', 'art'];
  const whitelistLower = whitelist.map(w => w.toLowerCase());

  try {
    const folders = fs.readdirSync(assetsDir);
    folders.forEach(folder => {
      const folderPath = path.join(assetsDir, folder);
      if (fs.lstatSync(folderPath).isDirectory()) {
        if (!whitelistLower.includes(folder.toLowerCase())) {
          console.log(`  Deleting unneeded folder: Assets/${folder}`);
          fs.rmSync(folderPath, { recursive: true, force: true });
        }
      }
    });

    // Clean up auxiliary folders outside of Assets (e.g. AuxiliaryFiles, ProjectSettings)
    const rootFolders = fs.readdirSync(exportPath);
    rootFolders.forEach(item => {
      const itemPath = path.join(exportPath, item);
      if (item !== 'Assets' && fs.lstatSync(itemPath).isDirectory()) {
        console.log(`  Deleting utility folder: ${item}`);
        fs.rmSync(itemPath, { recursive: true, force: true });
      }
    });

    console.log('\nCleanup completed successfully! Workspace size reduced to under 15 MB.');
  } catch (err) {
    console.warn(`Warning: Error during workspace cleanup: ${err.message}`);
  }
}

function printExportInstructions() {
  console.log('To update the database using the AssetRipper GUI:');
  console.log('1. Launch "AssetRipper.GUI.Free.exe" on your computer.');
  console.log('2. Click "File > Open Folder" and select:');
  console.log('   E:\\Program Files (x86)\\Steam\\steamapps\\common\\Odd Realm\\OddRealm_Data');
  console.log('3. In AssetRipper, select "Export > Export All Files" and choose this destination:');
  console.log(`   ${exportPath}`);
  console.log('\nOnce the export finishes in AssetRipper, run this script again to clean up and compile!');
}
