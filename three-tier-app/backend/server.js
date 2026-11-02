const express = require('express');
const cors = require('cors');
const os = require('os');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 5000;
const DB = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'taskboard',
  port: Number(process.env.DB_PORT || 3306),
};

const app = express();
app.use(cors());
app.use(express.json());

let pool;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function initDb() {
  // MySQL container ko ready hone me time lagta hai, isliye retry loop
  for (let i = 1; i <= 30; i++) {
    try {
      const boot = await mysql.createConnection({
        host: DB.host, user: DB.user, password: DB.password, port: DB.port,
      });
      await boot.query(`CREATE DATABASE IF NOT EXISTS \`${DB.database}\``);
      await boot.end();

      pool = mysql.createPool({ ...DB, connectionLimit: 10 });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(160) NOT NULL,
          description TEXT,
          priority ENUM('low','medium','high') DEFAULT 'medium',
          status ENUM('todo','doing','done') DEFAULT 'todo',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM tasks');
      if (n === 0) {
        await pool.query(
          `INSERT INTO tasks (title, description, priority, status) VALUES
           ('Write Dockerfile for backend', 'Node 20 alpine, non-root user, healthcheck', 'high', 'doing'),
           ('Write docker-compose.yml', 'frontend + backend + db with a named volume', 'high', 'todo'),
           ('Push images to Docker Hub', 'Tag with version and latest', 'medium', 'todo'),
           ('Set up MySQL container', 'Env vars and persistent volume', 'medium', 'done')`
        );
      }
      console.log('Database ready');
      return;
    } catch (err) {
      console.log(`DB not ready (${i}/30): ${err.code || err.message}`);
      await sleep(2000);
    }
  }
  console.error('Could not connect to database. Exiting.');
  process.exit(1);
}

const ready = (req, res, next) =>
  pool ? next() : res.status(503).json({ error: 'Database is starting up' });

app.get('/api/health', async (req, res) => {
  let db = 'down';
  try { if (pool) { await pool.query('SELECT 1'); db = 'up'; } } catch (_) {}
  res.json({ api: 'up', db, host: os.hostname(), uptime: Math.round(process.uptime()) });
});

app.get('/api/tasks', ready, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC, id DESC');
  res.json(rows);
});

app.get('/api/stats', ready, async (req, res) => {
  const [rows] = await pool.query('SELECT status, COUNT(*) AS n FROM tasks GROUP BY status');
  const s = { todo: 0, doing: 0, done: 0 };
  rows.forEach((r) => (s[r.status] = r.n));
  res.json({ ...s, total: s.todo + s.doing + s.done });
});

app.post('/api/tasks', ready, async (req, res) => {
  const { title, description = '', priority = 'medium' } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const [r] = await pool.query(
    'INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)',
    [title.trim(), description.trim(), priority]
  );
  const [[row]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [r.insertId]);
  res.status(201).json(row);
});

app.patch('/api/tasks/:id', ready, async (req, res) => {
  const { status } = req.body;
  if (!['todo', 'doing', 'done'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', ready, async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`API listening on ${PORT}`));
initDb();
