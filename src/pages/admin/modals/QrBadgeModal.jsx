import React from "react";
import Modal from "../../../components/Modal";

export default function QrBadgeModal({ isOpen, onClose, qrData }) {
  if (!qrData) return null;

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${qrData.name} — QR badge</title></head>
      <body style="text-align:center; font-family:sans-serif; padding-top:60px;">
        <h2>${qrData.name}</h2>
        <img src="${qrData.qrDataUrl}" width="300" height="300" alt="QR badge" />
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${qrData.name}'s QR badge`}
    >
      <div className="qr-box">
        <img
          src={qrData.qrDataUrl}
          width="260"
          height="260"
          alt={`QR badge for ${qrData.name}`}
          id="badge-img"
        />
        <p
          className="muted"
          style={{ fontSize: "13px", textAlign: "center" }}
        >
          Print this and give it to the student. Scanning it in the "Scan
          attendance" tab marks them present and notifies their parent.
        </p>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Close
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          Print
        </button>
      </div>
    </Modal>
  );
}
