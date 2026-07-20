# Odd Realm Glossary Explorer - Project Summary

## Project Overview
This project is an interactive, web-based database explorer and glossary tool designed for players and modders of the game **Odd Realm**. It compiles extracted Unity game assets into a unified JSON schema, exposing items, blocks, props, entities (races), and statuses. The web application allows users to search, filter, inspect, and trace recipes, research requirements, and entity attributes.

---

## Technical Stack
*   **Database Compiler**: Node.js script (`build_database.js`) that parses Unity YAML `.asset` files, compiles them, maps sprites, and outputs `src/glossary_database.json`.
*   **Web Application**: React + Vite client-side app (`src/App.jsx`, `src/index.css`) designed to be fully serverless-capable for hosting on GitHub Pages.
*   **Local Backend Server**: Optional Express backend (`server.js`) that allows real-time local file sync for live mod development.

---

## Directory Structure
*   `src/`: Main React source files.
    *   `src/App.jsx`: Main interface logic, search/sort algorithms, and inspectors.
    *   `src/components/`: Reusable components (e.g. `Sidebar.jsx`, `Dashboard.jsx`).
    *   `src/glossary_database.json`: The compiled database of items, blocks, and entities.
*   `public/`: Static game icons, selection graphics, and the compiled `game_atlas.png`.
*   `game_asset_export/`: Directory containing raw Unity asset files (races, items, blocks, blueprints, research, and statuses) extracted from the game.
*   `documentation/`: Walkthroughs, AI handovers, and current project specifications.
