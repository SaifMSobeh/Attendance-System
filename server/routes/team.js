const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const { requireAuth, requireOwner } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireOwner);

router.get("/", (req, res) => {
  const accounts = db
    .prepare(
      `SELECT id, name, username, active, created_at
       FROM users WHERE role = 'admin' AND is_co_admin = 1 ORDER BY name`
    )
    .all();
  res.json(accounts);
});

router.post("/", (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: "Name, username, and password are required." });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters." });
  }
  try {
    const result = db
      .prepare(
        `INSERT INTO users (name, username, password_hash, role, is_co_admin)
         VALUES (?, ?, ?, 'admin', 1)`
      )
      .run(String(name).trim(), String(username).trim(), bcrypt.hashSync(password, 10));
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: "That username is already in use." });
  }
});

router.delete("/:id", (req, res) => {
  db.prepare(
    "UPDATE users SET active = 0 WHERE id = ? AND role = 'admin' AND is_co_admin = 1"
  ).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;