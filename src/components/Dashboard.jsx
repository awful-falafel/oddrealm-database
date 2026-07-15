import React from 'react';
import { isWeapon, isShield, resourceTypes, getFilteredItemsBase } from '../utils/filterLogic';

const Dashboard = ({ glossary, resetFilters }) => {
  return (
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
            <img src="game_icons/sp_blade_of_brian_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Weapons</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Swords, bows, crossbows, practice daggers, and combat equipment.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(isWeapon).length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('tools')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_iron_pickaxe_two_hand_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Tools</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Axes, pickaxes, hammers, chisels, and harvesting implements.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => i.type === 'tool' && !isWeapon(i) && !isShield(i)).length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('gear')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_bronze_breastplate_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Armor & Gear</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Helmets, chestplates, boots, gauntlets, and defensive shields.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => (i.type === 'gear' || i.type === 'trinket') && i.id !== 'item_ren' && !isWeapon(i) && !isShield(i)).length || 0} Registered
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('animal_products')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_milk_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Animal Products</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Raw meats, fish, eggs, and milk.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => i.type === 'meat' || i.type === 'fish' || i.type === 'egg' || i.type === 'milk').length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('meals')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_apple_pie_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Meals</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Prepared dishes, baked pies, and stews.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => i.type === 'meal' || (i.name && i.name.toLowerCase() === 'teilic')).length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('produce')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_apple_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Fruits & Vegetables</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Apples, blueberries, broccoli, and other orchard or garden harvests.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => i.type === 'fruit' || i.type === 'vegetable' || (i.name && (i.name.toLowerCase() === 'rice' || i.name.toLowerCase() === 'tallow hay' || i.name.toLowerCase() === 'wheat'))).length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('books')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_tome_of_cooking_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Books & Tomes</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Written records, research tomes, and library materials.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => i.type === 'book').length || 0} Registered
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('fungus')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_boletus_mushroom_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Fungus</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mushrooms, caps, and ground fungus ingredients.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => i.type === 'fungus').length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('seeds')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_plant_beetroot_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
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
            <img src="game_icons/sp_iron_ingot_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Materials</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Wood blocks, metal ingots, ores, stones, and refining materials.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => resourceTypes.includes(i.type) && i.type !== 'seed' && i.type !== 'trinket' && i.id !== 'item_ren').length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('blocks')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_block_wood_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Blocks</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Terrain blocks, building walls, and structural elements.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.blocks?.filter(b => !b.id.startsWith('prop_')).length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('props')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_iron_anvil_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Props</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Workbenches, furniture, stoves, decorative props, and crafting units.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.blocks?.filter(b => b.id.startsWith('prop_')).length || 0} Registered
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('beverages')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_health_potion_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Beverages</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Potions, elixirs, alcohol, and thirst-quenching drinks.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {glossary.items?.filter(i => i.type === 'potion' || i.type === 'alcohol' || i.type === 'beverage' || i.type === 'water' || i.type === 'milk' || (i.actions && i.actions.toLowerCase().includes('thirst'))).length || 0} Registered
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }} onClick={() => resetFilters('other')}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass)', borderRadius: '4px', padding: '4px' }}>
            <img src="game_icons/sp_remains_rat_icon.png" style={{ width: '100%', height: '100%' }} alt="" />
          </div>
          <h3 className="card-title" style={{ color: 'var(--accent-cyan)', marginTop: '8px' }}>Other</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ren, miscellaneous creature drops, and leftover items.</p>
          <div style={{ marginTop: 'auto', fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {getFilteredItemsBase(glossary, 'other').length} Registered
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
