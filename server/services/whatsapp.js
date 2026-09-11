const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

// In-memory state the rest of the app (and the admin dashboard) can read.
const state = {
  status: "initializing", // initializing | qr | ready | disconnected | auth_failure
  qrDataUrl: null,
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
  state.qrDataUrl = await QRCode.toDataURL(qr);
  console.log("WhatsApp QR code ready. Open the admin dashboard's WhatsApp tab to scan it, or scan the terminal QR if your terminal supports it.");
});

client.on("ready", () => {
  state.status = "ready";
  state.qrDataUrl = null;
  console.log("WhatsApp client is ready and connected.");
});

client.on("authenticated", () => {
  console.log("WhatsApp authenticated.");
});

client.on("auth_failure", (msg) => {
  state.status = "auth_failure";
  console.error("WhatsApp authentication failed:", msg);
});

let reconnecting = false;

function attemptReconnect(delayMs = 3000) {
  if (reconnecting) return;
  reconnecting = true;
  setTimeout(async () => {
    try {
      // whatsapp-web.js often won't issue a fresh QR if you just call
      // initialize() again on a session it considers already ended —
      // destroying first reliably forces a clean new session.
      await client.destroy().catch(() => {});
      await client.initialize();
    } catch (err) {
      state.status = "disconnected";
      console.error("WhatsApp reconnect attempt failed:", err.message || err);
    } finally {
      reconnecting = false;
    }
  }, delayMs);
}

client.on("disconnected", (reason) => {
  state.status = "disconnected";
  state.qrDataUrl = null;
  console.warn("WhatsApp disconnected:", reason);
  // The phone unlinked the device (or lost connection). Bring up a fresh
  // session automatically so a new QR code appears without a server restart.
  attemptReconnect();
});

client.initialize().catch((err) => {
  state.status = "disconnected";
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
  try {
    const chatId = toChatId(phone);
    const numberId = await client.getNumberId(chatId);
    if (!numberId) {
      return { ok: false, reason: `The number ${phone} is not registered on WhatsApp.` };
    }
    await client.sendMessage(numberId._serialized, message);
    return { ok: true };
  } catch (err) {
    // Log the full error to the server terminal — the message shown in the
    // dashboard is intentionally short, but the real cause (often a
    // whatsapp-web.js/WhatsApp Web version mismatch) is in the stack trace.
    console.error(`WhatsApp send failed for ${phone}:`, err);
    return { ok: false, reason: err.message || "Failed to send message" };
  }
}

function getStatus() {
  return { status: state.status, qrDataUrl: state.qrDataUrl };
}

function reconnectNow() {
  state.status = "initializing";
  attemptReconnect(0);
}

module.exports = { sendMessage, getStatus, reconnectNow };
