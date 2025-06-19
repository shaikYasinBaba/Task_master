// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors"); // ✅ Import CORS
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const app = express();

// ✅ Enable CORS for all origins (or specify your React frontend domain)
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());

// 🧱 Create tasks table if not exists
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY,
      title VARCHAR NOT NULL,
      description TEXT,
      status VARCHAR(20) NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
      dueDate DATE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
initDB();

// ✅ GET /tasks
app.get("/tasks", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tasks ORDER BY createdAt DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /tasks error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ POST /tasks
app.post("/tasks", async (req, res) => {
  try {
    const { title, description, status, dueDate } = req.body;
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = createdAt;

    const query = `
      INSERT INTO tasks (id, title, description, status, dueDate, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [id, title, description || null, status, dueDate || null, createdAt, updatedAt];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /tasks error:", err);
    res.status(500).json({ error: "Failed to add task" });
  }
});

// ✅ PUT /tasks/:id
app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body;
    const updatedAt = new Date();

    const query = `
      UPDATE tasks
      SET title=$1, description=$2, status=$3, dueDate=$4, updatedAt=$5
      WHERE id=$6
      RETURNING *;
    `;
    const values = [title, description || null, status, dueDate || null, updatedAt, id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) return res.status(404).json({ error: "Task not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /tasks/:id error:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// ✅ DELETE /tasks/:id
app.delete("/tasks/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM tasks WHERE id=$1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Task not found" });
    res.sendStatus(204);
  } catch (err) {
    console.error("DELETE /tasks/:id error:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`API running on http://localhost:${process.env.PORT || 3000}`);
});
