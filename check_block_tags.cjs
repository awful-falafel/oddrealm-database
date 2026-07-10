const fs = require('fs');
const path = require('path');

const exportPath = 'C:\\Users\\carls\\OneDrive\\Desktop\\oddrealm_modding_app\\game_asset_export\\ExportedProject';
const blocksDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Blocks');

const files = [
  'prop_stone_anvil.asset',
  'prop_loom.asset',
  'prop_wood_stove.asset',
  'block_dirt.asset',
  'prop_bronze_anvil.asset'
];

files.forEach(file => {
  const fullPath = path.join(blocksDir, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const tagIds = content.match(/TagIDs:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
    const usageTags = content.match(/UsageTags:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
    console.log(file, '=>');
    console.log('  TagIDs:', tagIds ? tagIds[1].trim().replace(/\r?\n/g, ', ') : 'none');
    console.log('  UsageTags:', usageTags ? usageTags[1].trim().replace(/\r?\n/g, ', ') : 'none');
  } else {
    console.log(file, 'not found');
  }
});
