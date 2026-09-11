const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const whatsapp = require("../services/whatsapp");

const router = express.Router();

router.get("/status", requireAuth, requireAdmin, (req, res) => {
  res.json(whatsapp.getStatus());
});

router.post("/reconnect", requireAuth, requireAdmin, (req, res) => {
  whatsapp.reconnectNow();
  res.json({ ok: true });
});

module.exports = router;
