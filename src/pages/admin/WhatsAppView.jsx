import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";

const STATUS_LABELS = {
  initializing: "Starting up…",
  qr: "Scan the QR code below with WhatsApp on Mr. Hossam's phone",
  authenticated: "Phone authenticated — loading WhatsApp, please wait…",
  ready: "Connected — notifications will send automatically",
  disconnected:
    "Disconnected — check the connection error below, then reconnect when the session is available",
  auth_failure:
    "Authentication failed — reconnect to request a new QR code",
};

export default function WhatsAppView() {
  const [waData, setWaData] = useState({
    status: "initializing",
    qrDataUrl: null,
  });
  const [reconnecting, setReconnecting] = useState(false);
  const { toast } = useToast();

  const pollStatus = useCallback(async () => {
    try {
      const data = await api("/whatsapp/status");
      setWaData(data);
    } catch {
      // Ignore polling errors to prevent toast spam
    }
  }, []);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await api("/whatsapp/reconnect", { method: "POST" });
      toast("Reconnecting — a new QR code should appear in a few seconds.");
      pollStatus();
    } catch (err) {
      toast(err.message, false);
    } finally {
      setReconnecting(false);
    }
  };

  const showReconnectBtn =
    waData.status === "disconnected" || waData.status === "auth_failure";

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>WhatsApp connection</h2>
          <div className="sub">
            Needed to send parent notifications automatically.
          </div>
        </div>
      </div>

      <div className="panel card">
        <div id="wa-status" style={{ marginBottom: "16px" }}>
          <span className={`status-dot ${waData.status}`}></span>
          <span>{STATUS_LABELS[waData.status] || waData.status}</span>
          {waData.error && waData.status !== "ready" && (
            <div className="muted" style={{ marginTop: "8px", maxWidth: "700px" }}>
              {waData.error}
            </div>
          )}
          {showReconnectBtn && (
            <button
              className="btn"
              style={{ marginLeft: "12px" }}
              onClick={handleReconnect}
              disabled={reconnecting}
            >
              {reconnecting ? "Reconnecting…" : "Reconnect now"}
            </button>
          )}
        </div>

        {waData.status === "qr" && waData.qrDataUrl ? (
          <div className="qr-box" id="wa-qr-box">
            <img
              src={waData.qrDataUrl}
              width="260"
              height="260"
              alt="WhatsApp QR code"
            />
            <p
              className="muted"
              style={{
                fontSize: "13px",
                maxWidth: "320px",
                textAlign: "center",
              }}
            >
              Open WhatsApp on the phone that will send notifications → Settings
              → Linked devices → Link a device, then scan this code.
            </p>
          </div>
        ) : (
          <div id="wa-qr-box"></div>
        )}
      </div>
    </section>
  );
}
