import React, { useState, useEffect } from "react";
import StatCard from "../../components/StatCard";
import Modal from "../../components/Modal";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function OverviewView({ onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("overall");
  const [audience, setAudience] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [data, groupData] = await Promise.all([api("/students"), api("/groups")]);
        setStudents(data);
        setGroups(groupData);
      } catch (err) {
        toast(err.message, false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const sendReport = async () => {
    setSending(true);
    try {
      const result = await api("/whatsapp/reports", {
        method: "POST",
        body: {
          report_type: reportType,
          audience,
          student_id: audience === "student" ? Number(selectedStudentId) : undefined,
          group_id: audience === "group" ? Number(selectedGroupId) : undefined,
        },
      });
      toast(`Report sent to ${result.sent} parent${result.sent === 1 ? "" : "s"}.`);
      setReportOpen(false);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="empty-state">Loading overview…</div>;
  }

  const total = students.length;
  const avgAttendance =
    total === 0
      ? 0
      : Math.round(
          students.reduce((sum, s) => sum + (s.attendance_rate ?? 0), 0) / total
        );
  const unpaid = students.filter((s) => !s.paid_this_month).length;
  const matchingStudents = students.filter((student) =>
    student.name.toLowerCase().includes(studentSearch.trim().toLowerCase())
  );

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Overview</h2>
          <div className="sub">Everyone, at a glance.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setReportOpen(true)}>
          Send report
        </button>
      </div>

      <div className="stat-grid">
        <StatCard label="Total students" value={total} />
        <StatCard label="Average attendance" value={`${avgAttendance}%`} />
        <StatCard
          label="Unpaid this month"
          value={unpaid}
          coral={unpaid > 0}
        />
      </div>

      <div className="panel card">
        <div className="card-header">
          <h3>All students</h3>
        </div>
        {students.length === 0 ? (
          <div className="empty-state">
            No students yet. Add one from the Students tab.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>Attendance</th>
                <th>This month</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="student-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectStudent(s.id)}
                >
                  <td>{s.name}</td>
                  <td className="muted">{s.group_name || "—"}</td>
                  <td className="mono">
                    {s.attendance_rate === null ? "—" : `${s.attendance_rate}%`}
                  </td>
                  <td>
                    <span
                      className={`pill pill-${
                        s.paid_this_month ? "paid" : "unpaid"
                      }`}
                    >
                      {s.paid_this_month ? "paid" : "unpaid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={reportOpen} onClose={() => setReportOpen(false)} title="Send parent report" maxWidth={520}>
        <div className="field">
          <label htmlFor="report-type">Report type</label>
          <select id="report-type" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="overall">Overall report</option>
            <option value="payment">Payment report</option>
            <option value="attendance">Attendance report</option>
            <option value="exams">Exams report</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="report-audience">Send to</label>
          <select id="report-audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="all">All students</option>
            <option value="group">Students in a group</option>
            <option value="student">One student</option>
          </select>
        </div>
        {audience === "group" && (
          <div className="field">
            <label htmlFor="report-group">Group</label>
            <select id="report-group" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
              <option value="">Choose a group</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </div>
        )}
        {audience === "student" && (
          <div className="field">
            <label htmlFor="report-student-search">Search students</label>
            <input
              id="report-student-search"
              type="search"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by student name"
            />
            <label htmlFor="report-student" style={{ marginTop: "10px" }}>
              Student
            </label>
            <select id="report-student" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
              <option value="">Choose a student</option>
              {matchingStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
            {matchingStudents.length === 0 && <div className="muted" style={{ marginTop: "8px" }}>No students match this search.</div>}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn" type="button" onClick={() => setReportOpen(false)}>Cancel</button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={sendReport}
            disabled={sending || (audience === "student" && !selectedStudentId) || (audience === "group" && !selectedGroupId)}
          >
            {sending ? "Sending…" : "Send report"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
