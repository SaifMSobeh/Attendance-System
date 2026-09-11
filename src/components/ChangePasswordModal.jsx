import React, { useState } from "react";
import Modal from "./Modal";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/auth/change-password", {
        method: "PUT",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      toast("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      onClose();
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change password">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Current password</label>
          <input
            name="current_password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label>New password</label>
          <input
            name="new_password"
            type="password"
            required
            minLength={4}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={handleClose} disabled={loading}>
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
