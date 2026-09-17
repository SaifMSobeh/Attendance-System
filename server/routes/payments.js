const express = require("express");
const db = require("../config/database");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const whatsapp = require("../services/whatsapp");

const router = express.Router();
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Overview of everyone's payment status for a given month/year (admin)
router.get("/overview", requireAuth, requireAdmin, (req, res) => {
  db.expirePayments();

  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!month || !year) {
    return res.status(400).json({ error: "month and year are required." });
  }

  const students = db
    .prepare(
      `SELECT id, name, monthly_fee FROM users WHERE role = 'student' AND active = 1 ORDER BY name`
    )
    .all();

  const payStmt = db.prepare(
    "SELECT id, paid, paid_date, amount FROM payments WHERE student_id = ? AND month = ? AND year = ?"
  );

  const result = students.map((s) => {
    const pay = payStmt.get(s.id, month, year);
    return {
      student_id: s.id,
      name: s.name,
      amount: pay ? pay.amount : s.monthly_fee,
      paid: pay ? !!pay.paid : false,
      paid_date: pay ? pay.paid_date : null,
    };
  });

  const search = String(req.query.search || "").trim().toLowerCase();
  const filtered = search
    ? result.filter((r) => r.name.toLowerCase().includes(search))
    : result;

  const totalReceived = result
    .filter((row) => row.paid)
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalRemaining = result
    .filter((row) => !row.paid)
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  if (req.user.is_co_admin) {
    return res.json({ rows: filtered, totals: null });
  }

  res.json({
    rows: filtered,
    totals: {
      expected: totalReceived + totalRemaining,
      received: totalReceived,
      remaining: totalRemaining,
    },
  });
});

// Mark a student's month as paid or unpaid (admin)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  db.expirePayments();

  const { student_id, month, year, amount, paid } = req.body;
  if (!student_id || !month || !year) {
    return res.status(400).json({ error: "student_id, month, and year are required." });
  }

  const paidDate = paid ? new Date().toISOString().slice(0, 10) : null;
  const existing = db
    .prepare("SELECT paid FROM payments WHERE student_id = ? AND month = ? AND year = ?")
    .get(student_id, month, year);

  db.prepare(
    `INSERT INTO payments (student_id, month, year, amount, paid, paid_date)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(student_id, month, year)
     DO UPDATE SET amount = excluded.amount, paid = excluded.paid, paid_date = excluded.paid_date`
  ).run(student_id, month, year, amount || 0, paid ? 1 : 0, paidDate);

  let whatsappResult = null;
  if (paid && !existing?.paid) {
    const student = db
      .prepare("SELECT name, parent_phone FROM users WHERE id = ? AND role = 'student'")
      .get(student_id);
    if (student?.parent_phone) {
      whatsappResult = await whatsapp.sendMessage(
        student.parent_phone,
        `Hello,\n${student.name}'s payment of ${amount || 0} for ${monthNames[Number(month) - 1]} ${year} has been received.\nThank you.`
      );
    } else {
      whatsappResult = { ok: false, reason: "No parent WhatsApp number on file." };
    }
  }

  res.json({ ok: true, whatsapp: whatsappResult });
});

// A single student's payment history (admin, or the student themselves)
router.get("/:studentId", requireAuth, (req, res) => {
  db.expirePayments();

  const studentId = Number(req.params.studentId);
  if (req.user.role !== "admin" && req.user.id !== studentId) {
    return res.status(403).json({ error: "Not authorized." });
  }
  const rows = db
    .prepare(
      "SELECT month, year, amount, paid, paid_date FROM payments WHERE student_id = ? ORDER BY year DESC, month DESC"
    )
    .all(studentId);
  res.json(rows);
});

module.exports = router;
