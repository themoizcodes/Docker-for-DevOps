const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "appdb",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// DB container start hone me time lagta hai, isliye retry
async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await mysql.createPool(dbConfig).getConnection();
    } catch (e) {
      console.log(`DB not ready (${i + 1}/${retries}): ${e.message}`);
      await sleep(delay);
    }
  }
  throw new Error("Could not connect to DB");
}

let pool;

async function init() {
  const conn = await connectWithRetry();
  await conn.query(`CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  conn.release();
  pool = mysql.createPool(dbConfig);
}

app.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM messages ORDER BY id DESC");
  const items = rows.map((m) => `<li>${m.text} <small>(${m.created_at})</small></li>`).join("");
  res.send(`
    <h2>Node + MySQL (two-tier)</h2>
    <form method="post" action="/add">
      <input name="text" placeholder="message likho" required>
      <button>Save</button>
    </form>
    <ul>${items}</ul>`);
});

app.post("/add", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  await pool.query("INSERT INTO messages (text) VALUES (?)", [text]);
  res.redirect("/");
});

app.get("/api/messages", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM messages ORDER BY id DESC");
  res.json(rows);
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

init().then(() => {
  app.listen(3000, "0.0.0.0", () => console.log("Node app on :3000"));
});
