import React, { useState, useEffect } from 'react';
import prepackagedGlossary from './glossary_database.json';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, alcohol, gear, blocks, fruits, fungus, materials, meals, other, potions, props, seeds, tools, vegetables, weapons
  const [glossary, setGlossary] = useState(prepackagedGlossary);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  
  const [highlightId, setHighlightId] = useState(null);
  const [hideSpoilers, setHideSpoilers] = useState(true);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Filters
  const [rarityFilter, setRarityFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [slotFilter, setSlotFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Sorting
  const [itemsSort, setItemsSort] = useState({ field: 'name', asc: true });
  const [blocksSort, setBlocksSort] = useState({ field: 'name', asc: true });

  // Load database on mount
  useEffect(() => {
    const fetchGlossary = async () => {
      try {
        const res = await fetch(`${API_BASE}/game-data/glossary`);
        const data = await res.json();
        if (data && (data.items || data.blocks)) {
          setGlossary(data);
        }
      } catch (e) {
        console.warn('Backend server offline. Running in serverless offline mode.');
      }
    };
    fetchGlossary();
  }, []);

  const resetFilters = (view) => {
    setCurrentView(view);
    setSearchQuery('');
    setSelectedItem(null);
    setSelectedBlock(null);
    setRarityFilter('all');
    setMaterialFilter('all');
    setSlotFilter('all');
    setTypeFilter('all');
  };

  // Helper classification methods
  const isShield = (item) => {
    const name = (item.name || '').toLowerCase();
    const id = (item.id || '').toLowerCase();
    return name.includes('shield') || name.includes('buckler') || name.includes('bfs') || name.includes('vanguard') ||
           id.includes('shield') || id.includes('buckler') || id.includes('bfs') || id.includes('vanguard');
  };

  const isWeapon = (item) => {
    if (item.type !== 'tool') return false;
    if (isShield(item)) return false;

    const name = (item.name || '').toLowerCase();
    const id = (item.id || '').toLowerCase();
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
      const isGatheringTool = name.includes('pickaxe') || name.includes('axe') || name.includes('hammer') || name.includes('chisel') || name.includes('needle') || name.includes('knife') || name.includes('saw') || name.includes('trowel') || name.includes('spoon');
      if (!isGatheringTool) {
        return true;
      }
    }

    // Whitelist of weapon-specific keywords to separate them from gathering/production tools
    const weaponKeywords = [
      'sword', 'bow', 'crossbow', 'dagger', 'flail', 'spear', 'halberd', 'mace', 'club', 
      'atlatl', 'sling', 'bolas', 'whip', 'orb', 'scythe', 'staff', 'macuahuitl', 'gladius', 
      'kukri', 'blade', 'vanguard', 'thresk', 'rapier', 'greatsword', 'claymore', 'katana', 
      'lances', 'lance', 'trident', 'morningstar', 'cudgel', 'bastard', 'practice', 'atlatl', 
      'pointy stick', 'war axe', 'battle axe', 'battleaxe', 'warhammer', 'war hammer', 'kris'
    ];

    return weaponKeywords.some(kw => name.includes(kw) || id.includes(kw));
  };

  const getRarityColor = (rarity) => {
    if (theme === 'light') {
      const colors = {
        common: '#555555',
        uncommon: '#118000',
        rare: '#0055d4',
        epic: '#8018bf',
        legendary: '#b55b00'
      };
      return colors[rarity] || '#555555';
    }
    const colors = {
      common: '#9d9d9d',
      uncommon: '#1eff00',
      rare: '#0070ff',
      epic: '#a335ee',
      legendary: '#ff8000'
    };
    return colors[rarity] || '#9d9d9d';
  };

  const getAttackTypeLabel = (attacksStr) => {
    if (!attacksStr || attacksStr === 'None') return '-';
    const lower = attacksStr.toLowerCase();
    const types = [];
    if (lower.includes('slash') || lower.includes('cut')) types.push('Slash');
    if (lower.includes('pierce')) types.push('Pierce');
    if (lower.includes('blunt') || lower.includes('strike')) types.push('Blunt');
    
    if (types.length === 0) {
      const match = attacksStr.match(/,\s*(Blunt|Slash|Pierce|Physical),/i);
      if (match) return match[1];
      return 'Physical';
    }
    return types.join(', ');
  };

  const formatUnlockText = (text) => {
    if (!text || text === 'None' || text === 'None (Start)') return '-';
    return text;
  };

  const isSpoiler = (item) => {
    if (!item) return false;
    if (item.rarity === 'legendary') return true;
    if (item.rarity === 'epic') {
      const r = item.unlockResearch;
      return !r || r === 'None' || r === 'None (Start)';
    }
    return false;
  };

  // Lists of options dynamically derived from items in glossary
  const getMaterialsList = (viewName) => {
    const items = getFilteredItemsBase(viewName);
    const materials = ['Wood', 'Stone', 'Copper', 'Bronze', 'Iron', 'Steel', 'Ancient', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby', 'Emerald', 'Bone', 'Leather', 'Wool', 'Cloth'];
    return materials.filter(m => items.some(item => (item.name || '').toLowerCase().includes(m.toLowerCase())));
  };

  const getSlotsList = (viewName) => {
    const items = getFilteredItemsBase(viewName);
    const slots = new Set();
    items.forEach(item => {
      if (item.slots && item.slots !== 'None') {
        slots.add(item.slots);
      }
    });
    return Array.from(slots);
  };

  const getTypesList = (viewName) => {
    const items = getFilteredItemsBase(viewName);
    if (viewName === 'weapons') {
      const types = ['Sword', 'Bow', 'Crossbow', 'Dagger', 'Flail', 'Spear', 'Mace', 'Club', 'Sling', 'Scythe', 'Staff', 'Axe', 'Warhammer'];
      return types.filter(t => items.some(item => (item.name || '').toLowerCase().includes(t.toLowerCase())));
    }
    if (viewName === 'tools') {
      const types = ['Pickaxe', 'Axe', 'Spoon', 'Chisel', 'Needle', 'Knife', 'Hammer', 'Saw', 'Trowel'];
      return types.filter(t => items.some(item => (item.name || '').toLowerCase().includes(t.toLowerCase())));
    }
    if (viewName === 'materials') {
      const types = new Set();
      items.forEach(item => { if (item.type) types.add(item.type.replace('tag_item_type_', '')); });
      return Array.from(types);
    }
    return [];
  };

  // Universal Search Handler (supports regex)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    let regex = null;
    let isRegex = true;
    try {
      regex = new RegExp(searchQuery, 'i');
    } catch (e) {
      isRegex = false;
    }

    const testMatch = (text) => {
      if (!text) return false;
      if (isRegex && regex) {
        return regex.test(text);
      }
      return text.toLowerCase().includes(searchQuery.toLowerCase());
    };

    const results = [];

    // 1. Search Items
    if (glossary.items) {
      glossary.items.forEach(item => {
        const itemText = `${item.name} ${item.id} ${item.type} ${item.actions} ${item.slots} ${item.attacks} ${item.rarity} ${item.unlockResearch}`;
        if (testMatch(itemText)) {
          let view = 'other';
          let label = 'Other';
          
          if (isWeapon(item)) {
            view = 'weapons';
            label = 'Weapon';
          } else if (item.type === 'potion') {
            view = 'potions';
            label = 'Potion';
          } else if (item.type === 'tool') {
            view = 'tools';
            label = 'Tool';
          } else if (item.type === 'gear' || (item.type === 'trinket' && item.id !== 'item_ren')) {
            view = 'gear';
            label = 'Gear';
          } else if (item.type === 'meal') {
            view = 'meals';
            label = 'Meal';
          } else if (item.type === 'fruit') {
            view = 'fruits';
            label = 'Fruit';
          } else if (item.type === 'vegetable') {
            view = 'vegetables';
            label = 'Vegetable';
          } else if (item.type === 'fungus') {
            view = 'fungus';
            label = 'Fungus';
          } else if (item.type === 'alcohol') {
            view = 'alcohol';
            label = 'Alcohol';
          } else if (item.type === 'seed') {
            view = 'seeds';
            label = 'Seed';
          } else if (resourceTypes.includes(item.type) && item.type !== 'seed' && item.type !== 'trinket' && item.id !== 'item_ren') {
            view = 'materials';
            label = 'Material';
          }

          results.push({
            uniqueKey: `item-${item.id}`,
            id: item.id,
            name: item.name,
            type: 'item',
            view,
            details: `${label} • ${item.rarity} • Unlocked by: ${item.unlockResearch || 'None'}`,
            data: item
          });
        }
      });
    }

    // 2. Search Blocks/Props
    if (glossary.blocks) {
      glossary.blocks.forEach(block => {
        const blockText = `${block.name} ${block.id} ${block.unlockResearch} ${block.isStation ? 'station' : 'block'}`;
        if (testMatch(blockText)) {
          const isProp = block.id.startsWith('prop_');
          results.push({
            uniqueKey: `block-${block.id}`,
            id: block.id,
            name: block.name,
            type: 'block',
            view: isProp ? 'props' : 'blocks',
            details: `${isProp ? 'Prop' : 'Block'} • ${block.isStation ? 'Crafting Station' : 'Environment'} • Unlocked by: ${block.unlockResearch || 'None'}`,
            data: block
          });
        }
      });
    }

    setSearchResults(results.slice(0, 12));
  }, [searchQuery, glossary]);

  const handleSearchResultClick = (result) => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentView(result.view);

    if (result.type === 'item') {
      setSelectedItem(result.data);
      setSelectedBlock(null);
    } else if (result.type === 'block') {
      setSelectedBlock(result.data);
      setSelectedItem(null);
    }

    setHighlightId(result.id);
    setTimeout(() => {
      const element = document.getElementById(`row-${result.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    setTimeout(() => {
      setHighlightId(null);
    }, 2600);
  };

  // Sorting & Filtering helpers
  const handleSortItems = (field) => {
    setItemsSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : true
    }));
  };

  const getFilteredItemsBase = (viewName) => {
    if (!glossary.items) return [];
    
    return glossary.items.filter(item => {
      if (viewName === 'weapons') return isWeapon(item);
      if (viewName === 'tools') return item.type === 'tool' && !isWeapon(item) && !isShield(item);
      if (viewName === 'gear') return (item.type === 'gear' || item.type === 'trinket') && item.id !== 'item_ren' && !isWeapon(item) && !isShield(item);
      if (viewName === 'meals') return item.type === 'meal';
      if (viewName === 'fruits') return item.type === 'fruit';
      if (viewName === 'vegetables') return item.type === 'vegetable';
      if (viewName === 'fungus') return item.type === 'fungus';
      if (viewName === 'alcohol') return item.type === 'alcohol';
      if (viewName === 'potions') return item.type === 'potion';
      if (viewName === 'seeds') return item.type === 'seed';
      if (viewName === 'materials') return resourceTypes.includes(item.type) && item.type !== 'seed' && item.type !== 'trinket' && item.id !== 'item_ren';
      if (viewName === 'other') {
        // Exclude everything that has a specific view
        if (isWeapon(item)) return false;
        if (item.type === 'tool') return false;
        if ((item.type === 'gear' || item.type === 'trinket') && item.id !== 'item_ren') return false;
        if (item.type === 'meal') return false;
        if (item.type === 'fruit') return false;
        if (item.type === 'vegetable') return false;
        if (item.type === 'fungus') return false;
        if (item.type === 'alcohol') return false;
        if (item.type === 'potion') return false;
        if (item.type === 'seed') return false;
        if (resourceTypes.includes(item.type) && item.type !== 'seed' && item.type !== 'trinket' && item.id !== 'item_ren') return false;
        return true;
      }
      return false;
    });
  };

  const getFilteredItems = (viewName) => {
    const baseItems = getFilteredItemsBase(viewName);
    
    return baseItems.filter(item => {
      const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;
      if (!matchesRarity) return false;

      const matchesMaterial = materialFilter === 'all' || (item.name || '').toLowerCase().includes(materialFilter.toLowerCase());
      if (!matchesMaterial) return false;

      const matchesSlot = slotFilter === 'all' || item.slots === slotFilter;
      if (!matchesSlot) return false;

      let matchesType = true;
      if (typeFilter !== 'all') {
        if (viewName === 'materials') {
          matchesType = item.type.replace('tag_item_type_', '') === typeFilter;
        } else {
          matchesType = (item.name || '').toLowerCase().includes(typeFilter.toLowerCase());
        }
      }
      return matchesType;
    });
  };

  const getSortedItems = (viewName) => {
    const filtered = getFilteredItems(viewName);
    return [...filtered].sort((a, b) => {
      let valA = a[itemsSort.field] ?? '';
      let valB = b[itemsSort.field] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return itemsSort.asc ? valA - valB : valB - valA;
      }

      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();

      if (valA < valB) return itemsSort.asc ? -1 : 1;
      if (valA > valB) return itemsSort.asc ? 1 : -1;
      return 0;
    });
  };

  const handleSortBlocks = (field) => {
    setBlocksSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : true
    }));
  };

  const getFilteredBlocks = (viewName) => {
    if (!glossary.blocks) return [];

    return glossary.blocks.filter(block => {
      const isProp = block.id.startsWith('prop_');
      if (viewName === 'blocks') return !isProp;
      if (viewName === 'props') return isProp;
      return true;
    });
  };

  const getSortedBlocks = (viewName) => {
    const filtered = getFilteredBlocks(viewName);
    return [...filtered].sort((a, b) => {
      let valA = a[blocksSort.field] ?? '';
      let valB = b[blocksSort.field] ?? '';

      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        return blocksSort.asc ? (valA === valB ? 0 : (valA ? 1 : -1)) : (valA === valB ? 0 : (valA ? -1 : 1));
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return blocksSort.asc ? valA - valB : valB - valA;
      }

      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();

      if (valA < valB) return blocksSort.asc ? -1 : 1;
      if (valA > valB) return blocksSort.asc ? 1 : -1;
      return 0;
    });
  };

  const renderEffectBadges = (effectsStr) => {
    if (!effectsStr || effectsStr === 'None') return '-';
    const badges = effectsStr.split(', ')
      .filter(act => !act.includes('SourceID') && !act.includes('Source id') && !act.includes('Source') && act.trim() !== '');
    
    if (badges.length === 0) return '-';

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {badges.map((badge, idx) => {
          let badgeColor = theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
          let textColor = theme === 'light' ? '#2d2319' : '#88ffaa';
          const lower = badge.toLowerCase();
          
          if (lower.includes('resist') || lower.includes('warmth') || lower.includes('cold')) {
            badgeColor = theme === 'light' ? 'rgba(0, 100, 220, 0.1)' : 'rgba(0, 150, 255, 0.15)';
            textColor = theme === 'light' ? '#0055cc' : '#33aaff';
          } else if (lower.includes('speed') || lower.includes('haste')) {
            badgeColor = theme === 'light' ? 'rgba(180, 120, 0, 0.1)' : 'rgba(255, 200, 0, 0.15)';
            textColor = theme === 'light' ? '#805500' : '#ffcc00';
          } else if (lower.includes('damage') || lower.includes('power') || lower.includes('attack') || lower.includes('strength')) {
            badgeColor = theme === 'light' ? 'rgba(200, 0, 0, 0.08)' : 'rgba(255, 80, 80, 0.15)';
            textColor = theme === 'light' ? '#aa0000' : '#ff6666';
          } else if (lower.includes('health') || lower.includes('energy') || lower.includes('vitality') || lower.includes('mana')) {
            badgeColor = theme === 'light' ? 'rgba(0, 150, 0, 0.08)' : 'rgba(80, 255, 80, 0.15)';
            textColor = theme === 'light' ? '#007700' : '#66ff66';
          } else if (lower.includes('armor') || lower.includes('defense') || lower.includes('toughness') || lower.includes('shield')) {
            badgeColor = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(200, 200, 200, 0.15)';
            textColor = theme === 'light' ? '#333333' : '#cccccc';
          }
          
          return (
            <span key={idx} style={{ 
              padding: '2px 8px', 
              borderRadius: '4px', 
              background: badgeColor, 
              color: textColor, 
              fontSize: '0.75rem', 
              fontWeight: 500,
              border: `1px solid ${textColor}33`,
              whiteSpace: 'nowrap'
            }}>
              {badge}
            </span>
          );
        })}
      </div>
    );
  };

  // Reusable Inspectors
  const renderItemInspector = () => {
    if (!selectedItem) return null;
    
    return (
      <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)', zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Item Inspector</span>
          <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>

        {hideSpoilers && isSpoiler(selectedItem) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', border: '1px dashed #ff8000', borderRadius: '8px', background: 'rgba(255, 128, 0, 0.03)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
            <div style={{ fontWeight: 'bold', color: '#ff8000', fontSize: '0.9rem', marginBottom: '4px' }}>Spoiler Locked</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '0 20px', margin: 0 }}>
              Uncheck the "Blur Legendary Spoilers" switch in the top header to inspect parameters.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '128px', height: '128px', background: 'var(--bg-tertiary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '12px' }}>
                <img src={selectedItem.iconFilename ? `/game_icons/${selectedItem.iconFilename}` : `/game_icons/default.png`} style={{ width: '100%', height: '100%' }} alt="" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedItem.name}</h2>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedItem.id}</span>
              </div>
            </div>

            {selectedItem.unlockResearchList && selectedItem.unlockResearchList.length > 0 && (
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>unlockResearchList</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedItem.unlockResearchList.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img 
                        src={`/game_icons/${r.iconFile}`} 
                        alt="" 
                        style={{ width: '64px', height: '64px', borderRadius: '4px' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span style={{ color: 'var(--tbl-highlight)', fontWeight: 'bold', fontSize: '0.85rem' }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(selectedItem).map(([key, value]) => {
                if (key === 'unlockResearchList' || key === 'iconFilename') return null;

                let displayVal = '';
                if (typeof value === 'object' && value !== null) {
                  displayVal = JSON.stringify(value);
                } else {
                  displayVal = String(value);
                }

                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', gap: '2px' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{key}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{displayVal}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderBlockInspector = () => {
    if (!selectedBlock) return null;
    
    return (
      <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)', zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            {selectedBlock.id.startsWith('prop_') ? 'Prop Inspector' : 'Block Inspector'}
          </span>
          <button onClick={() => setSelectedBlock(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '128px', height: '128px', background: 'var(--bg-tertiary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '12px' }}>
            <img src={selectedBlock.iconFilename ? `/game_icons/${selectedBlock.iconFilename}` : `/game_icons/default.png`} style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedBlock.name}</h2>
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedBlock.id}</span>
          </div>
        </div>

        {selectedBlock.unlockResearchList && selectedBlock.unlockResearchList.length > 0 && (
          <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>unlockResearchList</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedBlock.unlockResearchList.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img 
                    src={`/game_icons/${r.iconFile}`} 
                    alt="" 
                    style={{ width: '64px', height: '64px', borderRadius: '4px' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span style={{ color: 'var(--tbl-highlight)', fontWeight: 'bold', fontSize: '0.85rem' }}>{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(selectedBlock).map(([key, value]) => {
            if (key === 'unlockResearchList' || key === 'iconFilename') return null;

            let displayVal = '';
            if (typeof value === 'object' && value !== null) {
              displayVal = JSON.stringify(value);
            } else {
              displayVal = String(value);
            }

            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{key}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{displayVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const foodTypes = ['meal', 'fruit', 'vegetable', 'meat', 'fish', 'fungus', 'alcohol', 'beverage', 'egg', 'milk'];
  const resourceTypes = ['refined_material', 'ingot', 'ore', 'gem', 'stone', 'wood', 'seed', 'plant_material', 'animal_byproduct', 'remains', 'container', 'garbage', 'soil', 'trinket', 'OnJobDisposedTagObjectID'];

  return (
    <div className="app-container">
      <style>{`
        @keyframes row-flash {
          0% { background-color: rgba(0, 240, 255, 0.45); }
          40% { background-color: rgba(0, 240, 255, 0.2); }
          100% { background-color: transparent; }
        }
        .flash-highlight {
          animation: row-flash 2.5s ease-out;
        }
        .search-result-item:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .spoiler-blurred {
          filter: blur(8px) !important;
          opacity: 0.3;
          user-select: none;
          pointer-events: none;
        }
        .spoiler-blurred-container {
          position: relative;
        }
        .spoiler-blurred-container::after {
          content: 'S P O I L E R';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.65rem;
          letter-spacing: 2px;
          color: #ff8000;
          font-weight: 900;
          background: rgba(0,0,0,0.7);
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255, 128, 0, 0.4);
          pointer-events: auto;
          white-space: nowrap;
          z-index: 2;
        }
        .switch-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #ff8000;
          border: 1px solid rgba(255, 128, 0, 0.3);
          padding: 6px 16px;
          border-radius: 20px;
          background: rgba(255, 128, 0, 0.04);
          user-select: none;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .switch-label:hover {
          background: rgba(255, 128, 0, 0.08);
          border-color: rgba(255, 128, 0, 0.6);
        }
        .switch-track {
          position: relative;
          width: 34px;
          height: 18px;
          background-color: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 128, 0, 0.4);
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        .switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          background-color: #9d9d9d;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .filter-select {
          padding: 8px 12px;
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-glass);
          outline: none;
          font-size: 0.8rem;
          cursor: pointer;
        }
        img {
          image-rendering: pixelated !important;
          image-rendering: crisp-edges !important;
          -ms-interpolation-mode: nearest-neighbor !important;
        }
      `}</style>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo-container">
          <div className="logo-icon" style={{ padding: '4px', background: 'var(--bg-primary)' }}>
            <img src="/game_icons/sp_adepts_aeternum_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <div>
            <div className="logo-text">Odd Glossary</div>
            <div className="logo-subtext">Explorer</div>
          </div>
        </div>

        <div className="nav-menu">
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => resetFilters('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_adepts_aeternum_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Dashboard</span>
          </button>

          {/* Alphabetical Left-Nav Sections */}
          <button 
            className={`nav-item ${currentView === 'alcohol' ? 'active' : ''}`}
            onClick={() => resetFilters('alcohol')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_blackberry_wine_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Alcohol</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'gear' ? 'active' : ''}`}
            onClick={() => resetFilters('gear')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_bronze_breastplate_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Armor & Gear</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'blocks' ? 'active' : ''}`}
            onClick={() => resetFilters('blocks')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_block_clay_brick_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Blocks</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'fruits' ? 'active' : ''}`}
            onClick={() => resetFilters('fruits')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_apple_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Fruits</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'fungus' ? 'active' : ''}`}
            onClick={() => resetFilters('fungus')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_boletus_mushroom_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Fungus</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'materials' ? 'active' : ''}`}
            onClick={() => resetFilters('materials')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_iron_ingot_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Materials</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'meals' ? 'active' : ''}`}
            onClick={() => resetFilters('meals')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_apple_pie_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Meals</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'other' ? 'active' : ''}`}
            onClick={() => resetFilters('other')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_remains_rat_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Other</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'potions' ? 'active' : ''}`}
            onClick={() => resetFilters('potions')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_health_potion_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Potions & Elixirs</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'props' ? 'active' : ''}`}
            onClick={() => resetFilters('props')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_iron_anvil_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Props</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'seeds' ? 'active' : ''}`}
            onClick={() => resetFilters('seeds')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_plant_beetroot_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Seeds</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'tools' ? 'active' : ''}`}
            onClick={() => resetFilters('tools')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_iron_pickaxe_two_hand_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Tools</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'vegetables' ? 'active' : ''}`}
            onClick={() => resetFilters('vegetables')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_broccoli_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Vegetables</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'weapons' ? 'active' : ''}`}
            onClick={() => resetFilters('weapons')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img src="/game_icons/sp_blade_of_brian_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
            <span>Weapons</span>
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '3px double var(--border-glass)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div>Explorer Version: 3.1.0</div>
          <div>Data Source: prepackaged</div>
          <div>Mode: 100% Serverless Offline</div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* GLOBAL HEADER */}
        <div className="top-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '16px 24px', 
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(26, 20, 15, 0.4)',
          backdropFilter: 'blur(10px)',
          zIndex: 10
        }}>
          <div style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-header)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentView === 'dashboard' && <><img src="/game_icons/sp_adepts_aeternum_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Dashboard</>}
            {currentView === 'alcohol' && <><img src="/game_icons/sp_blackberry_wine_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Alcohol</>}
            {currentView === 'gear' && <><img src="/game_icons/sp_bronze_breastplate_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Armor & Gear</>}
            {currentView === 'blocks' && <><img src="/game_icons/sp_block_clay_brick_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Blocks</>}
            {currentView === 'fruits' && <><img src="/game_icons/sp_apple_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Fruits</>}
            {currentView === 'fungus' && <><img src="/game_icons/sp_boletus_mushroom_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Fungus</>}
            {currentView === 'materials' && <><img src="/game_icons/sp_iron_ingot_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Materials</>}
            {currentView === 'meals' && <><img src="/game_icons/sp_apple_pie_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Meals</>}
            {currentView === 'other' && <><img src="/game_icons/sp_remains_rat_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Other</>}
            {currentView === 'potions' && <><img src="/game_icons/sp_health_potion_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Potions & Elixirs</>}
            {currentView === 'props' && <><img src="/game_icons/sp_iron_anvil_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Props</>}
            {currentView === 'seeds' && <><img src="/game_icons/sp_plant_beetroot_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Seeds</>}
            {currentView === 'tools' && <><img src="/game_icons/sp_iron_pickaxe_two_hand_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Tools</>}
            {currentView === 'vegetables' && <><img src="/game_icons/sp_broccoli_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Vegetables</>}
            {currentView === 'weapons' && <><img src="/game_icons/sp_blade_of_brian_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Weapons</>}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Spoiler Shield Checkbox */}
            <label className="switch-label">
              <input 
                type="checkbox" 
                checked={hideSpoilers} 
                onChange={(e) => setHideSpoilers(e.target.checked)}
                style={{ display: 'none' }}
              />
              <div className="switch-track" style={{ 
                backgroundColor: hideSpoilers ? 'rgba(255, 128, 0, 0.25)' : 'rgba(0, 0, 0, 0.5)',
                borderColor: hideSpoilers ? '#ff8000' : 'rgba(255, 128, 0, 0.4)'
              }}>
                <div className="switch-thumb" style={{ 
                  left: hideSpoilers ? '18px' : '2px',
                  backgroundColor: hideSpoilers ? '#ff8000' : '#9d9d9d'
                }} />
              </div>
              <span style={{ fontWeight: 600 }}>Blur Legendary Spoilers</span>
            </label>

            {/* Universal Search Container */}
            <div style={{ position: 'relative', width: '320px' }}>
              <input 
                type="text" 
                placeholder="Global Search (Regex works!)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px 16px', 
                  borderRadius: '20px', 
                  background: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border-glass)',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
              
              {searchResults.length > 0 && (
                <div style={{ 
                  position: 'absolute', 
                  top: '40px', 
                  right: 0, 
                  width: '420px', 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  background: '#19130e', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '8px', 
                  zIndex: 100
                }}>
                  {searchResults.map(result => {
                    const isBlurred = hideSpoilers && isSpoiler(result.data);
                    return (
                      <div 
                        key={result.uniqueKey} 
                        onClick={() => handleSearchResultClick(result)}
                        style={{ 
                          padding: '10px 14px', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                        className={`search-result-item ${isBlurred ? 'spoiler-blurred-container' : ''}`}
                      >
                        <div className={isBlurred ? 'spoiler-blurred' : ''} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                          {result.type === 'item' || result.type === 'block' ? (
                            <img 
                              src={result.data?.iconFilename ? `/game_icons/${result.data.iconFilename}` : `/game_icons/default.png`} 
                              alt=""
                              style={{ width: '48px', height: '48px' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.25rem' }}>⚙️</span>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{result.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{result.details}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theme Toggle Switch */}
            <label className="switch-label" style={{ 
              color: 'var(--text-primary)', 
              borderColor: 'var(--border-glass)',
              background: 'var(--bg-secondary)' 
            }}>
              <input 
                type="checkbox" 
                checked={theme === 'light'} 
                onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
                style={{ display: 'none' }}
              />
              <div className="switch-track" style={{ 
                backgroundColor: theme === 'light' ? 'rgba(150, 96, 0, 0.25)' : 'rgba(0, 0, 0, 0.5)',
                borderColor: theme === 'light' ? 'var(--accent-cyan)' : 'var(--border-glass)'
              }}>
                <div className="switch-thumb" style={{ 
                  left: theme === 'light' ? '18px' : '2px',
                  backgroundColor: 'var(--accent-cyan)'
                }} />
              </div>
              <span style={{ fontWeight: 600 }}>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
            </label>
          </div>
        </div>

        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
            <div className="content-header" style={{ marginBottom: '32px' }}>
              <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', fontSize: '2.5rem', color: 'var(--accent-cyan)' }}>Odd Glossary</h1>
              <p className="content-subtitle" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                Comprehensive reference catalog for official game parameters, item classifications, block properties, and prop features.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('weapons')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_blade_of_brian_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Weapons</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Swords, bows, crossbows, practice daggers, and combat equipment.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(isWeapon).length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('tools')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_iron_pickaxe_two_hand_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Tools</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Axes, pickaxes, hammers, chisels, and harvesting implements.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'tool' && !isWeapon(i) && !isShield(i)).length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('gear')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_bronze_breastplate_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Armor & Gear</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Helmets, chestplates, boots, gauntlets, and defensive shields.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => (i.type === 'gear' || i.type === 'trinket') && i.id !== 'item_ren' && !isWeapon(i) && !isShield(i)).length || 0} Registered
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('meals')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_apple_pie_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Meals</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Prepared dishes, baked pies, stews, and finished kitchen crafts.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'meal').length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('fruits')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_apple_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Fruits</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Apples, blueberries, and other gathered orchard harvests.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'fruit').length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('vegetables')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_broccoli_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Vegetables</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Broccoli, beetroots, and raw garden vegetables.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'vegetable').length || 0} Registered
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('fungus')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_boletus_mushroom_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Fungus</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mushrooms, caps, and ground fungus ingredients.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'fungus').length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('alcohol')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_blackberry_wine_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Alcohol</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Wine, cider, beer, and fermented cellar reserves.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'alcohol').length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('seeds')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_plant_beetroot_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Seeds</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Agricultural seeds, grain seeds, and tree saplings.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'seed').length || 0} Registered
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('materials')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_iron_ingot_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Materials</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Wood blocks, metal ingots, ores, stones, and refining materials.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => resourceTypes.includes(i.type) && i.type !== 'seed' && i.type !== 'trinket' && i.id !== 'item_ren').length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('blocks')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_block_clay_brick_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Blocks</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Terrain blocks, building walls, and structural elements.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.blocks?.filter(b => !b.id.startsWith('prop_')).length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('props')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_iron_anvil_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Props</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Workbenches, furniture, stoves, decorative props, and crafting units.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.blocks?.filter(b => b.id.startsWith('prop_')).length || 0} Registered
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('potions')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_health_potion_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Potions & Elixirs</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Magical draughts, stat boosters, and healing potions.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'potion').length || 0} Registered
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('other')}>
                <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
                  <img src="/game_icons/sp_remains_rat_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Other</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ren, raw meats, raw fish, miscellaneous creature drops, and leftover items.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {getFilteredItemsBase('other').length} Registered
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Category Views */}
        {currentView !== 'dashboard' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              
              {/* HEADER DETAILS & FILTERS */}
              <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)', textTransform: 'capitalize' }}>{currentView}</h1>
                  <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>
                    {currentView === 'alcohol' && 'Wines, ciders, beers, and cellared brews.'}
                    {currentView === 'gear' && 'Helmets, chestplates, greaves, boots, gauntlets, and protective shields.'}
                    {currentView === 'blocks' && 'Map blocks, walls, terrain floorings, and environment parameters.'}
                    {currentView === 'fruits' && 'Apples, wild berries, and orchard foods.'}
                    {currentView === 'fungus' && 'Boletus, blood crown mushrooms, and other fungi.'}
                    {currentView === 'materials' && 'Wood, ingots, ores, gems, and refined building resources.'}
                    {currentView === 'meals' && 'Prepared food, cooked stews, and finished kitchen crafts.'}
                    {currentView === 'other' && 'Miscellaneous items, Ren, raw meats, fish, and drops.'}
                    {currentView === 'potions' && 'Healing potions, draughts, and magical boosters.'}
                    {currentView === 'props' && 'Settler furniture, anvils, workbenches, stoves, and decorations.'}
                    {currentView === 'seeds' && 'Wheat seeds, saplings, crop seeds, and agricultural starters.'}
                    {currentView === 'tools' && 'Spoons, pickaxes, axes, chisels, saws, and needles.'}
                    {currentView === 'vegetables' && 'Broccoli, beetroots, and raw garden crops.'}
                    {currentView === 'weapons' && 'Swords, bows, daggers, morningstars, and combat tools.'}
                  </p>
                </div>
                
                {/* Filters */}
                {(currentView !== 'blocks' && currentView !== 'props') && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select className="filter-select" value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}>
                      <option value="all">All Rarities</option>
                      <option value="common">Common</option>
                      <option value="uncommon">Uncommon</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>

                    {(currentView === 'weapons' || currentView === 'tools' || currentView === 'gear') && (
                      <select className="filter-select" value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value)}>
                        <option value="all">All Materials</option>
                        {getMaterialsList(currentView).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )}

                    {currentView === 'gear' && (
                      <select className="filter-select" value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
                        <option value="all">All Slots</option>
                        {getSlotsList(currentView).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}

                    {currentView === 'materials' && (
                      <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">All Types</option>
                        {getTypesList('materials').map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* TABLE CONTAINER */}
              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                {(currentView !== 'blocks' && currentView !== 'props') ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: theme === 'light' ? 'var(--bg-tertiary)' : '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Icon</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Name {itemsSort.field === 'name' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('type')}>Classification {itemsSort.field === 'type' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('rarity')}>Rarity {itemsSort.field === 'rarity' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxDamage')}>Damage {itemsSort.field === 'maxDamage' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('toughness')}>Toughness {itemsSort.field === 'toughness' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('actions')}>Effects {itemsSort.field === 'actions' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('unlockResearch')}>Unlocked By {itemsSort.field === 'unlockResearch' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('buyValue')}>Value {itemsSort.field === 'buyValue' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedItems(currentView).map((item, index) => {
                        const isBlurred = hideSpoilers && isSpoiler(item);
                        return (
                          <tr 
                            key={item.id} 
                            id={`row-${item.id}`}
                            onClick={() => setSelectedItem(item)}
                            style={{ 
                              borderBottom: '1px solid var(--border-glass)',
                              backgroundColor: selectedItem?.id === item.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                              cursor: 'pointer'
                            }}
                            className={`${highlightId === item.id ? 'flash-highlight' : ''} ${isBlurred ? 'spoiler-blurred-container' : ''}`}
                          >
                            <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              <img 
                                src={item.iconFilename ? `/game_icons/${item.iconFilename}` : `/game_icons/default.png`} 
                                alt=""
                                style={{ width: '48px', height: '48px' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </td>
                            <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.id}</div>
                            </td>
                            <td style={{ padding: '8px', color: 'var(--text-secondary)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              {item.type.replace('tag_item_type_', '')}
                            </td>
                            <td style={{ padding: '8px', fontWeight: 600, color: getRarityColor(item.rarity) }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                            </td>
                            <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-damage)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              {item.maxDamage > 0 ? `${item.minDamage}-${item.maxDamage}` : '-'}
                            </td>
                            <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-toughness)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              {item.toughness > 0 ? `+${item.toughness}` : '-'}
                            </td>
                            <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderEffectBadges(item.actions)}</td>
                            <td style={{ padding: '8px', color: 'var(--tbl-highlight)', fontWeight: 500 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              {item.unlockResearchList && item.unlockResearchList.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {item.unlockResearchList.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <img 
                                        src={`/game_icons/${r.iconFile}`} 
                                        alt="" 
                                        style={{ width: '64px', height: '64px', borderRadius: '4px' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                      <span>{r.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span>{formatUnlockText(item.unlockResearch)}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px', color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.buyValue} Ren</td>
                          </tr>
                        );
                      })}
                      {getSortedItems(currentView).length === 0 && (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: theme === 'light' ? 'var(--bg-tertiary)' : '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('name')}>Icon</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('name')}>Name {blocksSort.field === 'name' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('unlockResearch')}>Unlocked By {blocksSort.field === 'unlockResearch' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('roomQuality')}>Room Quality {blocksSort.field === 'roomQuality' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('toughness')}>Toughness {blocksSort.field === 'toughness' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('cost')}>Path Cost {blocksSort.field === 'cost' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        {currentView === 'props' && (
                          <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('isStation')}>Is Station {blocksSort.field === 'isStation' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedBlocks(currentView).map((block, index) => (
                        <tr 
                          key={block.id} 
                          id={`row-${block.id}`}
                          onClick={() => setSelectedBlock(block)}
                          style={{ 
                            borderBottom: '1px solid var(--border-glass)',
                            backgroundColor: selectedBlock?.id === block.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                            cursor: 'pointer'
                          }}
                          className={highlightId === block.id ? 'flash-highlight' : ''}
                        >
                          <td style={{ padding: '8px' }}>
                            <img 
                              src={block.iconFilename ? `/game_icons/${block.iconFilename}` : `/game_icons/default.png`} 
                              alt=""
                              style={{ width: '48px', height: '48px' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ fontWeight: 600 }}>{block.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{block.id}</div>
                          </td>
                          <td style={{ padding: '8px', color: 'var(--tbl-highlight)', fontWeight: 500 }}>
                            {block.unlockResearchList && block.unlockResearchList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {block.unlockResearchList.map((r, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <img 
                                      src={`/game_icons/${r.iconFile}`} 
                                      alt="" 
                                      style={{ width: '64px', height: '64px', borderRadius: '4px' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span>{r.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>{formatUnlockText(block.unlockResearch)}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: 'var(--accent-cyan)' }}>+{block.roomQuality}</td>
                          <td style={{ padding: '8px', color: '#ff8888' }}>{block.toughness || '-'}</td>
                          <td style={{ padding: '8px' }}>{block.cost} pts</td>
                          {currentView === 'props' && (
                            <td style={{ padding: '8px' }}>
                              {block.isStation ? (
                                <span style={{ color: '#88ffaa', fontWeight: 'bold' }}>Yes</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>No</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                      {getSortedBlocks(currentView).length === 0 && (
                        <tr>
                          <td colSpan={currentView === 'props' ? '7' : '6'} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No elements found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* SHARED INSPECTORS */}
            {renderItemInspector()}
            {renderBlockInspector()}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
