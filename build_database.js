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

function extractYamlField(content, fieldName) {
  const regex = new RegExp(`^[ \\t]*${fieldName}:([\\s\\S]*?)(?=\\r?\\n  [A-Za-z]+:|$)`, 'm');
  const match = content.match(regex);
  if (!match) return '';
  let val = match[1].trim();
  if (val.startsWith('|') || val.startsWith('>')) {
    val = val.slice(1).trim();
  }
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1).trim();
  }
  val = val.split('\n').map(line => line.trim()).join(' ');
  return val.replace(/\s+/g, ' ');
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
const statuses = [];
if (fs.existsSync(tooltipsDir)) {
  fs.readdirSync(tooltipsDir).filter(f => f.endsWith('.asset')).forEach(file => {
      try {
        const content = fs.readFileSync(path.join(tooltipsDir, file), 'utf8');
        const id = content.match(/m_Name:\s*(\w+)/)?.[1] || path.basename(file, '.asset');
        const nameStr = extractYamlField(content, 'Name');
        if (nameStr) {
          let descStr = extractYamlField(content, 'Description').replace(/^DiscoveryHint:\s*/i, '').trim();
          if (descStr === 'DiscoveryHint:') descStr = '';

          let hintStr = extractYamlField(content, 'DiscoveryHint').replace(/^DiscoveryHint:\s*/i, '').trim();
          if (hintStr === 'DiscoveryHint:') hintStr = '';

          const typeStr = content.match(/Type:\s*(\w+)/)?.[1] || '';
          const inlineIcon = content.match(/InlineIcon:\s*['"]?(.*?)['"]?$/m)?.[1]?.trim() || '';
          const order = parseInt(content.match(/Order:\s*(\d+)/)?.[1] || '0');
          
          let textColor = null;
          const rMatch = content.match(/TextColor:\s*\{r:\s*([\d.]+),\s*g:\s*([\d.]+),\s*b:\s*([\d.]+),\s*a:\s*([\d.]+)\}/);
          if (rMatch) {
            const r = Math.round(parseFloat(rMatch[1]) * 255);
            const g = Math.round(parseFloat(rMatch[2]) * 255);
            const b = Math.round(parseFloat(rMatch[3]) * 255);
            const a = parseFloat(rMatch[4]);
            textColor = `rgba(${r}, ${g}, ${b}, ${a})`;
          }

          tooltipsMap[id] = { name: nameStr, description: descStr, discoveryHint: hintStr, type: typeStr, inlineIcon, textColor, order };

          if (typeStr === 'Status' || id.startsWith('tooltip_entity_status_')) {
            statuses.push({
              id: id.replace('tooltip_', ''),
              name: nameStr,
              description: descStr,
              discoveryHint: hintStr,
              inlineIcon,
              textColor,
              order
            });
          }
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
      const range = content.match(/\bRange:\s*(\d+)/)?.[1] || '1';
      const dmgType = content.match(/DamageType:\s*(\d+)/)?.[1] || '2';
      const skillId = content.match(/SkillID:\s*(\w+)/)?.[1] || 'skill_fight_melee';
      const atkTooltipId = content.match(/TooltipID:\s*(\w+)/)?.[1] || '';
      const atkName = tooltipsMap[atkTooltipId]?.name || id.replace('attack_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      attacksMap[id] = { 
        name: atkName,
        minDamage: parseInt(min), 
        maxDamage: parseInt(max), 
        range: parseInt(range),
        dmgType: parseInt(dmgType),
        skillId: skillId.replace('skill_fight_', '')
      };
    } catch(e){}
  });
}

const agesMap = {};
const entityAgeDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'EntityAge');
if (fs.existsSync(entityAgeDir)) {
  fs.readdirSync(entityAgeDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(entityAgeDir, file), 'utf8');
      const id = content.match(/m_Name:\s*(\w+)/)?.[1] || path.basename(file, '.asset');
      const min = parseInt(content.match(/\bMin:\s*(\d+)/)?.[1] || '0');
      const max = parseInt(content.match(/\bMax:\s*(\d+)/)?.[1] || '0');
      const ageType = parseInt(content.match(/\bAgeType:\s*(\d+)/)?.[1] || '0');
      const tooltipId = content.match(/TooltipID:\s*(\w+)/)?.[1] || '';
      agesMap[id] = { min, max, ageType, tooltipId };
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
const blueprintRecipeMap = {};
const blueprintsDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Blueprints');
if (fs.existsSync(blueprintsDir)) {
  fs.readdirSync(blueprintsDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(blueprintsDir, file), 'utf8');
      const spawnMatch = content.match(/SpawnTagObjectID:\s*(\w+)/);
      if (!spawnMatch) return;
      const spawnId = spawnMatch[1];

      const ingredients = {};
      const resourceRegex = /ResourceID:[ \t]*([^\r\n]+)/g;
      let resMatch;
      while ((resMatch = resourceRegex.exec(content)) !== null) {
         const resId = resMatch[1].trim();
         if (resId) {
            ingredients[resId] = (ingredients[resId] || 0) + 1;
         }
      }
      if (Object.keys(ingredients).length > 0) {
         if (!blueprintRecipeMap[spawnId]) blueprintRecipeMap[spawnId] = [];
         blueprintRecipeMap[spawnId].push(Object.entries(ingredients).map(([id, count]) => ({ id, count })));
      }

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

const resolveRecipe = (id) => {
  const recipes = blueprintRecipeMap[id];
  if (!recipes) return null;
  return recipes.map(recipe => recipe.map(ing => ({
     id: ing.id,
     name: tooltipsMap[ing.id] ? tooltipsMap[ing.id].name : ing.id.replace('item_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
     count: ing.count,
     iconFile: `sp_${ing.id.replace('item_', '').replace('block_', '')}_icon.png`
  })));
};

const resolveResearchList = (id) => {
  const keys = blueprintResearchMap[id] || [];
  return keys.map(key => {
    const name = researchNamesMap[key] || key.replace('research_', '').replace(/_/g, ' ');
    const normKey = key.toLowerCase();
    
    // Find matching icon file
    let iconFile = 'sp_research_basics0.png'; // default fallback
    
    // Hardcoded fallbacks for things that don't follow naming conventions at all
    if (normKey.includes('ancient_crafting')) {
      return { name, iconFile: 'sp_research_ancient_aeternum0.png' };
    }
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
          normFile === `${normKey.replace('research_', 'sp_research_')}1` ||
          normFile === normKey.replace(/research_[a-z]+_/, 'sp_research_') ||
          normFile === `${normKey.replace(/research_[a-z]+_/, 'sp_research_')}0` ||
          normFile === `${normKey.replace(/research_[a-z]+_/, 'sp_research_')}1` ||
          normFile === `${normKey.replace('research_artifact_', 'sp_').replace(/\d+$/, '')}_icon` ||
          normFile === `${normKey.replace('research_artifact_', 'sp_').replace(/\d+$/, '')}0_icon`
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
      if (id === 'item_none') return;
      const tooltipId = content.match(/TooltipID:\s*(\w+)/)?.[1] || '';
      const tooltipObj = tooltipsMap[tooltipId] || {};
      const name = tooltipObj.name || id.replace('item_', '').replace(/_/g, ' ');
      let description = tooltipObj.description || '';
      const discoveryHint = tooltipObj.discoveryHint || '';
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
      const attacksDetail = [];
      let minDamage = 0;
      let maxDamage = 0;
      let maxRange = 0;
      let isRanged = false;
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
            const parts = attId.split('_');
            const actionWord = parts[parts.length - 1];
            const cleanActionName = actionWord.charAt(0).toUpperCase() + actionWord.slice(1);
            const dmgTypeLabel = attData.dmgType === 1 ? 'Blunt' : (attData.dmgType === 2 ? 'Slash' : (attData.dmgType === 3 ? 'Pierce' : 'Physical'));
            attacksList.push(`${nameTitle} (${attData.minDamage}-${attData.maxDamage} Dmg, Rng ${attData.range}, ${dmgTypeLabel}, ${attData.skillId})`);
            attacksDetail.push({
              name: cleanActionName,
              minDamage: attData.minDamage,
              maxDamage: attData.maxDamage,
              range: attData.range,
              dmgType: dmgTypeLabel,
              skill: attData.skillId
            });
            
            // Append attack tooltip description to item description
            const attTooltipId = `tooltip_${attId}`;
            const attTooltipObj = tooltipsMap[attTooltipId];
            if (attTooltipObj && attTooltipObj.description) {
              const cleanedAttDesc = attTooltipObj.description.replace(/^DiscoveryHint:\s*/i, '').trim();
              if (cleanedAttDesc && !description.includes(cleanedAttDesc)) {
                description = description ? `${description}\n${cleanedAttDesc}` : cleanedAttDesc;
              }
            }

            if (attData.minDamage > minDamage) minDamage = attData.minDamage;
            if (attData.maxDamage > maxDamage) maxDamage = attData.maxDamage;
            if (attData.range > maxRange) maxRange = attData.range;
            if (attData.skillId === 'marksmanship' || attData.range > 2) isRanged = true;
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
             if (amountVal === 0) return; // Skip 0-amount actions/stats
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
      let rList = resolveResearchList(id);

      // Manual unlock overrides: items whose DiscoveryDependencies in the asset file
      // don't reflect the real in-game unlock requirements.
      const unlockOverrides = {
        // Bottled Water is available via Glass-Work research, not the Clay Tablet
        'item_water_purified': [{ name: 'Glass-Work', iconFile: 'sp_research_glass0.png' }],
        // Bucket of Water is available via Wood-Work research
        'item_water': [{ name: 'Wood-Work', iconFile: 'sp_research_wood0.png' }],
      };
      if (unlockOverrides[id]) rList = unlockOverrides[id];

      const unlockResearch = rList.map(r => r.name).join(', ') || 'None (Start)';


      let minTemp = null;
      let maxTemp = null;
      let seasons = [];
      let growsIntoItem = null;
      let growsIntoName = null;
      let lifespan = null;
      let growthTime = null;
      
      if (type === 'tag_item_type_seed') {
        const plantSpawnIdMatch = content.match(/ActionID:\s*tag_can_plant_(?:seed|tree)[\s\S]*?SpawnID:\s*(\w+)/);
        if (plantSpawnIdMatch) {
          const spawnId = plantSpawnIdMatch[1];
          const plantPath = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'BlockPlants', `${spawnId}.asset`);
          if (fs.existsSync(plantPath)) {
            const plantContent = fs.readFileSync(plantPath, 'utf8');
            const minTempMatch = plantContent.match(/MinTemp:\s*(-?\d+)/);
            const maxTempMatch = plantContent.match(/MaxTemp:\s*(-?\d+)/);
            if (minTempMatch) minTemp = parseInt(minTempMatch[1]);
            if (maxTempMatch) maxTemp = parseInt(maxTempMatch[1]);

            const lifeTimeMatch = plantContent.match(/MaxLifeTime:\s*(-?\d+)/);
            const matureThreshMatch = plantContent.match(/MatureThreshold:\s*([\d\.]+)/);
            if (lifeTimeMatch) {
              lifespan = parseInt(lifeTimeMatch[1]);
              if (lifespan === -1) {
                growthTime = -1;
              } else {
                const thresh = matureThreshMatch ? parseFloat(matureThreshMatch[1]) : 0.5;
                growthTime = Math.round(lifespan * thresh);
              }
            }
            
            const seasonsBlock = plantContent.match(/\bSeasons:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
            if (seasonsBlock) {
              const regex = /-\s*(\w+)/g;
              let m;
              while ((m = regex.exec(seasonsBlock[1])) !== null) {
                seasons.push(m[1].charAt(0).toUpperCase() + m[1].slice(1));
              }
            }

            let foundItemDrop = null;
            const fruitMatch = plantContent.match(/FruitItemDrops:[ \t]*([\w_]+)/);
            if (fruitMatch && fruitMatch[1]) {
               foundItemDrop = fruitMatch[1];
            }
            if (!foundItemDrop) {
               const matureMatch = plantContent.match(/MatureItemDrops:[ \t]*([\w_]+)/);
               if (matureMatch && matureMatch[1]) {
                  const spawnFile = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'TagObjectSpawn', `${matureMatch[1]}.asset`);
                  if (fs.existsSync(spawnFile)) {
                     const spawnContent = fs.readFileSync(spawnFile, 'utf8');
                     const tagObjMatches = [...spawnContent.matchAll(/TagObjectID:[ \t]*([\w_]+)/g)];
                     for (const m of tagObjMatches) {
                        if (m[1] && m[1] !== id) {
                           foundItemDrop = m[1];
                           break;
                        }
                     }
                  }
               }
            }
            if (!foundItemDrop && spawnId.includes('_sapling')) {
               const baseTreeName = spawnId.replace('_sapling', '');
               const leavesFile = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'BlockPlants', `${baseTreeName}_leaves.asset`);
               if (fs.existsSync(leavesFile)) {
                  const leavesContent = fs.readFileSync(leavesFile, 'utf8');
                  const fruitMatch2 = leavesContent.match(/FruitItemDrops:[ \t]*([\w_]+)/);
                  if (fruitMatch2 && fruitMatch2[1]) {
                     foundItemDrop = fruitMatch2[1];
                  }
               }
            }
              if (foundItemDrop) {
                 growsIntoItem = foundItemDrop;
                 growsIntoName = tooltipsMap[foundItemDrop]?.name || foundItemDrop.replace('item_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              }
          }
        }
      }

      items.push({
        id,
        name,
        description,
        discoveryHint,
        buyValue,
        stackSize,
        type: type.replace('tag_item_type_', ''),
        rarity: rarity.replace('item_rarity_', ''),
        decayInfo: decayRate === -1 ? 'None' : `Decays in ${decayRate} to ${decayItem.replace('item_', '')}`,
        textureX: visualsObj.textureX,
        textureY: visualsObj.textureY,
        slots: handsLabel || 'Inventory Only',
        attacks: attacksList.join(', ') || 'None',
        attacksDetail,
        minDamage,
        maxDamage,
        maxRange,
        isRanged,
        toughness,
        actions: actionsList.join(', ') || 'None',
        iconFilename,
        unlockResearch,
        unlockResearchList: rList,
        minTemp,
        maxTemp,
        seasons: type === 'tag_item_type_seed' ? (seasons.length > 0 ? seasons.join(', ') : 'Any Season') : null,
        recipe: resolveRecipe(id),
        growsIntoItem,
        growsIntoName,
        lifespan,
        growthTime
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
      const tooltipObj = tooltipsMap[tooltipId] || {};
      const name = tooltipObj.name || id.replace('block_', '').replace(/_/g, ' ');
      const description = tooltipObj.description || '';
      const discoveryHint = tooltipObj.discoveryHint || '';
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
        description,
        discoveryHint,
        roomQuality,
        toughness,
        cost,
        textureX: visualsObj.textureX,
        textureY: visualsObj.textureY,
        iconFilename,
        isStation,
        unlockResearch,
        unlockResearchList: rList,
        recipe: resolveRecipe(id)
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

// Compile Races/NPCs
console.log('Compiling Races...');
const races = [];
const racesDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Races');
const entitiesDir = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Entities');

if (fs.existsSync(racesDir)) {
  fs.readdirSync(racesDir).filter(f => f.endsWith('.asset')).forEach(file => {
    try {
      const content = fs.readFileSync(path.join(racesDir, file), 'utf8');
      const isEnabled = content.match(/m_Enabled:\s*(\d+)/)?.[1];
      if (isEnabled === '0') return;

      const id = content.match(/m_Name:\s*(\w+)/)?.[1] || path.basename(file, '.asset');
      const tooltipId = content.match(/TooltipID:\s*(\w+)/)?.[1] || '';
      const tooltipObj = tooltipsMap[tooltipId] || {};
      
      const name = tooltipObj.name || id.replace('race_', '').replace(/_/g, ' ');
      const namePlural = name + 's'; // default fallback
      let resolvedNamePlural = namePlural;
      const tooltipFile = path.join(exportPath, 'Assets', 'Resources_moved', 'Data', 'Tooltips', `${tooltipId}.asset`);
      let inlineIcon = '';
      if (fs.existsSync(tooltipFile)) {
        const tooltipContent = fs.readFileSync(tooltipFile, 'utf8');
        const pluralMatch = tooltipContent.match(/NamePlural:\s*(.*)/)?.[1]?.trim();
        if (pluralMatch) resolvedNamePlural = pluralMatch;
        inlineIcon = tooltipContent.match(/InlineIcon:\s*['"]?(.*?)['"]?$/m)?.[1]?.trim() || '';
      }

      const description = tooltipObj.description || '';
      const merchantValue = parseInt(content.match(/MerchantValue:\s*(\d+)/)?.[1] || '0');
      const intelligence = content.match(/Intelligence:\s*(\w+)/)?.[1]?.replace('intelligence_', '') || 'sapient';
      
      // Parse tags
      const tagsList = [];
      const tagsBlock = content.match(/\bTags:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      if (tagsBlock) {
        const tagRegex = /-\s*(\w+)/g;
        let m;
        while ((m = tagRegex.exec(tagsBlock[1])) !== null) tagsList.push(m[1]);
      }

      // Parse perks
      const perksList = [];
      const perksBlock = content.match(/\bPerks:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      if (perksBlock) {
        const perkRegex = /-\s*['"]?(.*?)['"]?$/gm;
        let m;
        while ((m = perkRegex.exec(perksBlock[1])) !== null) {
          const val = m[1].replace(/<[^>]+>/g, '').trim();
          if (val) perksList.push(val);
        }
      }

      // Parse starting items
      const startingItems = [];
      const startingItemsBlock = content.match(/\bStartingItems:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
      if (startingItemsBlock) {
        const itemRegex = /ItemID:\s*(\w+)/g;
        let m;
        while ((m = itemRegex.exec(startingItemsBlock[1])) !== null) {
          const itemID = m[1];
          let itemName = itemID.replace('item_', '').replace(/_/g, ' ');
          const matchedItem = items.find(it => it.id === itemID);
          if (matchedItem) itemName = matchedItem.name;
          startingItems.push({ id: itemID, name: itemName });
        }
      }

      // Resolve Entity Details (Attacks, Skills, Professions, Attributes)
      const defaultEntityId = content.match(/DefaultEntityID:\s*(\w+)/)?.[1] || '';
      const attacksList = [];
      const skillsList = [];
      const professionsList = [];
      const attributes = {};
      let becomesAdultAge = null;
      let becomesElderAge = null;

      if (defaultEntityId) {
        const entityFile = path.join(entitiesDir, `${defaultEntityId}.asset`);
        if (fs.existsSync(entityFile)) {
          const entityContent = fs.readFileSync(entityFile, 'utf8');

          // Attacks with damage ranges
          const entityAttacksBlock = entityContent.match(/\bAttacks:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
          if (entityAttacksBlock) {
            const attackRegex = /-\s*(\w+)/g;
            let m;
            while ((m = attackRegex.exec(entityAttacksBlock[1])) !== null) {
              const attackID = m[1];
              const matchedAttack = attacksMap[attackID];
              if (matchedAttack) {
                attacksList.push({
                  name: matchedAttack.name || attackID.replace('attack_', '').replace(/_/g, ' '),
                  minDamage: matchedAttack.minDamage || 0,
                  maxDamage: matchedAttack.maxDamage || 0,
                  range: matchedAttack.range || 1,
                });
              } else {
                attacksList.push({ name: attackID.replace('attack_', '').replace(/_/g, ' '), minDamage: 0, maxDamage: 0, range: 1 });
              }
            }
          }

          // Skills - only ones PlayerCanEdit = 1
          const skillBlocks = [...entityContent.matchAll(/SkillID:\s*(\w+)\s*\r?\n\s*PlayerCanEdit:\s*(\d)/g)];
          for (const sb of skillBlocks) {
            if (sb[2] === '1') {
              const sId = sb[1];
              const sName = sId.replace('skill_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              skillsList.push(sName);
            }
          }

          // Professions - only ones CanAssign = 1, filter out leadership/meta ones
          const metaProfessions = new Set(['profession_king','profession_queen','profession_chief','profession_dominus','profession_primarch','profession_none','profession_unassigned','profession_animal']);
          const profBlocks = [...entityContent.matchAll(/ProfessionID:\s*(\w+)\s*\r?\n\s*CanAssign:\s*(\d)/g)];
          for (const pb of profBlocks) {
            if (pb[2] === '1' && !metaProfessions.has(pb[1])) {
              const pId = pb[1];
              const pName = pId.replace('profession_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              professionsList.push(pName);
            }
          }

          // Key attributes: health, move_speed, evasion, toughness
          const attrKeys = ['attribute_health', 'attribute_move_speed', 'attribute_evasion', 'attribute_toughness', 'attribute_sight_range'];
          for (const attrId of attrKeys) {
            const attrMatch = entityContent.match(new RegExp(`AttributeID:\\s*${attrId}\\s*\\r?\\n\\s*StartingBase:\\s*(-?\\d+)`));
            if (attrMatch) {
               const shortKey = attrId.replace('attribute_', '');
               attributes[shortKey] = parseInt(attrMatch[1]);
             }
           }

           // Ages and "Becomes Adult" / "Becomes Elder" calculation
           const entityAgesBlock = entityContent.match(/\bAges:([\s\S]*?)(?=\r?\n  [A-Za-z]+:|$)/);
           if (entityAgesBlock) {
             const ageRegex = /-\s*(\w+)/g;
             let m;
             while ((m = ageRegex.exec(entityAgesBlock[1])) !== null) {
               const ageID = m[1];
               const ageData = agesMap[ageID];
               if (ageData) {
                 if (ageData.ageType === 2 || ageID.includes('adult')) {
                   becomesAdultAge = ageData.min;
                 } else if (ageData.ageType === 4 || ageID.includes('elder')) {
                   becomesElderAge = ageData.min;
                 }
               }
             }
           }
        }
      }

      // Resolve icon filename - prefer sp_adult_<entity>_fa0.png portrait
      const raceBase = id.replace('race_', '');
      const adultIcon = `sp_adult_${raceBase}_fa0.png`;
      let finalIcon = '';
      if (fs.existsSync(path.join(publicIconsDir, adultIcon))) {
        finalIcon = adultIcon;
      } else {
        // Fallback to sp_race_ icon
        const raceIcon = `sp_race_${raceBase}_icon.png`;
        if (fs.existsSync(path.join(publicIconsDir, raceIcon))) {
          finalIcon = raceIcon;
        } else {
          const filesInDir = fs.readdirSync(publicIconsDir);
          const searchBase = raceBase.toLowerCase();
          for (const file of filesInDir) {
            const normFile = file.toLowerCase().replace(/\.png$/i, '');
            if (normFile.includes(searchBase) && normFile.includes('race')) {
              finalIcon = file;
              break;
            }
          }
        }
      }

      races.push({
        id,
        name,
        namePlural: resolvedNamePlural,
        inlineIcon,
        description,
        perks: perksList,
        merchantValue,
        intelligence,
        tags: tagsList,
        startingItems,
        attacks: attacksList,
        skills: skillsList,
        professions: professionsList,
        attributes,
        becomesAdultAge,
        becomesElderAge,
        iconFilename: finalIcon || 'default.png'
      });
    } catch(e){}
  });
}

const glossaryData = { items, blocks, craftingStations, races, statuses };
fs.writeFileSync(srcDatabasePath, JSON.stringify(glossaryData, null, 2), 'utf8');
console.log(`Successfully compiled and bundled ${items.length} items, ${blocks.length} blocks, ${craftingStations.length} crafting stations, ${races.length} races, and ${statuses.length} statuses to ${srcDatabasePath}`);
console.log('--- ASSET BUNDLE COMPILING COMPLETE ---');
