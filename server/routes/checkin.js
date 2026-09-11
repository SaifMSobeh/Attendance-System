const express = require("express");
const db = require("../config/database");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const whatsapp = require("../services/whatsapp");

const router = express.Router();

function buildMessage(studentName, date, teacherName) {
  return (
    `Hello,\n` +
    `This is to let you know that ${studentName} attended today's math session ` +
    `(${date}) with ${teacherName}.\n` +
    `Thank you.`
  );
}

// Called by the admin's scanner page when a student's QR badge is scanned.
// Kept behind requireAdmin so a leaked/guessed token alone isn't enough —
// you also need to be logged in as Mr. Hossam to trigger a check-in.
router.post("/:token", requireAuth, requireAdmin, async (req, res) => {
  const student = db
    .prepare("SELECT id, name, parent_phone FROM users WHERE qr_token = ? AND role = 'student' AND active = 1")
    .get(req.params.token);

  if (!student) {
    return res.status(404).json({ error: "This QR code doesn't match any active student." });
  }

  const date = new Date().toISOString().slice(0, 10);

  const already = db
    .prepare("SELECT status FROM attendance WHERE student_id = ? AND date = ?")
    .get(student.id, date);

  if (already?.status === "present") {
    return res.json({
      ok: true,
      alreadyCheckedIn: true,
      student: { id: student.id, name: student.name },
    });
  }

  db.prepare(
    `INSERT INTO attendance (student_id, date, status)
     VALUES (?, ?, 'present')
     ON CONFLICT(student_id, date) DO UPDATE SET status = 'present', notified = 0`
  ).run(student.id, date);

  let whatsappResult = null;
  if (student.parent_phone) {
    const admin = db.prepare("SELECT name FROM users WHERE role = 'admin' LIMIT 1").get();
    const message = buildMessage(student.name, date, admin?.name || "your teacher");
    whatsappResult = await whatsapp.sendMessage(student.parent_phone, message);
    if (whatsappResult.ok) {
      db.prepare("UPDATE attendance SET notified = 1 WHERE student_id = ? AND date = ?").run(
        student.id,
        date
      );
    }
  } else {
    whatsappResult = { ok: false, reason: "No parent WhatsApp number on file." };
  }

  res.json({
    ok: true,
    alreadyCheckedIn: false,
    student: { id: student.id, name: student.name },
    whatsapp: whatsappResult,
  });
});

module.exports = router;
