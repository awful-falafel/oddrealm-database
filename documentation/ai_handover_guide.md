# AI Handover Guide - Odd Realm Glossary Explorer

This guide is designed to help any incoming AI coding assistant take over development of this repository seamlessly.

---

## 1. Database Construction & Sync
The app's data is compiled from Unity game assets using a custom compilation pipeline in `build_database.js`.

*   **Source Data Location**: Raw decompiled Unity YAML files are located in `game_asset_export/ExportedProject/Assets/`.
    *   Items: `Resources_moved/Data/Items/`
    *   Blocks: `Resources_moved/Data/Blocks/`
    *   Races/Entities: `Resources_moved/Data/Races/` & `Resources_moved/Data/Entities/`
    *   Blueprints/Recipes: `Resources_moved/Data/Blueprints/`
    *   Research: `Resources_moved/Data/Research/`
    *   Status effects: `Resources_moved/Data/Statuses/` & `Resources_moved/Data/Tooltips/`
*   **Compiling/Building Database**: Run `npm run sync-game-data` (which runs `node sync_game_data.js` and updates the compiled `src/glossary_database.json`).

---

## 2. Dev Environment vs. Production Serverless Mode
The application can run in two modes:
1.  **Dev Mode (Local Server)**:
    *   Running `npm run dev` starts the Vite frontend.
    *   Running `npm start` starts the local Express server (`server.js`) on port 5000.
    *   The frontend detects if it is running on `localhost` or `127.0.0.1` and queries the express backend for real-time live database synchronization.
2.  **Serverless/Production Mode (GitHub Pages)**:
    *   To avoid **Private Network Access (PNA)** preflight browser prompts on public pages, the app restricts local fetch calls to local hostnames.
    *   If running on a public hostname (e.g. `awful-falafel.github.io`), the app skips the local fetch entirely and loads `src/glossary_database.json` statically (prepackaged), making it 100% serverless.

---

## 3. Deployment Protocol (GitHub Pages)
Due to Windows path length limits (`ENAMETOOLONG` error) when handling thousands of asset icons, `package.json` uses the `--add` option: `gh-pages -d dist -a`.

*   **Deploying Updates**:
    1.  Run `npm run build` to compile production assets.
    2.  Run `npm run deploy` to publish to the `gh-pages` branch.
*   **Fixing Pushed Unnecessary Files**: If the `gh-pages` branch accumulates raw source files (due to a previous incorrect deploy), you must clear the local gh-pages cache:
    1.  Delete the remote `gh-pages` branch on GitHub: `git push origin --delete gh-pages`
    2.  Delete the local cache directory: `Remove-Item -Path "node_modules\.cache\gh-pages" -Recurse -Force`
    3.  Run `npm run deploy` to push a clean deployment.

---

## 4. UI Patterns & Styling
*   **Design system**: Centralized styling variables are defined in `src/index.css` (supporting dark/light theme classes).
*   **Category Filters**: Category titles, descriptions, and dropdown filter containers have been completely removed from list tables to maximize vertical table area.
*   **Inspectors**: Component inspectors (Items, Blocks, Entities, Statuses) render dynamically in the right pane by iterating through `Object.entries()`, stripping raw Unity YAML prefixes and internal formatting tags.
