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

// Get the roster for a group on a given date, with today's marks if any (admin)
router.get("/roster", requireAuth, requireAdmin, (req, res) => {
  const { group_id, date } = req.query;
  if (!group_id || !date) {
    return res.status(400).json({ error: "group_id and date are required." });
  }

  const students = db
    .prepare(
      `SELECT id, name, parent_phone FROM users
       WHERE role = 'student' AND active = 1 AND group_id = ?
       ORDER BY name`
    )
    .all(group_id);

  const markStmt = db.prepare(
    "SELECT status FROM attendance WHERE student_id = ? AND date = ?"
  );

  const roster = students.map((s) => {
    const mark = markStmt.get(s.id, date);
    return { ...s, status: mark ? mark.status : null };
  });

  res.json(roster);
});

// Shared logic: record a mark, and if present, notify the parent on WhatsApp.
async function markAttendance(studentId, date, status) {
  db.prepare(
    `INSERT INTO attendance (student_id, date, status)
     VALUES (?, ?, ?)
     ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status, notified = 0`
  ).run(studentId, date, status);

  let whatsappResult = null;

  if (status === "present") {
    const student = db
      .prepare("SELECT name, parent_phone FROM users WHERE id = ?")
      .get(studentId);
    const admin = db
      .prepare("SELECT name FROM users WHERE role = 'admin' LIMIT 1")
      .get();

    if (student?.parent_phone) {
      const message = buildMessage(student.name, date, admin?.name || "your teacher");
      whatsappResult = await whatsapp.sendMessage(student.parent_phone, message);
      if (whatsappResult.ok) {
        db.prepare(
          "UPDATE attendance SET notified = 1 WHERE student_id = ? AND date = ?"
        ).run(studentId, date);
      }
    } else {
      whatsappResult = { ok: false, reason: "No parent WhatsApp number on file." };
    }
  }

  return whatsappResult;
}

// Mark attendance for one student on one date. Sends a WhatsApp message to the
// parent automatically when status is "present".
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { student_id, date, status } = req.body;
  if (!student_id || !date || !["present", "absent"].includes(status)) {
    return res
      .status(400)
      .json({ error: "student_id, date, and a valid status are required." });
  }

  const whatsappResult = await markAttendance(student_id, date, status);
  res.json({ ok: true, whatsapp: whatsappResult });
});

// Mark a student present by scanning their QR code. Always marks "present" —
// students aren't expected to check themselves out as absent.
router.post("/scan", requireAuth, requireAdmin, async (req, res) => {
  const { token, date } = req.body;
  if (!token || !date) {
    return res.status(400).json({ error: "token and date are required." });
  }

  const student = db
    .prepare(
      "SELECT id, name FROM users WHERE qr_token = ? AND role = 'student' AND active = 1"
    )
    .get(token);

  if (!student) {
    return res.status(404).json({ error: "This QR code doesn't match any active student." });
  }

  const already = db
    .prepare("SELECT status FROM attendance WHERE student_id = ? AND date = ?")
    .get(student.id, date);
  if (already?.status === "present") {
    return res.json({
      ok: true,
      student_name: student.name,
      already_marked: true,
      whatsapp: null,
    });
  }

  const whatsappResult = await markAttendance(student.id, date, "present");
  res.json({ ok: true, student_name: student.name, already_marked: false, whatsapp: whatsappResult });
});

// Full attendance history for one student (admin, or the student viewing their own)
router.get("/:studentId", requireAuth, (req, res) => {
  const studentId = Number(req.params.studentId);
  if (req.user.role !== "admin" && req.user.id !== studentId) {
    return res.status(403).json({ error: "Not authorized." });
  }
  const rows = db
    .prepare(
      "SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC"
    )
    .all(studentId);
  res.json(rows);
});

module.exports = router;
