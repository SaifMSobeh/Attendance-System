import React from "react";
import Modal from "../../../components/Modal";

export default function StudentAddedModal({ isOpen, onClose, credentials }) {
  if (!credentials) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student added">
      <p className="muted">
        Give these login details to the student. They will not be shown again.
      </p>
      <div className="credentials-box">
        <div>
          <span className="k">Username: </span>
          <span className="v">{credentials.username}</span>
        </div>
        <div>
          <span className="k">Password: </span>
          <span className="v">{credentials.password}</span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
