import React from 'react';

const Sidebar = ({ currentView, resetFilters }) => {
  return (
    <div className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">
          <img src="game_icons/sp_starting_loadout_survivor.png" style={{ width: '50px', height: '46px' }} alt="" />
        </div>
        <div>
          <div className="logo-text">Odd Glossary</div>
          <div className="logo-subtext">Explorer</div>
        </div>
      </div>

      <div className="nav-menu">
        {/* Alphabetical Left-Nav Sections */}
        <button 
          className={`nav-item ${currentView === 'animal_products' ? 'active' : ''}`}
          onClick={() => resetFilters('animal_products')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_milk_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Animal Products</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'beverages' ? 'active' : ''}`}
          onClick={() => resetFilters('beverages')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_health_potion_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Beverages</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'blocks' ? 'active' : ''}`}
          onClick={() => resetFilters('blocks')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_block_wood_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Blocks</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'books' ? 'active' : ''}`}
          onClick={() => resetFilters('books')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_tome_of_cooking_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Books &amp; Tomes</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'npcs' ? 'active' : ''}`}
          onClick={() => resetFilters('npcs')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_adult_crab_fa0.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Entities</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'produce' ? 'active' : ''}`}
          onClick={() => resetFilters('produce')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_apple_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Fruits &amp; Vegetables</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'fungus' ? 'active' : ''}`}
          onClick={() => resetFilters('fungus')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_boletus_mushroom_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Fungus</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'gear' ? 'active' : ''}`}
          onClick={() => resetFilters('gear')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_bronze_breastplate_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Gear &amp; Armor</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'materials' ? 'active' : ''}`}
          onClick={() => resetFilters('materials')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_iron_ingot_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Materials</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'meals' ? 'active' : ''}`}
          onClick={() => resetFilters('meals')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_apple_pie_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Meals</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'other' ? 'active' : ''}`}
          onClick={() => resetFilters('other')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_waste_rotten_food_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Other</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'props' ? 'active' : ''}`}
          onClick={() => resetFilters('props')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_iron_anvil_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Props</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'seeds' ? 'active' : ''}`}
          onClick={() => resetFilters('seeds')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_plant_beetroot_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Seeds</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'statuses' ? 'active' : ''}`}
          onClick={() => resetFilters('statuses')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_job_integrate_as_citizen_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Statuses &amp; Effects</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'tools' ? 'active' : ''}`}
          onClick={() => resetFilters('tools')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_iron_pickaxe_two_hand_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Tools</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'trinkets' ? 'active' : ''}`}
          onClick={() => resetFilters('trinkets')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_ren_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Trinkets</span>
        </button>
        <button 
          className={`nav-item ${currentView === 'weapons' ? 'active' : ''}`}
          onClick={() => resetFilters('weapons')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <img src="game_icons/sp_blade_of_brian_icon.png" style={{ width: '24px', height: '24px' }} alt="" />
          <span>Weapons</span>
        </button>

      </div>

      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '3px double var(--border-glass)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div>Explorer Version: 3.2.0</div>
        <div>Data Source: prepackaged</div>
        <div>Mode: 100% Serverless Offline</div>
      </div>
    </div>
  );
};

export default Sidebar;
