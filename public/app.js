// --- Daily Auto-Generated Quote ---
async function loadDailyQuote() {
    const quoteDisplay = document.getElementById('quote-display');
    if (!quoteDisplay) return;

    const today = new Date().toLocaleDateString();
    const savedDate = localStorage.getItem('quote_date');
    const savedQuote = localStorage.getItem('quote_text');

    // If we already fetched a quote today, use the saved one
    if (savedDate === today && savedQuote) {
        quoteDisplay.innerHTML = savedQuote;
        return;
    }

    // Otherwise, fetch a new auto-generated quote
    try {
        quoteDisplay.innerText = "Loading daily inspiration...";

        // Using DummyJSON's free quote API
        const response = await fetch('https://dummyjson.com/quotes/random');
        const data = await response.json();

        const formattedQuote = `"${data.quote}" <br><span style="font-size: 0.9rem; color: var(--text-muted);">- ${data.author}</span>`;

        // Display it
        quoteDisplay.innerHTML = formattedQuote;

        // Save it to local storage so it doesn't change until tomorrow
        localStorage.setItem('quote_date', today);
        localStorage.setItem('quote_text', formattedQuote);

    } catch (error) {
        // Fallback just in case the API goes down
        quoteDisplay.innerHTML = `"Keep your face always toward the sunshine—and shadows will fall behind you." <br><span style="font-size: 0.9rem; color: var(--text-muted);">- Walt Whitman</span>`;
    }
}

// --- Theme Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('aura_theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = savedTheme;
});

// --- Auth Forms ---
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('login-user').value,
                password: document.getElementById('login-pass').value
            })
        });
        if (res.ok) window.location.href = '/dashboard.html';
        else alert('Login failed: Invalid credentials');
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('reg-user').value,
                password: document.getElementById('reg-pass').value
            })
        });
        if (res.ok) alert('Registration successful! You can now login.');
        else alert('Registration failed: User may already exist');
    });
}

async function logout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/index.html';
}

// --- Data Loading ---
async function checkAuthAndLoadData() {
    const res = await fetch('/api/data');
    if (!res.ok) { window.location.href = '/index.html'; return; }
    const data = await res.json();

    // Apply Settings
    if (data.settings && data.settings.theme) {
        document.body.setAttribute('data-theme', data.settings.theme);
        localStorage.setItem('aura_theme', data.settings.theme);
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = data.settings.theme;
    }

    // Load Daily Quote
    loadDailyQuote();

    const settingsUser = document.getElementById('settings-username');
    if (settingsUser) settingsUser.innerText = data.username;

    updateLists(data.moods, 'mood-list');
    updateLists(data.notes, 'note-list');
}

function updateLists(items, elementId) {
    const listElement = document.getElementById(elementId);
    if (!listElement) return;
    listElement.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted)">${item.date}</span><br><strong>${item.mood || item.note}</strong>`;
        listElement.appendChild(li);
    });
}

// --- Interactions ---
async function saveMood() {
    const mood = document.getElementById('mood-select').value;
    const date = new Date().toLocaleDateString();
    await fetch('/api/mood', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mood, date }) });
    checkAuthAndLoadData();
}

async function saveNote() {
    const note = document.getElementById('note-input').value;
    if (!note) return;
    const date = new Date().toLocaleDateString();
    await fetch('/api/note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note, date }) });
    document.getElementById('note-input').value = '';
    checkAuthAndLoadData();
}

async function searchSong() {
    const query = document.getElementById('song-query').value;
    if (!query) return;
    const resultsList = document.getElementById('song-results');
    resultsList.innerHTML = '<li>Searching...</li>';
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=4`);
    const data = await res.json();
    resultsList.innerHTML = '';
    if (data.results.length === 0) { resultsList.innerHTML = '<li>No songs found.</li>'; return; }
    data.results.forEach(song => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${song.trackName}</strong><br><span style="font-size:0.8rem">${song.artistName}</span><audio controls src="${song.previewUrl}" style="margin-top: 10px;"></audio>`;
        resultsList.appendChild(li);
    });
}

// --- Settings Actions ---
async function updateTheme() {
    const theme = document.getElementById('theme-select').value;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('aura_theme', theme);
    await fetch('/api/settings/theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme }) });
}

function exportData() {
    window.location.href = '/api/export';
}

async function clearHistory() {
    if (confirm("Are you sure you want to delete all your moods and notes? This cannot be undone.")) {
        const res = await fetch('/api/history', { method: 'DELETE' });
        if (res.ok) { alert("History cleared."); window.location.reload(); }
    }
}

async function deleteAccount() {
    if (confirm("🚨 WARNING: Are you sure you want to permanently delete your account and all data?")) {
        const res = await fetch('/api/account', { method: 'DELETE' });
        if (res.ok) { alert("Account deleted."); window.location.href = '/index.html'; }
    }
}