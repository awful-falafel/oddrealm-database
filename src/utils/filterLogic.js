export const resourceTypes = ['refined_material', 'ingot', 'ore', 'gem', 'stone', 'wood', 'seed', 'plant_material', 'animal_byproduct', 'remains', 'container', 'soil', 'trinket'];

export const isShield = (item) => {
  const name = (item.name || '').toLowerCase();
  const id = (item.id || '').toLowerCase();
  return name.includes('shield') || name.includes('buckler') || name.includes('bfs') || name.includes('vanguard') ||
         id.includes('shield') || id.includes('buckler') || id.includes('bfs') || id.includes('vanguard');
};

export const isWeapon = (item) => {
  if (item.type !== 'tool') return false;
  if (isShield(item)) return false;

  const name = (item.name || '').toLowerCase();
  const id = (item.id || '').toLowerCase();

  // Explicitly categorize gathering/crafting/magic tools as tools, not weapons
  if (
    name.includes('thresk') ||
    name.includes('tongs') ||
    name.includes('hatchet') ||
    name.includes('sickle') ||
    name.includes('pickaxe') ||
    name.includes('chisel') ||
    name.includes('needle') ||
    name.includes('saw') ||
    name.includes('trowel') ||
    name.includes('spoon') ||
    name.includes('fishing pole') ||
    id.includes('thresk') ||
    id.includes('tongs') ||
    id.includes('hatchet') ||
    id.includes('sickle')
  ) {
    return false;
  }

  const research = (item.unlockResearch || '').toLowerCase();

  // Specific exceptions for weapons that are incorrectly classified
  if (name.includes('twisted steel') || name.includes('xanatos') || name.includes('axeward') || name.includes("happy cat's kris") || name.includes("loth loth's stick")) {
    return true;
  }

  // Heuristics based on research nodes
  if (research.includes('weapon') || research.includes('marksmanship')) {
    return true;
  }
  if (research.includes('tool') || research.includes('woodworking') || research.includes('stonemasonry') || research.includes('farming') || research.includes('mining') || research.includes('masonry')) {
    return false;
  }

  // Explicit 1h / 2h word check to catch custom or remaining items
  const isExplicitWeapon = name.includes(' 1h') || name.includes(' 2h') || name.includes('(1h)') || name.includes('(2h)') || id.includes('_1h') || id.includes('_2h');
  if (isExplicitWeapon) {
    // Ensure it is not a gathering tool
    const isGatheringTool = name.includes('pickaxe') || name.includes('axe') || name.includes('hammer') || name.includes('chisel') || name.includes('needle') || name.includes('knife') || name.includes('saw') || name.includes('trowel') || name.includes('spoon') || name.includes('fishing pole') || name.includes('thresk');
    if (!isGatheringTool) {
      return true;
    }
  }

  // Whitelist of weapon-specific keywords to separate them from gathering/production tools
  const weaponKeywords = [
    'sword', 'bow', 'crossbow', 'dagger', 'flail', 'spear', 'halberd', 'mace', 'club', 
    'atlatl', 'sling', 'bolas', 'whip', 'orb', 'scythe', 'staff', 'macuahuitl', 'gladius', 
    'kukri', 'blade', 'vanguard', 'rapier', 'greatsword', 'claymore', 'katana', 
    'lances', 'lance', 'trident', 'morningstar', 'cudgel', 'bastard', 'practice', 'atlatl', 
    'pointy stick', 'war axe', 'battle axe', 'battleaxe', 'warhammer', 'war hammer', 'kris'
  ];

  return weaponKeywords.some(kw => name.includes(kw) || id.includes(kw));
};

export const getFilteredItemsBase = (glossary, viewName) => {
  if (!glossary.items) return [];
  
  return glossary.items.filter(item => {
    if (viewName === 'weapons') return isWeapon(item);
    if (viewName === 'tools') return item.type === 'tool' && !isWeapon(item) && !isShield(item);
    if (viewName === 'gear') return (item.type === 'gear' || isShield(item)) && !isWeapon(item);
    if (viewName === 'animal_products') return ((item.type === 'meat' || item.type === 'fish' || item.type === 'egg' || item.type === 'milk' || item.type === 'animal_byproduct' || item.type === 'remains' || (item.name && item.name.toLowerCase() === 'wool')) && !(item.name && item.name.toLowerCase() === 'chicken and waffles'));
    if (viewName === 'meals') return item.type === 'meal' || (item.name && (item.name.toLowerCase() === 'teiloc' || item.name.toLowerCase() === 'chicken and waffles'));
    if (viewName === 'produce') return item.type === 'fruit' || item.type === 'vegetable' || (item.name && (item.name.toLowerCase() === 'rice' || item.name.toLowerCase() === 'tallow hay' || item.name.toLowerCase() === 'wheat'));
    if (viewName === 'fungus') return item.type === 'fungus';
    if (viewName === 'beverages') return item.type === 'potion' || item.type === 'alcohol' || item.type === 'beverage' || item.type === 'water' || item.type === 'milk' || (item.actions && item.actions.toLowerCase().includes('thirst'));
    if (viewName === 'seeds') return item.type === 'seed';
    if (viewName === 'books') return item.type === 'book';
    if (viewName === 'trinkets') return item.type === 'trinket';
    if (viewName === 'materials') return resourceTypes.includes(item.type) && item.type !== 'seed' && item.type !== 'remains' && item.type !== 'trinket' && item.type !== 'container' && item.type !== 'animal_byproduct' && item.id !== 'item_ren' && !(item.name && item.name.toLowerCase() === 'wool');
    if (viewName === 'other') {
      if (isWeapon(item)) return false;
      if (isShield(item)) return false;
      if (item.type === 'tool') return false;
      if (item.type === 'gear' || item.type === 'trinket') return false;
      if (item.type === 'remains') return false;
      if (item.type === 'animal_byproduct') return false;
      if (item.type === 'meal' || item.type === 'meat' || item.type === 'fish' || item.type === 'egg' || item.type === 'milk') return false;
      if (item.type === 'fruit' || item.type === 'vegetable') return false;
      if (item.type === 'fungus') return false;
      if (item.type === 'potion' || item.type === 'alcohol' || item.type === 'beverage' || item.type === 'water' || (item.actions && item.actions.toLowerCase().includes('thirst'))) return false;
      if (item.type === 'seed') return false;
      if (item.type === 'book') return false;
      if (resourceTypes.includes(item.type) && item.type !== 'seed' && item.type !== 'remains' && item.type !== 'trinket' && item.type !== 'container' && item.type !== 'animal_byproduct' && item.id !== 'item_ren' && !(item.name && item.name.toLowerCase() === 'wool')) return false;
      if (item.name && (item.name.toLowerCase() === 'teiloc' || item.name.toLowerCase() === 'rice' || item.name.toLowerCase() === 'tallow hay' || item.name.toLowerCase() === 'wheat' || item.name.toLowerCase() === 'wool' || item.name.toLowerCase() === 'chicken and waffles')) return false;
      return true;
    }
    return false;
  });
};

export const isSpoiler = (item) => {
  if (!item) return false;
  const lowerName = item.name ? item.name.toLowerCase() : '';
  if (lowerName === 'yellow gale tea' || lowerName === 'teiloc' || lowerName === 'tallow hay') return true;
  if (lowerName === 'ancient bow 2h' || lowerName.includes('emerald') || lowerName.includes('sapphire') || lowerName.includes('opal') || lowerName.includes('stone rune')) return true;
  if (item.rarity === 'legendary') return true;
  if (item.rarity === 'epic') {
    const r = item.unlockResearch;
    return !r || r === 'None' || r === 'None (Start)';
  }
  return false;
};

export const getMaterialsList = (glossary, viewName) => {
  const items = getFilteredItemsBase(glossary, viewName);
  const materials = ['Wood', 'Stone', 'Copper', 'Bronze', 'Iron', 'Steel', 'Ancient', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby', 'Emerald', 'Bone', 'Leather', 'Wool', 'Cloth'];
  return materials.filter(m => items.some(item => (item.name || '').toLowerCase().includes(m.toLowerCase())));
};

export const getSlotsList = (glossary, viewName) => {
  const items = getFilteredItemsBase(glossary, viewName);
  const slots = new Set();
  items.forEach(item => {
    if (item.slots && item.slots !== 'None') {
      slots.add(item.slots);
    }
  });
  return Array.from(slots);
};

export const getTypesList = (glossary, viewName) => {
  const items = getFilteredItemsBase(glossary, viewName);
  if (viewName === 'weapons') {
    const types = ['Sword', 'Bow', 'Crossbow', 'Dagger', 'Flail', 'Spear', 'Mace', 'Club', 'Sling', 'Scythe', 'Staff', 'Axe', 'Warhammer'];
    return types.filter(t => items.some(item => (item.name || '').toLowerCase().includes(t.toLowerCase())));
  }
  if (viewName === 'tools') {
    const types = ['Pickaxe', 'Axe', 'Spoon', 'Chisel', 'Needle', 'Knife', 'Hammer', 'Saw', 'Trowel', 'Fishing Pole'];
    return types.filter(t => items.some(item => (item.name || '').toLowerCase().includes(t.toLowerCase())));
  }
  if (viewName === 'materials') {
    const types = new Set();
    items.forEach(item => { if (item.type) types.add(item.type.replace('tag_item_type_', '')); });
    return Array.from(types);
  }
  return [];
};
