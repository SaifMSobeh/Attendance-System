const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('./database');
const attendanceRouter = require('../routes/attendance');
const { formatCredentialMessage } = require('../services/credentialMessages');

test('adds one calendar month from an ISO date without drifting the day', () => {
  assert.equal(db.addOneMonthToIsoDate('2026-10-09'), '2026-11-09');
  assert.equal(db.addOneMonthToIsoDate('2026-01-01'), '2026-02-01');
  assert.equal(db.addOneMonthToIsoDate('2026-01-31'), '2026-02-28');
});

test('formats a student login credential message for WhatsApp', () => {
  const msg = formatCredentialMessage('alpha.student', 'abc12345');
  assert.match(msg, /alpha.student/i);
  assert.match(msg, /abc12345/i);
  assert.match(msg, /username/i);
  assert.match(msg, /password/i);
});

test('hydrates a selected attendance session date into absent rows for all active students in a group', () => {
  const date = '2026-09-15';
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const groupName = `test-session-${suffix}`;
  const groupId = db.prepare('INSERT INTO groups (name) VALUES (?)').run(groupName).lastInsertRowid;
  const studentIds = [];
  try {
    const studentOne = db.prepare(
      `INSERT INTO users (name, username, password_hash, role, group_id, active)
       VALUES (?, ?, ?, 'student', ?, 1)`
    ).run(`Test Session One ${suffix}`, `testsessionone${suffix}`, 'hash', groupId);
    studentIds.push(studentOne.lastInsertRowid);
    const studentTwo = db.prepare(
      `INSERT INTO users (name, username, password_hash, role, group_id, active)
       VALUES (?, ?, ?, 'student', ?, 1)`
    ).run(`Test Session Two ${suffix}`, `testsessiontwo${suffix}`, 'hash', groupId);
    studentIds.push(studentTwo.lastInsertRowid);

    attendanceRouter.ensureGroupSessionAbsences(groupId, date);

    const rows = db.prepare(
      `SELECT student_id, date, status FROM attendance
       WHERE date = ? AND student_id IN (?, ?) ORDER BY student_id`
    ).all(date, ...studentIds);

    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => r.status), ['absent', 'absent']);
  } finally {
    const cleanup = db.transaction(() => {
      if (studentIds.length) {
        const deleteStudents = db.prepare('DELETE FROM users WHERE id = ?');
        studentIds.forEach((studentId) => deleteStudents.run(studentId));
      }
      db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
    });
    cleanup();
  }
});
