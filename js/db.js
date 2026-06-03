import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from './config.js';

let supabase = null;

// Retrieve Supabase credentials from config file or localStorage
function getSupabaseCredentials() {
  let url = SUPABASE_CONFIG.url;
  let anonKey = SUPABASE_CONFIG.anonKey;

  if (!url || url === 'YOUR_SUPABASE_URL' || url.trim() === '') {
    url = localStorage.getItem('luna_supabase_url');
  }
  if (!anonKey || anonKey === 'YOUR_SUPABASE_ANON_KEY' || anonKey.trim() === '') {
    anonKey = localStorage.getItem('luna_supabase_anon_key');
  }

  return { url, anonKey };
}

const creds = getSupabaseCredentials();
const isConfigured = creds.url && creds.anonKey && 
                     creds.url !== 'YOUR_SUPABASE_URL' && 
                     creds.url.trim() !== '' &&
                     creds.anonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
                     creds.anonKey.trim() !== '';

if (isConfigured) {
  supabase = createClient(creds.url, creds.anonKey);
}

const DB = {
  profileCache: null,
  entriesCache: [],

  // Authentication & Session
  setSession(username, email) {
    sessionStorage.setItem('luna_active_user', username || email.split('@')[0]);
  },

  getActiveUser() {
    return sessionStorage.getItem('luna_active_user') || null;
  },

  async logout() {
    sessionStorage.removeItem('luna_active_user');
    if (supabase) {
      await supabase.auth.signOut();
    }
  },

  async getSessionUser() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      this.setSession(session.user.user_metadata?.username, session.user.email);
      return session.user;
    }
    return null;
  },

  async registerUser(email, password, username) {
    if (!supabase) return { success: false, message: 'Supabase is not configured yet.' };

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  },

  async authenticateUser(email, password) {
    if (!supabase) return { success: false, message: 'Supabase is not configured yet.' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      return { success: false, message: error.message };
    }

    if (data.user) {
      this.setSession(data.user.user_metadata?.username, data.user.email);
      return { success: true };
    }

    return { success: false, message: 'Failed to authenticate user.' };
  },

  // Synchronous initial data sync on startup/login
  async loadUserData() {
    if (!supabase) return false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // 1. Fetch Profile
      let { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile) {
        // Upsert default profile
        const defaultProfile = {
          id: user.id,
          username: user.user_metadata?.username || user.email.split('@')[0],
          lamp_status: false,
          active_theme: 'theme-forest',
          sticky_left: 'be gentle with yourself 🌸',
          sticky_center: 'Cherish yourself, because you are worth it.',
          sticky_right: 'grow at your own pace 🌱',
          checklist: [
            { id: '1', text: 'take a deep breath', completed: false },
            { id: '2', text: 'write down my mood', completed: false }
          ]
        };

        const { data: newProfile, error: createErr } = await supabase
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .single();

        profile = newProfile || defaultProfile;
      }

      this.profileCache = profile;

      // 2. Fetch Journal Entries
      const { data: entries, error: entriesErr } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      this.entriesCache = entries || [];
      return true;
    } catch (e) {
      console.error("Error loading user data from cloud:", e);
      return false;
    }
  },

  // Background profile sync
  saveProfileBackground() {
    if (!supabase || !this.profileCache) return;
    supabase
      .from('profiles')
      .upsert(this.profileCache)
      .then(({ error }) => {
        if (error) console.error("Error updating profile in Supabase:", error);
      });
  },

  // Photo Uploader (Base64 dataURL -> Supabase Storage memories bucket -> public URL)
  async uploadPhoto(fileDataUrl, pathPrefix) {
    if (!supabase) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Convert Base64 dataURL to Blob
      const res = await fetch(fileDataUrl);
      const blob = await res.blob();

      // Create unique filepath: userId/prefix_timestamp.png
      const filePath = `${user.id}/${pathPrefix}_${Date.now()}.png`;

      const { error } = await supabase.storage
        .from('memories')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) {
        console.error("Error uploading photo to storage:", error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('memories')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (e) {
      console.error("Error in photo upload handler:", e);
      return null;
    }
  },

  // Sync operations reading from memory cache and syncing in the background
  getEntries() {
    return this.entriesCache || [];
  },

  saveEntry(entry) {
    const entries = this.getEntries();
    const existingIndex = entries.findIndex(e => e.date === entry.date);

    const entryId = entry.id || crypto.randomUUID();

    const entryData = {
      id: entryId,
      date: entry.date,
      mood: entry.mood,
      text: entry.text || '',
      img: entry.img || null, // temporary base64
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
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    this.entriesCache = entries;

    // Trigger background upload and database save
    this.saveEntryBackground(entryData);

    return entryData;
  },

  async saveEntryBackground(entryData) {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let finalImg = entryData.img;

      if (finalImg && finalImg.startsWith('data:image/')) {
        const uploadedUrl = await this.uploadPhoto(finalImg, 'entry');
        if (uploadedUrl) {
          finalImg = uploadedUrl;
          // Update cache with public URL
          const found = this.entriesCache.find(e => e.id === entryData.id);
          if (found) found.img = uploadedUrl;
        }
      }

      const dbRow = {
        id: entryData.id,
        user_id: user.id,
        date: entryData.date,
        mood: entryData.mood,
        text: entryData.text,
        good: entryData.good,
        upset: entryData.upset,
        improve: entryData.improve,
        img: finalImg
      };

      const { error } = await supabase
        .from('entries')
        .upsert(dbRow, { onConflict: 'user_id, date' });

      if (error) {
        console.error("Error saving entry to Supabase DB:", error);
      }
    } catch (e) {
      console.error("Error in background entry saver:", e);
    }
  },

  deleteEntry(id) {
    if (!this.entriesCache) return;
    this.entriesCache = this.entriesCache.filter(e => e.id !== id);

    if (supabase) {
      supabase
        .from('entries')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error("Error deleting entry from Supabase:", error);
        });
    }
  },

  getLampState() {
    return this.profileCache ? this.profileCache.lamp_status : false;
  },

  setLampState(isOn) {
    if (this.profileCache) {
      this.profileCache.lamp_status = isOn;
      this.saveProfileBackground();
    }
  },

  getPhotoFrameImage() {
    return this.profileCache ? this.profileCache.custom_frame_img : null;
  },

  async setPhotoFrameImage(imgBase64) {
    if (this.profileCache) {
      this.profileCache.custom_frame_img = imgBase64;
    }
    // Upload in background
    const url = await this.uploadPhoto(imgBase64, 'frame');
    if (url && this.profileCache) {
      this.profileCache.custom_frame_img = url;
      this.saveProfileBackground();
    }
  },

  getLeftStickyQuote() {
    return this.profileCache ? this.profileCache.sticky_left : 'be gentle with yourself 🌸';
  },

  setLeftStickyQuote(quote) {
    if (this.profileCache) {
      this.profileCache.sticky_left = quote;
      this.saveProfileBackground();
    }
  },

  getStickyQuote() {
    return this.profileCache ? this.profileCache.sticky_center : 'Cherish yourself, because you are worth it.';
  },

  setStickyQuote(quote) {
    if (this.profileCache) {
      this.profileCache.sticky_center = quote;
      this.saveProfileBackground();
    }
  },

  getRightStickyQuote() {
    return this.profileCache ? this.profileCache.sticky_right : 'grow at your own pace 🌱';
  },

  setRightStickyQuote(quote) {
    if (this.profileCache) {
      this.profileCache.sticky_right = quote;
      this.saveProfileBackground();
    }
  },

  getChecklist() {
    return this.profileCache ? this.profileCache.checklist : [];
  },

  saveChecklist(list) {
    if (this.profileCache) {
      this.profileCache.checklist = list;
      this.saveProfileBackground();
    }
  },

  getActiveTheme() {
    return this.profileCache ? this.profileCache.active_theme : 'theme-forest';
  },

  setActiveTheme(themeName) {
    if (this.profileCache) {
      this.profileCache.active_theme = themeName;
      this.saveProfileBackground();
    }
  }
};

export { supabase, isConfigured };
export default DB;
