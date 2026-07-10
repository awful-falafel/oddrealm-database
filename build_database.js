import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exportPath = path.join(__dirname, 'game_asset_export', 'ExportedProject');
const publicIconsDir = path.join(__dirname, 'public', 'game_icons');
const publicAtlasPath = path.join(__dirname, 'public', 'game_atlas.png');
const srcDatabasePath = path.join(__dirname, 'src', 'glossary_database.json');

// Auto-hoist if AssetRipper nested the output
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

console.log('--- STARTING ASSETS PRE-PACKAGING AND BUNDLING COMPILER ---');

if (!fs.existsSync(exportPath)) {
  console.error(`Error: game_asset_export directory not found at ${exportPath}`);
  process.exit(1);
}


// 1. Ensure public directories exist
if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
}

// 2. Copy the Terrain Atlas to public
const srcAtlasPath1 = path.join(exportPath, 'Assets', 'Resources', 'art', 'terrain', 'tx_terrain_atlas.png');
const srcAtlasPath2 = path.join(exportPath, 'Assets', 'Resources_moved', 'art', 'terrain', 'tx_terrain_atlas.png');
const srcAtlasPath = fs.existsSync(srcAtlasPath1) ? srcAtlasPath1 : srcAtlasPath2;

if (fs.existsSync(srcAtlasPath)) {
  fs.copyFileSync(srcAtlasPath, publicAtlasPath);
  console.log(`Copied terrain atlas to ${publicAtlasPath}`);
} else {
  console.warn('Warning: Terrain atlas file not found in export folder.');
}

// 3. Copy all icons to public/game_icons/
const extractedIconsDir = path.join(__dirname, 'game_asset_export', 'item icons');
let count = 0;

if (fs.existsSync(extractedIconsDir)) {
  const files = fs.readdirSync(extractedIconsDir);
  files.forEach(file => {
    if (file.toLowerCase().endsWith('.png')) {
      fs.copyFileSync(
        path.join(extractedIconsDir, file),
        path.join(publicIconsDir, file)
      );
      count++;
    }
  });
  console.log(`Copied ${count} item icons from ${extractedIconsDir} to ${publicIconsDir}`);
}

const srcIconsDir = path.join(exportPath, 'Assets', 'Resources', 'art', 'icons');
if (fs.existsSync(srcIconsDir)) {
  const files = fs.readdirSync(srcIconsDir);
  let srcCount = 0;
  files.forEach(file => {
    if (file.toLowerCase().endsWith('.png')) {
      const destFile = path.join(publicIconsDir, file);
      if (!fs.existsSync(destFile)) {
        fs.copyFileSync(path.join(srcIconsDir, file), destFile);
        srcCount++;
      }
    }
  });
  console.log(`Copied ${srcCount} unique item icons from ${srcIconsDir} to ${publicIconsDir}`);
}

// 4. Parse glossary database
const itemsDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Items');
const blocksDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Blocks');
const tooltipsDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Tooltips');
const attacksDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Attacks');
const blockVisualsDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'BlockVisuals');

console.log('Parsing tooltips and attacks...');

const tooltipsMap = {};
if (fs.existsSync(tooltipsDir)) {
  fs.readdirSync(tooltipsDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(tooltipsDir, file), 'utf8');
      const id = content.match(/m_Name:\s*(\w+)/)?.[1] || path.basename(file, '.asset');
      const nameMatch = content.match(/^\s*Name:\s*([^\r\n]+)/m);
      if (nameMatch) {
        let nameStr = nameMatch[1].trim();
        if ((nameStr.startsWith("'") && nameStr.endsWith("'")) || (nameStr.startsWith('"') && nameStr.endsWith('"'))) {
          nameStr = nameStr.slice(1, -1).trim();
        }
        tooltipsMap[id] = nameStr;
      }
    } catch(e){}
  });
}

const attacksMap = {};
if (fs.existsSync(attacksDir)) {
  fs.readdirSync(attacksDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(attacksDir, file), 'utf8');
      const id = content.match(/m_Name:\s*(\w+)/)?.[1] || path.basename(file, '.asset');
      const min = content.match(/MinAmount:\s*(\d+)/)?.[1] || '0';
      const max = content.match(/MaxAmount:\s*(\d+)/)?.[1] || '0';
      const range = content.match(/Range:\s*(\d+)/)?.[1] || '1';
      const dmgType = content.match(/DamageType:\s*(\d+)/)?.[1] || '2';
      const skillId = content.match(/SkillID:\s*(\w+)/)?.[1] || 'skill_fight_melee';
      attacksMap[id] = { 
        min: parseInt(min), 
        max: parseInt(max), 
        range: parseInt(range),
        dmgType: parseInt(dmgType),
        skillId: skillId.replace('skill_fight_', '')
      };
    } catch(e){}
  });
}

const visualsMap = {};
if (fs.existsSync(blockVisualsDir)) {
  fs.readdirSync(blockVisualsDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(blockVisualsDir, file), 'utf8');
      const id = content.match(/m_Name:\s*(\w+)/)?.[1] || path.basename(file, '.asset');
      const tx = content.match(/TextureX:\s*(\d+)/)?.[1] || '0';
      const ty = content.match(/TextureY:\s*(\d+)/)?.[1] || '0';
      visualsMap[id] = { textureX: parseInt(tx), textureY: parseInt(ty) };
    } catch(e){}
  });
}

// 5. Parse research names map
const researchNamesMap = {};
const researchDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Research');
if (fs.existsSync(researchDir)) {
  fs.readdirSync(researchDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(researchDir, file), 'utf8');
      const nameMatch = content.match(/m_Name:\s*(\w+)/);
      if (!nameMatch) return;
      const id = nameMatch[1];
      const tooltipIdMatch = content.match(/TooltipID:\s*(\w+)/);
      const tooltipId = tooltipIdMatch ? tooltipIdMatch[1] : '';
      let humanName = id.replace('research_', '').replace(/_/g, ' ');
      humanName = humanName.charAt(0).toUpperCase() + humanName.slice(1);

      if (tooltipId) {
        const tooltipFile = path.join(tooltipsDir, `${tooltipId}.asset`);
        if (fs.existsSync(tooltipFile)) {
          const tooltipContent = fs.readFileSync(tooltipFile, 'utf8');
          const nameFieldMatch = tooltipContent.match(/^\s*Name:\s*([^\r\n]+)/m);
          if (nameFieldMatch) {
            let nameStr = nameFieldMatch[1].trim();
            if ((nameStr.startsWith("'") && nameStr.endsWith("'")) || (nameStr.startsWith('"') && nameStr.endsWith('"'))) {
              nameStr = nameStr.slice(1, -1).trim();
            }
            humanName = nameStr;
          }
        }
      }
      researchNamesMap[id] = humanName;
    } catch(e){}
  });
}

// 6. Parse blueprints to map spawned ID -> unlocking research keys
const blueprintResearchMap = {};
const blueprintsDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Blueprints');
if (fs.existsSync(blueprintsDir)) {
  fs.readdirSync(blueprintsDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(blueprintsDir, file), 'utf8');
      const spawnMatch = content.match(/SpawnTagObjectID:\s*(\w+)/);
      if (!spawnMatch) return;
      const spawnId = spawnMatch[1];

      const researchMatches = content.match(/\bResearchKeys:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      if (researchMatches) {
        const researchText = researchMatches[1];
        const regex = /-\s*(\w+)/g;
        let m;
        const keys = [];
        while ((m = regex.exec(researchText)) !== null) {
          keys.push(m[1]);
        }
        if (keys.length > 0) {
          blueprintResearchMap[spawnId] = keys;
        }
      }
    } catch (e) {}
  });
}

const resolveResearchList = (id) => {
  const keys = blueprintResearchMap[id] || [];
  return keys.map(key => {
    const name = researchNamesMap[key] || key.replace('research_', '').replace(/_/g, ' ');
    const normKey = key.toLowerCase();
    
    // Find matching icon file
    let iconFile = 'sp_research_basics0.png'; // default fallback
    try {
      const files = fs.readdirSync(publicIconsDir);
      for (const file of files) {
        const normFile = file.toLowerCase().replace(/\.png$/i, '');
        if (
          normFile === normKey || 
          normFile === `${normKey}0` || 
          normFile === `${normKey}1` ||
          normFile === normKey.replace('research_', 'sp_research_') ||
          normFile === `${normKey.replace('research_', 'sp_research_')}0` ||
          normFile === `${normKey.replace('research_', 'sp_research_')}1`
        ) {
          iconFile = file;
          break;
        }
      }
    } catch(e){}
    return { name, iconFile };
  });
};

console.log('Compiling Items and Weapons...');
const items = [];
if (fs.existsSync(itemsDir)) {
  fs.readdirSync(itemsDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(itemsDir, file), 'utf8');
      
      // Filter out disabled items
      const isEnabled = content.match(/m_Enabled:\s*(\d+)/)?.[1];
      if (isEnabled === '0') return;

      const id = content.match(/m_Name:\s*(\w+)/)?.[1] || path.basename(file, '.asset');
      const tooltipId = content.match(/TooltipID:\s*(\w+)/)?.[1] || '';
      const name = tooltipsMap[tooltipId] || id.replace('item_', '').replace(/_/g, ' ');
      const buyValue = parseInt(content.match(/MerchantBuyValue:\s*(\d+)/)?.[1] || '0');
      const stackSize = parseInt(content.match(/StackSize:\s*(\d+)/)?.[1] || '1');
      const type = content.match(/ItemType:\s*(\w+)/)?.[1] || '';
      const rarity = content.match(/ItemRarity:\s*(\w+)/)?.[1] || 'item_rarity_common';
      const decayRate = parseInt(content.match(/DecayRate:\s*(-?\d+)/)?.[1] || '-1');
      const decayItem = content.match(/DecayItem:\s*(\w+)/)?.[1] || '';

      // Resolve 1h / 2h hands slots
      const fillAllSlots = parseInt(content.match(/FillAllSlots:\s*(\d+)/)?.[1] || '0');

      // Resolve visuals coordinates
      const visualsId = content.match(/Visuals:\s*(\w+)/)?.[1] || '';
      const visualsObj = visualsMap[visualsId] || { textureX: 0, textureY: 0 };

      // Resolve slot strings
      const slotMatches = content.match(/\bPermittedSlots:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      const slots = [];
      if (slotMatches) {
        const slotsText = slotMatches[1];
        const regex = /-\s*(\w+)/g;
        let m;
        while ((m = regex.exec(slotsText)) !== null) {
          slots.push(m[1].replace('item_slot_', '').replace(/_/g, ' '));
        }
      }

      let handsLabel = slots.join(', ');
      if (handsLabel.includes('hand')) {
        handsLabel += fillAllSlots === 1 ? ' (2h)' : ' (1h)';
      }

      // Resolve attacks
      const attackMatches = content.match(/\bAttacks:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      const attacksList = [];
      let minDamage = 0;
      let maxDamage = 0;
      if (attackMatches) {
        const attacksText = attackMatches[1];
        const regex = /-\s*(\w+)/g;
        let m;
        while ((m = regex.exec(attacksText)) !== null) {
          const attId = m[1];
          const attData = attacksMap[attId];
          if (attData) {
            const nameClean = attId.replace('attack_', '').replace(/_/g, ' ');
            const nameTitle = nameClean.charAt(0).toUpperCase() + nameClean.slice(1);
            const dmgTypeLabel = attData.dmgType === 1 ? 'Blunt' : (attData.dmgType === 2 ? 'Slash' : (attData.dmgType === 3 ? 'Pierce' : 'Physical'));
            attacksList.push(`${nameTitle} (${attData.min}-${attData.max} Dmg, Rng ${attData.range}, ${dmgTypeLabel}, ${attData.skillId})`);
            
            if (attData.min > minDamage) minDamage = attData.min;
            if (attData.max > maxDamage) maxDamage = attData.max;
          }
        }
      }

      // Resolve actions / buffs / consumables values
      const actionsList = [];
      let toughness = 0;
      const actionsBlock = content.match(/\bActions:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      if (actionsBlock) {
        const actionsText = actionsBlock[1];
        const individualActions = actionsText.split(/-\s*ActionID:/g);
        individualActions.forEach(act => {
          if (!act.trim()) return;
           const targetIdMatch = act.match(/TargetID:[ \t]*([a-zA-Z0-9_]+)/);
           const amountMatch = act.match(/Amount:[ \t]*(-?\d+)/);
           if (targetIdMatch && amountMatch) {
             const targetId = targetIdMatch[1];
             if (targetId === 'attribute_source_id' || targetId === 'source_id' || targetId === 'SourceID') return;

             const amountVal = parseInt(amountMatch[1]);
             if (targetId === 'attribute_toughness') {
               toughness = amountVal;
               return; // Do not add to actionsList
             }

            const rawName = targetId.replace('attribute_', '').replace('skill_', '').replace(/_/g, ' ');
            const statName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
            actionsList.push(`${amountVal >= 0 ? '+' : ''}${amountVal} ${statName}`);
          }
        });
      }

      // Resolve icon sprite name mapping with robust fallback matching
      const cleanId = id.toLowerCase();
      const base = id.replace(/^item_|^block_|^prop_/, '').toLowerCase();
      
      // Build extended name variants for game-specific patterns
      const baseNoRaw = base.replace(/_raw$/, '');               // item_apple_raw -> apple
      const baseNoSeed = base.replace(/_seed$/, '');             // item_agave_seed -> agave
      const baseNoTreeSeed = base.replace(/_tree_seed$/, '');    // item_oak_tree_seed -> oak
      const baseMeatNoRaw = base.replace(/_meat_raw$/, '_meat'); // item_chicken_meat_raw -> chicken_meat
      const baseNoTwoHand = base.replace(/_two_hand$/, '');      // item_wood_pickaxe_two_hand -> wood_pickaxe
      // Remains: item_chicken_remains -> remains_chicken
      const remainsMatch = base.match(/^(.+)_remains$/);
      const remainsReversed = remainsMatch ? `remains_${remainsMatch[1]}` : '';
      // Reversed word pairs: item_water_purified -> sp_purified_water_icon.png
      const twoWords = base.match(/^(\w+)_(\w+)$/);
      const reversed = twoWords ? `${twoWords[2]}_${twoWords[1]}` : '';
      // Tree fruit -> tree seed fallback: item_tthdir_tree_fruit -> sp_tthdir_tree_seed_icon.png
      const fruitToSeed = base.replace(/_fruit$/, '_seed');
      
      const possibleIconNames = [
        `sp_${base}_icon.png`,
        `sp_block_${base}_icon.png`,
        `sp_prop_${base}_icon.png`,
        `sp_${cleanId}_icon.png`,
        // Strip _raw suffix (item_apple_raw -> sp_apple_icon.png)
        `sp_${baseNoRaw}_icon.png`,
        // Raw meat (item_chicken_meat_raw -> sp_chicken_meat_icon.png)
        `sp_${baseMeatNoRaw}_icon.png`,
        // Seeds -> plant prefix (item_agave_seed -> sp_plant_agave_icon.png)
        `sp_plant_${baseNoSeed}_icon.png`,
        // Tree seeds with full tree name (item_apple_tree_seed -> sp_plant_apple_tree_sapling_icon.png)
        `sp_plant_${baseNoSeed}_sapling_icon.png`,
        // Tree seeds stripped (item_oak_tree_seed -> sp_plant_oak_sapling_icon.png)
        `sp_plant_${baseNoTreeSeed}_sapling_icon.png`,
        // Remains reversed (item_chicken_remains -> sp_remains_chicken_icon.png)
        remainsReversed ? `sp_${remainsReversed}_icon.png` : '',
        // Strip _two_hand (item_wood_pickaxe_two_hand -> sp_wood_pickaxe_icon.png)
        `sp_${baseNoTwoHand}_icon.png`,
        // Reversed word order (item_water_purified -> sp_purified_water_icon.png)
        reversed ? `sp_${reversed}_icon.png` : '',
        // Fruit to seed fallback (item_tthdir_tree_fruit -> sp_tthdir_tree_seed_icon.png)
        `sp_${fruitToSeed}_icon.png`,
        `sp_${cleanId}.png`,
        `sp_${base}.png`,
        `${base}_icon.png`,
        `${cleanId}_icon.png`,
        `${cleanId}.png`,
        `${base}.png`
      ].filter(Boolean);

      let iconFilename = '';
      for (const possible of possibleIconNames) {
        if (fs.existsSync(path.join(publicIconsDir, possible))) {
          iconFilename = possible;
          break;
        }
      }

      // If still not found, do normalized fuzzy matching
      if (!iconFilename && fs.existsSync(publicIconsDir)) {
        const normId = cleanId.replace(/[^a-z0-9]/g, '');
        const normBase = base.replace(/[^a-z0-9]/g, '');
        const normNoRaw = baseNoRaw.replace(/[^a-z0-9]/g, '');
        const normMeat = baseMeatNoRaw.replace(/[^a-z0-9]/g, '');
        const normRemains = remainsReversed.replace(/[^a-z0-9]/g, '');
        const normPlant = `plant${baseNoSeed.replace(/[^a-z0-9]/g, '')}`;
        const filesInDir = fs.readdirSync(publicIconsDir);
        for (const file of filesInDir) {
          const normFile = file.toLowerCase().replace(/\.png$/i, '').replace(/[^a-z0-9]/g, '');
          if (normFile === `sp${normBase}icon` || normFile === `sp${normId}icon` || 
              normFile === `sp${normNoRaw}icon` || normFile === `sp${normMeat}icon` ||
              (normRemains && normFile === `sp${normRemains}icon`) ||
              normFile === `sp${normPlant}icon` ||
              normFile === `${normBase}icon` || normFile === normId || normFile === normBase) {
            iconFilename = file;
            break;
          }
        }
      }

      // Resolve unlocking research nodes
      const rList = resolveResearchList(id);
      const unlockResearch = rList.map(r => r.name).join(', ') || 'None (Start)';

      items.push({
        id,
        name,
        buyValue,
        stackSize,
        type: type.replace('tag_item_type_', ''),
        rarity: rarity.replace('item_rarity_', ''),
        decayInfo: decayRate === -1 ? 'None' : `Decays in ${decayRate} to ${decayItem.replace('item_', '')}`,
        textureX: visualsObj.textureX,
        textureY: visualsObj.textureY,
        slots: handsLabel || 'Inventory Only',
        attacks: attacksList.join(', ') || 'None',
        minDamage,
        maxDamage,
        toughness,
        actions: actionsList.join(', ') || 'None',
        iconFilename,
        unlockResearch,
        unlockResearchList: rList
      });
    } catch (e) {
      console.error(`Failed parsing item ${file}:`, e.message);
    }
  });
}

console.log('Compiling Blocks and Props...');
const blocks = [];
if (fs.existsSync(blocksDir)) {
  fs.readdirSync(blocksDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(blocksDir, file), 'utf8');
      
      const isEnabled = content.match(/m_Enabled:\s*(\d+)/)?.[1];
      if (isEnabled === '0') return;

      const id = content.match(/m_Name:\s*(\w+)/)?.[1] || path.basename(file, '.asset');
      const tooltipId = content.match(/TooltipID:\s*(\w+)/)?.[1] || '';
      const name = tooltipsMap[tooltipId] || id.replace('block_', '').replace(/_/g, ' ');
      const roomQuality = parseInt(content.match(/RoomQualityAdd:\s*(\d+)/)?.[1] || '0');
      const toughness = parseInt(content.match(/Toughness:\s*(\d+)/)?.[1] || '0');
      const cost = parseInt(content.match(/MovementCost:\s*(\d+)/)?.[1] || '3');

      // Resolve visuals coordinates
      const visualsId = content.match(/Visuals:\s*[\s\S]*?-\s*(\w+)/)?.[1] || '';
      const visualsObj = visualsMap[visualsId] || { textureX: 0, textureY: 0 };

      // Find individual block/prop PNG icon file
      const base = id.replace(/^(block_|prop_)/, '');
      const cleanId = id.replace(/[^a-z0-9_]/g, '');
      // For lode blocks like block_lode_coal_ore, also try without the lode_ prefix
      const baseNoLode = base.replace(/^lode_/, '');
      const possibleIconNames = [
        `sp_block_${base}_icon.png`,
        `sp_prop_${base}_icon.png`,
        `sp_${base}_icon.png`,
        `sp_${cleanId}_icon.png`,
        `sp_block_${cleanId}_icon.png`,
        `sp_prop_${cleanId}_icon.png`,
        `sp_block_${baseNoLode}_icon.png`,
        `sp_prop_${baseNoLode}_icon.png`,
        `sp_${baseNoLode}_icon.png`,
        `sp_${cleanId}.png`,
        `sp_${base}.png`,
        `${base}_icon.png`,
        `${cleanId}_icon.png`,
        `${cleanId}.png`,
        `${base}.png`
      ];

      let iconFilename = '';
      for (const possible of possibleIconNames) {
        if (fs.existsSync(path.join(publicIconsDir, possible))) {
          iconFilename = possible;
          break;
        }
      }

      if (!iconFilename && fs.existsSync(publicIconsDir)) {
        const normId = cleanId.replace(/[^a-z0-9]/g, '');
        const normBase = base.replace(/[^a-z0-9]/g, '');
        const filesInDir = fs.readdirSync(publicIconsDir);
        for (const file of filesInDir) {
          const normFile = file.toLowerCase().replace(/\.png$/i, '').replace(/[^a-z0-9]/g, '');
          if (normFile === `spblock${normBase}icon` || normFile === `spprop${normBase}icon` || normFile === `spblock${normId}icon` || normFile === `spprop${normId}icon` || normFile === `sp${normBase}icon` || normFile === `sp${normId}icon` || normFile === `${normBase}icon` || normFile === normId || normFile === normBase) {
            iconFilename = file;
            break;
          }
        }
      }

      // Resolve tags to check if it is a crafting station
      const tagIdsBlock = content.match(/\bTagIDs:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      const usageTagsBlock = content.match(/\bUsageTags:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      const tagsList = [];
      const tagRegex = /-\s*(\w+)/g;
      
      if (tagIdsBlock) {
        let m;
        while ((m = tagRegex.exec(tagIdsBlock[1])) !== null) tagsList.push(m[1]);
      }
      tagRegex.lastIndex = 0; // reset
      if (usageTagsBlock) {
        let m;
        while ((m = tagRegex.exec(usageTagsBlock[1])) !== null) tagsList.push(m[1]);
      }

      const isStation = tagsList.some(tag => 
        tag.includes('bench') || 
        tag.includes('anvil') || 
        tag.includes('stove') || 
        tag.includes('furnace') || 
        tag.includes('well') || 
        tag.includes('distillery') || 
        tag.includes('butcher') || 
        tag.includes('station') ||
        tag.includes('loom') ||
        tag.includes('table') ||
        tag.includes('mat') ||
        tag.includes('basket') ||
        tag.includes('pot') ||
        tag.includes('bed') ||
        tag.includes('container') ||
        tag.includes('box') ||
        tag.includes('chest') ||
        tag.includes('shelf') ||
        tag.includes('rack') ||
        tag.includes('trough') ||
        tag.includes('dummy') ||
        tag.includes('pool') ||
        tag.includes('rostrum')
      ) || id.includes('bench') || id.includes('anvil') || id.includes('stove') || id.includes('furnace') || id.includes('well') || id.includes('distillery') || id.includes('butcher') || id.includes('loom') || id.includes('table') || id.includes('mat') || id.includes('basket') || id.includes('pot') || id.includes('bed') || id.includes('container') || id.includes('box') || id.includes('chest') || id.includes('shelf') || id.includes('rack') || id.includes('trough') || id.includes('dummy') || id.includes('pool') || id.includes('rostrum');

      // Resolve unlocking research nodes
      const rList = resolveResearchList(id);
      const unlockResearch = rList.map(r => r.name).join(', ') || 'None (Start)';

      blocks.push({
        id,
        name,
        roomQuality,
        toughness,
        cost,
        textureX: visualsObj.textureX,
        textureY: visualsObj.textureY,
        iconFilename,
        isStation,
        unlockResearch,
        unlockResearchList: rList
      });
    } catch(e){}
  });
}

console.log('Compiling Crafting Stations and Props...');
const craftingStations = [
  { id: 'tag_workbench', name: 'Workbench' },
  { id: 'tag_anvil', name: 'Anvil' },
  { id: 'tag_stove', name: 'Stove' },
  { id: 'tag_furnace', name: 'Furnace' },
  { id: 'tag_well', name: 'Well' },
  { id: 'tag_still', name: 'Distillery' },
  { id: 'tag_butcher', name: 'Butcher Block' },
  { id: 'tag_loom', name: 'Tailor Loom' },
  { id: 'tag_table', name: 'Table' },
  { id: 'tag_bed', name: 'Bed / Sleeping Mat' },
  { id: 'tag_container', name: 'Container / Basket / Chest' },
  { id: 'tag_cauldron', name: 'Cauldron' },
  { id: 'tag_altar', name: 'Altar' },
  { id: 'tag_barrel', name: 'Barrel' },
  { id: 'tag_roost', name: 'Roost' }
];

// Append all enabled props, stripping material prefixes to deduplicate (e.g. Wood Chair and Stone Chair become Chair)
const materialList = [
  'wood', 'stone', 'iron', 'steel', 'bronze', 'clay', 'rutile', 'sable', 'gold', 'silver', 
  'copper', 'lead', 'tin', 'obsidian', 'bedrock', 'dirt', 'sand', 'ice', 'snow', 'gem', 
  'glass', 'fiber', 'grass', 'rope', 'bone', 'leather', 'ancient', 'tomek', 'gwdir', 'ardyn', 'human'
];
const materialRegex = new RegExp(`^(${materialList.join('|')})\\s+`, 'i');
const materialIdRegex = new RegExp(`_(${materialList.join('|')})_`, 'g');

const seenStationNames = new Set(craftingStations.map(c => c.name.toLowerCase()));
const seenStationIds = new Set(craftingStations.map(c => c.id.toLowerCase()));

blocks.forEach(b => {
  const isProp = b.id.startsWith('prop_');
  if (isProp) {
    // Clean name by stripping material prefix
    let cleanName = b.name.replace(materialRegex, '').trim();
    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    
    // Clean ID by stripping material segment
    let cleanId = b.id.replace(materialIdRegex, '_');
    const tagId = cleanId.replace('prop_', 'tag_');

    if (!seenStationNames.has(cleanName.toLowerCase()) && !seenStationIds.has(tagId.toLowerCase())) {
      seenStationNames.add(cleanName.toLowerCase());
      seenStationIds.add(tagId.toLowerCase());
      craftingStations.push({ id: tagId, name: cleanName });
    }
  }
});

const glossaryData = { items, blocks, craftingStations };
fs.writeFileSync(srcDatabasePath, JSON.stringify(glossaryData, null, 2), 'utf8');
console.log(`Successfully compiled and bundled ${items.length} items, ${blocks.length} blocks, and ${craftingStations.length} crafting stations to ${srcDatabasePath}`);
console.log('--- ASSET BUNDLE COMPILING COMPLETE ---');
