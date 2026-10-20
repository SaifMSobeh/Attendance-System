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
    `SELECT COALESCE(SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END), 0) AS legacy_paid,
            MAX(paid_date) AS paid_date
     FROM payments WHERE student_id = ? AND month = ? AND year = ?`
  );
  const transactionStmt = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS transaction_paid, MAX(paid_date) AS paid_date FROM payment_transactions WHERE student_id = ? AND month = ? AND year = ?"
  );

  const result = students.map((s) => {
    const pay = payStmt.get(s.id, month, year);
    const transactions = transactionStmt.get(s.id, month, year);
    const totalPaid = Number(pay.legacy_paid || 0) + Number(transactions.transaction_paid || 0);
    const monthlyFee = Number(s.monthly_fee || 0);
    return {
      student_id: s.id,
      name: s.name,
      amount: totalPaid,
      total_paid: totalPaid,
      monthly_fee: monthlyFee,
      remaining: Math.max(monthlyFee - totalPaid, 0),
      paid: monthlyFee > 0 ? totalPaid >= monthlyFee : totalPaid > 0,
      paid_date: pay.paid_date || transactions.paid_date || null,
    };
  });

  const search = String(req.query.search || "").trim().toLowerCase();
  const filtered = search
    ? result.filter((r) => r.name.toLowerCase().includes(search))
    : result;

  const totalReceived = result
    .reduce((sum, row) => sum + Number(row.total_paid || 0), 0);
  const totalExpected = result
    .reduce((sum, row) => sum + Number(row.monthly_fee || 0), 0);
  const overExpected = result.reduce((sum, row) => {
    if (Number(row.monthly_fee || 0) <= 0) return sum;
    return sum + Math.max(Number(row.total_paid || 0) - Number(row.monthly_fee || 0), 0);
  }, 0);
  const totalRemaining = result
    .reduce((sum, row) => sum + Number(row.remaining || 0), 0);

  if (req.user.is_co_admin) {
    return res.json({ rows: filtered, totals: null });
  }

  res.json({
    rows: filtered,
    totals: {
      expected: totalExpected,
      received: totalReceived,
      remaining: totalRemaining,
      over_expected: overExpected,
    },
  });
});

// Record one payment installment for a student's month (admin)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  db.expirePayments();

  const { student_id, month, year, amount, note } = req.body;
  if (!student_id || !month || !year) {
    return res.status(400).json({ error: "student_id, month, and year are required." });
  }
  const paymentAmount = Number(amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ error: "A payment amount greater than zero is required." });
  }
  if (Number(month) < 1 || Number(month) > 12 || !Number.isInteger(Number(year))) {
    return res.status(400).json({ error: "A valid payment month and year are required." });
  }

  const student = db
    .prepare("SELECT name, parent_phone, monthly_fee FROM users WHERE id = ? AND role = 'student' AND active = 1")
    .get(student_id);
  if (!student) {
    return res.status(404).json({ error: "Active student not found." });
  }

  const legacyPaid = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS amount FROM payments WHERE student_id = ? AND month = ? AND year = ? AND paid = 1"
  ).get(student_id, month, year).amount;
  const transactionsPaid = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS amount FROM payment_transactions WHERE student_id = ? AND month = ? AND year = ?"
  ).get(student_id, month, year).amount;
  const remaining = Math.max(
    Number(student.monthly_fee || 0) - Number(legacyPaid || 0) - Number(transactionsPaid || 0),
    0
  );
  if (Number(student.monthly_fee || 0) > 0 && remaining <= 0) {
    return res.status(400).json({ error: "This month's tuition is already fully paid." });
  }
  if (remaining > 0 && paymentAmount > remaining + 0.001) {
    return res.status(400).json({ error: `Payment cannot exceed the remaining balance of ${remaining}.` });
  }

  db.prepare(
    `INSERT INTO payment_transactions (student_id, month, year, amount, note, paid_date)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(student_id, month, year, paymentAmount, String(note || "").trim() || null, new Date().toISOString().slice(0, 10));

  let whatsappResult = null;
  if (student?.parent_phone) {
    whatsappResult = await whatsapp.sendMessage(
      student.parent_phone,
      `Payment received for ${student.name}: ${paymentAmount}. Thank you.`
    );
  } else {
    whatsappResult = { ok: false, reason: "No parent WhatsApp number on file." };
  }

  res.json({ ok: true, whatsapp: whatsappResult, amount: paymentAmount });
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
      `SELECT month, year, amount, paid, paid_date, NULL AS note, 'legacy' AS source
       FROM payments WHERE student_id = ?
       UNION ALL
       SELECT month, year, amount, 1 AS paid, paid_date, note, 'transaction' AS source
       FROM payment_transactions WHERE student_id = ?
       ORDER BY year DESC, month DESC, paid_date DESC`
    )
    .all(studentId, studentId);
  res.json(rows);
});

module.exports = router;
