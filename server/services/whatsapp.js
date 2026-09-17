const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

// Keep the LocalAuth session between server restarts. Removing this directory
// forces the phone to be linked again and can interrupt an active QR login.
const sessionDir = path.join(process.cwd(), "whatsapp-session");
fs.mkdirSync(sessionDir, { recursive: true });

// In-memory state the rest of the app (and the admin dashboard) can read.
const state = {
  status: "initializing", // initializing | qr | authenticated | ready | disconnected | auth_failure
  qrDataUrl: null,
  error: null,
};

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./whatsapp-session" }),
  puppeteer: {
    // headless: true works on most servers; set to false locally if you want to watch it.
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
  // Fetches a cached copy of the exact WhatsApp Web version currently live,
  // instead of relying on whatever shipped with this whatsapp-web.js release.
  // This is the main fix for "Failed to send message" / "Evaluation failed"
  // errors that show up after WhatsApp pushes a web client update.
  webVersionCache: {
    type: "remote",
    remotePath:
      "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html",
  },
});

client.on("qr", async (qr) => {
  state.status = "qr";
  state.error = null;
  state.qrDataUrl = await QRCode.toDataURL(qr);
  console.log("WhatsApp QR code ready. Open the admin dashboard's WhatsApp tab to scan it, or scan the terminal QR if your terminal supports it.");
});

client.on("ready", () => {
  state.status = "ready";
  state.qrDataUrl = null;
  state.error = null;
  readyAt = Date.now();
  console.log("WhatsApp client is ready and connected.");
});

client.on("authenticated", () => {
  state.status = "authenticated";
  state.qrDataUrl = null;
  state.error = null;
  console.log("WhatsApp authenticated.");
});

client.on("auth_failure", (msg) => {
  state.status = "auth_failure";
  state.error = msg || "WhatsApp authentication failed.";
  console.error("WhatsApp authentication failed:", msg);
});

client.on("change_state", (stateName) => {
  console.log("WhatsApp state changed:", stateName);
  if (stateName === "CONNECTED") {
    state.status = "ready";
    state.qrDataUrl = null;
    state.error = null;
    readyAt = Date.now();
  }
});

client.on("error", (err) => {
  state.error = err?.message || "WhatsApp client error.";
  console.error("WhatsApp client error:", err);
});

let reconnecting = false;
let reconnectPromise = null;
let readyAt = 0;

function waitForReady(timeoutMs = 15000) {
  if (state.status === "ready") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.removeListener("ready", onReady);
      reject(new Error(`WhatsApp did not become ready (status: ${state.status}).`));
    }, timeoutMs);

    function onReady() {
      clearTimeout(timeout);
      resolve();
    }

    client.once("ready", onReady);
  });
}

function reconnectClient() {
  if (reconnectPromise) return reconnectPromise;

  reconnectPromise = (async () => {
    state.status = "initializing";
    await client.destroy().catch(() => {});
    await client.initialize();
    await waitForReady();
  })().finally(() => {
    reconnectPromise = null;
  });

  return reconnectPromise;
}

function attemptReconnect(delayMs = 3000) {
  if (reconnecting) return;
  reconnecting = true;
  setTimeout(async () => {
    try {
      await client.destroy().catch(() => {});
      await client.initialize();
    } catch (err) {
      state.status = "disconnected";
      state.error = err?.message || "WhatsApp reconnect failed.";
      console.error("WhatsApp reconnect attempt failed:", err.message || err);
    } finally {
      reconnecting = false;
    }
  }, delayMs);
}

client.on("disconnected", (reason) => {
  state.status = "disconnected";
  state.qrDataUrl = null;
  state.error = String(reason || "WhatsApp disconnected.");
  console.warn("WhatsApp disconnected:", reason);
  // The phone unlinked the device (or lost connection). Bring up a fresh
  // session automatically so a new QR code appears without a server restart.
  attemptReconnect();
});

client.initialize().catch((err) => {
  state.status = "disconnected";
  state.error = err?.message || "WhatsApp failed to start.";
  console.error("WhatsApp failed to start:", err.message || err);
});

/**
 * Normalizes a local phone number into WhatsApp's chat id format.
 * Expects numbers WITH country code (e.g. 201234567890 for Egypt).
 * Strips spaces, dashes, plus signs and leading zeros after the country code.
 */
function toChatId(phone) {
  const digits = String(phone).replace(/[^\d]/g, "");
  return `${digits}@c.us`;
}

/**
 * Sends a WhatsApp message. Resolves { ok: true } on success,
 * or { ok: false, reason } if WhatsApp isn't connected or the send fails.
 */
async function sendMessage(phone, message) {
  if (state.status !== "ready") {
    return { ok: false, reason: `WhatsApp is not connected (status: ${state.status}).` };
  }

  const sendOnce = async () => {
    const remainingWarmup = 2500 - (Date.now() - readyAt);
    if (remainingWarmup > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingWarmup));
    }
    const chatId = toChatId(phone);
    const numberId = await client.getNumberId(chatId);
    if (!numberId) {
      return { ok: false, reason: `The number ${phone} is not registered on WhatsApp.` };
    }
    await client.sendMessage(numberId._serialized, message);
    return { ok: true };
  };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await sendOnce();
    } catch (err) {
      lastError = err;
      const errorMessage = err?.message || "";
      const transient = /detached frame|getChat|execution context was destroyed|target closed/i.test(errorMessage);
      if (!transient || attempt === 2) break;

      try {
        if (/detached frame|execution context was destroyed|target closed/i.test(errorMessage)) {
          await reconnectClient();
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (reconnectError) {
        lastError = reconnectError;
      }
    }
  }

  state.status = "disconnected";
  console.error(`WhatsApp send failed for ${phone}:`, lastError);
  return {
    ok: false,
    reason: "WhatsApp browser connection was refreshed, but the message could not be sent. Try again.",
  };
}

function getStatus() {
  return { status: state.status, qrDataUrl: state.qrDataUrl, error: state.error };
}

function reconnectNow() {
  state.status = "initializing";
  attemptReconnect(0);
}

module.exports = { sendMessage, getStatus, reconnectNow };
