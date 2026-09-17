const express = require("express");
const QRCode = require("qrcode");
const db = require("../config/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  db.expirePayments();

  if (req.user.role !== "student") {
    return res.status(403).json({ error: "This endpoint is for student accounts." });
  }

  const student = db
    .prepare(
      `SELECT u.id, u.name, u.username, u.phone, u.parent_phone, u.qr_token,
              g.name as group_name
       FROM users u LEFT JOIN groups g ON g.id = u.group_id
       WHERE u.id = ?`
    )
    .get(req.user.id);

  if (!student.qr_token) {
    const token = require("crypto").randomBytes(16).toString("hex");
    db.prepare("UPDATE users SET qr_token = ? WHERE id = ?").run(token, req.user.id);
    student.qr_token = token;
  }

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
  const qrDataUrl = await QRCode.toDataURL(student.qr_token, { width: 280, margin: 2 });

  res.json({
    ...student,
    qrDataUrl,
    attendance,
    exams,
    payments,
    attendance_rate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null,
  });
});

module.exports = router;
