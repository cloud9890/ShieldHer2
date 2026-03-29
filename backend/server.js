require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const app = express();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.json({ status: "ShieldHer backend running" }));
app.post("/api/sms", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Missing to or message" });
  try {
    const msg = await client.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to });
    console.log("SMS sent:", msg.sid);
    res.json({ success: true, sid: msg.sid });
  } catch (err) {
    console.error("Twilio error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("ShieldHer backend on port " + PORT));
