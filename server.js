import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Serve static assets
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/game_icons', express.static(path.join(__dirname, 'public', 'game_icons')));

// Serve precompiled glossary database of official game parameters
app.get('/api/game-data/glossary', (req, res) => {
  const dbPath = path.join(__dirname, 'src', 'glossary_database.json');
  if (fs.existsSync(dbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      return res.json(data);
    } catch (e) {
      console.error('Failed to parse glossary database:', e.message);
    }
  }
  return res.json({ items: [], blocks: [], craftingStations: [] });
});

// Fallback to serving the built index.html for standalone frontend routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Odd Realm Database Explorer production files not found. Run npm run build first.');
  }
});

app.listen(PORT, () => {
  console.log(`[Odd Realm Database Explorer] Backend running on http://localhost:${PORT}`);
});
