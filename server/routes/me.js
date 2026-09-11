const express = require("express");
const db = require("../config/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "This endpoint is for student accounts." });
  }

  const student = db
    .prepare(
      `SELECT u.id, u.name, u.username, u.phone, u.parent_phone,
              g.name as group_name
       FROM users u LEFT JOIN groups g ON g.id = u.group_id
       WHERE u.id = ?`
    )
    .get(req.user.id);

  const attendance = db
    .prepare("SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC")
    .all(req.user.id);

  const exams = db
    .prepare(
      "SELECT exam_name, degree, max_degree, date, notes FROM exams WHERE student_id = ? ORDER BY date DESC"
    )
    .all(req.user.id);

  const payments = db
    .prepare(
      "SELECT month, year, amount, paid, paid_date FROM payments WHERE student_id = ? ORDER BY year DESC, month DESC"
    )
    .all(req.user.id);

  const totalDays = attendance.length;
  const presentDays = attendance.filter((a) => a.status === "present").length;

  res.json({
    ...student,
    attendance,
    exams,
    payments,
    attendance_rate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null,
  });
});

module.exports = router;
