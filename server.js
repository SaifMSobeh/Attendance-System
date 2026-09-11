require("dotenv").config();

// Safety net: whatsapp-web.js runs a real Chromium browser under the hood,
// and it occasionally throws errors from inside that browser (e.g. right
// after the phone unlinks the device) that Node treats as fatal by default.
// Log them instead of letting one flaky WhatsApp moment take down student
// records, exams, and payments too.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection (server kept running):", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (server kept running):", err);
});

const fs = require("fs");
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./server/routes/auth");
const studentRoutes = require("./server/routes/students");
const groupRoutes = require("./server/routes/groups");
const attendanceRoutes = require("./server/routes/attendance");
const examRoutes = require("./server/routes/exams");
const paymentRoutes = require("./server/routes/payments");
const meRoutes = require("./server/routes/me");
const whatsappRoutes = require("./server/routes/whatsapp");
const checkinRoutes = require("./server/routes/checkin");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/me", meRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/checkin", checkinRoutes);

const distPath = path.join(__dirname, "dist");
const publicPath = path.join(__dirname, "public");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.use(express.static(publicPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hossam Mohammed math system running at http://localhost:${PORT}`);
});
