import React, { useState, useEffect, useCallback } from "react";
import { api, todayStr } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function AttendanceView() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [applyingSession, setApplyingSession] = useState(false);
  const [sessionApplied, setSessionApplied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadGroups() {
      try {
        const data = await api("/groups");
        setGroups(data);
        if (data.length > 0) {
          setSelectedGroupId(String(data[0].id));
        }
      } catch (err) {
        toast(err.message, false);
      } finally {
        setLoadingGroups(false);
      }
    }
    loadGroups();
  }, [toast]);

  const loadRoster = useCallback(async (groupId, selectedDate) => {
    if (!groupId || !selectedDate) return;
    setLoadingRoster(true);
    try {
      const data = await api(
        `/attendance/roster?group_id=${groupId}&date=${selectedDate}`
      );
      setRoster(Array.isArray(data) ? data : []);
      setSessionApplied(Array.isArray(data) && data.some((student) => student.status));
    } catch (err) {
      toast(err.message, false);
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  }, [toast]);

  const applySession = async () => {
    if (!selectedGroupId || !date) return;
    setApplyingSession(true);
    try {
      await api("/attendance/session", {
        method: "POST",
        body: { group_id: Number(selectedGroupId), date },
      });
      setSessionApplied(true);
      await loadRoster(selectedGroupId, date);
      toast("Session applied to the selected group.");
    } catch (err) {
      toast(err.message, false);
    } finally {
      setApplyingSession(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId && date) {
      loadRoster(selectedGroupId, date);
    }
  }, [selectedGroupId, date, loadRoster]);

  const handleToggle = async (studentId, status) => {
    try {
      const result = await api("/attendance", {
        method: "POST",
        body: { student_id: studentId, date, status },
      });

      setRoster((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status } : s))
      );

      if (status === "present") {
          if (result.whatsapp?.already_sent) {
            toast("Marked present — parent was already notified for this session.");
          } else if (result.whatsapp?.ok) {
          toast("Marked present — parent notified on WhatsApp.");
        } else {
          toast(
            `Marked present, but WhatsApp message failed: ${
              result.whatsapp?.reason || "unknown reason"
            }`,
            false
          );
        }
      } else {
        toast("Marked absent.");
      }
    } catch (err) {
      toast(err.message, false);
      loadRoster(selectedGroupId, date);
    }
  };

  if (loadingGroups) {
    return <div className="empty-state">Loading…</div>;
  }

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Take attendance</h2>
          <div className="sub">
            Marking a student present notifies their parent on WhatsApp automatically.
          </div>
        </div>
      </div>

      <div className="panel card">
        <div className="toolbar" style={{ marginBottom: "18px" }}>
          <div>
            <label>Group</label>
            <select
              id="att-group"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              {groups.length === 0 ? (
                <option value="">No groups yet</option>
              ) : (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label>Date</label>
            <input
              type="date"
              id="att-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label>Apply session</label>
            <button
              type="button"
              className="btn btn-primary apply-session-btn"
              onClick={applySession}
              disabled={applyingSession || !selectedGroupId}
            >
              {applyingSession ? "Applying…" : "Apply to selected group"}
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">Create a group first.</div>
        ) : loadingRoster ? (
          <div className="empty-state">Loading roster…</div>
        ) : roster.length === 0 ? (
          <div className="empty-state">No students in this group yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent WhatsApp</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td className="muted mono">{s.parent_phone || "—"}</td>
                    <td>
                      <div className="attendance-toggle">
                        <button
                          type="button"
                          className={`present ${
                            s.status === "present" ? "active" : ""
                          }`}
                          onClick={() => handleToggle(s.id, "present")}
                          disabled={!sessionApplied}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`absent ${
                            s.status === "absent" ? "active" : ""
                          }`}
                          onClick={() => handleToggle(s.id, "absent")}
                          disabled={!sessionApplied}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
