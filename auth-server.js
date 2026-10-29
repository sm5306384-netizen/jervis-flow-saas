const express = require("express");
const session = require("express-session");
const SQLiteStoreFactory = require("connect-sqlite3");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
const SQLiteStore = SQLiteStoreFactory(session);

const PORT = Number(process.env.AUTH_PORT || 3100);
const HOST = process.env.AUTH_HOST || "127.0.0.1";
const DATA_DIR = path.join(__dirname, "auth-data");

fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "accounts.sqlite");
const SESSION_DB = path.join(DATA_DIR, "sessions.sqlite");

const isProduction = process.env.NODE_ENV === "production";
const secret = process.env.AUTH_SESSION_SECRET || 'jervis_super_secret_key_2026_secure', "utf8").trim();

if (!secret || secret.length < 32) {
  console.error(
    "ERROR: AUTH_SESSION_SECRET set nahi hai ya 32 characters se chhota hai."
  );
  console.error("PowerShell mein secret set karke server dobara start karo.");
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gym_information (
      user_id INTEGER PRIMARY KEY,
      information_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
});

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

app.use(
  session({
    name: "gymassist.sid",
    secret,
    store: new SQLiteStore({
      db: "sessions.sqlite",
      dir: DATA_DIR
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Bahut zyada attempts. 15 minute baad try karo." }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Signup attempts limit ho gayi. Baad mein try karo." }
});

function normalizePhone(value) {
  if (typeof value !== "string") return null;

  const phone = value.trim().replace(/[\s()-]/g, "");

  if (!/^\+?[1-9]\d{9,14}$/.test(phone)) return null;

  return phone;
}

function validPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 12 &&
    value.length <= 72
  );
}

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: "Login required hai.",
      loginRequired: true
    });
  }

  next();
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save(err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy(err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function getUserByPhone(phone) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT id, phone, password_hash FROM users WHERE phone = ?",
      [phone],
      (err, row) => err ? reject(err) : resolve(row)
    );
  });
}

function createUser(phone, passwordHash) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (phone, password_hash) VALUES (?, ?)",
      [phone, passwordHash],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function ensureGymInformation(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO gym_information (user_id) VALUES (?)",
      [userId],
      err => err ? reject(err) : resolve()
    );
  });
}

function getGymInformation(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT information_json FROM gym_information WHERE user_id = ?",
      [userId],
      (err, row) => {
        if (err) return reject(err);

        try {
          resolve(row ? JSON.parse(row.information_json) : {});
        } catch {
          reject(new Error("Saved gym information is invalid."));
        }
      }
    );
  });
}

function saveGymInformation(userId, data) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO gym_information
         (user_id, information_json, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         information_json = excluded.information_json,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(data)],
      err => err ? reject(err) : resolve()
    );
  });
}

function isValidGymData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  const keys = Object.keys(data);

  if (keys.length > 20) return false;

  return keys.every(key =>
    /^q([1-9]|1\d|20)$/.test(key) &&
    typeof data[key] === "string" &&
    data[key].length <= 5000
  );
}

app.get("/", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }

  res.sendFile(path.join(__dirname, "auth-login.html"));
});

app.get("/signup", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }

  res.sendFile(path.join(__dirname, "auth-signup.html"));
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "gym-owner-dashboard.html"));
});

app.get("/api/me", (req, res) => {
  res.set("Cache-Control", "no-store");

  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    phone: req.session.phone
  });
});

app.post("/api/signup", signupLimiter, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const password = req.body.password;

    if (!phone) {
      return res.status(400).json({
        error: "Valid phone number country code ke saath enter karo."
      });
    }

    if (!validPassword(password)) {
      return res.status(400).json({
        error: "Password 12 se 72 characters ka hona chahiye."
      });
    }

    const existing = await getUserByPhone(phone);

    if (existing) {
      return res.status(409).json({
        error: "Is phone number ka account pehle se hai. Login karo."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await createUser(phone, passwordHash);

    await ensureGymInformation(userId);
    await regenerateSession(req);

    req.session.userId = userId;
    req.session.phone = phone;

    await saveSession(req);

    res.status(201).json({ success: true, redirect: "/dashboard" });
  } catch (err) {
    if (err && err.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({
        error: "Is phone number ka account pehle se hai."
      });
    }

    next(err);
  }
});

app.post("/api/login", loginLimiter, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const password = req.body.password;

    if (!phone || typeof password !== "string" || password.length > 72) {
      return res.status(401).json({
        error: "Phone number ya password galat hai."
      });
    }

    const user = await getUserByPhone(phone);

    const hashToCheck = user
      ? user.password_hash
      : "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6cZ1gDqVZ6eY1z7vYjvQ7t6Q7v7Ku";

    const passwordMatches = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatches) {
      return res.status(401).json({
        error: "Phone number ya password galat hai."
      });
    }

    await regenerateSession(req);

    req.session.userId = user.id;
    req.session.phone = user.phone;

    await saveSession(req);

    res.json({ success: true, redirect: "/dashboard" });
  } catch (err) {
    next(err);
  }
});

app.post("/api/logout", requireLogin, async (req, res, next) => {
  try {
    await destroySession(req);

    res.clearCookie("gymassist.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction
    });

    res.json({ success: true, redirect: "/" });
  } catch (err) {
    next(err);
  }
});

app.get("/api/gym-information", requireLogin, async (req, res, next) => {
  try {
    const information = await getGymInformation(req.session.userId);
    res.set("Cache-Control", "no-store");
    res.json(information);
  } catch (err) {
    next(err);
  }
});

app.put("/api/gym-information", requireLogin, async (req, res, next) => {
  try {
    const data = req.body;

    if (!isValidGymData(data)) {
      return res.status(400).json({
        error: "Gym information format invalid hai."
      });
    }

    await saveGymInformation(req.session.userId, data);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error("Authentication server error:", err.message);

  if (res.headersSent) return next(err);

  res.status(500).json({
    error: "Server mein problem hui. Dobara try karo."
  });
});
app.use("/api/whatsapp", require("./whatsapp-qr")());

app.listen(PORT, HOST, () => {
  console.log(`Authentication server running at http://${HOST}:${PORT}`);
  console.log("Account database:", DB_PATH);
  console.log("Sessions database:", SESSION_DB);
  console.log("Local development mode:", !isProduction);
});



