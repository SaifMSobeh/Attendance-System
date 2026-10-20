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

router.get("/:id/students", (req, res) => {
  db.expirePayments();
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  const group = db.prepare("SELECT id, name FROM groups WHERE id = ?").get(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found." });

  const students = db
    .prepare(
      `SELECT u.id, u.name, u.username, u.phone, u.parent_phone, u.monthly_fee,
              COALESCE(legacy.paid_amount, 0) + COALESCE(tx.transaction_amount, 0) AS total_paid
       FROM users u
       LEFT JOIN (
         SELECT student_id, SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) AS paid_amount
         FROM payments WHERE month = ? AND year = ? GROUP BY student_id
       ) legacy ON legacy.student_id = u.id
       LEFT JOIN (
         SELECT student_id, SUM(amount) AS transaction_amount
         FROM payment_transactions WHERE month = ? AND year = ? GROUP BY student_id
       ) tx ON tx.student_id = u.id
       WHERE u.role = 'student' AND u.active = 1 AND u.group_id = ?
       ORDER BY u.name`
    )
    .all(month, year, month, year, req.params.id)
    .map((student) => ({
      ...student,
      total_paid: Number(student.total_paid || 0),
      remaining: Math.max(Number(student.monthly_fee || 0) - Number(student.total_paid || 0), 0),
      paid_this_month: Number(student.monthly_fee || 0) > 0
        ? Number(student.total_paid || 0) >= Number(student.monthly_fee || 0)
        : Number(student.total_paid || 0) > 0,
    }));

  res.json({ ...group, students });
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
