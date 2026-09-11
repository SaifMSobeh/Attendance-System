import React, { useState, useEffect, useCallback } from "react";
import AddStudentModal from "./modals/AddStudentModal";
import EditStudentModal from "./modals/EditStudentModal";
import StudentAddedModal from "./modals/StudentAddedModal";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function StudentsView({ onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [studentsData, groupsData] = await Promise.all([
        api("/students"),
        api("/groups"),
      ]);
      setStudents(studentsData);
      setGroups(groupsData);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrintAllQr = async () => {
    setIsPrinting(true);
    try {
      if (students.length === 0) {
        toast("No students to print yet.", false);
        return;
      }
      const badges = await Promise.all(
        students.map((s) => api(`/students/${s.id}/qr`))
      );

      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`
        <html>
        <head>
          <title>Student QR badges</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 24px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
            .badge { text-align: center; border: 1px solid #ccc; border-radius: 8px; padding: 16px; break-inside: avoid; }
            .badge img { width: 180px; height: 180px; }
            .badge h3 { margin: 10px 0 0; font-size: 15px; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${badges
              .map(
                (b) =>
                  `<div class="badge"><img src="${b.qrDataUrl}" /><h3>${b.name}</h3></div>`
              )
              .join("")}
          </div>
        </body>
        </html>
      `);
      w.document.close();
      w.print();
    } catch (err) {
      toast(err.message, false);
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading) {
    return <div className="empty-state">Loading students…</div>;
  }

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Students</h2>
          <div className="sub">Add students, assign groups, manage info.</div>
        </div>
        <div className="toolbar">
          <button
            className="btn"
            id="print-qr-btn"
            onClick={handlePrintAllQr}
            disabled={isPrinting}
          >
            {isPrinting ? "Preparing…" : "Print all QR codes"}
          </button>
          <button
            className="btn btn-primary"
            id="add-student-btn"
            onClick={() => setIsAddOpen(true)}
          >
            Add student
          </button>
        </div>
      </div>

      <div className="panel card">
        {students.length === 0 ? (
          <div className="empty-state">
            No students yet. Add one from the button above.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>Attendance</th>
                <th>This month</th>
                <th></th>
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
                  <td>
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStudent(s);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddStudentModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        groups={groups}
        onStudentAdded={(creds) => {
          loadData();
          setNewCredentials(creds);
        }}
      />

      <StudentAddedModal
        isOpen={!!newCredentials}
        onClose={() => setNewCredentials(null)}
        credentials={newCredentials}
      />

      <EditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        groups={groups}
        onStudentUpdated={() => {
          loadData();
        }}
      />
    </section>
  );
}
