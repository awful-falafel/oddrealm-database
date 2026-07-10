import React, { useState, useEffect } from 'react';
import prepackagedGlossary from './glossary_database.json';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, weapons, tools, gear, food, resources, blocks, stations
  const [glossary, setGlossary] = useState(prepackagedGlossary);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  
  const [highlightId, setHighlightId] = useState(null);
  const [hideSpoilers, setHideSpoilers] = useState(true);

  // Filters
  const [rarityFilter, setRarityFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');

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

  // Helper classification methods
  const isShield = (item) => {
    const name = (item.name || '').toLowerCase();
    const id = (item.id || '').toLowerCase();
    return name.includes('shield') || name.includes('buckler') || id.includes('shield') || id.includes('buckler');
  };

  const isWeapon = (item) => {
    if (item.type !== 'tool') return false;
    if (isShield(item)) return false;

    const name = (item.name || '').toLowerCase();
    const id = (item.id || '').toLowerCase();

    // Whitelist of weapon-specific keywords to separate them from gathering/production tools
    const weaponKeywords = [
      'sword', 'bow', 'crossbow', 'dagger', 'flail', 'spear', 'halberd', 'mace', 'club', 
      'atlatl', 'sling', 'bolas', 'whip', 'orb', 'scythe', 'staff', 'macuahuitl', 'gladius', 
      'kukri', 'blade', 'vanguard', 'thresk', 'rapier', 'greatsword', 'claymore', 'katana', 
      'lances', 'lance', 'trident', 'morningstar', 'cudgel', 'bastard', 'practice', 'atlatl', 
      'pointy stick', 'war axe', 'battle axe', 'battleaxe', 'warhammer', 'war hammer'
    ];

    return weaponKeywords.some(kw => name.includes(kw) || id.includes(kw));
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: '#9d9d9d',
      uncommon: '#1eff00',
      rare: '#0070ff',
      epic: '#a335ee',
      legendary: '#ff8000'
    };
    return colors[rarity] || '#9d9d9d';
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
          let view = 'resources';
          let icon = '📦';
          let label = 'Material';
          
          if (isWeapon(item)) {
            view = 'weapons';
            icon = '🗡️';
            label = 'Weapon';
          } else if (item.type === 'tool') {
            view = 'tools';
            icon = '⛏️';
            label = 'Tool';
          } else if (item.type === 'gear' || item.type === 'trinket' || isShield(item)) {
            view = 'gear';
            icon = '🛡️';
            label = 'Gear';
          } else if (foodTypes.includes(item.type)) {
            view = 'food';
            icon = '🍏';
            label = 'Food';
          }

          results.push({
            uniqueKey: `item-${item.id}`,
            id: item.id,
            name: item.name,
            type: 'item',
            view,
            icon,
            details: `${label} • ${item.rarity} • Unlocked by: ${item.unlockResearch || 'None'}`,
            data: item
          });
        }
      });
    }

    // 2. Search Blocks
    if (glossary.blocks) {
      glossary.blocks.forEach(block => {
        const blockText = `${block.name} ${block.id} ${block.unlockResearch} ${block.isStation ? 'station' : 'block'}`;
        if (testMatch(blockText)) {
          results.push({
            uniqueKey: `block-${block.id}`,
            id: block.id,
            name: block.name,
            type: 'block',
            view: 'blocks',
            icon: block.isStation ? '🛠️' : '🧱',
            details: `Block • ${block.isStation ? 'Crafting Station' : 'Terrain / Wall'} • Unlocked by: ${block.unlockResearch || 'None'}`,
            data: block
          });
        }
      });
    }

    // 3. Search Stations
    if (glossary.craftingStations) {
      glossary.craftingStations.forEach(station => {
        const stationText = `${station.name} ${station.id}`;
        if (testMatch(stationText)) {
          results.push({
            uniqueKey: `station-${station.id}`,
            id: station.id,
            name: station.name,
            type: 'station',
            view: 'stations',
            icon: '⚙️',
            details: `Workstation • ${station.id}`,
            data: station
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

  const getFilteredItems = (viewName) => {
    if (!glossary.items) return [];
    
    return glossary.items.filter(item => {
      const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;
      if (!matchesRarity) return false;

      if (viewName === 'weapons') return isWeapon(item);
      if (viewName === 'tools') return item.type === 'tool' && !isWeapon(item) && !isShield(item);
      if (viewName === 'gear') return item.type === 'gear' || item.type === 'trinket' || isShield(item);
      if (viewName === 'food') return foodTypes.includes(item.type);
      if (viewName === 'resources') return resourceTypes.includes(item.type);

      return false;
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

  const getFilteredBlocks = () => {
    if (!glossary.blocks) return [];

    return glossary.blocks.filter(block => {
      return stationFilter === 'all' || 
             (stationFilter === 'station' && block.isStation) || 
             (stationFilter === 'block' && !block.isStation);
    });
  };

  const getSortedBlocks = () => {
    const filtered = getFilteredBlocks();
    return [...filtered].sort((a, b) => {
      let valA = a[blocksSort.field] ?? '';
      let valB = b[blocksSort.field] ?? '';

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
          let badgeColor = 'rgba(255, 255, 255, 0.05)';
          let textColor = '#88ffaa';
          const lower = badge.toLowerCase();
          
          if (lower.includes('resist') || lower.includes('warmth') || lower.includes('cold')) {
            badgeColor = 'rgba(0, 150, 255, 0.15)';
            textColor = '#33aaff';
          } else if (lower.includes('speed') || lower.includes('haste')) {
            badgeColor = 'rgba(255, 200, 0, 0.15)';
            textColor = '#ffcc00';
          } else if (lower.includes('damage') || lower.includes('power') || lower.includes('attack') || lower.includes('strength')) {
            badgeColor = 'rgba(255, 80, 80, 0.15)';
            textColor = '#ff6666';
          } else if (lower.includes('health') || lower.includes('energy') || lower.includes('vitality') || lower.includes('mana')) {
            badgeColor = 'rgba(80, 255, 80, 0.15)';
            textColor = '#66ff66';
          } else if (lower.includes('armor') || lower.includes('defense') || lower.includes('toughness') || lower.includes('shield')) {
            badgeColor = 'rgba(200, 200, 200, 0.15)';
            textColor = '#cccccc';
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

  const foodTypes = ['meal', 'fruit', 'vegetable', 'meat', 'fish', 'fungus', 'alcohol', 'beverage', 'egg', 'milk', 'potion'];
  const resourceTypes = ['refined_material', 'ingot', 'ore', 'gem', 'stone', 'wood', 'seed', 'plant_material', 'animal_byproduct', 'remains', 'container', 'garbage', 'soil', 'trinket', 'OnJobDisposedTagObjectID'];

  return (
    <div className="app-container">
      <style>{`
        @keyframes row-flash {
          0% { background-color: rgba(0, 240, 255, 0.45); box-shadow: inset 0 0 12px rgba(0, 240, 255, 0.6); }
          40% { background-color: rgba(0, 240, 255, 0.2); box-shadow: inset 0 0 6px rgba(0, 240, 255, 0.3); }
          100% { background-color: transparent; box-shadow: none; }
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
          content: 'L E G E N D A R Y';
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
          box-shadow: 0 0 10px rgba(255, 128, 0, 0.15);
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
      `}</style>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">📚</div>
          <div>
            <div className="logo-text">Odd Realm</div>
            <div className="logo-subtext">Database Explorer</div>
          </div>
        </div>

        <div className="nav-menu">
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setCurrentView('dashboard'); setSearchQuery(''); }}
          >
            🏰 Dashboard
          </button>
          <button 
            className={`nav-item ${currentView === 'weapons' ? 'active' : ''}`}
            onClick={() => { setCurrentView('weapons'); setSearchQuery(''); setSelectedItem(null); setRarityFilter('all'); }}
          >
            🗡️ Weapons Database
          </button>
          <button 
            className={`nav-item ${currentView === 'tools' ? 'active' : ''}`}
            onClick={() => { setCurrentView('tools'); setSearchQuery(''); setSelectedItem(null); setRarityFilter('all'); }}
          >
            ⛏️ Tools Database
          </button>
          <button 
            className={`nav-item ${currentView === 'gear' ? 'active' : ''}`}
            onClick={() => { setCurrentView('gear'); setSearchQuery(''); setSelectedItem(null); setRarityFilter('all'); }}
          >
            🛡️ Armor & Gear
          </button>
          <button 
            className={`nav-item ${currentView === 'food' ? 'active' : ''}`}
            onClick={() => { setCurrentView('food'); setSearchQuery(''); setSelectedItem(null); setRarityFilter('all'); }}
          >
            🍏 Food & Potions
          </button>
          <button 
            className={`nav-item ${currentView === 'resources' ? 'active' : ''}`}
            onClick={() => { setCurrentView('resources'); setSearchQuery(''); setSelectedItem(null); setRarityFilter('all'); }}
          >
            📦 Materials & Seeds
          </button>
          <button 
            className={`nav-item ${currentView === 'blocks' ? 'active' : ''}`}
            onClick={() => { setCurrentView('blocks'); setSearchQuery(''); setSelectedBlock(null); }}
          >
            🧱 Blocks & Props
          </button>
          <button 
            className={`nav-item ${currentView === 'stations' ? 'active' : ''}`}
            onClick={() => { setCurrentView('stations'); setSearchQuery(''); }}
          >
            🛠️ Crafting Stations
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '3px double var(--border-glass)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div>Explorer Version: 1.9.0</div>
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
          <div style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-header)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {currentView === 'dashboard' && '🏰 Dashboard'}
            {currentView === 'weapons' && '🗡️ Weapons Database'}
            {currentView === 'tools' && '⛏️ Tools Database'}
            {currentView === 'gear' && '🛡️ Armor & Gear'}
            {currentView === 'food' && '🍏 Food & Potions'}
            {currentView === 'resources' && '📦 Materials & Seeds'}
            {currentView === 'blocks' && '🧱 Blocks & Props'}
            {currentView === 'stations' && '🛠️ Crafting Stations'}
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
                  backgroundColor: hideSpoilers ? '#ff8000' : '#9d9d9d',
                  boxShadow: hideSpoilers ? '0 0 6px #ff8000' : 'none'
                }} />
              </div>
              <span style={{ fontWeight: 600 }}>🔒 Blur Legendary Spoilers</span>
            </label>

            {/* Universal Search Container */}
            <div style={{ position: 'relative', width: '320px' }}>
              <input 
                type="text" 
                placeholder="Search anything... (e.g. \\+[0-9]\\sFishing)" 
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
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  zIndex: 100
                }}>
                  {searchResults.map(result => {
                    const isLegendary = result.data?.rarity === 'legendary';
                    const isBlurred = hideSpoilers && isLegendary;
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
                          <span style={{ fontSize: '1.25rem' }}>{result.icon}</span>
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
          </div>
        </div>

        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
            <div className="content-header" style={{ marginBottom: '32px' }}>
              <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', fontSize: '2.5rem', color: 'var(--accent-cyan)' }}>Odd Realm Game Database</h1>
              <p className="content-subtitle" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                Comprehensive reference catalog for official game parameters, item classifications, block properties, and crafting stations.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentView('weapons')}>
                <div style={{ fontSize: '2rem' }}>🗡️</div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)' }}>Weapons</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Swords, bows, crossbows, practice daggers, and combat equipment.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(isWeapon).length || 0} Registered Weapons
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentView('tools')}>
                <div style={{ fontSize: '2rem' }}>⛏️</div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)' }}>Tools</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Axes, pickaxes, hammers, chisels, and harvesting implements.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'tool' && !isWeapon(i) && !isShield(i)).length || 0} Registered Tools
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentView('gear')}>
                <div style={{ fontSize: '2rem' }}>🛡️</div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)' }}>Armor & Gear</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Helmets, chestplates, boots, gauntlets, and defensive shields.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => i.type === 'gear' || i.type === 'trinket' || isShield(i)).length || 0} Armor & Shield pieces
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentView('food')}>
                <div style={{ fontSize: '2rem' }}>🍏</div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)' }}>Food & Potions</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Prepared meals, drinks, alcohols, ingredients, and potions.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => foodTypes.includes(i.type)).length || 0} Consumables
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentView('resources')}>
                <div style={{ fontSize: '2rem' }}>📦</div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)' }}>Materials & Seeds</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Wood logs, metal ingots, ores, seeds, and raw ingredients.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.filter(i => resourceTypes.includes(i.type)).length || 0} Materials
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentView('blocks')}>
                <div style={{ fontSize: '2rem' }}>🧱</div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)' }}>Blocks & Props</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Terrain blocks, building walls, furniture, crops, and map layouts.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.blocks?.length || 0} Registered Blocks
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentView('stations')}>
                <div style={{ fontSize: '2rem' }}>🛠️</div>
                <h3 className="card-title" style={{ color: 'var(--accent-cyan)' }}>Crafting Stations</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Anvils, stoves, spinning wheels, workbenches, and stills.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.craftingStations?.length || 0} Workstations
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: WEAPONS DATABASE */}
        {currentView === 'weapons' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)' }}>🗡️ Weapons</h1>
                  <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>Weapons database. Displays physical damage ranges and attack parameters.</p>
                </div>
                <div>
                  <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Rarities</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 8px' }}>Icon</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Name {itemsSort.field === 'name' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('rarity')}>Rarity</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxDamage')}>Damage Range</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('toughness')}>Toughness</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('attacks')}>Attack Type</th>
                      <th style={{ padding: '10px 8px' }}>Effects / Attributes</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('unlockResearch')}>Unlocked By {itemsSort.field === 'unlockResearch' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('buyValue')}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedItems('weapons').map((item, index) => {
                      const isBlurred = hideSpoilers && item.rarity === 'legendary';
                      return (
                        <tr 
                          key={item.id} 
                          id={`row-${item.id}`}
                          onClick={() => setSelectedItem(item)}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            backgroundColor: selectedItem?.id === item.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                            cursor: 'pointer'
                          }}
                          className={`${highlightId === item.id ? 'flash-highlight' : ''} ${isBlurred ? 'spoiler-blurred-container' : ''}`}
                        >
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <img 
                              src={item.iconFilename ? `/game_icons/${item.iconFilename}` : `/game_icons/default.png`} 
                              alt=""
                              style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.id}</div>
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: getRarityColor(item.rarity) }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#ff5555' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.maxDamage > 0 ? `${item.minDamage}-${item.maxDamage}` : '-'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#88aaff' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.toughness > 0 ? `+${item.toughness}` : '-'}
                          </td>
                          <td style={{ padding: '8px', color: '#ffc233' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.attacks !== 'None' ? item.attacks : '-'}</td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderEffectBadges(item.actions)}</td>
                          <td style={{ padding: '8px', color: '#ffc233', fontWeight: 500 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.unlockResearchList && item.unlockResearchList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {item.unlockResearchList.map((r, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <img 
                                      src={`/game_icons/${r.iconFile}`} 
                                      alt="" 
                                      style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span>{r.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>{item.unlockResearch || 'None (Start)'}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.buyValue} Ren</td>
                        </tr>
                      );
                    })}
                    {getSortedItems('weapons').length === 0 && (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAIL DRAWER */}
            {selectedItem && (
              <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Item Inspector</span>
                  <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>

                {hideSpoilers && selectedItem.rarity === 'legendary' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', border: '1px dashed #ff8000', borderRadius: '8px', background: 'rgba(255, 128, 0, 0.03)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
                    <div style={{ fontWeight: 'bold', color: '#ff8000', fontSize: '0.9rem', marginBottom: '4px' }}>Legendary Spoiler Locked</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '0 20px', margin: 0 }}>
                      Uncheck the "Blur Legendary Spoilers" switch in the top header to inspect parameters.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '6px' }}>
                        <img src={selectedItem.iconFilename ? `/game_icons/${selectedItem.iconFilename}` : `/game_icons/default.png`} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} alt="" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedItem.name}</h2>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedItem.id}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                        <span>{isWeapon(selectedItem) ? 'Weapon' : selectedItem.type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Unlocked By:</span>
                        <span>
                          {selectedItem.unlockResearchList && selectedItem.unlockResearchList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              {selectedItem.unlockResearchList.map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <img 
                                    src={`/game_icons/${r.iconFile}`} 
                                    alt="" 
                                    style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{r.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{selectedItem.unlockResearch || 'None (Start)'}</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rarity:</span>
                        <span style={{ fontWeight: 600, color: getRarityColor(selectedItem.rarity) }}>
                          {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Value:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{selectedItem.buyValue} Ren</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Damage Range:</span>
                        <span style={{ color: '#ff5555', fontWeight: 'bold' }}>{selectedItem.minDamage} - {selectedItem.maxDamage} Dmg</span>
                      </div>
                      {selectedItem.attacks && selectedItem.attacks !== 'None' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Weapon Attack Type:</span>
                          <span style={{ color: '#ffc233' }}>{selectedItem.attacks}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Equip Slots:</span>
                        <span>{selectedItem.slots}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Stack Size:</span>
                        <span>{selectedItem.stackSize} items</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Toughness (Armor):</span>
                        <span style={{ color: '#88aaff', fontWeight: 'bold' }}>+{selectedItem.toughness}</span>
                      </div>
                      {selectedItem.actions && selectedItem.actions !== 'None' && (
                        <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Special Attributes:</div>
                          <div>{renderEffectBadges(selectedItem.actions)}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW: TOOLS DATABASE */}
        {currentView === 'tools' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)' }}>⛏️ Tools</h1>
                  <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>Spoons, pickaxes, axes, needles, chisels, and harvesting implements.</p>
                </div>
                <div>
                  <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Rarities</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 8px' }}>Icon</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Name {itemsSort.field === 'name' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('rarity')}>Rarity</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxDamage')}>Damage Range</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('toughness')}>Toughness</th>
                      <th style={{ padding: '10px 8px' }}>Effects / Attributes</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('unlockResearch')}>Unlocked By {itemsSort.field === 'unlockResearch' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('buyValue')}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedItems('tools').map((item, index) => {
                      const isBlurred = hideSpoilers && item.rarity === 'legendary';
                      return (
                        <tr 
                          key={item.id} 
                          id={`row-${item.id}`}
                          onClick={() => setSelectedItem(item)}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            backgroundColor: selectedItem?.id === item.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                            cursor: 'pointer'
                          }}
                          className={`${highlightId === item.id ? 'flash-highlight' : ''} ${isBlurred ? 'spoiler-blurred-container' : ''}`}
                        >
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <img 
                              src={item.iconFilename ? `/game_icons/${item.iconFilename}` : `/game_icons/default.png`} 
                              alt=""
                              style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.id}</div>
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: getRarityColor(item.rarity) }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#ff5555' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.maxDamage > 0 ? `${item.minDamage}-${item.maxDamage}` : '-'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#88aaff' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.toughness > 0 ? `+${item.toughness}` : '-'}
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderEffectBadges(item.actions)}</td>
                          <td style={{ padding: '8px', color: '#ffc233', fontWeight: 500 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.unlockResearchList && item.unlockResearchList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {item.unlockResearchList.map((r, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <img 
                                      src={`/game_icons/${r.iconFile}`} 
                                      alt="" 
                                      style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span>{r.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>{item.unlockResearch || 'None (Start)'}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.buyValue} Ren</td>
                        </tr>
                      );
                    })}
                    {getSortedItems('tools').length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAIL DRAWER */}
            {selectedItem && (
              <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Item Inspector</span>
                  <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>

                {hideSpoilers && selectedItem.rarity === 'legendary' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', border: '1px dashed #ff8000', borderRadius: '8px', background: 'rgba(255, 128, 0, 0.03)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
                    <div style={{ fontWeight: 'bold', color: '#ff8000', fontSize: '0.9rem', marginBottom: '4px' }}>Legendary Spoiler Locked</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '0 20px', margin: 0 }}>
                      Uncheck the "Blur Legendary Spoilers" switch in the top header to inspect parameters.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '6px' }}>
                        <img src={selectedItem.iconFilename ? `/game_icons/${selectedItem.iconFilename}` : `/game_icons/default.png`} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} alt="" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedItem.name}</h2>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedItem.id}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                        <span>Tool</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Unlocked By:</span>
                        <span>
                          {selectedItem.unlockResearchList && selectedItem.unlockResearchList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              {selectedItem.unlockResearchList.map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <img 
                                    src={`/game_icons/${r.iconFile}`} 
                                    alt="" 
                                    style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{r.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{selectedItem.unlockResearch || 'None (Start)'}</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rarity:</span>
                        <span style={{ fontWeight: 600, color: getRarityColor(selectedItem.rarity) }}>
                          {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Value:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{selectedItem.buyValue} Ren</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Stack Size:</span>
                        <span>{selectedItem.stackSize} items</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Equip Slots:</span>
                        <span>{selectedItem.slots}</span>
                      </div>
                      {selectedItem.actions && selectedItem.actions !== 'None' && (
                        <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Special Attributes:</div>
                          <div>{renderEffectBadges(selectedItem.actions)}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW: GEAR DATABASE */}
        {currentView === 'gear' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)' }}>🛡️ Armor & Gear</h1>
                  <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>Helmets, chestplates, greaves, boots, gauntlets, shields, and rings.</p>
                </div>
                <div>
                  <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Rarities</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 8px' }}>Icon</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Name {itemsSort.field === 'name' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('rarity')}>Rarity</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('slots')}>Equip Slot</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxDamage')}>Damage Range</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('toughness')}>Toughness</th>
                      <th style={{ padding: '10px 8px' }}>Effects / Attributes</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('unlockResearch')}>Unlocked By {itemsSort.field === 'unlockResearch' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('buyValue')}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedItems('gear').map((item, index) => {
                      const isBlurred = hideSpoilers && item.rarity === 'legendary';
                      return (
                        <tr 
                          key={item.id} 
                          id={`row-${item.id}`}
                          onClick={() => setSelectedItem(item)}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            backgroundColor: selectedItem?.id === item.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                            cursor: 'pointer'
                          }}
                          className={`${highlightId === item.id ? 'flash-highlight' : ''} ${isBlurred ? 'spoiler-blurred-container' : ''}`}
                        >
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <img 
                              src={item.iconFilename ? `/game_icons/${item.iconFilename}` : `/game_icons/default.png`} 
                              alt=""
                              style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.id}</div>
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: getRarityColor(item.rarity) }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                          </td>
                          <td style={{ padding: '8px', color: '#ffc233' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.slots}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#ff5555' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.maxDamage > 0 ? `${item.minDamage}-${item.maxDamage}` : '-'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#88aaff' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.toughness > 0 ? `+${item.toughness}` : '-'}</td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderEffectBadges(item.actions)}</td>
                          <td style={{ padding: '8px', color: '#ffc233', fontWeight: 500 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.unlockResearchList && item.unlockResearchList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {item.unlockResearchList.map((r, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <img 
                                      src={`/game_icons/${r.iconFile}`} 
                                      alt="" 
                                      style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span>{r.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>{item.unlockResearch || 'None (Start)'}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.buyValue} Ren</td>
                        </tr>
                      );
                    })}
                    {getSortedItems('gear').length === 0 && (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAIL DRAWER */}
            {selectedItem && (
              <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Item Inspector</span>
                  <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>

                {hideSpoilers && selectedItem.rarity === 'legendary' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', border: '1px dashed #ff8000', borderRadius: '8px', background: 'rgba(255, 128, 0, 0.03)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
                    <div style={{ fontWeight: 'bold', color: '#ff8000', fontSize: '0.9rem', marginBottom: '4px' }}>Legendary Spoiler Locked</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '0 20px', margin: 0 }}>
                      Uncheck the "Blur Legendary Spoilers" switch in the top header to inspect parameters.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '6px' }}>
                        <img src={selectedItem.iconFilename ? `/game_icons/${selectedItem.iconFilename}` : `/game_icons/default.png`} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} alt="" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedItem.name}</h2>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedItem.id}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                        <span>{selectedItem.type.replace('tag_item_type_', '')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Unlocked By:</span>
                        <span>
                          {selectedItem.unlockResearchList && selectedItem.unlockResearchList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              {selectedItem.unlockResearchList.map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <img 
                                    src={`/game_icons/${r.iconFile}`} 
                                    alt="" 
                                    style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{r.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{selectedItem.unlockResearch || 'None (Start)'}</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rarity:</span>
                        <span style={{ fontWeight: 600, color: getRarityColor(selectedItem.rarity) }}>
                          {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Value:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{selectedItem.buyValue} Ren</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Stack Size:</span>
                        <span>{selectedItem.stackSize} items</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Equip Slots:</span>
                        <span>{selectedItem.slots}</span>
                      </div>
                      {selectedItem.toughness > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Toughness (Armor):</span>
                          <span style={{ color: '#88aaff', fontWeight: 'bold' }}>+{selectedItem.toughness}</span>
                        </div>
                      )}
                      {selectedItem.actions && selectedItem.actions !== 'None' && (
                        <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Special Attributes:</div>
                          <div>{renderEffectBadges(selectedItem.actions)}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW: FOOD DATABASE */}
        {currentView === 'food' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)' }}>🍏 Food & Potions</h1>
                  <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>Prepared meals, drinks, alcohol, raw ingredients, and magical potions.</p>
                </div>
                <div>
                  <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Rarities</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 8px' }}>Icon</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Name {itemsSort.field === 'name' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('type')}>Type</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('rarity')}>Rarity</th>
                      <th style={{ padding: '10px 8px' }}>Decay Rule</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxDamage')}>Damage Range</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('toughness')}>Toughness</th>
                      <th style={{ padding: '10px 8px' }}>Effects / Attributes</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('unlockResearch')}>Unlocked By {itemsSort.field === 'unlockResearch' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('buyValue')}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedItems('food').map((item, index) => {
                      const isBlurred = hideSpoilers && item.rarity === 'legendary';
                      return (
                        <tr 
                          key={item.id} 
                          id={`row-${item.id}`}
                          onClick={() => setSelectedItem(item)}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            backgroundColor: selectedItem?.id === item.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                            cursor: 'pointer'
                          }}
                          className={`${highlightId === item.id ? 'flash-highlight' : ''} ${isBlurred ? 'spoiler-blurred-container' : ''}`}
                        >
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <img 
                              src={item.iconFilename ? `/game_icons/${item.iconFilename}` : `/game_icons/default.png`} 
                              alt=""
                              style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.id}</div>
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.type}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: getRarityColor(item.rarity) }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.decayInfo !== 'None' ? item.decayInfo : '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#ff5555' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.maxDamage > 0 ? `${item.minDamage}-${item.maxDamage}` : '-'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#88aaff' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.toughness > 0 ? `+${item.toughness}` : '-'}
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderEffectBadges(item.actions)}</td>
                          <td style={{ padding: '8px', color: '#ffc233', fontWeight: 500 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.unlockResearchList && item.unlockResearchList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {item.unlockResearchList.map((r, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <img 
                                      src={`/game_icons/${r.iconFile}`} 
                                      alt="" 
                                      style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span>{r.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>{item.unlockResearch || 'None (Start)'}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.buyValue} Ren</td>
                        </tr>
                      );
                    })}
                    {getSortedItems('food').length === 0 && (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAIL DRAWER */}
            {selectedItem && (
              <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Item Inspector</span>
                  <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>

                {hideSpoilers && selectedItem.rarity === 'legendary' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', border: '1px dashed #ff8000', borderRadius: '8px', background: 'rgba(255, 128, 0, 0.03)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
                    <div style={{ fontWeight: 'bold', color: '#ff8000', fontSize: '0.9rem', marginBottom: '4px' }}>Legendary Spoiler Locked</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '0 20px', margin: 0 }}>
                      Uncheck the "Blur Legendary Spoilers" switch in the top header to inspect parameters.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '6px' }}>
                        <img src={selectedItem.iconFilename ? `/game_icons/${selectedItem.iconFilename}` : `/game_icons/default.png`} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} alt="" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedItem.name}</h2>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedItem.id}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                        <span>{selectedItem.type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Unlocked By:</span>
                        <span>
                          {selectedItem.unlockResearchList && selectedItem.unlockResearchList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              {selectedItem.unlockResearchList.map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <img 
                                    src={`/game_icons/${r.iconFile}`} 
                                    alt="" 
                                    style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{r.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{selectedItem.unlockResearch || 'None (Start)'}</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rarity:</span>
                        <span style={{ fontWeight: 600, color: getRarityColor(selectedItem.rarity) }}>
                          {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Value:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{selectedItem.buyValue} Ren</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Stack Size:</span>
                        <span>{selectedItem.stackSize} items</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Decay Rule:</span>
                        <span>{selectedItem.decayInfo}</span>
                      </div>
                      {selectedItem.actions && selectedItem.actions !== 'None' && (
                        <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Special Attributes:</div>
                          <div>{renderEffectBadges(selectedItem.actions)}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW: RESOURCES DATABASE */}
        {currentView === 'resources' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)' }}>📦 Materials & Seeds</h1>
                  <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>Wood, ingots, raw ores, agricultural seeds, refined building materials, and drops.</p>
                </div>
                <div>
                  <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Rarities</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 8px' }}>Icon</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('name')}>Name {itemsSort.field === 'name' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('type')}>Classification</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('rarity')}>Rarity</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('stackSize')}>Stack Size</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxDamage')}>Damage Range</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('toughness')}>Toughness</th>
                      <th style={{ padding: '10px 8px' }}>Effects / Attributes</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('unlockResearch')}>Unlocked By {itemsSort.field === 'unlockResearch' ? (itemsSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('buyValue')}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedItems('resources').map((item, index) => {
                      const isBlurred = hideSpoilers && item.rarity === 'legendary';
                      return (
                        <tr 
                          key={item.id} 
                          id={`row-${item.id}`}
                          onClick={() => setSelectedItem(item)}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            backgroundColor: selectedItem?.id === item.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                            cursor: 'pointer'
                          }}
                          className={`${highlightId === item.id ? 'flash-highlight' : ''} ${isBlurred ? 'spoiler-blurred-container' : ''}`}
                        >
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <img 
                              src={item.iconFilename ? `/game_icons/${item.iconFilename}` : `/game_icons/default.png`} 
                              alt=""
                              style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.id}</div>
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.type.replace('tag_item_type_', '')}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: getRarityColor(item.rarity) }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.stackSize} items</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#ff5555' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.maxDamage > 0 ? `${item.minDamage}-${item.maxDamage}` : '-'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#88aaff' }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.toughness > 0 ? `+${item.toughness}` : '-'}
                          </td>
                          <td style={{ padding: '8px' }} className={isBlurred ? 'spoiler-blurred' : ''}>{renderEffectBadges(item.actions)}</td>
                          <td style={{ padding: '8px', color: '#ffc233', fontWeight: 500 }} className={isBlurred ? 'spoiler-blurred' : ''}>
                            {item.unlockResearchList && item.unlockResearchList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {item.unlockResearchList.map((r, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <img 
                                      src={`/game_icons/${r.iconFile}`} 
                                      alt="" 
                                      style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span>{r.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>{item.unlockResearch || 'None (Start)'}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--accent-cyan)' }} className={isBlurred ? 'spoiler-blurred' : ''}>{item.buyValue} Ren</td>
                        </tr>
                      );
                    })}
                    {getSortedItems('resources').length === 0 && (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAIL DRAWER */}
            {selectedItem && (
              <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Item Inspector</span>
                  <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>

                {hideSpoilers && selectedItem.rarity === 'legendary' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', border: '1px dashed #ff8000', borderRadius: '8px', background: 'rgba(255, 128, 0, 0.03)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
                    <div style={{ fontWeight: 'bold', color: '#ff8000', fontSize: '0.9rem', marginBottom: '4px' }}>Legendary Spoiler Locked</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '0 20px', margin: 0 }}>
                      Uncheck the "Blur Legendary Spoilers" switch in the top header to inspect parameters.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '6px' }}>
                        <img src={selectedItem.iconFilename ? `/game_icons/${selectedItem.iconFilename}` : `/game_icons/default.png`} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} alt="" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedItem.name}</h2>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedItem.id}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                        <span>{selectedItem.type.replace('tag_item_type_', '')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Unlocked By:</span>
                        <span>
                          {selectedItem.unlockResearchList && selectedItem.unlockResearchList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              {selectedItem.unlockResearchList.map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <img 
                                    src={`/game_icons/${r.iconFile}`} 
                                    alt="" 
                                    style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{r.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{selectedItem.unlockResearch || 'None (Start)'}</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rarity:</span>
                        <span style={{ fontWeight: 600, color: getRarityColor(selectedItem.rarity) }}>
                          {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Value:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{selectedItem.buyValue} Ren</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Stack Size:</span>
                        <span>{selectedItem.stackSize} items</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Decay Rule:</span>
                        <span>{selectedItem.decayInfo}</span>
                      </div>
                      {selectedItem.actions && selectedItem.actions !== 'None' && (
                        <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Special Attributes:</div>
                          <div>{renderEffectBadges(selectedItem.actions)}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW: BLOCKS & PROPS */}
        {currentView === 'blocks' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)' }}>🧱 Blocks & Props database</h1>
                  <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>Reference base game room quality, pathing movement costs, and research locks.</p>
                </div>
                <div>
                  <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Categories</option>
                    <option value="station">Crafting / Furniture</option>
                    <option value="block">Map blocks / Walls</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 8px' }}>Icon</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('name')}>Name {blocksSort.field === 'name' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('unlockResearch')}>Unlocked By {blocksSort.field === 'unlockResearch' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('roomQuality')}>Room Quality</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('toughness')}>Toughness</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('cost')}>Path Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedBlocks().map((block, index) => (
                      <tr 
                        key={block.id} 
                        id={`row-${block.id}`}
                        onClick={() => setSelectedBlock(block)}
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          backgroundColor: selectedBlock?.id === block.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                          cursor: 'pointer'
                        }}
                        className={highlightId === block.id ? 'flash-highlight' : ''}
                      >
                        <td style={{ padding: '8px' }}>
                          <img 
                            src={block.iconFilename ? `/game_icons/${block.iconFilename}` : `/game_icons/default.png`} 
                            alt=""
                            style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: 600 }}>{block.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{block.id}</div>
                        </td>
                        <td style={{ padding: '8px', color: '#ffc233', fontWeight: 500 }}>
                          {block.unlockResearchList && block.unlockResearchList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {block.unlockResearchList.map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <img 
                                    src={`/game_icons/${r.iconFile}`} 
                                    alt="" 
                                    style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <span>{r.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span>{block.unlockResearch || 'None (Start)'}</span>
                          )}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 600, color: 'var(--accent-cyan)' }}>+{block.roomQuality}</td>
                        <td style={{ padding: '8px', color: '#ff8888' }}>{block.toughness || '-'}</td>
                        <td style={{ padding: '8px' }}>{block.cost} pts</td>
                      </tr>
                    ))}
                    {getSortedBlocks().length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No blocks match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BLOCK DETAIL DRAWER */}
            {selectedBlock && (
              <div className="card" style={{ width: '380px', borderLeft: '2px solid var(--border-glass)', borderRadius: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Block Inspector</span>
                  <button onClick={() => setSelectedBlock(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '64px', height: '64px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '6px' }}>
                    <img src={selectedBlock.iconFilename ? `/game_icons/${selectedBlock.iconFilename}` : `/game_icons/default.png`} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} alt="" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-header)' }}>{selectedBlock.name}</h2>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{selectedBlock.id}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                    <span>{selectedBlock.isStation ? 'Crafting / Functional Prop' : 'Terrain Block / Wall'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Unlocked By:</span>
                    <span>
                      {selectedBlock.unlockResearchList && selectedBlock.unlockResearchList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {selectedBlock.unlockResearchList.map((r, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <img 
                                src={`/game_icons/${r.iconFile}`} 
                                      alt="" 
                                style={{ width: '16px', height: '16px', imageRendering: 'pixelated', borderRadius: '2px' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                              <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{r.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{selectedBlock.unlockResearch || 'None (Start)'}</span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Room Quality Contribution:</span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>+{selectedBlock.roomQuality} points</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Toughness (Durability):</span>
                    <span>{selectedBlock.toughness || '0'} pts</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Movement Path Cost:</span>
                    <span>{selectedBlock.cost} cost</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Atlas Coord (Texture):</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>({selectedBlock.textureX}, {selectedBlock.textureY})</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: CRAFTING STATIONS */}
        {currentView === 'stations' && (
          <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
            <div className="content-header" style={{ marginBottom: '24px' }}>
              <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)' }}>🛠️ Crafting Stations directory</h1>
              <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>Listing of functional stations in the game database where settlers construct items.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {glossary.craftingStations?.map(station => (
                <div key={station.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-glass)', padding: '16px' }}>
                  <div style={{ fontSize: '2rem' }}>⚙️</div>
                  <h4 style={{ fontFamily: 'var(--font-sans)', color: 'var(--accent-cyan)', fontSize: '1.1rem', margin: 0 }}>{station.name}</h4>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{station.id}</span>
                </div>
              ))}
              {(!glossary.craftingStations || glossary.craftingStations.length === 0) && (
                <div style={{ colSpan: 'all', color: 'var(--text-muted)', fontStyle: 'italic' }}>No crafting stations declared in database.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
