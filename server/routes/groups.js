const express = require("express");
const db = require("../config/database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/", (req, res) => {
  const groups = db
    .prepare(
      `SELECT g.*, COUNT(u.id) as student_count
       FROM groups g
       LEFT JOIN users u ON u.group_id = g.id AND u.role = 'student' AND u.active = 1
       GROUP BY g.id
       ORDER BY g.name`
    )
    .all();
  res.json(groups);
});

router.post("/", (req, res) => {
  const { name, schedule_info } = req.body;
  if (!name) return res.status(400).json({ error: "Group name is required." });
  try {
    const result = db
      .prepare("INSERT INTO groups (name, schedule_info) VALUES (?, ?)")
      .run(name.trim(), schedule_info || null);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: "A group with that name already exists." });
  }
});

router.put("/:id", (req, res) => {
  const { name, schedule_info } = req.body;
  db.prepare("UPDATE groups SET name = ?, schedule_info = ? WHERE id = ?").run(
    name,
    schedule_info || null,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM groups WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
