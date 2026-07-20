# Current App State & Specification Reference

This document summarizes the functional state, database overrides, and UI structural rules of the application.

---

## 1. Sidebar & Navigation
*   **Sections List**: All navigation categories are ordered alphabetically in the sidebar:
    1.  Beverages
    2.  Blocks
    3.  Books & Tomes
    4.  Dashboard
    5.  Entities (previously "NPCs & Creatures")
    6.  Fruits & Vegetables
    7.  Fungus
    8.  Gear & Armor
    9.  Materials
    10. Meats & Meals
    11. Other
    12. Props
    13. Seeds
    14. Statuses & Effects
    15. Tools
    16. Trinkets
    17. Weapons
*   **Sidebar Scroll**: The `.sidebar` container is height-constrained to the viewport (`100vh`) with `.nav-menu` using `overflow-y: auto` to allow all navigation links to be reachable on smaller screens.
*   **Entities Icon**: Uses the crab icon (`sp_adult_crab_fa0.png`) in the sidebar and top headers.

---

## 2. Table Column Configurations
### Entities Section
*   **Columns**: Icon, Name, Plural, Classification (Sapient/Animal/Creature), Becomes Adult, Becomes Elder, Description, Perks, Damage (Combined), Health, Speed, Evasion, View Distance, Toughness, Skills, Professions, Starting Gear, Value (Ren).
*   **Icons**: Set to double-size (`72px` width) with crisp, pixelated CSS rendering rules. Portals are mapped to `sp_adult_<race>_fa0.png` where available.
*   **Sorting**: Full support for all headers including the dynamic fields `becomesAdultAge` and `becomesElderAge` (handling numeric ordering).

### Statuses & Effects Section
*   **Columns**: Icon (circular colored badge featuring the name's first character), Name (bolded with the status's native `textColor`), Status ID (`font-mono`), Description, Discovery Hint (italicized).
*   **Sorting**: Support for sorting by Name, ID, Description, and Discovery Hint.

### Weapons Section
*   **Columns**: Icon, Name, Classification, Rarity, Damage (Combined as `AttName: min-max`), Attack Range, Toughness, Slot, Is Edible, Effects, Unlocked By, Recipe, Value (Ren).

### Other Item & Block Sections
*   Consistent sizing, border rendering, and color themes (`var(--tbl-highlight)`, `var(--tbl-damage)`, etc.) matching the dark/light modes.
*   **Header Removal**: Redundant local headers (title & description subtitles) and the `.content-header` class wrapper (background, border, padding) have been completely removed from all views. tables are now rendered with maximum screen height, sorted and searchable directly via global headers.

---

## 3. Database Overrides & Rules
*   **Purified Water (`item_water_purified`)**: Unlocked by research node **Glass-Work** (Icon: `sp_research_glass0.png`).
*   **Bucket of Water (`item_water`)**: Unlocked by research node **Wood-Work** (Icon: `sp_research_wood0.png`).

---

## 4. Reusable Inspectors
*   **Item & Block Inspectors**: Display raw fields and values dynamically using `Object.entries()`, excluding icon and description labels.
*   **Entities Inspector**: Standardized layout with raw key-value pairs (`namePlural`, `intelligence`, `health`, etc.) and mapped starting items linking directly to the Item Inspector. Custom emojis are completely stripped.
*   **Statuses Inspector**: Rendered with raw entries from `glossary_database.json`, styled with the status's custom inline text color.
