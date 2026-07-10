import React, { useState, useEffect } from 'react';
import prepackagedGlossary from './glossary_database.json';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, items, blocks, stations
  const [glossary, setGlossary] = useState(prepackagedGlossary);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
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

  // Items filtering & sorting logic
  const handleSortItems = (field) => {
    setItemsSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : true
    }));
  };

  const getFilteredItems = () => {
    if (!glossary.items) return [];
    
    return glossary.items.filter(item => {
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      
      const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;

      return matchesSearch && matchesType && matchesRarity;
    });
  };

  const getSortedItems = () => {
    const filtered = getFilteredItems();
    return [...filtered].sort((a, b) => {
      let valA = a[itemsSort.field] ?? '';
      let valB = b[itemsSort.field] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return itemsSort.asc ? -1 : 1;
      if (valA > valB) return itemsSort.asc ? 1 : -1;
      return 0;
    });
  };

  // Blocks filtering & sorting logic
  const handleSortBlocks = (field) => {
    setBlocksSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : true
    }));
  };

  const getFilteredBlocks = () => {
    if (!glossary.blocks) return [];

    return glossary.blocks.filter(block => {
      const matchesSearch = 
        block.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.id?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStation = 
        stationFilter === 'all' || 
        (stationFilter === 'station' && block.isStation) || 
        (stationFilter === 'block' && !block.isStation);

      return matchesSearch && matchesStation;
    });
  };

  const getSortedBlocks = () => {
    const filtered = getFilteredBlocks();
    return [...filtered].sort((a, b) => {
      let valA = a[blocksSort.field] ?? '';
      let valB = b[blocksSort.field] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return blocksSort.asc ? -1 : 1;
      if (valA > valB) return blocksSort.asc ? 1 : -1;
      return 0;
    });
  };

  // Unique item types and rarities helper
  const getItemTypes = () => {
    if (!glossary.items) return [];
    return [...new Set(glossary.items.map(item => item.type).filter(Boolean))];
  };

  const getItemRarities = () => {
    if (!glossary.items) return [];
    return [...new Set(glossary.items.map(item => item.rarity).filter(Boolean))];
  };

  return (
    <div className="app-container">
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
            className={`nav-item ${currentView === 'items' ? 'active' : ''}`}
            onClick={() => { setCurrentView('items'); setSearchQuery(''); setSelectedItem(null); }}
          >
            ⚔️ Items database
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
          <div>Explorer Version: 1.1.0</div>
          <div>Data Source: prepackaged</div>
          <div>Mode: 100% Serverless Offline</div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
            <div className="content-header" style={{ marginBottom: '32px' }}>
              <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', fontSize: '2.5rem', color: 'var(--accent-cyan)' }}>Odd Realm Game Database</h1>
              <p className="content-subtitle" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                Comprehensive reference catalog for official game parameters, item classifications, block properties, and crafting stations.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentView('items')}>
                <div style={{ fontSize: '2.5rem' }}>⚔️</div>
                <h3 className="card-title" style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>Items Catalog</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Browse armor, weapons, tools, resources, food, and seeds.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.items?.length || 0} Registered Items
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentView('blocks')}>
                <div style={{ fontSize: '2.5rem' }}>🧱</div>
                <h3 className="card-title" style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>Blocks & Props</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Inspect map terrain, building blocks, crop stages, and furniture objects.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.blocks?.length || 0} Registered Blocks
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentView('stations')}>
                <div style={{ fontSize: '2.5rem' }}>🛠️</div>
                <h3 className="card-title" style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>Crafting Stations</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>List of functional workshops where your settlers create goods.</p>
                <div style={{ marginTop: 'auto', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {glossary.craftingStations?.length || 0} Crafting Stations
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }}>📖 Database Usage Tips</h3>
              <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li><strong>Search Bar:</strong> Use the universal search bar in the item or block catalog tab to find entities instantly by name or ID.</li>
                <li><strong>Interactive Inspector:</strong> Click on any item or block in the tables to open a detailed properties sidebar.</li>
                <li><strong>Sort Columns:</strong> Click on column headers (such as Rarity, Value, Damage) to sort the catalogs dynamically.</li>
                <li><strong>Offline Capability:</strong> This app prepackages the game data directly. It is designed to work fully offline and serverless.</li>
              </ul>
            </div>
          </div>
        )}

        {/* VIEW: ITEMS DATABASE */}
        {currentView === 'items' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              <div className="content-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="content-title" style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-cyan)' }}>⚔️ Official Items database</h1>
                  <p className="content-subtitle" style={{ fontSize: '0.85rem' }}>Reference official weapon metrics, slot attachments, buy values, and stack sizes.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Types</option>
                    {getItemTypes().map(type => (
                      <option key={type} value={type}>{type.replace('tag_item_type_', '')}</option>
                    ))}
                  </select>
                  <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Rarities</option>
                    {getItemRarities().map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Search name or ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '220px', padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}
                  />
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
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('slots')}>Equip Slot</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('maxDamage')}>Dmg (Max)</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortItems('buyValue')}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedItems().map((item, index) => (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedItem(item)}
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          backgroundColor: selectedItem?.id === item.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ padding: '8px' }}>
                          <img 
                            src={item.iconFilename ? `/game_icons/${item.iconFilename}` : `/game_icons/default.png`} 
                            alt=""
                            style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.id}</div>
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{item.type.replace('tag_item_type_', '')}</td>
                        <td style={{ padding: '8px', fontWeight: 600, color: { common: '#9d9d9d', uncommon: '#1eff00', rare: '#0070ff', epic: '#a335ee', legendary: '#ff8000' }[item.rarity] || '#9d9d9d' }}>
                          {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                        </td>
                        <td style={{ padding: '8px', color: '#ffc233' }}>{item.slots}</td>
                        <td style={{ padding: '8px', fontWeight: 600, color: '#ff5555' }}>{item.maxDamage > 0 ? item.maxDamage : '-'}</td>
                        <td style={{ padding: '8px', color: 'var(--accent-cyan)' }}>{item.buyValue} Ren</td>
                      </tr>
                    ))}
                    {getSortedItems().length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No items match your search filters.</td>
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
                    <span style={{ color: 'var(--text-muted)' }}>Rarity:</span>
                    <span style={{ fontWeight: 600, color: { common: '#9d9d9d', uncommon: '#1eff00', rare: '#0070ff', epic: '#a335ee', legendary: '#ff8000' }[selectedItem.rarity] || '#9d9d9d' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Decay Rule:</span>
                    <span>{selectedItem.decayInfo}</span>
                  </div>
                  {selectedItem.maxDamage > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Min / Max Damage:</span>
                        <span style={{ color: '#ff5555', fontWeight: 'bold' }}>{selectedItem.minDamage} - {selectedItem.maxDamage} Dmg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Weapon Attack Type:</span>
                        <span>{selectedItem.attacks}</span>
                      </div>
                    </>
                  )}
                  {selectedItem.toughness > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Toughness (Armor):</span>
                      <span style={{ color: '#88aaff', fontWeight: 'bold' }}>+{selectedItem.toughness}</span>
                    </div>
                  )}
                  {selectedItem.actions && selectedItem.actions !== 'None' && (
                    <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Special Attributes:</div>
                      <div style={{ color: '#88ffaa', fontSize: '0.85rem' }}>
                        {selectedItem.actions.split(', ').filter(act => !act.includes('SourceID') && !act.includes('Source')).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
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
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
                    <option value="all">All Categories</option>
                    <option value="station">Crafting / Furniture</option>
                    <option value="block">Map blocks / Walls</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Search name or ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '220px', padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}
                  />
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--accent-cyan)', backgroundColor: '#1a140f', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 8px' }}>Icon</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('name')}>Name {blocksSort.field === 'name' ? (blocksSort.asc ? '▲' : '▼') : ''}</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('unlockResearch')}>Requirements</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('roomQuality')}>Room Quality</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('toughness')}>Toughness</th>
                      <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => handleSortBlocks('cost')}>Path Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedBlocks().map((block, index) => (
                      <tr 
                        key={block.id} 
                        onClick={() => setSelectedBlock(block)}
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          backgroundColor: selectedBlock?.id === block.id ? 'var(--accent-purple-glow)' : (index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'),
                          cursor: 'pointer'
                        }}
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
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{block.unlockResearch}</td>
                        <td style={{ padding: '8px', fontWeight: 600, color: 'var(--accent-cyan)' }}>+{block.roomQuality}</td>
                        <td style={{ padding: '8px', color: '#ff8888' }}>{block.toughness || '-'}</td>
                        <td style={{ padding: '8px' }}>{block.cost} pts</td>
                      </tr>
                    ))}
                    {getSortedBlocks().length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No blocks match your search filters.</td>
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
                    <span style={{ color: '#ffc233', fontWeight: 'bold' }}>{selectedBlock.unlockResearch}</span>
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
