# Odd Realm Database Explorer

A web-based glossary and database tool for the game **Odd Realm**. Browse items, blocks, props, entities, statuses, recipes, and research trees compiled directly from the game's Unity asset files.

**Live site**: [awful-falafel.github.io/oddrealm-database](https://awful-falafel.github.io/oddrealm-database/)

## Getting Started

```bash
npm install
npm run dev        # Start Vite dev server
npm start          # Start backend + frontend together
```

## Updating the Database

1. Run `update_database.bat` to launch AssetRipper, export assets, and recompile the glossary.
2. Or manually: `npm run sync-game-data`

## Deploying to GitHub Pages

```bash
npm run deploy     # Builds and publishes to gh-pages branch
```

## Tech Stack

- **Frontend**: React + Vite
- **Database Compiler**: Node.js (`build_database.js`)
- **Backend** (optional): Express server for local live-sync

---

*This project is unaffiliated with the game Odd Realm or its developers.*
