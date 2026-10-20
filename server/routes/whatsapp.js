const express = require("express");
const db = require("../config/database");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const whatsapp = require("../services/whatsapp");

const router = express.Router();

router.get("/status", requireAuth, requireAdmin, (req, res) => {
  res.json(whatsapp.getStatus());
});

router.post("/reconnect", requireAuth, requireAdmin, (req, res) => {
  whatsapp.reconnectNow();
  res.json({ ok: true });
});

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildReportMessage(student, type, now) {
  const attendance = db
    .prepare("SELECT status FROM attendance WHERE student_id = ? ORDER BY date DESC")
    .all(student.id);
  const exams = db
    .prepare(
      "SELECT exam_name, degree, max_degree, date FROM exams WHERE student_id = ? ORDER BY date DESC"
    )
    .all(student.id);
  const payments = db.prepare(
    `SELECT month, year, SUM(amount) AS amount, 1 AS paid
     FROM (
       SELECT month, year, amount FROM payments WHERE student_id = ? AND paid = 1
       UNION ALL
       SELECT month, year, amount FROM payment_transactions WHERE student_id = ?
     ) GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 6`
  ).all(student.id, student.id);
  const present = attendance.filter((row) => row.status === "present").length;
  const attendanceRate = attendance.length
    ? `${Math.round((present / attendance.length) * 100)}%`
    : "No records";
  const currentPayment = payments.find(
    (payment) => payment.month === now.getMonth() + 1 && payment.year === now.getFullYear()
  );
  const lines = [`Hello,`, `Progress report for ${student.name}.`];

  if (type === "overall" || type === "attendance") {
    lines.push(`Attendance: ${present}/${attendance.length} sessions (${attendanceRate}).`);
  }
  if (type === "overall" || type === "payment") {
    lines.push(
      `Payment for ${monthNames[now.getMonth()]} ${now.getFullYear()}: ${
        currentPayment?.paid ? `paid (${currentPayment.amount})` : "unpaid"
      }.`
    );
    if (type === "payment" && payments.length > 1) {
      lines.push(
        `Recent payment records: ${payments
          .map((payment) => `${monthNames[payment.month - 1]} ${payment.year} ${payment.paid ? "paid" : "unpaid"}`)
          .join(", ")}.`
      );
    }
  }
  if (type === "overall" || type === "exams") {
    if (exams.length === 0) {
      lines.push("Exams: No exam records yet.");
    } else {
      lines.push(
        `Exams: ${exams
          .slice(0, 5)
          .map((exam) => `${exam.exam_name} ${exam.degree}/${exam.max_degree} (${exam.date})`)
          .join(", ")}.`
      );
    }
  }
  lines.push("Thank you.");
  return lines.join("\n");
}

router.post("/reports", requireAuth, requireAdmin, async (req, res) => {
  const { report_type: reportType, audience, student_id: studentId, group_id: groupId } = req.body;
  const validTypes = ["overall", "payment", "attendance", "exams"];
  const validAudiences = ["all", "group", "student"];
  if (!validTypes.includes(reportType) || !validAudiences.includes(audience)) {
    return res.status(400).json({ error: "Choose a valid report type and audience." });
  }
  if (audience === "student" && !studentId) {
    return res.status(400).json({ error: "Choose a student for this report." });
  }
  if (audience === "group" && !groupId) {
    return res.status(400).json({ error: "Choose a group for this report." });
  }

  const conditions = ["u.role = 'student'", "u.active = 1"];
  const params = [];
  if (audience === "student") {
    conditions.push("u.id = ?");
    params.push(Number(studentId));
  } else if (audience === "group") {
    conditions.push("u.group_id = ?");
    params.push(Number(groupId));
  }
  const students = db
    .prepare(
      `SELECT u.id, u.name, u.parent_phone
       FROM users u WHERE ${conditions.join(" AND ")} ORDER BY u.name`
    )
    .all(...params);
  if (students.length === 0) {
    return res.status(400).json({ error: "No active students match this selection." });
  }

  const now = new Date();
  const results = [];
  for (const student of students) {
    if (!student.parent_phone) {
      results.push({ name: student.name, ok: false, skipped: true, reason: "No parent WhatsApp number on file." });
      continue;
    }
    const result = await whatsapp.sendMessage(
      student.parent_phone,
      buildReportMessage(student, reportType, now)
    );
    results.push({ name: student.name, ok: result.ok, reason: result.reason || null });
  }

  res.json({
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok && !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length,
    results,
  });
});

module.exports = router;
