const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'aura-super-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Database Setup
const db = new sqlite3.Database('./mood-app.db', (err) => {
    if (err) console.error('Error opening database', err.message);
    else {
        console.log('Connected to SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)`);
            db.run(`CREATE TABLE IF NOT EXISTS moods (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, mood TEXT, date TEXT, FOREIGN KEY(user_id) REFERENCES users(id))`);
            db.run(`CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, note TEXT, date TEXT, FOREIGN KEY(user_id) REFERENCES users(id))`);
            db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, theme TEXT DEFAULT 'light', FOREIGN KEY(user_id) REFERENCES users(id))`);
        });
    }
});

const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    next();
};

// --- AUTH ROUTES ---
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function (err) {
        if (err) return res.status(400).json({ error: 'User already exists' });
        db.run('INSERT INTO settings (user_id) VALUES (?)', [this.lastID]);
        res.json({ message: 'Registration successful' });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT id, username FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ message: 'Login successful' });
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// --- DATA ROUTES ---
app.get('/api/data', requireAuth, (req, res) => {
    const userId = req.session.userId;
    db.all('SELECT mood, date FROM moods WHERE user_id = ? ORDER BY id DESC', [userId], (err, moods) => {
        db.all('SELECT note, date FROM notes WHERE user_id = ? ORDER BY id DESC', [userId], (err, notes) => {
            db.get('SELECT theme FROM settings WHERE user_id = ?', [userId], (err, settings) => {
                res.json({ username: req.session.username, moods, notes, settings });
            });
        });
    });
});

app.post('/api/mood', requireAuth, (req, res) => {
    db.run('INSERT INTO moods (user_id, mood, date) VALUES (?, ?, ?)', [req.session.userId, req.body.mood, req.body.date], () => res.json({ message: 'Mood saved' }));
});

app.post('/api/note', requireAuth, (req, res) => {
    db.run('INSERT INTO notes (user_id, note, date) VALUES (?, ?, ?)', [req.session.userId, req.body.note, req.body.date], () => res.json({ message: 'Note saved' }));
});

// --- SETTINGS ROUTES ---
app.post('/api/settings/theme', requireAuth, (req, res) => {
    db.run('UPDATE settings SET theme = ? WHERE user_id = ?', [req.body.theme, req.session.userId], () => res.json({ message: 'Theme updated' }));
});

app.get('/api/export', requireAuth, (req, res) => {
    const userId = req.session.userId;
    db.all('SELECT mood, date FROM moods WHERE user_id = ?', [userId], (err, moods) => {
        db.all('SELECT note, date FROM notes WHERE user_id = ?', [userId], (err, notes) => {
            res.setHeader('Content-disposition', 'attachment; filename=aura_data.json');
            res.setHeader('Content-type', 'application/json');
            res.send(JSON.stringify({ moods, notes }, null, 2));
        });
    });
});

app.delete('/api/history', requireAuth, (req, res) => {
    db.run('DELETE FROM moods WHERE user_id = ?', [req.session.userId]);
    db.run('DELETE FROM notes WHERE user_id = ?', [req.session.userId]);
    res.json({ message: 'History cleared' });
});

app.delete('/api/account', requireAuth, (req, res) => {
    const userId = req.session.userId;
    db.serialize(() => {
        db.run('DELETE FROM moods WHERE user_id = ?', [userId]);
        db.run('DELETE FROM notes WHERE user_id = ?', [userId]);
        db.run('DELETE FROM settings WHERE user_id = ?', [userId]);
        db.run('DELETE FROM users WHERE id = ?', [userId]);
    });
    req.session.destroy();
    res.json({ message: 'Account deleted' });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));