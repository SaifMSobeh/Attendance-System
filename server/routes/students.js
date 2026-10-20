const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const QRCode = require("qrcode");
const db = require("../config/database");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const whatsapp = require("../services/whatsapp");
const { formatCredentialMessage } = require("../services/credentialMessages");

const router = express.Router();
router.use(requireAuth, requireAdmin);

function slugUsername(name) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .join(".");
  return base || "student";
}

function uniqueUsername(name) {
  const base = slugUsername(name);
  let username = base;
  let n = 1;
  const exists = (u) =>
    db.prepare("SELECT id FROM users WHERE username = ?").get(u);
  while (exists(username)) {
    n += 1;
    username = `${base}${n}`;
  }
  return username;
}

function randomPassword() {
  return Math.random().toString(36).slice(-8);
}

// List all students with quick-glance stats (group, this month's payment, attendance rate)
router.get("/", (req, res) => {
  db.expirePayments();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const search = String(req.query.search || "").trim().toLowerCase();

  const students = db
    .prepare(
      `SELECT u.id, u.name, u.username, u.phone, u.parent_phone, u.monthly_fee,
              g.id as group_id, g.name as group_name
       FROM users u
       LEFT JOIN groups g ON g.id = u.group_id
       WHERE u.role = 'student' AND u.active = 1
       ORDER BY u.name`
    )
    .all();

  const attStmt = db.prepare(
    `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
     FROM attendance WHERE student_id = ?`
  );
  const payStmt = db.prepare(
    `SELECT paid FROM payments WHERE student_id = ? AND month = ? AND year = ?`
  );

  const result = students.map((s) => {
    const att = attStmt.get(s.id);
    const pay = payStmt.get(s.id, month, year);
    return {
      ...s,
      attendance_rate:
        att.total > 0 ? Math.round((att.present / att.total) * 100) : null,
      paid_this_month: pay ? !!pay.paid : false,
    };
  });

  const filtered = search
    ? result.filter((s) =>
        `${s.name} ${s.username} ${s.phone || ""} ${s.parent_phone || ""} ${s.group_name || ""}`
          .toLowerCase()
          .includes(search)
      )
    : result;

  res.json(filtered);
});

// Full profile for one student
router.get("/:id", (req, res) => {
  db.expirePayments();

  const student = db
    .prepare(
      `SELECT u.id, u.name, u.username, u.phone, u.parent_phone, u.monthly_fee,
              g.id as group_id, g.name as group_name
       FROM users u LEFT JOIN groups g ON g.id = u.group_id
       WHERE u.id = ? AND u.role = 'student'`
    )
    .get(req.params.id);

  if (!student) return res.status(404).json({ error: "Student not found." });

  const attendance = db
    .prepare(
      "SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC"
    )
    .all(req.params.id);

  const exams = db
    .prepare(
      "SELECT id, exam_name, degree, max_degree, date, notes FROM exams WHERE student_id = ? ORDER BY date DESC"
    )
    .all(req.params.id);

  const payments = db.prepare(
    `SELECT id, month, year, amount, paid, paid_date, NULL AS note, 'legacy' AS source
     FROM payments WHERE student_id = ?
     UNION ALL
     SELECT id, month, year, amount, 1 AS paid, paid_date, note, 'transaction' AS source
     FROM payment_transactions WHERE student_id = ?
     ORDER BY year DESC, month DESC, paid_date DESC, id DESC`
  ).all(req.params.id, req.params.id);

  const visiblePayments = req.user.is_co_admin
    ? payments.map(({ note, ...payment }) => payment)
    : payments;

  res.json({ ...student, attendance, exams, payments: visiblePayments });
});

// Create a new student (auto-generates login credentials)
router.post("/", async (req, res) => {
  const { name, phone, parent_phone, group_id, monthly_fee } = req.body;
  if (!name || !phone || !parent_phone) {
    return res
      .status(400)
      .json({ error: "Student name, student phone and parent WhatsApp number are required." });
  }

  const username = uniqueUsername(name);
  const password = randomPassword();
  const hash = bcrypt.hashSync(password, 10);
  const qrToken = crypto.randomBytes(16).toString("hex");

  const result = db
    .prepare(
      `INSERT INTO users (name, username, password_hash, role, phone, parent_phone, group_id, monthly_fee, qr_token)
       VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      username,
      hash,
      phone || null,
      parent_phone,
      group_id || null,
      monthly_fee || process.env.DEFAULT_MONTHLY_FEE || 0,
      qrToken
    );

  let whatsappResult = null;
  const studentPhone = String(phone || "").trim();
  if (studentPhone) {
    const message = formatCredentialMessage(username, password);
    whatsappResult = await whatsapp.sendMessage(studentPhone, message);
  }

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    password,
    whatsapp: whatsappResult || { ok: false, reason: "No student phone number on file." },
  });
});

router.put("/:id", (req, res) => {
  const { name, phone, parent_phone, group_id, monthly_fee } = req.body;
  if (!name || !phone || !parent_phone) {
    return res
      .status(400)
      .json({ error: "Student name, student phone and parent WhatsApp number are required." });
  }

  db.prepare(
    `UPDATE users SET name = ?, phone = ?, parent_phone = ?, group_id = ?, monthly_fee = ?
     WHERE id = ? AND role = 'student'`
  ).run(name.trim(), phone, parent_phone, group_id || null, monthly_fee || 0, req.params.id);
  res.json({ ok: true });
});

// Reset a student's password (e.g. if they forget it)
router.post("/:id/reset-password", (req, res) => {
  const password = randomPassword();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ? AND role = 'student'").run(
    hash,
    req.params.id
  );
  res.json({ password });
});

// Get a student's check-in QR code as an image, for printing / handing out as an ID card
router.get("/:id/qr", async (req, res) => {
  const student = db
    .prepare("SELECT id, name, qr_token FROM users WHERE id = ? AND role = 'student'")
    .get(req.params.id);
  if (!student) return res.status(404).json({ error: "Student not found." });

  if (!student.qr_token) {
    const token = crypto.randomBytes(16).toString("hex");
    db.prepare("UPDATE users SET qr_token = ? WHERE id = ?").run(token, student.id);
    student.qr_token = token;
  }

  // The QR encodes a check-in link the admin's scanner page reads and calls automatically.
  const checkinValue = student.qr_token;
  const qrDataUrl = await QRCode.toDataURL(checkinValue, { width: 400, margin: 2 });
  res.json({ name: student.name, token: student.qr_token, qrDataUrl });
});

// Deactivate (soft delete) a student
router.delete("/:id", (req, res) => {
  db.prepare("UPDATE users SET active = 0 WHERE id = ? AND role = 'student'").run(
    req.params.id
  );
  res.json({ ok: true });
});

module.exports = router;
