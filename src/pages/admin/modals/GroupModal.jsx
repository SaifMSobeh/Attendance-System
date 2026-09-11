import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { api } from "../../../api";
import { useToast } from "../../../context/ToastContext";

export default function GroupModal({
  isOpen,
  onClose,
  group,
  onGroupSaved,
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [scheduleInfo, setScheduleInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name || "");
      setScheduleInfo(group.schedule_info || "");
    } else {
      setName("");
      setScheduleInfo("");
    }
  }, [group, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (group) {
        await api(`/groups/${group.id}`, {
          method: "PUT",
          body: { name, schedule_info: scheduleInfo },
        });
        toast("Group updated.");
      } else {
        await api("/groups", {
          method: "POST",
          body: { name, schedule_info: scheduleInfo },
        });
        toast("Group added.");
      }
      onClose();
      onGroupSaved();
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={group ? "Edit group" : "Add group"}
    >
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Group name</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Schedule (optional)</label>
          <input
            name="schedule_info"
            placeholder="e.g. Sun & Tue 5–7pm"
            value={scheduleInfo}
            onChange={(e) => setScheduleInfo(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
