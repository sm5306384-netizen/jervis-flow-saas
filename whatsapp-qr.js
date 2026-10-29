const express = require("express");
const path = require("path");
const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

module.exports = function createWhatsAppRouter() {
  const router = express.Router();
  const DATA_DIR = path.join(__dirname, "auth-data");
  const SESSION_DIR = path.join(DATA_DIR, "whatsapp-sessions");
  const PROFILE_DIR = path.join(DATA_DIR, "whatsapp-profiles");

  fs.mkdirSync(SESSION_DIR, { recursive: true });
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const clients = new Map();
  const states = new Map();

  function accountId(req) {
    const s = req.session || {};
    const value =
      s.userId ??
      s.user?.id ??
      s.accountId ??
      s.account?.id ??
      s.user?.userId;

    if (value === undefined || value === null || String(value).trim() === "") {
      return null;
    }

    return String(value).replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function profilePath(id) {
    return path.join(PROFILE_DIR, `${id}.json`);
  }

  function readProfile(id) {
    try {
      return JSON.parse(fs.readFileSync(profilePath(id), "utf8"));
    } catch {
      return {};
    }
  }

  function writeProfile(id, data) {
    const clean = {};
    for (let i = 1; i <= 20; i++) {
      const key = `q${i}`;
      clean[key] = typeof data?.[key] === "string"
        ? data[key].trim().slice(0, 5000)
        : "";
    }

  clean.greeting = typeof data.greeting === "string" ? data.greeting.trim().slice(0, 1000) : "";
    fs.writeFileSync(profilePath(id), JSON.stringify(clean, null, 2), "utf8");
    return clean;
  }

  function getState(id) {
    return states.get(id) || {
      state: "disconnected",
      qr: null,
      connected: false,
      phone: null,
      message: "WhatsApp abhi connect nahi hai."
    };
  }

  function hasText(profile, key) {
    return typeof profile[key] === "string" && profile[key].trim().length > 0;
  }

  function replyFromProfile(message, profile) {
    const text = String(message || "").toLowerCase().replace(/\s+/g, " ").trim();
    const gymName = hasText(profile, "q1") ? profile.q1.trim() : "hamare gym";

    const missing = (label) =>
      `Maaf kijiye, ${label} ki exact information ${gymName} ke dashboard mein saved nahi hai. Kripya gym owner se confirm karein.`;

    const entries = [
      { keys: ["annual", "yearly", "annually", "12 month", "12-month", "one year", "per year", "saal ka", "saal ki", "saalana", "salana", "वार्षिक", "सालाना"], field: "q8", label: "Annual membership fee" },
      { keys: ["6 month", "6-month", "six month", "half year", "half-year", "chhe mahine", "6 mahine", "6 months"], field: "q7", label: "6-month membership fee" },
      { keys: ["3 month", "3-month", "three month", "quarterly", "teen mahine", "3 mahine", "3 months"], field: "q6", label: "3-month membership fee" },
      { keys: ["monthly", "per month", "every month", "month fee", "month fees", "monthly membership", "mahine ka", "mahine ki", "mahina", "मासिक"], field: "q5", label: "Monthly membership fee" },
      { keys: ["joining fee", "joining fees", "registration", "admission fee", "admission charges"], field: "q10", label: "Joining and registration charges" },
      { keys: ["timing", "timings", "open", "close", "kab khulta", "kab band", "समय"], field: "q3", label: "Gym timings" },
      { keys: ["weekly", "holiday", "sunday", "monday", "closed", "chhutti", "बंद"], field: "q4", label: "Weekly schedule and holidays" },
      { keys: ["address", "location", "where", "kahan", "लोकेशन", "पता"], field: "q2", label: "Gym address" },
      { keys: ["trial", "free workout", "trial workout", "demo"], field: "q9", label: "Trial workout" },
      { keys: ["equipment", "facilities", "machines", "locker", "shower", "cardio"], field: "q11", label: "Gym facilities" },
      { keys: ["ladies", "women", "female"], field: "q12", label: "Ladies facilities and timings" },
      { keys: ["personal training", "personal trainer", "pt charges", "trainer"], field: "q13", label: "Personal training" },
      { keys: ["diet", "nutrition", "dietician", "diet plan"], field: "q14", label: "Diet consultation" },
      { keys: ["weight loss", "lose weight", "fat loss", "wazan kam"], field: "q15", label: "Weight-loss programme" },
      { keys: ["muscle gain", "muscle building", "bulking", "bodybuilding"], field: "q16", label: "Muscle-gain programme" },
      { keys: ["payment", "pay", "upi", "cash", "card", "online payment"], field: "q17", label: "Accepted payment methods" },
      { keys: ["refund", "refund policy", "cancel", "cancellation"], field: "q18", label: "Cancellation and refund policy" },
      { keys: ["freeze", "pause", "hold membership", "membership pause"], field: "q19", label: "Membership pause policy" },
      { keys: ["contact", "phone number", "mobile number", "phone", "contact details"], field: "q20", label: "Contact details and FAQs" }
    ];

    const greeting = /^(hi|hello|hey|namaste|namaskar|hii|hlo|good morning|good afternoon|good evening|नमस्ते|हेलो)[\s!.😊🙏]*$/i.test(text);
    if (greeting) {
      return hasText(profile, "greeting")
        ? profile.greeting.trim().slice(0, 1000)
        : `Namaste! Welcome to ${gymName}. 😊 Aapko kis information ki zaroorat hai?`;
    }

    for (const entry of entries) {
      if (entry.keys.some(k => text.includes(k))) {
        return hasText(profile, entry.field)
          ? `${entry.label} — ${profile[entry.field].trim()}`
          : missing(entry.label.toLowerCase());
      }
    }

    const feeIntent = /\b(fee|fees|membership|price|pricing|charges|cost|kitna|kitni|rate|amount)\b|फीस|कितना|कितनी|कीमत|मेम्बरशिप/.test(text);
    if (feeIntent) {
      const plans = [
        ["Monthly", "q5"],
        ["3-month", "q6"],
        ["6-month", "q7"],
        ["Annual", "q8"]
      ];
      const available = plans
        .filter(([, key]) => hasText(profile, key))
        .map(([label, key]) => `${label}: ${profile[key].trim()}`);

      const unavailable = plans
        .filter(([, key]) => !hasText(profile, key))
        .map(([label]) => label);

      if (available.length) {
        return ` ${gymName} ki saved membership fees:\n${available.join("\n")}` +
          (unavailable.length
            ? `\n\nIn plans ki fee dashboard mein saved nahi hai: ${unavailable.join(", ")}. Exact amount ke liye gym owner se confirm karein.`
            : "");
      }
      return missing("membership fees");
    }

    if (!hasText(profile, "q1") || !hasText(profile, "q2")) {
      return `Gym ki complete information dashboard mein saved nahi hai. Kripya ${gymName} ke owner se confirm karein.`;
    }

    return "Sorry, main aapka question clearly samajh nahi paaya. Please check your spelling and send your question again.";
  }

  // Har API request mein logged-in account zaroori hai.
  router.use((req, res, next) => {
    const id = accountId(req);
    if (!id) {
      return res.status(401).json({
        ok: false,
        error: "Login required. Please log in again."
      });
    }
    req.whatsappAccountId = id;
    next();
  });

    router.get("/profile", (req, res) => {
    res.json({ ok: true, profile: readProfile(req.whatsappAccountId) });
  });

  router.post("/profile", (req, res) => {
    try {
      const updated = writeProfile(req.whatsappAccountId, req.body || {});
      res.json({ ok: true, profile: updated, message: "Gym profile successfully saved!" });
    } catch (err) {
      console.error("Profile save error:", err);
      res.status(500).json({ ok: false, error: "Profile save nahi ho saki." });
    }
  });

  router.put("/profile", (req, res) => {
    const profile = writeProfile(req.whatsappAccountId, req.body || {});
    res.json({ ok: true, message: "Gym profile WhatsApp replies ke liye save ho gayi.", profile });
  });

  router.get("/status", (req, res) => {
    const s = getState(req.whatsappAccountId);
    res.json({
      ok: true,
      state: s.state,
      connected: Boolean(s.connected),
      qr: s.qr || null,
      phone: s.phone || null,
      message: s.message || ""
    });
  });

  router.post("/connect", async (req, res) => {
    const id = req.whatsappAccountId;
    const existing = clients.get(id);

    if (existing) {
      const s = getState(id);
      return res.json({
        ok: true,
        state: s.state,
        message: "WhatsApp connection pehle se start ho chuka hai."
      });
    }

    states.set(id, {
      state: "starting",
      qr: null,
      connected: false,
      phone: null,
      message: "WhatsApp connection start ho raha hai..."
    });

    try {
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: `gym-${id}`,
          dataPath: SESSION_DIR
        }),
        puppeteer: {
          executablePath: path.join(
            process.env.USERPROFILE,
            ".cache",
            "puppeteer",
            "chrome",
            "win64-158.0.8127.0",
            "chrome-win64",
            "chrome.exe"
          ),
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
        },
        authTimeoutMs: 60000,
        qrMaxRetries: 8
      });

      clients.set(id, client);

      client.on("qr", async (qr) => {
        try {
          const qrData = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: "M",
            margin: 2,
            width: 320
          });
          states.set(id, {
            state: "qr",
            qr: qrData,
            connected: false,
            phone: null,
            message: "Phone se QR scan karein."
          });
        } catch (err) {
          console.error("WhatsApp QR generation error:", err);
          states.set(id, {
            state: "error",
            qr: null,
            connected: false,
            phone: null,
            message: "QR code generate nahi ho saka. Terminal logs check karein."
          });
        }
      });

      client.on("authenticated", () => {
        states.set(id, {
          state: "authenticated",
          qr: null,
          connected: false,
          phone: null,
          message: "Authentication successful. WhatsApp load ho raha hai..."
        });
      });

      client.on("ready", () => {
        const info = client.info;
        const phone = info?.wid?.user || null;
        states.set(id, {
          state: "connected",
          qr: null,
          connected: true,
          phone,
          message: "WhatsApp Connected"
        });
      });

      client.on("auth_failure", (message) => {
        states.set(id, {
          state: "error",
          qr: null,
          connected: false,
          phone: null,
          message: "WhatsApp authentication fail hui. Disconnect karke dobara try karein."
        });
      });

      client.on("disconnected", (reason) => {
        states.set(id, {
          state: "disconnected",
          qr: null,
          connected: false,
          phone: null,
          message: "WhatsApp disconnect ho gaya. Dobara connect karein."
        });
        clients.delete(id);
      });

      client.on("message", async (msg) => {
        try {
          if (!msg || msg.fromMe || msg.isStatus) return;
          if (!msg.from || msg.from.endsWith("@g.us") || msg.from === "status@broadcast") return;
          if (!String(msg.body || "").trim()) return;
          if (!getState(id).connected) return;

          console.log("[INCOMING] Customer message:", String(msg.body).slice(0, 1000));
          const profile = readProfile(id);
          console.log("[DIAGNOSTIC] Account ID:", id);
          console.log("[DIAGNOSTIC] Profile path:", profilePath(id));
          console.log("[DIAGNOSTIC] Profile fields:", JSON.stringify({ q1: profile.q1, q2: profile.q2, q3: profile.q3, q5: profile.q5, q6: profile.q6, q7: profile.q7, q8: profile.q8 }));
          console.log("[DIAGNOSTIC] gym-ai module:", require.resolve("./gym-ai"));
          const { createGymAIReply } = require("./gym-ai");
          const reply = await createGymAIReply(msg.body, profile, replyFromProfile);
          await msg.reply(reply);
          console.log("[BOT REPLY] Generated response:", String(reply).slice(0, 1500));
        } catch (err) {
          console.log("[BOT REPLY] WhatsApp send completed.");
          console.error("WhatsApp auto-reply error:", err.message);
        }
      });

      client.initialize().catch((err) => {
        console.error("WhatsApp initialization error:", err.message);
        states.set(id, {
          state: "error",
          qr: null,
          connected: false,
          phone: null,
          message: "WhatsApp start nahi ho saka. Terminal logs check karein."
        });
        clients.delete(id);
      });

      res.json({
        ok: true,
        state: "starting",
        message: "WhatsApp connection start ho gaya. QR aane ke liye dashboard par wait karein."
      });
    } catch (err) {
      clients.delete(id);
      states.set(id, {
        state: "error",
        qr: null,
        connected: false,
        phone: null,
        message: "WhatsApp start nahi ho saka."
      });
      console.error("WhatsApp connect error:", err);
      res.status(500).json({ ok: false, error: "WhatsApp connection start nahi ho saka." });
    }
  });

  router.post("/disconnect", async (req, res) => {
    const id = req.whatsappAccountId;
    const client = clients.get(id);

    if (client) {
      try {
        await client.logout();
      } catch {}
      try {
        await client.destroy();
      } catch {}
      clients.delete(id);
    }

    states.set(id, {
      state: "disconnected",
      qr: null,
      connected: false,
      phone: null,
      message: "WhatsApp disconnect kar diya gaya hai."
    });

    res.json({ ok: true, message: "WhatsApp disconnected." });
  });

  return router;
};









