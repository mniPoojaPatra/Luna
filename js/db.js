const DB = {
  // Authentication & Users
  getUsers() {
    return JSON.parse(localStorage.getItem('luna_users') || '{}');
  },

  registerUser(username, password) {
    const users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    if (users[cleanUser]) {
      return { success: false, message: 'Username already exists' };
    }
    users[cleanUser] = {
      username: username.trim(),
      password: password // simple hash or string comparison for client-side sandbox
    };
    localStorage.setItem('luna_users', JSON.stringify(users));
    return { success: true };
  },

  authenticateUser(username, password) {
    const users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    if (users[cleanUser] && users[cleanUser].password === password) {
      this.setSession(users[cleanUser].username);
      return { success: true };
    }
    return { success: false, message: 'Invalid username or password' };
  },

  setSession(username) {
    sessionStorage.setItem('luna_active_user', username);
  },

  getActiveUser() {
    return sessionStorage.getItem('luna_active_user');
  },

  logout() {
    sessionStorage.removeItem('luna_active_user');
  },

  // User-scoped data access helpers
  getUserKey(suffix) {
    const user = this.getActiveUser();
    if (!user) return null;
    return `luna_data_${user.toLowerCase()}_${suffix}`;
  },

  get(suffix, defaultValue = null) {
    const key = this.getUserKey(suffix);
    if (!key) return defaultValue;
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  },

  set(suffix, value) {
    const key = this.getUserKey(suffix);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Scoped Operations
  getEntries() {
    return this.get('entries', []);
  },

  saveEntry(entry) {
    const entries = this.getEntries();
    // Check if entry for this date already exists to prevent duplicate dates
    const existingIndex = entries.findIndex(e => e.date === entry.date);
    
    const entryData = {
      id: entry.id || Date.now().toString(),
      date: entry.date,
      mood: entry.mood,
      text: entry.text || '',
      img: entry.img || null,
      good: entry.good || '',
      upset: entry.upset || '',
      improve: entry.improve || '',
      timestamp: Date.now()
    };

    if (existingIndex !== -1) {
      entries[existingIndex] = { ...entries[existingIndex], ...entryData };
    } else {
      entries.push(entryData);
    }

    // Sort entries chronological (newest first for memory wall or calendar sorting)
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    this.set('entries', entries);
    return entryData;
  },

  deleteEntry(id) {
    const entries = this.getEntries();
    const filtered = entries.filter(e => e.id !== id);
    this.set('entries', filtered);
  },

  // Dashboard Settings
  getLampState() {
    return this.get('lamp_state', false);
  },

  setLampState(isOn) {
    this.set('lamp_state', isOn);
  },

  getPhotoFrameImage() {
    // Return a cozy fallback image or null
    return this.get('frame_image', null);
  },

  setPhotoFrameImage(imgBase64) {
    this.set('frame_image', imgBase64);
  },

  getLeftStickyQuote() {
    return this.get('sticky_quote_left', 'be gentle with yourself 🌸');
  },

  setLeftStickyQuote(quote) {
    this.set('sticky_quote_left', quote);
  },

  getStickyQuote() {
    return this.get('sticky_quote', 'Cherish yourself, because you are worth it.');
  },

  setStickyQuote(quote) {
    this.set('sticky_quote', quote);
  },

  getRightStickyQuote() {
    return this.get('sticky_quote_right', 'grow at your own pace 🌱');
  },

  setRightStickyQuote(quote) {
    this.set('sticky_quote_right', quote);
  },

  getChecklist() {
    return this.get('checklist', [
      { id: '1', text: 'take a deep breath', completed: false },
      { id: '2', text: 'write down my mood', completed: false }
    ]);
  },

  saveChecklist(list) {
    this.set('checklist', list);
  },

  getActiveTheme() {
    return this.get('active_theme', 'theme-forest');
  },

  setActiveTheme(themeName) {
    this.set('active_theme', themeName);
  }
};

export default DB;
