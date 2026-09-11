import React, { useState, useEffect, useCallback } from "react";
import GroupModal from "./modals/GroupModal";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function GroupsView() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalGroup, setModalGroup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const loadGroups = useCallback(async () => {
    try {
      const data = await api("/groups");
      setGroups(data);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Delete this group? Students in it will become unassigned.")) {
      return;
    }
    try {
      await api(`/groups/${groupId}`, { method: "DELETE" });
      toast("Group deleted.");
      loadGroups();
    } catch (err) {
      toast(err.message, false);
    }
  };

  const handleOpenAdd = () => {
    setModalGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group) => {
    setModalGroup(group);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="empty-state">Loading groups…</div>;
  }

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Groups</h2>
          <div className="sub">Class sections and schedules.</div>
        </div>
        <button
          className="btn btn-primary"
          id="add-group-btn"
          onClick={handleOpenAdd}
        >
          Add group
        </button>
      </div>

      <div className="panel card">
        {groups.length === 0 ? (
          <div className="empty-state">
            No groups yet. Add one to start organizing students.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Schedule</th>
                <th>Students</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td className="muted">{g.schedule_info || "—"}</td>
                  <td className="mono">{g.student_count}</td>
                  <td>
                    <button
                      className="btn"
                      style={{ marginRight: 8 }}
                      onClick={() => handleOpenEdit(g)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteGroup(g.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <GroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={modalGroup}
        onGroupSaved={loadGroups}
      />
    </section>
  );
}
