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
});

client.on("qr", async (qr) => {
  clearTimeout(initializationTimeout);
  state.status = "qr";
  state.error = null;
  state.qrDataUrl = await QRCode.toDataURL(qr);
  console.log("WhatsApp QR code ready. Open the admin dashboard's WhatsApp tab to scan it, or scan the terminal QR if your terminal supports it.");
});

client.on("ready", () => {
  clearTimeout(initializationTimeout);
  state.status = "ready";
  state.qrDataUrl = null;
  state.error = null;
  readyAt = Date.now();
  console.log("WhatsApp client is ready and connected.");
});

client.on("loading_screen", (percent, message) => {
  if (state.status === "ready") return;
  state.status = "initializing";
  state.error = `${message || "WhatsApp"} is loading (${percent}%).`;
});

client.on("authenticated", () => {
  if (state.status === "ready") return;
  state.status = "authenticated";
  state.qrDataUrl = null;
  state.error = null;
  console.log("WhatsApp authenticated.");
});

client.on("auth_failure", (msg) => {
  clearTimeout(initializationTimeout);
  state.status = "auth_failure";
  state.error = msg || "WhatsApp authentication failed.";
  console.error("WhatsApp authentication failed:", msg);
});

client.on("change_state", (stateName) => {
  console.log("WhatsApp state changed:", stateName);
  if (stateName === "UNPAIRED" || stateName === "UNPAIRED_IDLE") {
    if (state.status === "ready") state.status = "initializing";
    state.qrDataUrl = null;
    state.error = "WhatsApp is logged out. Waiting for a new QR code.";
  }
});

client.on("error", (err) => {
  state.error = err?.message || "WhatsApp client error.";
  console.error("WhatsApp client error:", err);
});

let reconnecting = false;
let reconnectTimer = null;
let initializationPromise = null;
let reconnectAttempts = 0;
let readyAt = 0;
let initializationTimeout = null;
let clientInitialized = false;

function isProfileLocked(error) {
  return /browser is already running|userDataDir/i.test(error?.message || "");
}

function initializeClient(restart = false) {
  if (initializationPromise) return initializationPromise;
  if (state.status === "ready" && !restart) return Promise.resolve();

  initializationPromise = (async () => {
    if (restart && clientInitialized) {
      state.status = "initializing";
      state.error = "Refreshing WhatsApp browser connection…";
      state.qrDataUrl = null;
      clearTimeout(initializationTimeout);
      await client.destroy().catch(() => {});
      clientInitialized = false;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    state.status = "initializing";
    state.error = null;
    clearTimeout(initializationTimeout);
    initializationTimeout = setTimeout(() => {
      if (state.status !== "initializing" && state.status !== "authenticated") return;
      state.status = "disconnected";
      state.error = "WhatsApp startup timed out. Check that only one server is using the WhatsApp session, then reconnect.";
    }, 60000);
    await client.initialize();
    clientInitialized = true;
    reconnectAttempts = 0;
  })().catch((err) => {
    clearTimeout(initializationTimeout);
    state.status = "disconnected";
    state.error = err?.message || "WhatsApp reconnect failed.";
    console.error("WhatsApp reconnect attempt failed:", err?.message || err);
    throw err;
  }).finally(() => {
    initializationPromise = null;
  });

  return initializationPromise;
}

function waitForReady(timeoutMs = 60000) {
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

function attemptReconnect(delayMs = 3000) {
  if (reconnecting || reconnectTimer || initializationPromise) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    reconnecting = true;
    let nextDelay = null;
    try {
      await initializeClient(true);
    } catch (err) {
      if (!isProfileLocked(err)) {
        nextDelay = Math.min(30000, 3000 * 2 ** reconnectAttempts);
        reconnectAttempts += 1;
      }
    } finally {
      reconnecting = false;
      if (nextDelay !== null && state.status === "disconnected") {
        attemptReconnect(nextDelay);
      }
    }
  }, delayMs);
}

function scheduleReconnect(delayMs = 3000) {
  if (reconnectTimer || reconnecting) return;
  attemptReconnect(delayMs);
}

client.on("disconnected", (reason) => {
  state.status = "disconnected";
  state.qrDataUrl = null;
  readyAt = 0;
  clearTimeout(initializationTimeout);
  state.error = String(reason || "WhatsApp disconnected.");
  console.warn("WhatsApp disconnected:", reason);
  scheduleReconnect(3000);
});

function startClient() {
  return initializeClient().catch((err) => {
    if (!isProfileLocked(err)) scheduleReconnect(5000);
  });
}

startClient();

/**
 * Normalizes a local phone number into WhatsApp's chat id format.
 * Expects numbers WITH country code (e.g. 201234567890 for Egypt).
 * Strips spaces, dashes, plus signs and leading zeros after the country code.
 */
function toChatId(phone) {
  let digits = String(phone || "").replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const countryCode = String(process.env.WHATSAPP_COUNTRY_CODE || "20").replace(/\D/g, "");
  if (countryCode && digits.startsWith("0")) digits = `${countryCode}${digits.slice(1)}`;
  return digits.length >= 8 ? `${digits}@c.us` : null;
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
    if (!chatId) return { ok: false, reason: "The parent phone number is invalid." };
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
          await initializeClient(true);
          await waitForReady();
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (reconnectError) {
        lastError = reconnectError;
      }
    }
  }

  console.error(`WhatsApp send failed for ${phone}:`, lastError);
  return {
    ok: false,
    reason: lastError?.message || "WhatsApp could not send the message.",
  };
}

function getStatus() {
  return { status: state.status, qrDataUrl: state.qrDataUrl, error: state.error };
}

function reconnectNow() {
  if (state.status === "initializing" || state.status === "authenticated" || state.status === "qr") {
    return;
  }
  attemptReconnect(0);
}

module.exports = { sendMessage, getStatus, reconnectNow };
