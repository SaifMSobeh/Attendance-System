const express = require("express");
const db = require("../config/database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { student_id, exam_name, degree, max_degree, date, notes } = req.body;
  if (!student_id || !exam_name || degree == null || !max_degree || !date) {
    return res.status(400).json({ error: "Missing required exam fields." });
  }
  const result = db
    .prepare(
      `INSERT INTO exams (student_id, exam_name, degree, max_degree, date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(student_id, exam_name, degree, max_degree, date, notes || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const { exam_name, degree, max_degree, date, notes } = req.body;
  db.prepare(
    `UPDATE exams SET exam_name = ?, degree = ?, max_degree = ?, date = ?, notes = ?
     WHERE id = ?`
  ).run(exam_name, degree, max_degree, date, notes || null, req.params.id);
  res.json({ ok: true });
});

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  db.prepare("DELETE FROM exams WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/:studentId", requireAuth, (req, res) => {
  const studentId = Number(req.params.studentId);
  if (req.user.role !== "admin" && req.user.id !== studentId) {
    return res.status(403).json({ error: "Not authorized." });
  }
  const rows = db
    .prepare(
      "SELECT id, exam_name, degree, max_degree, date, notes FROM exams WHERE student_id = ? ORDER BY date DESC"
    )
    .all(studentId);
  res.json(rows);
});

module.exports = router;
