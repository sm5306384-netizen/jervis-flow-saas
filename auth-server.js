const express = require("express");
const path = require("path");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all static files (login.html, dashboard.html, styles) publicly
app.use(express.static(__dirname));

const secret = process.env.AUTH_SESSION_SECRET || "jervis_super_secret_key_2026_secure_enough_length_32_chars";

app.use(session({
    store: new SQLiteStore({ db: "sessions.sqlite", dir: path.join(__dirname, "auth-data") }),
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Route for root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

// Route for login page
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

// Route for dashboard page
app.get("/dashboard", (req, res) => {
    if (req.session && req.session.userId) {
        res.sendFile(path.join(__dirname, "dashboard.html"));
    } else {
        res.redirect("/login");
    }
});

// Helper Auth Middleware ONLY for /api/ routes
const requireAuthAPI = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: "Login required hai.", loginRequired: true });
};

// Mock Auth API Endpoints
app.get("/api/me", (req, res) => {
    if (req.session && req.session.userId) {
        return res.json({ loggedIn: true, user: req.session.user });
    }
    return res.json({ loggedIn: false });
});

app.post("/api/login", (req, res) => {
    const { phone, password } = req.body;
    // Basic session creation
    req.session.userId = phone || "admin";
    req.session.user = { phone };
    return res.json({ success: true, redirect: "/dashboard" });
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
