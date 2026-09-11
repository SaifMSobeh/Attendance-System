const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "..", "data.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---- Schema ----------------------------------------------------------

db.exec(`
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  schedule_info TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  phone TEXT,
  parent_phone TEXT,
  group_id INTEGER,
  monthly_fee REAL DEFAULT 0,
  active INTEGER DEFAULT 1,
  qr_token TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  notified INTEGER DEFAULT 0,
  marked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  exam_name TEXT NOT NULL,
  degree REAL NOT NULL,
  max_degree REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  amount REAL NOT NULL,
  paid INTEGER DEFAULT 0,
  paid_date TEXT,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(student_id, month, year)
);
`);

// ---- Migration: add qr_token to databases created before this feature --
const crypto = require("crypto");

const existingColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!existingColumns.includes("qr_token")) {
  db.exec("ALTER TABLE users ADD COLUMN qr_token TEXT");
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_qr_token ON users(qr_token)");

// Backfill any student rows missing a token (new installs will have none yet, which is fine)
const missingToken = db
  .prepare("SELECT id FROM users WHERE role = 'student' AND (qr_token IS NULL OR qr_token = '')")
  .all();
const setToken = db.prepare("UPDATE users SET qr_token = ? WHERE id = ?");
for (const row of missingToken) {
  setToken.run(crypto.randomBytes(16).toString("hex"), row.id);
}

// ---- Seed default admin ----------------------------------------------

function seedAdmin() {
  const existing = db
    .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    .get();
  if (existing) return;

  const username = process.env.ADMIN_USERNAME || "hossam";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const name = process.env.ADMIN_NAME || "Hossam Mohammed";
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'admin')`
  ).run(name, username, hash);

  console.log(`Seeded admin account -> username: "${username}"`);
  console.log(
    `Set ADMIN_USERNAME / ADMIN_PASSWORD in your .env before first run to control this login.`
  );
}

seedAdmin();

module.exports = db;
