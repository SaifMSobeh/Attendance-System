import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api, todayStr } from "../../api";

export default function ScanView() {
  const [date, setDate] = useState(todayStr());
  const [scanResult, setScanResult] = useState(null);
  const containerRef = useRef(null);
  const scanLockedRef = useRef(false);
  const dateRef = useRef(date);
  dateRef.current = date;

  useEffect(() => {
    let isMounted = true;
    let scannerInstance = null;
    let isScanning = false;

    if (!containerRef.current) return;

    // Create a dedicated inner DOM node for Html5Qrcode to mutate.
    // This prevents React's reconciliation engine from encountering unexpected child nodes on unmount.
    const readerDiv = document.createElement("div");
    const readerId = "qr-reader-" + Math.random().toString(36).substring(2, 9);
    readerDiv.id = readerId;
    containerRef.current.appendChild(readerDiv);

    async function startScanner() {
      try {
        scannerInstance = new Html5Qrcode(readerId);

        if (!isMounted) {
          cleanUp();
          return;
        }

        await scannerInstance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            if (scanLockedRef.current) return;
            scanLockedRef.current = true;
            setScanResult({ type: "loading", message: "Checking in…" });

            const currentDate = dateRef.current || todayStr();
            try {
              const result = await api("/attendance/scan", {
                method: "POST",
                body: { token: decodedText, date: currentDate },
              });

              if (!isMounted) return;

              if (result.already_marked) {
                setScanResult({
                  type: "present",
                  message: `${result.student_name} — already marked present today`,
                });
              } else if (result.whatsapp?.already_sent) {
                setScanResult({
                  type: "present",
                  message: `${result.student_name} marked present — parent was already notified`,
                });
              } else if (result.whatsapp?.ok) {
                setScanResult({
                  type: "present",
                  message: `${result.student_name} marked present — parent notified`,
                });
              } else {
                setScanResult({
                  type: "present-warning",
                  studentName: result.student_name,
                  reason: result.whatsapp?.reason || "not sent",
                });
              }
            } catch (err) {
              if (!isMounted) return;
              setScanResult({
                type: "error",
                message: err.message || "Failed to record attendance.",
              });
            }

            setTimeout(() => {
              scanLockedRef.current = false;
            }, 2500);
          },
          () => {
            // Ignore frame-by-frame no-QR detections
          }
        );

        isScanning = true;

        if (!isMounted) {
          cleanUp();
        }
      } catch (err) {
        if (!isMounted) return;
        setScanResult({
          type: "camera-error",
          message: `Couldn't access the camera: ${
            err?.message || err
          }. Make sure you allowed camera access and are on http://localhost or https.`,
        });
      }
    }

    function cleanUp() {
      if (scannerInstance) {
        const instance = scannerInstance;
        scannerInstance = null;

        if (isScanning) {
          isScanning = false;
          instance
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                instance.clear();
              } catch (_) {}
              if (readerDiv.parentNode) {
                readerDiv.parentNode.removeChild(readerDiv);
              }
            });
        } else {
          try {
            instance.clear();
          } catch (_) {}
          if (readerDiv.parentNode) {
            readerDiv.parentNode.removeChild(readerDiv);
          }
        }
      } else if (readerDiv.parentNode) {
        readerDiv.parentNode.removeChild(readerDiv);
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      cleanUp();
    };
  }, []);

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Scan attendance</h2>
          <div className="sub">
            Point the camera at a student's QR code as they arrive. Marks them
            present and notifies the parent automatically.
          </div>
        </div>
      </div>

      <div className="panel card">
        <div className="toolbar" style={{ marginBottom: "18px" }}>
          <div>
            <label>Date</label>
            <input
              type="date"
              id="scan-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div
          ref={containerRef}
          style={{ maxWidth: "420px", margin: "0 auto", minHeight: "250px" }}
        ></div>

        <div
          id="scan-result"
          style={{ textAlign: "center", marginTop: "18px", minHeight: "24px" }}
        >
          {scanResult && (
            <>
              {scanResult.type === "loading" && (
                <span className="muted">{scanResult.message}</span>
              )}
              {scanResult.type === "present" && (
                <span className="pill pill-present">{scanResult.message}</span>
              )}
              {scanResult.type === "present-warning" && (
                <>
                  <span className="pill pill-present">
                    {scanResult.studentName} marked present
                  </span>{" "}
                  <span className="muted">
                    (WhatsApp: {scanResult.reason})
                  </span>
                </>
              )}
              {scanResult.type === "error" && (
                <span className="pill pill-absent">{scanResult.message}</span>
              )}
              {scanResult.type === "camera-error" && (
                <span className="muted">{scanResult.message}</span>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
