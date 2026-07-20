# Walkthrough of Recent Technical Improvements

This document outlines the major recent refactoring and feature additions made to the Odd Realm database compilation and glossary explorer UI.

---

## 1. Extracted Blueprints for Recipes
*   `build_database.js` now scans all `Data/Blueprints/` asset files and extracts their `ResourceID` requirements.
*   It maps the internal tags (e.g. `tag_item_type_stone`) to human-readable generic names ("Any Stone") and assigns them a fallback icon (like `sp_stone_icon.png`).
*   Items, Blocks, and Crafting Stations in the glossary database now feature a `recipe` array, allowing items with multiple blueprints to show all of their valid recipes.

---

## 2. Fixed Research Node Icons
*   Instead of using a broken heuristic to guess the icon name, `build_database.js` now reads the corresponding `Data/Research/` `.asset` file to find its explicit `TooltipID`.
*   It dynamically maps this TooltipID back to the exact `.png` icon file, eliminating the "Basics" fallback bug for the majority of nodes.

---

## 3. Seed Yields & Grows Into Links
*   The database compiler now traverses from a Seed's plant action (`SpawnID`) to the corresponding `BlockPlants` asset file, and extracts what that plant drops when harvested (`tag_can_harvest`).
*   Added a new clickable "Grows Into" field in the Inspector UI for seeds. Clicking the crop (e.g., Apple) automatically updates the inspector to show the crop's details!

---

## 4. UI Rendering Updates
*   `App.jsx`'s `renderRecipeCell` function supports arrays of recipes. It renders the first recipe by default in the table view and indicates if alternative recipes exist (e.g., "+ 1 more recipe(s)").
*   Status sorting helper (`handleSortStatuses`) and list filter helper `getSortedStatuses()` were added to provide a fast and fully sortable Statuses & Effects category view.
*   Entities are now equipped with a **View Distance** column (`sight_range` starting attribute), fully sortable.
*   The app disclaims game/developer association in the sidebar footer cleanly.
