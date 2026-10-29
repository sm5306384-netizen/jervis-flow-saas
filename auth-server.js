const express = require('express');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets publicly before any auth checks
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

const secret = process.env.AUTH_SESSION_SECRET || "jervis_super_secret_key_2026_secure_enough_length_32_chars";

app.use(session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'auth-data') }),
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Public Root Route - Serves login.html if not logged in
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard.html');
    }
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Login Page Route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Auth API endpoints and Protected routes below...
// (Baaki routes intact rahenge)

