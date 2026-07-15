import React, { useState, useEffect } from 'react';
import prepackagedGlossary from './glossary_database.json';
import { isShield, isWeapon, getFilteredItemsBase, isSpoiler, resourceTypes, getMaterialsList, getSlotsList, getTypesList } from './utils/filterLogic';
import Sidebar from './components/Sidebar';

const API_BASE = 'http://localhost:5000/api';

const filterDatabase = (db) => {
  const newDb = { ...db };
  if (newDb.blocks) {
    newDb.blocks = newDb.blocks.filter(b => 
      b.name !== 'Unknown' && 
      b.id !== 'block_none' && 
      b.id !== 'block_null' && 
      b.id !== 'block_out_of_bounds'
    );
  }
  return newDb;
};

const renderSeasons = (seasonsStr) => {
  if (!seasonsStr || seasonsStr === 'Any Season' || seasonsStr === '-') {
    return <span style={{ color: 'var(--accent-green)' }}>{seasonsStr || '-'}</span>;
  }
  const parts = seasonsStr.split(', ');
  return parts.map((season, i) => {
    let color = 'white';
    if (season === 'Spring') color = '#92E82E';
    else if (season === 'Summer') color = '#FFEB04';
    else if (season === 'Fall') color = '#FF885C';
    else if (season === 'Winter') color = '#4CD7FF';
    
    return (
      <React.Fragment key={season}>
        <span style={{ color }}>{season}</span>
        {i < parts.length - 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}> , </span>}
      </React.Fragment>
    );
  });
};

function App() {
  const [currentView, setCurrentView] = useState('animal_products'); // animal_products, alcohol, gear, blocks, fruits, fungus, materials, meals, other, potions, props, seeds, tools, vegetables, weapons
  const [glossary, setGlossary] = useState(() => filterDatabase(prepackagedGlossary));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchResultsAll, setSearchResultsAll] = useState([]);
  const [searchSort, setSearchSort] = useState({ field: 'name', asc: true });
  const [showSearchView, setShowSearchView] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  
  const [highlightId, setHighlightId] = useState(null);
  const [hideSpoilers, setHideSpoilers] = useState(() => {
    const saved = localStorage.getItem('hideSpoilers');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    localStorage.setItem('hideSpoilers', JSON.stringify(hideSpoilers));
  }, [hideSpoilers]);

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
  const [npcsSort, setNpcsSort] = useState({ field: 'name', asc: true });
  const [statusesSort, setStatusesSort] = useState({ field: 'name', asc: true });

  // Load database on mount
  useEffect(() => {
    const fetchGlossary = async () => {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalHost) return;

      try {
        const res = await fetch(`${API_BASE}/game-data/glossary`);
        const data = await res.json();
        if (data && (data.items || data.blocks)) {
          setGlossary(filterDatabase(data));
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
    setSearchResults([]);
    setSearchResultsAll([]);
    setShowSearchView(false);
    setSelectedItem(null);
    setSelectedBlock(null);
    setSelectedNPC(null);
    setSelectedStatus(null);
    setRarityFilter('all');
    setMaterialFilter('all');
    setSlotFilter('all');
    setTypeFilter('all');
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
          } else if (isShield(item)) {
            view = 'gear';
            label = 'Shield';
          } else if (item.type === 'potion' || item.type === 'alcohol' || item.type === 'beverage') {
            view = 'beverages';
            label = 'Beverage';
          } else if (item.type === 'tool') {
            view = 'tools';
            label = 'Tool';
          } else if (item.type === 'gear') {
            view = 'gear';
            label = 'Gear';
          } else if (item.type === 'trinket') {
            view = 'trinkets';
            label = 'Trinket';
          } else if (item.type === 'meal') {
            view = 'meals';
            label = 'Meal';
          } else if (item.type === 'fruit' || item.type === 'vegetable') {
            view = 'produce';
            label = 'Fruit/Vegetable';
          } else if (item.type === 'fungus') {
            view = 'fungus';
            label = 'Fungus';
          } else if (item.type === 'seed') {
            view = 'seeds';
            label = 'Seed';
          } else if (item.type === 'meat' || item.type === 'fish' || item.type === 'egg' || item.type === 'milk' || item.type === 'animal_byproduct' || item.type === 'remains' || (item.name && item.name.toLowerCase() === 'wool')) {
            view = 'animal_products';
            label = 'Animal Product';
          } else if (resourceTypes.includes(item.type) && item.type !== 'seed' && item.type !== 'remains' && item.type !== 'trinket' && item.type !== 'container' && item.type !== 'animal_byproduct' && item.id !== 'item_ren') {
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

    // 3. Search Entities
    if (glossary.races) {
      glossary.races.forEach(race => {
        const raceText = `${race.name} ${race.namePlural} ${race.id} ${race.description} ${race.intelligence} ${race.perks.join(' ')}`;
        if (testMatch(raceText)) {
          results.push({
            uniqueKey: `race-${race.id}`,
            id: race.id,
            name: race.name,
            type: 'race',
            view: 'npcs',
            details: `Entity • ${race.intelligence === 'sapient' ? 'Sapient' : 'Animal/Creature'} • Value: ${race.merchantValue}`,
            data: race
          });
        }
      });
    }

    setSearchResultsAll(results);
    setSearchResults(results.slice(0, 12));
  }, [searchQuery, glossary]);

  const handleSearchResultClick = (result) => {
    // Keep the query so the user doesn't have to retype
    setSearchResults([]);
    setShowSearchView(false);
    setCurrentView(result.view);

    if (result.type === 'item') {
      setSelectedItem(result.data);
      setSelectedBlock(null);
      setSelectedNPC(null);
    } else if (result.type === 'block') {
      setSelectedItem(null);
      setSelectedBlock(result.data);
      setSelectedNPC(null);
    } else if (result.type === 'race') {
      setSelectedItem(null);
      setSelectedBlock(null);
      setSelectedNPC(result.data);
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

  const handleShowAllResults = () => {
    setSearchResults([]);
    setShowSearchView(true);
    setCurrentView('search');
    setSelectedItem(null);
    setSelectedBlock(null);
  };

  const handleSortSearch = (field) => {
    setSearchSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : true
    }));
  };

  const getSortedSearchResults = () => {
    return [...searchResultsAll].sort((a, b) => {
      const ad = a.data;
      const bd = b.data;
      let valA, valB;

      // Numeric sorts — compare as numbers, not strings
      if (searchSort.field === 'damage') {
        valA = (((ad?.minDamage ?? 0) + (ad?.maxDamage ?? 0)) / 2);
        valB = (((bd?.minDamage ?? 0) + (bd?.maxDamage ?? 0)) / 2);
        return searchSort.asc ? valA - valB : valB - valA;
      }
      if (searchSort.field === 'decayInfo') {
        const parseDecay = (info) => {
          if (!info || info === 'None') return Infinity;
          const m = info.match(/\d+/);
          return m ? parseInt(m[0], 10) : Infinity;
        };
        valA = parseDecay(ad?.decayInfo);
        valB = parseDecay(bd?.decayInfo);
        return searchSort.asc ? valA - valB : valB - valA;
      }
      if (searchSort.field === 'toughness') {
        valA = ad?.toughness ?? 0;
        valB = bd?.toughness ?? 0;
        return searchSort.asc ? valA - valB : valB - valA;
      }
      if (searchSort.field === 'roomQuality') {
        valA = ad?.roomQuality ?? 0;
        valB = bd?.roomQuality ?? 0;
        return searchSort.asc ? valA - valB : valB - valA;
      }
      if (searchSort.field === 'cost') {
        valA = ad?.cost ?? 0;
        valB = bd?.cost ?? 0;
        return searchSort.asc ? valA - valB : valB - valA;
      }
      if (searchSort.field === 'buyValue') {
        valA = ad?.buyValue ?? 0;
        valB = bd?.buyValue ?? 0;
        return searchSort.asc ? valA - valB : valB - valA;
      }
      if (searchSort.field === 'isStation') {
        valA = ad?.isStation ? 1 : 0;
        valB = bd?.isStation ? 1 : 0;
        return searchSort.asc ? valA - valB : valB - valA;
      }

      // String sorts
      if (searchSort.field === 'name') {
        valA = a.name || '';
        valB = b.name || '';
      } else if (searchSort.field === 'rarity') {
        // Sort rarity in logical tier order
        const order = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
        valA = order[ad?.rarity] ?? -1;
        valB = order[bd?.rarity] ?? -1;
        return searchSort.asc ? valA - valB : valB - valA;
      } else if (searchSort.field === 'category') {
        valA = a.view || '';
        valB = b.view || '';
      } else {
        valA = a.name || '';
        valB = b.name || '';
      }

      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
      if (valA < valB) return searchSort.asc ? -1 : 1;
      if (valA > valB) return searchSort.asc ? 1 : -1;
      return 0;
    });
  };

  // Sorting & Filtering helpers
  const handleSortItems = (field) => {
    setItemsSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : true
    }));
  };



  const getFilteredItems = (viewName) => {
    const baseItems = getFilteredItemsBase(glossary, viewName);
    
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

  // Extract the numeric value from the first effect in an actions string, e.g. "+70 Hunger, +5 Energy" → 70
  const firstEffectValue = (actionsStr) => {
    if (!actionsStr || actionsStr === 'None') return 0;
    const m = actionsStr.match(/([+-]?\d+)/);
    return m ? parseFloat(m[1]) : 0;
  };

  const getSortedItems = (viewName) => {
    const filtered = getFilteredItems(viewName);
    return [...filtered].sort((a, b) => {
      let valA = a[itemsSort.field] ?? '';
      let valB = b[itemsSort.field] ?? '';

      if (itemsSort.field === 'recipe') {
        valA = a.recipe ? a.recipe.ingredients.map(i => `${i.count}x ${i.name}`).join(', ') : '';
        valB = b.recipe ? b.recipe.ingredients.map(i => `${i.count}x ${i.name}`).join(', ') : '';
      }

      // Sort damage by average of min+max so a 5-10 weapon beats a 1-12 weapon correctly
      if (itemsSort.field === 'maxDamage') {
        valA = ((a.minDamage ?? 0) + (a.maxDamage ?? 0)) / 2;
        valB = ((b.minDamage ?? 0) + (b.maxDamage ?? 0)) / 2;
      }

      // Sort effects by numeric value of first effect
      if (itemsSort.field === 'actions') {
        valA = firstEffectValue(a.actions);
        valB = firstEffectValue(b.actions);
      }

      // Sort decay time numerically
      if (itemsSort.field === 'decayInfo') {
        const parseDecay = (info) => {
          if (!info || info === 'None') return Infinity;
          const m = info.match(/\d+/);
          return m ? parseInt(m[0], 10) : Infinity;
        };
        valA = parseDecay(a.decayInfo);
        valB = parseDecay(b.decayInfo);
      }

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

      if (blocksSort.field === 'recipe') {
        valA = a.recipe ? a.recipe.ingredients.map(i => `${i.count}x ${i.name}`).join(', ') : '';
        valB = b.recipe ? b.recipe.ingredients.map(i => `${i.count}x ${i.name}`).join(', ') : '';
      }

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

  const handleSortNPCs = (field) => {
    setNpcsSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : true
    }));
  };

  const getSortedNPCs = () => {
    if (!glossary.races) return [];
    return [...glossary.races].sort((a, b) => {
      let valA = a[npcsSort.field] ?? '';
      let valB = b[npcsSort.field] ?? '';
      if (npcsSort.field === 'becomesAdultAge') {
        valA = a.becomesAdultAge !== null && a.becomesAdultAge !== undefined ? a.becomesAdultAge : 999999999;
        valB = b.becomesAdultAge !== null && b.becomesAdultAge !== undefined ? b.becomesAdultAge : 999999999;
      }
      if (npcsSort.field === 'becomesElderAge') {
        valA = a.becomesElderAge !== null && a.becomesElderAge !== undefined ? a.becomesElderAge : 999999999;
        valB = b.becomesElderAge !== null && b.becomesElderAge !== undefined ? b.becomesElderAge : 999999999;
      }
      if (['health', 'move_speed', 'evasion', 'toughness', 'sight_range'].includes(npcsSort.field)) {
        valA = a.attributes?.[npcsSort.field] ?? 0;
        valB = b.attributes?.[npcsSort.field] ?? 0;
      }
      if (npcsSort.field === 'perks') { valA = a.perks.join(', '); valB = b.perks.join(', '); }
      if (npcsSort.field === 'attacks') { valA = a.attacks.map(at => at.name || at).join(', '); valB = b.attacks.map(at => at.name || at).join(', '); }
      if (npcsSort.field === 'skills') { valA = (a.skills||[]).join(', '); valB = (b.skills||[]).join(', '); }
      if (npcsSort.field === 'professions') { valA = (a.professions||[]).join(', '); valB = (b.professions||[]).join(', '); }
      if (npcsSort.field === 'startingItems') { valA = a.startingItems.map(i => i.name).join(', '); valB = b.startingItems.map(i => i.name).join(', '); }
      if (typeof valA === 'number' && typeof valB === 'number') return npcsSort.asc ? valA - valB : valB - valA;
      valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase();
      if (valA < valB) return npcsSort.asc ? -1 : 1;
      if (valA > valB) return npcsSort.asc ? 1 : -1;
      return 0;
    });
  };
  const handleSortStatuses = (field) => {
    setStatusesSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : true
    }));
  };

  const getSortedStatuses = () => {
    if (!glossary.statuses) return [];
    return [...glossary.statuses].sort((a, b) => {
      let valA = a[statusesSort.field] ?? '';
      let valB = b[statusesSort.field] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return statusesSort.asc ? valA - valB : valB - valA;
      }
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
      if (valA < valB) return statusesSort.asc ? -1 : 1;
      if (valA > valB) return statusesSort.asc ? 1 : -1;
      return 0;
    });
  };
  const renderEffectBadges = (effectsStr) => {
    if (!effectsStr || effectsStr === 'None') return '-';
    const badges = effectsStr.split(', ')
      .filter(act => !act.includes('SourceID') && !act.includes('Source id') && !act.includes('Source') && act.trim() !== '');
    
    if (badges.length === 0) return '-';

    // Per-category color palette. Keys are lowercase substrings matched against each badge.
    const effectColors = {
      hunger:          { bg: 'rgba(210, 120, 30, 0.18)',  border: 'rgba(210, 120, 30, 0.5)',  text: '#f0a050' },
      thirst:          { bg: 'rgba(30, 140, 210, 0.18)',  border: 'rgba(30, 140, 210, 0.5)',  text: '#55aaff' },
      energy:          { bg: 'rgba(255, 220, 0, 0.15)',   border: 'rgba(255, 220, 0, 0.45)',  text: '#ffd700' },
      health:          { bg: 'rgba(60, 200, 80, 0.15)',   border: 'rgba(60, 200, 80, 0.5)',   text: '#55dd77' },
      happiness:       { bg: 'rgba(230, 80, 180, 0.15)',  border: 'rgba(230, 80, 180, 0.5)',  text: '#f070cc' },
      mood:            { bg: 'rgba(230, 80, 180, 0.15)',  border: 'rgba(230, 80, 180, 0.5)',  text: '#f070cc' },
      'move speed':    { bg: 'rgba(100, 220, 200, 0.15)', border: 'rgba(100, 220, 200, 0.5)', text: '#44ddcc' },
      speed:           { bg: 'rgba(100, 220, 200, 0.15)', border: 'rgba(100, 220, 200, 0.5)', text: '#44ddcc' },
      'cold tolerance':{ bg: 'rgba(80, 180, 255, 0.15)',  border: 'rgba(80, 180, 255, 0.5)',  text: '#88ccff' },
      temperature:     { bg: 'rgba(255, 100, 60, 0.15)',  border: 'rgba(255, 100, 60, 0.5)',  text: '#ff7755' },
      warmth:          { bg: 'rgba(255, 100, 60, 0.15)',  border: 'rgba(255, 100, 60, 0.5)',  text: '#ff7755' },
      damage:          { bg: 'rgba(220, 60, 60, 0.15)',   border: 'rgba(220, 60, 60, 0.5)',   text: '#ff6666' },
      attack:          { bg: 'rgba(220, 60, 60, 0.15)',   border: 'rgba(220, 60, 60, 0.5)',   text: '#ff6666' },
      evasion:         { bg: 'rgba(160, 80, 240, 0.15)',  border: 'rgba(160, 80, 240, 0.5)',  text: '#bb88ff' },
      'crit rate':     { bg: 'rgba(255, 160, 30, 0.15)',  border: 'rgba(255, 160, 30, 0.5)',  text: '#ffaa33' },
      toughness:       { bg: 'rgba(180, 180, 180, 0.15)', border: 'rgba(180, 180, 180, 0.4)', text: '#cccccc' },
      armor:           { bg: 'rgba(180, 180, 180, 0.15)', border: 'rgba(180, 180, 180, 0.4)', text: '#cccccc' },
      mine:            { bg: 'rgba(120, 90, 50, 0.2)',    border: 'rgba(160, 110, 60, 0.5)',  text: '#c8965a' },
      log:             { bg: 'rgba(80, 140, 60, 0.18)',   border: 'rgba(80, 140, 60, 0.5)',   text: '#78c050' },
      fish:            { bg: 'rgba(40, 160, 200, 0.15)',  border: 'rgba(40, 160, 200, 0.5)',  text: '#44aacc' },
      plant:           { bg: 'rgba(60, 180, 80, 0.15)',   border: 'rgba(60, 180, 80, 0.5)',   text: '#55cc66' },
      'craft metal':   { bg: 'rgba(150, 150, 180, 0.18)', border: 'rgba(150, 150, 200, 0.5)', text: '#aaaadd' },
      'craft wood':    { bg: 'rgba(160, 110, 60, 0.18)',  border: 'rgba(160, 110, 60, 0.5)',  text: '#c8966a' },
      'craft stone':   { bg: 'rgba(130, 130, 110, 0.18)', border: 'rgba(130, 130, 110, 0.5)', text: '#bbbbaa' },
      'craft cloth':   { bg: 'rgba(200, 100, 160, 0.15)', border: 'rgba(200, 100, 160, 0.5)', text: '#dd88bb' },
      'craft leather': { bg: 'rgba(170, 120, 70, 0.18)',  border: 'rgba(170, 120, 70, 0.5)',  text: '#cc9966' },
      'craft void':    { bg: 'rgba(120, 60, 200, 0.18)',  border: 'rgba(120, 60, 200, 0.5)',  text: '#aa66ff' },
      cook:            { bg: 'rgba(230, 130, 40, 0.15)',  border: 'rgba(230, 130, 40, 0.5)',  text: '#ee9944' },
      carry:           { bg: 'rgba(100, 160, 100, 0.15)', border: 'rgba(100, 160, 100, 0.5)', text: '#88cc88' },
      summoning:       { bg: 'rgba(80, 50, 150, 0.2)',    border: 'rgba(100, 60, 200, 0.5)',  text: '#9977ee' },
      'fight magic':   { bg: 'rgba(60, 30, 160, 0.2)',    border: 'rgba(80, 50, 200, 0.5)',   text: '#7766ff' },
      xp:              { bg: 'rgba(255, 210, 60, 0.15)',  border: 'rgba(255, 210, 60, 0.5)',  text: '#ffcc44' },
      age:             { bg: 'rgba(160, 160, 100, 0.15)', border: 'rgba(160, 160, 100, 0.5)', text: '#cccc77' },
      resist:          { bg: 'rgba(80, 180, 255, 0.15)',  border: 'rgba(80, 180, 255, 0.5)',  text: '#88ccff' },
    };

    const getBadgeStyle = (badge) => {
      const lower = badge.toLowerCase();
      // Longest-match first so 'craft metal' beats 'craft'
      const sortedKeys = Object.keys(effectColors).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (lower.includes(key)) return effectColors[key];
      }
      // Fallback
      return {
        bg: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
        border: 'rgba(255,255,255,0.15)',
        text: theme === 'light' ? '#2d2319' : '#88ffaa',
      };
    };
    
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {badges.map((badge, idx) => {
          const style = getBadgeStyle(badge);
          return (
            <span key={idx} style={{ 
              padding: '2px 8px', 
              borderRadius: '4px', 
              background: style.bg,
              color: style.text, 
              fontSize: '0.75rem', 
              fontWeight: 500,
              border: `1px solid ${style.border}`,
              whiteSpace: 'nowrap'
            }}>
              {badge}
            </span>
          );
        })}
      </div>
    );
  };

  const renderRecipeCell = (recipes) => {
    if (!recipes || recipes.length === 0) return '-';
    // If it's an array of recipes, just show the first one in the table view to save space
    const recipeArray = Array.isArray(recipes[0]) ? recipes[0] : recipes;
    if (!recipeArray || recipeArray.length === 0) return '-';
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {recipeArray.map((ing, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>{ing.count}x</span>
            <img 
              src={`game_icons/${ing.iconFile}`} 
              alt="" 
              style={{ width: '24px', height: '24px' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>{ing.name}</span>
          </div>
        ))}
        {Array.isArray(recipes[0]) && recipes.length > 1 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+ {recipes.length - 1} more recipe(s)</span>
        )}
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
                <img src={selectedItem.iconFilename ? `game_icons/${selectedItem.iconFilename}` : `game_icons/default.png`} style={{ width: '100%', height: '100%' }} alt="" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedItem.name}</h2>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedItem.id}</span>
              </div>
            </div>

            {selectedItem.description && (
              <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.4', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid var(--border-glass)', whiteSpace: 'pre-wrap' }}>
                "{selectedItem.description}"
              </div>
            )}
            
            {selectedItem.discoveryHint && (
              <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.4', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid var(--accent-purple)', whiteSpace: 'pre-wrap' }}>
                "{selectedItem.discoveryHint}"
              </div>
            )}

            {selectedItem.type === 'seed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(0,255,255,0.05)', borderRadius: '4px', borderLeft: '3px solid var(--accent-cyan)' }}>
                {selectedItem.growsIntoItem && (
                  <div style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Grows Into:</span>
                    <span 
                      style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => {
                        const targetItem = glossary.items.find(i => i.id === selectedItem.growsIntoItem);
                        if (targetItem) setSelectedItem(targetItem);
                      }}
                    >
                      {selectedItem.growsIntoName || selectedItem.growsIntoItem}
                    </span>
                  </div>
                )}
                {selectedItem.growthTime !== null && selectedItem.growthTime !== undefined && (
                  <div style={{ fontSize: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Growth Time: </span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{selectedItem.growthTime === -1 ? 'None' : `${selectedItem.growthTime} ticks`}</span>
                  </div>
                )}
                {selectedItem.lifespan !== null && selectedItem.lifespan !== undefined && (
                  <div style={{ fontSize: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lifespan: </span>
                    <span style={{ color: 'var(--tbl-highlight)', fontWeight: 'bold' }}>{selectedItem.lifespan === -1 ? 'Infinite' : `${selectedItem.lifespan} ticks`}</span>
                  </div>
                )}
                {selectedItem.seasons && (
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>Grows in </span>
                    {renderSeasons(selectedItem.seasons)}
                  </div>
                )}
                {selectedItem.minTemp !== null && selectedItem.maxTemp !== null && (
                  <div style={{ fontSize: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Temp Range </span>
                    <span style={{ color: 'var(--tbl-highlight)', fontWeight: 'bold' }}>{selectedItem.minTemp}</span>
                    <span style={{ color: 'var(--text-muted)' }}> ... </span>
                    <span style={{ color: 'var(--tbl-highlight)', fontWeight: 'bold' }}>{selectedItem.maxTemp}</span>
                  </div>
                )}
              </div>
            )}

            {(selectedItem.type === 'tool' || isWeapon(selectedItem)) && selectedItem.maxRange !== undefined && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '10px', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>Attack Range</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: selectedItem.isRanged ? 'var(--accent-cyan)' : 'var(--text-primary)', fontWeight: 'normal' }}>
                  {selectedItem.maxRange > 0 ? selectedItem.maxRange : '-'}
                  {selectedItem.isRanged ? ' (Ranged Weapon)' : (selectedItem.maxRange > 0 ? ' (Melee Weapon)' : '')}
                </span>
              </div>
            )}

            {selectedItem.unlockResearchList && selectedItem.unlockResearchList.length > 0 && (
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>unlockResearchList</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedItem.unlockResearchList.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img 
                        src={`game_icons/${r.iconFile}`} 
                        alt="" 
                        style={{ width: '64px', height: '64px', borderRadius: '4px' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span style={{ color: 'var(--tbl-highlight)', fontWeight: 'normal', fontSize: '1.05rem' }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(selectedItem).map(([key, value]) => {
                if (key === 'unlockResearchList' || key === 'iconFilename' || key === 'description' || key === 'discoveryHint' || key === 'minTemp' || key === 'maxTemp' || key === 'seasons' || key === 'isRanged' || key === 'maxRange') return null;
                if (value === '' || value === null || value === undefined) return null;

                let displayVal = '';
                if (typeof value === 'object' && value !== null) {
                  displayVal = JSON.stringify(value);
                } else {
                  displayVal = String(value);
                }

                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', gap: '2px' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{key}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{displayVal}</span>
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
            <img src={selectedBlock.iconFilename ? `game_icons/${selectedBlock.iconFilename}` : `game_icons/default.png`} style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedBlock.name}</h2>
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedBlock.id}</span>
          </div>
        </div>

        {selectedBlock.description && (
          <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid var(--border-glass)', whiteSpace: 'pre-wrap' }}>
            "{selectedBlock.description}"
          </div>
        )}
        
        {selectedBlock.discoveryHint && (
          <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid var(--accent-purple)', whiteSpace: 'pre-wrap' }}>
            "{selectedBlock.discoveryHint}"
          </div>
        )}

        {selectedBlock.unlockResearchList && selectedBlock.unlockResearchList.length > 0 && (
          <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>unlockResearchList</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedBlock.unlockResearchList.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img 
                    src={`game_icons/${r.iconFile}`} 
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
            if (key === 'unlockResearchList' || key === 'iconFilename' || key === 'description' || key === 'discoveryHint') return null;
            if (value === '' || value === null || value === undefined) return null;

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

  const renderNPCInspector = () => {
    if (!selectedNPC) return null;
    const npc = selectedNPC;
    const classLabel = npc.intelligence === 'sapient' ? 'Sapient' : npc.tags.includes('animal') ? 'Animal' : 'Creature';
    return (
      <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)', zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            {classLabel} Inspector
          </span>
          <button onClick={() => setSelectedNPC(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '128px', height: '128px', background: 'var(--bg-tertiary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', flexShrink: 0 }}>
            <img src={npc.iconFilename && npc.iconFilename !== 'default.png' ? `game_icons/${npc.iconFilename}` : `game_icons/sp_race_unknown.png`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{npc.name}</h2>
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{npc.id}</span>
          </div>
        </div>

        {npc.description && (
          <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.4', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid var(--border-glass)', whiteSpace: 'pre-wrap' }}>
            "{npc.description}"
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(npc).map(([key, value]) => {
            if (key === 'iconFilename' || key === 'description' || key === 'name' || key === 'id') return null;
            if (value === '' || value === null || value === undefined) return null;

            let displayVal = '';
            if (key === 'startingItems' && Array.isArray(value)) {
              if (value.length === 0) return null;
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', gap: '4px' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{key}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {value.map((item, i) => (
                      <span key={i} style={{ fontSize: '0.85rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(80,200,255,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(80,200,255,0.25)', cursor: 'pointer' }} onClick={() => {
                        const targetItem = glossary.items?.find(it => it.id === item.id);
                        if (targetItem) {
                          setSelectedItem(targetItem);
                          setSelectedNPC(null);
                        }
                      }}>{item.name}</span>
                    ))}
                  </div>
                </div>
              );
            } else if (key === 'attacks' && Array.isArray(value)) {
              if (value.length === 0) return null;
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', gap: '4px' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{key}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {value.map((atk, i) => (
                      <div key={i} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '4px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{atk.name || atk}</div>
                        {atk.minDamage != null && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Damage: {atk.minDamage}-{atk.maxDamage} | Range: {atk.range}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            } else if (typeof value === 'object' && value !== null) {
              displayVal = JSON.stringify(value);
            } else {
              displayVal = String(value);
            }

            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{key}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: key === 'merchantValue' ? 'var(--accent-cyan)' : 'var(--text-primary)', wordBreak: 'break-all' }}>{displayVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStatusInspector = () => {
    if (!selectedStatus) return null;
    const status = selectedStatus;
    const firstLetter = status.name ? status.name.charAt(0).toUpperCase() : '?';
    const statusColor = status.textColor || 'var(--text-primary)';

    return (
      <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)', zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            Status Inspector
          </span>
          <button onClick={() => setSelectedStatus(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--bg-tertiary)', border: `2px solid ${statusColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: statusColor }}>{firstLetter}</span>
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)', color: statusColor }}>{status.name}</h2>
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{status.id}</span>
          </div>
        </div>

        {status.description && (
          <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.4', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid var(--border-glass)', whiteSpace: 'pre-wrap' }}>
            "{status.description}"
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(status).map(([key, value]) => {
            if (key === 'description' || key === 'name' || key === 'id' || key === 'textColor' || key === 'inlineIcon') return null;
            if (value === '' || value === null || value === undefined) return null;

            let displayVal = '';
            if (typeof value === 'object' && value !== null) {
              displayVal = JSON.stringify(value);
            } else {
              displayVal = String(value);
            }

            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', gap: '2px' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{key}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{displayVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const foodTypes = ['meal', 'fruit', 'vegetable', 'meat', 'fish', 'fungus', 'alcohol', 'beverage', 'egg', 'milk'];
  const resourceTypes = ['refined_material', 'ingot', 'ore', 'gem', 'stone', 'wood', 'seed', 'plant_material', 'animal_byproduct', 'remains', 'container', 'garbage', 'soil', 'trinket', 'OnJobDisposedTagObjectID'];


  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't intercept if user is typing in the search box or any input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const isDown = e.key === 'ArrowDown';
        
        if (currentView === 'search') {
          if (!selectedItem && !selectedBlock) return;
          e.preventDefault();
          const list = getSortedSearchResults();
          const activeId = selectedItem ? `item-${selectedItem.id}` : (selectedBlock ? `block-${selectedBlock.id}` : null);
          const currentIndex = list.findIndex(r => r.uniqueKey === activeId);
          if (currentIndex === -1) return;
          
          let nextIndex = currentIndex + (isDown ? 1 : -1);
          if (nextIndex < 0) nextIndex = 0;
          if (nextIndex >= list.length) nextIndex = list.length - 1;
          
          handleSearchResultClick(list[nextIndex]);
          setTimeout(() => {
            const el = document.getElementById(`row-${list[nextIndex].uniqueKey}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
          
        } else if (currentView === 'blocks' || currentView === 'props') {
          if (!selectedBlock) return;
          e.preventDefault();
          const list = getSortedBlocks(currentView);
          const currentIndex = list.findIndex(b => b.id === selectedBlock.id);
          if (currentIndex === -1) return;
          
          let nextIndex = currentIndex + (isDown ? 1 : -1);
          if (nextIndex < 0) nextIndex = 0;
          if (nextIndex >= list.length) nextIndex = list.length - 1;
          
          setSelectedBlock(list[nextIndex]);
          setTimeout(() => {
            const el = document.getElementById(`row-${list[nextIndex].id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
          
        } else if (currentView !== 'dashboard') {
          if (!selectedItem) return;
          e.preventDefault();
          const list = getSortedItems(currentView);
          const currentIndex = list.findIndex(i => i.id === selectedItem.id);
          if (currentIndex === -1) return;
          
          let nextIndex = currentIndex + (isDown ? 1 : -1);
          if (nextIndex < 0) nextIndex = 0;
          if (nextIndex >= list.length) nextIndex = list.length - 1;
          
          setSelectedItem(list[nextIndex]);
          setTimeout(() => {
            const el = document.getElementById(`row-${list[nextIndex].id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  });

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
          filter: blur(14px) !important;
          opacity: 0.15;
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
      <Sidebar currentView={currentView} resetFilters={resetFilters} />

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
            {currentView === 'dashboard' && <><img src="game_icons/sp_adepts_aeternum_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Dashboard</>}
            {currentView === 'beverages' && <><img src="game_icons/sp_health_potion_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Beverages</>}
            {currentView === 'blocks' && <><img src="game_icons/sp_block_wood_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Blocks</>}
            {currentView === 'books' && <><img src="game_icons/sp_tome_of_cooking_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Books & Tomes</>}
            {currentView === 'produce' && <><img src="game_icons/sp_apple_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Fruits & Vegetables</>}
            {currentView === 'fungus' && <><img src="game_icons/sp_boletus_mushroom_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Fungus</>}
            {currentView === 'gear' && <><img src="game_icons/sp_bronze_breastplate_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Gear & Armor</>}
            {currentView === 'materials' && <><img src="game_icons/sp_iron_ingot_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Materials</>}
            {currentView === 'meals' && <><img src="game_icons/sp_apple_pie_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Meats & Meals</>}
            {currentView === 'other' && <><img src="game_icons/sp_waste_rotten_food_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Other</>}
            {currentView === 'props' && <><img src="game_icons/sp_iron_anvil_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Props</>}
            {currentView === 'seeds' && <><img src="game_icons/sp_plant_beetroot_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Seeds</>}
            {currentView === 'statuses' && <><img src="game_icons/sp_job_integrate_as_citizen_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Statuses & Effects</>}
            {currentView === 'tools' && <><img src="game_icons/sp_iron_pickaxe_two_hand_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Tools</>}
            {currentView === 'trinkets' && <><img src="game_icons/sp_ren_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Trinkets</>}
            {currentView === 'npcs' && <><img src="game_icons/sp_adult_crab_fa0.png" style={{ width: '24px', height: '24px' }} alt="" /> Entities</>}
            {currentView === 'weapons' && <><img src="game_icons/sp_blade_of_brian_icon.png" style={{ width: '24px', height: '24px' }} alt="" /> Weapons</>}
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
              <span style={{ fontWeight: 600 }}>Blur Discoverable Spoilers</span>
            </label>

            {/* Universal Search Container */}
            <div style={{ position: 'relative', width: '340px' }}>
              <input 
                type="text" 
                placeholder="Global Search (Regex works!)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { 
                    setSearchQuery(''); 
                    setSearchResults([]); 
                    setSearchResultsAll([]); 
                    setShowSearchView(false); 
                    if (currentView === 'search') setCurrentView('animal_products');
                  }
                  if (e.key === 'Enter' && searchResultsAll.length > 0) { handleShowAllResults(); }
                }}
                style={{ 
                  width: '100%', 
                  padding: '8px 36px 8px 16px', 
                  borderRadius: '20px', 
                  background: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border-glass)',
                  outline: 'none',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
              {/* X Clear button */}
              {searchQuery && (
                <button
                  onClick={() => { 
                    setSearchQuery(''); 
                    setSearchResults([]); 
                    setSearchResultsAll([]); 
                    setShowSearchView(false); 
                    if (currentView === 'search') setCurrentView('animal_products');
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    padding: '2px 4px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Clear search"
                >×</button>
              )}
              
              {searchResults.length > 0 && (
                <div style={{ 
                  position: 'absolute', 
                  top: '40px', 
                  right: 0, 
                  width: '460px', 
                  maxHeight: '560px',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '8px', 
                  zIndex: 100,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}>
                  {/* Scrollable results list */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
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
                                src={result.data?.iconFilename ? `game_icons/${result.data.iconFilename}` : `game_icons/default.png`} 
                                alt=""
                                style={{ width: '40px', height: '40px' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <span style={{ fontSize: '1.25rem' }}>⚙️</span>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{result.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{result.details}</div>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{result.view}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Show All — always pinned to bottom */}
                  {searchResultsAll.length > 0 && (
                    <div
                      onClick={handleShowAllResults}
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        borderTop: '2px solid var(--border-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--accent-cyan)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        background: 'rgba(0, 240, 255, 0.05)',
                        transition: 'background 0.15s',
                        flexShrink: 0
                      }}
                      className="search-result-item"
                    >
                      <span>Show all {searchResultsAll.length} results → <kbd style={{ fontSize: '0.7rem', opacity: 0.6, background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-glass)' }}>Enter</kbd></span>
                    </div>
                  )}
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


        {/* VIEW: SEARCH RESULTS */}
        {currentView === 'search' && (() => {
          const hasItems       = searchResultsAll.some(r => r.type === 'item');
          const hasBlocks      = searchResultsAll.some(r => r.type === 'block');
          const hasDamage      = searchResultsAll.some(r => (r.data?.maxDamage ?? 0) > 0);
          const hasToughness   = searchResultsAll.some(r => (r.data?.toughness ?? 0) > 0);
          const hasEffects     = searchResultsAll.some(r => r.data?.actions && r.data.actions !== 'None');
          const hasIsEdible    = searchResultsAll.some(r => r.data?.type === 'fruit' || r.data?.type === 'vegetable' || r.data?.type === 'fungus' || r.data?.type === 'meat' || r.data?.type === 'fish' || r.data?.type === 'egg' || r.data?.type === 'milk' || r.data?.type === 'meal');
          const hasSlots       = searchResultsAll.some(r => r.data?.slots && r.data.slots !== 'None' && r.data.slots !== 'Inventory Only');
          const hasBuyValue    = hasItems;
          const hasIsStation   = searchResultsAll.some(r => r.type === 'block' && r.view === 'props');
          const hasRoomQuality = hasBlocks;
          const hasPathCost    = hasBlocks;
          const hasRarity      = searchResultsAll.some(r => r.data?.rarity);
          const hasRecipe      = searchResultsAll.some(r => r.data?.recipe);
          const hasUnlock      = searchResultsAll.some(r => r.data?.unlockResearch || (r.data?.unlockResearchList?.length ?? 0) > 0);
          const hasDecayInfo   = searchResultsAll.some(r => r.data?.decayInfo && r.data.decayInfo !== 'None');

          const thStyle = (field) => ({ padding: '10px 8px', cursor: 'pointer', whiteSpace: 'nowrap' });
          const sortIndicator = (field) => searchSort.field === field ? (searchSort.asc ? ' ▲' : ' ▼') : '';

          return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={() => { setCurrentView('animal_products'); setSearchQuery(''); setSearchResults([]); setSearchResultsAll([]); setShowSearchView(false); }}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-muted)',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                ← Close Search
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: theme === 'light' ? 'var(--bg-tertiary)' : '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '10px 8px' }}>Icon</th>
                    <th style={thStyle()} onClick={() => handleSortSearch('name')}>Name{sortIndicator('name')}</th>
                    <th style={thStyle()} onClick={() => handleSortSearch('category')}>Category{sortIndicator('category')}</th>
                    {hasRarity     && <th style={thStyle()} onClick={() => handleSortSearch('rarity')}>Rarity{sortIndicator('rarity')}</th>}
                    {hasDamage     && <th style={thStyle()} onClick={() => handleSortSearch('damage')}>Damage{sortIndicator('damage')}</th>}
                    {hasToughness  && <th style={thStyle()} onClick={() => handleSortSearch('toughness')}>Toughness{sortIndicator('toughness')}</th>}
                    {hasSlots      && <th style={thStyle()} onClick={() => handleSortSearch('slots')}>Slot{sortIndicator('slots')}</th>}
                    {hasIsEdible   && <th style={thStyle()}>Is Edible</th>}
                    {hasEffects    && <th style={thStyle()} onClick={() => handleSortSearch('effects')}>Effects{sortIndicator('effects')}</th>}
                    {hasDecayInfo  && <th style={thStyle()} onClick={() => handleSortSearch('decayInfo')}>Decay Time{sortIndicator('decayInfo')}</th>}
                    {hasRoomQuality && <th style={thStyle()} onClick={() => handleSortSearch('roomQuality')}>Room Quality{sortIndicator('roomQuality')}</th>}
                    {hasPathCost   && <th style={thStyle()} onClick={() => handleSortSearch('cost')}>Path Cost{sortIndicator('cost')}</th>}
                    {hasIsStation  && <th style={thStyle()} onClick={() => handleSortSearch('isStation')}>Is Station{sortIndicator('isStation')}</th>}
                    {hasRecipe     && <th style={thStyle()}>Recipe</th>}
                    {hasUnlock     && <th style={thStyle()}>Unlocked By</th>}
                    {hasBuyValue   && <th style={thStyle()} onClick={() => handleSortSearch('buyValue')}>Value{sortIndicator('buyValue')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {getSortedSearchResults().map((result, index) => {
                    const isBlurred = hideSpoilers && isSpoiler(result.data);
                    const d = result.data;
                    return (
                      <tr
                        key={result.uniqueKey}
                        onClick={() => handleSearchResultClick(result)}
                        style={{
                          borderBottom: '1px solid var(--border-glass)',
                          backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          cursor: 'pointer'
                        }}
                        className={isBlurred ? 'spoiler-blurred-container' : ''}
                      >
                        <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                          <img src={d?.iconFilename ? `game_icons/${d.iconFilename}` : `game_icons/default.png`} alt="" style={{ width: '40px', height: '40px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        </td>
                        <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                          <div style={{ fontWeight: 600 }}>{result.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d?.id}</div>
                        </td>
                        <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.2)', color: 'var(--accent-cyan)', textTransform: 'capitalize' }}>{result.view}</span>
                        </td>
                        {hasRarity     && <td style={{ padding: '8px', fontWeight: 600, color: getRarityColor(d?.rarity || 'common') }} className={isBlurred ? 'spoiler-blurred' : ''}>{d?.rarity ? d.rarity.charAt(0).toUpperCase() + d.rarity.slice(1) : '—'}</td>}
                        {hasDamage     && (
                           <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-damage)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                             {d?.attacksDetail && d.attacksDetail.length > 0 ? (
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                 {d.attacksDetail.map((att, idx) => (
                                   <div key={idx} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                     <span style={{ color: 'var(--text-secondary)' }}>{att.name}:</span> {att.minDamage}-{att.maxDamage}
                                   </div>
                                 ))}
                               </div>
                             ) : ((d?.maxDamage ?? 0) > 0 ? `${d.minDamage}-${d.maxDamage}` : '-')}
                           </td>
                         )}
                        {hasToughness  && <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-toughness)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{(d?.toughness ?? 0) > 0 ? `+${d.toughness}` : '-'}</td>}
                        {hasSlots      && <td style={{ padding: '8px', color: 'var(--text-secondary)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{d?.slots && d.slots !== 'None' && d.slots !== 'Inventory Only' ? d.slots : '-'}</td>}
                        {hasIsEdible   && (
                          <td style={{ padding: '8px', fontWeight: 'bold', color: (d?.actions && (d.actions.includes('Hunger') || d.actions.includes('Thirst') || d.actions.includes('Energy'))) ? 'var(--accent-cyan)' : 'var(--text-muted)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {(d?.actions && (d.actions.includes('Hunger') || d.actions.includes('Thirst') || d.actions.includes('Energy'))) ? 'Yes' : 'No'}
                          </td>
                        )}
                        {hasEffects    && <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderEffectBadges(d?.actions)}</td>}
                        {hasDecayInfo  && <td style={{ padding: '8px', color: 'var(--text-muted)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{d?.decayInfo && d.decayInfo !== 'None' ? (d.decayInfo.match(/\d+/) ? d.decayInfo.match(/\d+/)[0] : d.decayInfo) : '-'}</td>}
                        {hasRoomQuality && <td style={{ padding: '8px', fontWeight: 600, color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>+{d?.roomQuality ?? 0}</td>}
                        {hasPathCost   && <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{d?.cost != null ? `${d.cost} pts` : '—'}</td>}
                        {hasIsStation  && <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{result.type === 'block' && result.view === 'props' ? (d?.isStation ? <span style={{ color: '#88ffaa', fontWeight: 'bold' }}>Yes</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>) : '—'}</td>}
                        {hasRecipe     && <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderRecipeCell(d?.recipe)}</td>}
                        {hasUnlock     && <td style={{ padding: '8px', color: 'var(--tbl-highlight)', fontWeight: 500 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                          {d?.unlockResearchList && d.unlockResearchList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {d.unlockResearchList.map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <img src={`game_icons/${r.iconFile}`} alt="" style={{ width: '36px', height: '36px', borderRadius: '4px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                  <span style={{ fontSize: '0.78rem' }}>{r.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : <span>{formatUnlockText(d?.unlockResearch)}</span>}
                        </td>}
                        {hasBuyValue   && <td style={{ padding: '8px', color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{d?.buyValue != null ? `${d.buyValue} Ren` : '—'}</td>}
                      </tr>
                    );
                  })}
                  {searchResultsAll.length === 0 && (
                    <tr>
                      <td colSpan={colCount} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No results found for "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* Dynamic Category Views */}
        {currentView !== 'search' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              

              {/* TABLE CONTAINER */}
              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                {currentView === 'npcs' ? (() => {
                  const npcsList = getSortedNPCs();
                  const si = (f) => npcsSort.field === f ? (npcsSort.asc ? ' ▲' : ' ▼') : '';
                  const thStyle = { padding: '10px 8px', cursor: 'pointer', whiteSpace: 'nowrap' };
                  const hasAttacks = npcsList.some(n => n.attacks.length > 0);
                  const hasSkills = npcsList.some(n => n.skills && n.skills.length > 0);
                  const hasProfessions = npcsList.some(n => n.professions && n.professions.length > 0);
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: theme === 'light' ? 'var(--bg-tertiary)' : '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{ padding: '10px 8px' }}>Icon</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('name')}>Name{si('name')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('namePlural')}>Plural{si('namePlural')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('intelligence')}>Classification{si('intelligence')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('becomesAdultAge')}>Becomes Adult{si('becomesAdultAge')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('becomesElderAge')}>Becomes Elder{si('becomesElderAge')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('description')}>Description{si('description')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('perks')}>Perks{si('perks')}</th>
                          {hasAttacks && <th style={thStyle} onClick={() => handleSortNPCs('attacks')}>Damage{si('attacks')}</th>}
                          <th style={thStyle} onClick={() => handleSortNPCs('health')}>Health{si('health')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('move_speed')}>Speed{si('move_speed')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('evasion')}>Evasion{si('evasion')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('sight_range')}>View Distance{si('sight_range')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('toughness')}>Toughness{si('toughness')}</th>
                          {hasSkills && <th style={thStyle} onClick={() => handleSortNPCs('skills')}>Skills{si('skills')}</th>}
                          {hasProfessions && <th style={thStyle} onClick={() => handleSortNPCs('professions')}>Professions{si('professions')}</th>}
                          <th style={thStyle} onClick={() => handleSortNPCs('startingItems')}>Starting Gear{si('startingItems')}</th>
                          <th style={thStyle} onClick={() => handleSortNPCs('merchantValue')}>Value{si('merchantValue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {npcsList.map((npc, index) => {
                          const classLabel = npc.intelligence === 'sapient' ? 'Sapient' : npc.tags.includes('animal') ? 'Animal' : 'Creature';
                          return (
                            <tr
                              key={npc.id}
                              id={`row-${npc.id}`}
                              onClick={() => setSelectedNPC(npc)}
                              style={{
                                borderBottom: '1px solid var(--border-glass)',
                                cursor: 'pointer',
                                backgroundColor: selectedNPC?.id === npc.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                                transition: 'background 0.15s'
                              }}
                            >
                              <td style={{ padding: '8px' }}>
                                <img src={npc.iconFilename && npc.iconFilename !== 'default.png' ? `game_icons/${npc.iconFilename}` : `game_icons/sp_race_unknown.png`} alt="" style={{ width: '72px', height: '72px', objectFit: 'contain', imageRendering: 'pixelated' }} onError={e => { e.target.src = 'game_icons/sp_race_unknown.png'; }} />
                              </td>
                              <td style={{ padding: '8px', fontWeight: 600 }}>{npc.name}</td>
                              <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{npc.namePlural}</td>
                              <td style={{ padding: '8px' }}>
                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px', background: npc.intelligence === 'sapient' ? 'rgba(120,80,255,0.2)' : 'rgba(60,180,80,0.2)', color: npc.intelligence === 'sapient' ? 'var(--accent-purple)' : 'var(--accent-green)', border: `1px solid ${npc.intelligence === 'sapient' ? 'var(--accent-purple)' : 'var(--accent-green)'}` }}>
                                  {classLabel}
                                </span>
                              </td>
                              <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: npc.becomesAdultAge > 0 ? 600 : 'normal' }}>
                                {npc.becomesAdultAge !== null && npc.becomesAdultAge !== undefined ? (npc.becomesAdultAge === 0 ? 'Immediate' : `${npc.becomesAdultAge.toLocaleString()} days`) : '—'}
                              </td>
                              <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: npc.becomesElderAge > 0 ? 600 : 'normal' }}>
                                {npc.becomesElderAge !== null && npc.becomesElderAge !== undefined ? (npc.becomesElderAge === 0 ? 'Immediate' : `${npc.becomesElderAge.toLocaleString()} days`) : '—'}
                              </td>
                              <td style={{ padding: '8px', color: 'var(--text-secondary)', fontStyle: 'italic', minWidth: '200px', maxWidth: '350px' }}>{npc.description || '—'}</td>
                              <td style={{ padding: '8px', color: 'var(--tbl-highlight)', minWidth: '180px', maxWidth: '300px' }}>
                                {npc.perks.length > 0 ? npc.perks.map((p, i) => <div key={i}>{p}</div>) : '—'}
                              </td>
                              {hasAttacks && (
                                <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-damage)' }}>
                                  {npc.attacks.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {npc.attacks.map((a, i) => (
                                        <div key={i} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>{a.name}:</span> {a.minDamage}-{a.maxDamage}
                                        </div>
                                      ))}
                                    </div>
                                  ) : '—'}
                                </td>
                              )}
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-highlight)' }}>
                                {npc.attributes?.health ?? '—'}
                              </td>
                              <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                                {npc.attributes?.move_speed ?? '—'}
                              </td>
                              <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                                {npc.attributes?.evasion != null ? `${npc.attributes.evasion}%` : '—'}
                              </td>
                              <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                                {npc.attributes?.sight_range ?? '—'}
                              </td>
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-toughness)' }}>
                                {npc.attributes?.toughness != null ? `+${npc.attributes.toughness}` : '—'}
                              </td>
                              {hasSkills && (
                                <td style={{ padding: '8px' }}>
                                  {npc.skills && npc.skills.length > 0
                                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{npc.skills.map((s, i) => <span key={i} style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(80,200,120,0.12)', color: 'var(--accent-green)' }}>{s}</span>)}</div>
                                    : '—'}
                                </td>
                              )}
                              {hasProfessions && (
                                <td style={{ padding: '8px' }}>
                                  {npc.professions && npc.professions.length > 0
                                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{npc.professions.map((p, i) => <span key={i} style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(200,160,80,0.15)', color: '#e8c060' }}>{p}</span>)}</div>
                                    : '—'}
                                </td>
                              )}
                              <td style={{ padding: '8px' }}>
                                {npc.startingItems.length > 0
                                  ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{npc.startingItems.map((it, i) => <span key={i} style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(80,200,255,0.1)', color: 'var(--accent-cyan)' }}>{it.name}</span>)}</div>
                                  : '—'}
                              </td>
                              <td style={{ padding: '8px', color: 'var(--accent-cyan)' }}>{npc.merchantValue} Ren</td>
                            </tr>
                          );
                        })}
                        {npcsList.length === 0 && (
                          <tr><td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No entities found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  );
                })() : currentView === 'statuses' ? (() => {
                  const statusesList = getSortedStatuses();
                  const si = (f) => statusesSort.field === f ? (statusesSort.asc ? ' ▲' : ' ▼') : '';
                  const thStyle = { padding: '10px 8px', cursor: 'pointer', whiteSpace: 'nowrap' };
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: theme === 'light' ? 'var(--bg-tertiary)' : '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{ padding: '10px 8px' }}>Icon</th>
                          <th style={thStyle} onClick={() => handleSortStatuses('name')}>Name{si('name')}</th>
                          <th style={thStyle} onClick={() => handleSortStatuses('id')}>Status ID{si('id')}</th>
                          <th style={thStyle} onClick={() => handleSortStatuses('description')}>Description{si('description')}</th>
                          <th style={thStyle} onClick={() => handleSortStatuses('discoveryHint')}>Discovery Hint{si('discoveryHint')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusesList.map((status, index) => {
                          const statusColor = status.textColor || 'var(--text-primary)';
                          const firstLetter = status.name ? status.name.charAt(0).toUpperCase() : '?';
                          return (
                            <tr
                              key={status.id}
                              id={`row-${status.id}`}
                              onClick={() => setSelectedStatus(status)}
                              style={{
                                borderBottom: '1px solid var(--border-glass)',
                                cursor: 'pointer',
                                backgroundColor: selectedStatus?.id === status.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                                transition: 'background 0.15s'
                              }}
                            >
                              <td style={{ padding: '8px' }}>
                                <div style={{ width: '36px', height: '36px', background: 'var(--bg-tertiary)', border: `2px solid ${statusColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: statusColor }}>{firstLetter}</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px', fontWeight: 600, color: statusColor }}>{status.name}</td>
                              <td style={{ padding: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{status.id}</td>
                              <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{status.description || '—'}</td>
                              <td style={{ padding: '8px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{status.discoveryHint || '—'}</td>
                            </tr>
                          );
                        })}
                        {statusesList.length === 0 && (
                          <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No statuses found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  );
                })() : (currentView !== 'blocks' && currentView !== 'props') ? (() => {
                  const itemsList = getSortedItems(currentView);
                  const hasDecayInfo = itemsList.some(i => i.decayInfo && i.decayInfo !== 'None') && currentView !== 'gear';
                  const hasSlots = itemsList.some(i => i.slots && i.slots !== 'None' && i.slots !== 'Inventory Only');
                  const hasDamage = itemsList.some(i => (i.maxDamage ?? 0) > 0);
                  const hasToughness = itemsList.some(i => (i.toughness ?? 0) > 0);
                  const hasIsEdible = itemsList.some(i => i.type === 'fruit' || i.type === 'vegetable' || i.type === 'fungus' || i.type === 'meat' || i.type === 'fish' || i.type === 'egg' || i.type === 'milk' || i.type === 'meal');
                  const colSpan = 10 + (hasDecayInfo ? 1 : 0) + (hasSlots ? 1 : 0) + (hasDamage ? 1 : 0) + (hasToughness ? 1 : 0) + (hasIsEdible ? 1 : 0);
                  
                  return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: theme === 'light' ? 'var(--bg-tertiary)' : '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Icon</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Name {itemsSort.field === 'name' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('type')}>Classification {itemsSort.field === 'type' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('rarity')}>Rarity {itemsSort.field === 'rarity' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        {hasDamage && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxDamage')}>Damage {itemsSort.field === 'maxDamage' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {(currentView === 'weapons' || currentView === 'tools' || currentView === 'books' || currentView === 'gear') && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxRange')}>Attack Range {itemsSort.field === 'maxRange' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {hasToughness && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('toughness')}>Toughness {itemsSort.field === 'toughness' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {currentView === 'seeds' && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('seasons')}>Grow Seasons {itemsSort.field === 'seasons' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {currentView === 'seeds' && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('growthTime')}>Growth Time {itemsSort.field === 'growthTime' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {currentView === 'seeds' && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('lifespan')}>Lifespan {itemsSort.field === 'lifespan' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {currentView === 'seeds' && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('minTemp')}>Min Temp {itemsSort.field === 'minTemp' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {currentView === 'seeds' && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxTemp')}>Max Temp {itemsSort.field === 'maxTemp' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {currentView === 'seeds' && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('growsIntoName')}>Grows Into {itemsSort.field === 'growsIntoName' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {hasSlots && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('slots')}>Slot {itemsSort.field === 'slots' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        {hasIsEdible && <th style={{ padding: '10px 8px', cursor: 'pointer' }}>Is Edible</th>}
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('actions')}>Effects {itemsSort.field === 'actions' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        {hasDecayInfo && <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('decayInfo')}>Decay Time {itemsSort.field === 'decayInfo' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>}
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('unlockResearch')}>Unlocked By {itemsSort.field === 'unlockResearch' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('recipe')}>Recipe {itemsSort.field === 'recipe' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('buyValue')}>Value {itemsSort.field === 'buyValue' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsList.map((item, index) => {
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
                                src={item.iconFilename ? `game_icons/${item.iconFilename}` : `game_icons/default.png`} 
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
                            {hasDamage && (
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-damage)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.attacksDetail && item.attacksDetail.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {item.attacksDetail.map((att, idx) => (
                                      <div key={idx} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{att.name}:</span> {att.minDamage}-{att.maxDamage}
                                      </div>
                                    ))}
                                  </div>
                                ) : (item.maxDamage > 0 ? `${item.minDamage}-${item.maxDamage}` : '-')}
                              </td>
                            )}
                            {(currentView === 'weapons' || currentView === 'tools' || currentView === 'books' || currentView === 'gear') && (
                              <td style={{ padding: '8px', fontWeight: 600, color: (item.isRanged || item.name?.toLowerCase().includes('dart') || item.id?.toLowerCase().includes('dart') || item.attacksDetail?.some(att => att.skill === 'range' || att.skill === 'magic' || att.range > 64)) ? 'var(--accent-cyan)' : 'var(--text-primary)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.attacksDetail && item.attacksDetail.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {item.attacksDetail.map((att, idx) => {
                                      const isRanged = att.skill === 'range' || att.skill === 'magic' || att.range > 64 || item.name?.toLowerCase().includes('dart') || item.id?.toLowerCase().includes('dart');
                                      return (
                                        <div key={idx} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: isRanged ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>{att.name}:</span> {att.range} {isRanged ? '(Ranged)' : '(Melee)'}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  item.maxRange > 0 ? (
                                    (item.isRanged || item.maxRange > 64 || item.name?.toLowerCase().includes('dart') || item.id?.toLowerCase().includes('dart')) ? (
                                      `${item.maxRange} (Ranged)`
                                    ) : (
                                      `${item.maxRange} (Melee)`
                                    )
                                  ) : '-'
                                )}
                              </td>
                            )}
                            {hasToughness && (
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-toughness)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.toughness > 0 ? `+${item.toughness}` : '-'}
                              </td>
                            )}
                            {currentView === 'seeds' && (
                              <td style={{ padding: '8px', fontWeight: 600 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {renderSeasons(item.seasons)}
                              </td>
                            )}
                            {currentView === 'seeds' && (
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.growthTime !== null ? (item.growthTime === -1 ? 'None' : item.growthTime) : '-'}
                              </td>
                            )}
                            {currentView === 'seeds' && (
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-highlight)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.lifespan !== null ? (item.lifespan === -1 ? 'Infinite' : item.lifespan) : '-'}
                              </td>
                            )}
                            {currentView === 'seeds' && (
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-highlight)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.minTemp !== null ? item.minTemp : '-'}
                              </td>
                            )}
                            {currentView === 'seeds' && (
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--tbl-highlight)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.maxTemp !== null ? item.maxTemp : '-'}
                              </td>
                            )}
                            {currentView === 'seeds' && (
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.growsIntoName ? (
                                  <span 
                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const targetItem = glossary.items.find(i => i.id === item.growsIntoItem);
                                      if (targetItem) setSelectedItem(targetItem);
                                    }}
                                  >
                                    {item.growsIntoName}
                                  </span>
                                ) : '-'}
                              </td>
                            )}
                            {hasSlots && (
                              <td style={{ padding: '8px', color: 'var(--text-secondary)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.slots && item.slots !== 'None' && item.slots !== 'Inventory Only' ? item.slots : '-'}
                              </td>
                            )}
                            {hasIsEdible && (
                              <td style={{ padding: '8px', fontWeight: 'bold', color: (item.actions && (item.actions.includes('Hunger') || item.actions.includes('Thirst') || item.actions.includes('Energy'))) ? 'var(--accent-cyan)' : 'var(--text-muted)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {(item.actions && (item.actions.includes('Hunger') || item.actions.includes('Thirst') || item.actions.includes('Energy'))) ? 'Yes' : 'No'}
                              </td>
                            )}
                            <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderEffectBadges(item.actions)}</td>
                            {hasDecayInfo && (
                              <td style={{ padding: '8px', color: 'var(--text-muted)' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                                {item.decayInfo && item.decayInfo !== 'None' && !item.decayInfo.includes(' -') ? (item.decayInfo.match(/\d+/) ? item.decayInfo.match(/\d+/)[0] : item.decayInfo) : '-'}
                              </td>
                            )}
                            <td style={{ padding: '8px', color: 'var(--tbl-highlight)', fontWeight: 500 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              {item.unlockResearchList && item.unlockResearchList.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {item.unlockResearchList.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <img 
                                        src={`game_icons/${r.iconFile}`} 
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
                            <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                              {renderRecipeCell(item.recipe)}
                            </td>
                            <td style={{ padding: '8px', color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.buyValue} Ren</td>
                          </tr>
                        );
                      })}
                      {itemsList.length === 0 && (
                        <tr>
                          <td colSpan={colSpan} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  );
                })() : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: theme === 'light' ? 'var(--bg-tertiary)' : '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('name')}>Icon</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('name')}>Name {blocksSort.field === 'name' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px' }}>Classification</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('unlockResearch')}>Unlocked By {blocksSort.field === 'unlockResearch' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('roomQuality')}>Room Quality {blocksSort.field === 'roomQuality' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                        <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('recipe')}>Recipe {blocksSort.field === 'recipe' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
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
                              src={block.iconFilename ? `game_icons/${block.iconFilename}` : `game_icons/default.png`} 
                              alt=""
                              style={{ width: '48px', height: '48px' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ fontWeight: 600 }}>{block.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{block.id}</div>
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                            {block.id.startsWith('prop_') ? 'Prop' : 'Block'}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--tbl-highlight)', fontWeight: 500 }}>
                            {block.unlockResearchList && block.unlockResearchList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {block.unlockResearchList.map((r, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <img 
                                      src={`game_icons/${r.iconFile}`} 
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
                          <td style={{ padding: '8px' }}>
                            {renderRecipeCell(block.recipe)}
                          </td>
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
                          <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No elements found.</td>
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
            {renderNPCInspector()}
            {renderStatusInspector()}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
