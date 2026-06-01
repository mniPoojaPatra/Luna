# Luna ✦ Cozy Night Journal

A warm, soft nightly sanctuary for self-reflection, mood tracking, and preserving your memories.
---

## 🌟 Features

### 1. Interactive Cozy Desk Setup (Dashboard)
- **Ambient Night Atmosphere**: Floating fireflies animation with 4 custom visual themes: Forest Vibes 🌲, Cherry Blossom 🌸, Sunset Dusk 🌇, and Night Coffee ☕.
- **Dynamic Spotlight Lamp**: Click the base switch to toggle a radial light beam tracking your cursor.
- **Handwritten Wall Notes**: Click any of the three background sticky notes to write and save your custom bedtime affirmations in a handwriting font.
- **Interactive Retro CRT Monitor**: Cycles display states on click:
  1. *LUNA OS v1.0* (Default green terminal moon logo)
  2. *Comforting Affirmations* (Randomized cozy bedtime messages)
  3. *Memory Recall* (Fetches and displays your most recent photo memory with a date caption)
- **Checklist Notebook**: Add to-do list items, tick them off, and track completed task ratios.

### 2. Retro Ambient Cassette Radio
- Streams a relaxing **Birds Forest Nature** ambient track.
- Fully adjustable volume dial with rotary rotation physics and equalizing audio bar animations.

### 3. The Postage Stamp Memory Wall
- A 6x6 pegboard grid mapping your last 36 days of thoughts.
- Empty cells let you click to back-write reflections for any past date.
- Stored memories hang as **postage stamp photo cards** connected with wooden clips and strings, which swing dynamically using hover physics.

### 4. Dual-Page Reflection Notebook
- Log your daily mood (Joyful, Cozy, Blue, Stormy, Loving).
- Capture a live webcam selfie using WebRTC or upload a local image to stamp onto your daily page.
- Structured sections for daily gratitude (🌸 beautiful moment), storms (🌧️ gentle storm), and self-growth (🌱 seed of growth).

### 5. Self-Care Calendar & Breathing guide
- Color-coded calendar showing logged mood trends.
- Auto-calculated daily journaling streak counts.
- **Breathing Balloon**: Interactive guide balloon to ground yourself with standard 10s cycles (Inhale, Hold, Exhale).

---

## 🛠️ Tech Stack & Architecture

- **Structure**: Semantic HTML5 markup.
- **Styling**: Vanilla CSS3, custom CSS variables mapping cohesive night themes, responsive layout sheets, and CRT flicker / swing keyframe animations.
- **Logic**: Pure Vanilla ES6 JavaScript modules:
  - `js/db.js` - LocalStorage data layer ensuring local, offline persistence.
  - `js/auth.js` - User profile, session storage, and passcode validations.
  - `js/camera.js` - Webcam video feeds and captures.
  - `js/audio.js` - Audio player controls.
  - `js/theme.js` - Theme styling switcher and radio volume dials.
  - `js/app.js` - Main app orchestrator binding page links, list items, calendar grids, and modal toggle logic.
- **Fonts**: Curated Google Web Fonts (`Fredoka`, `Quicksand`, `Caveat`) and custom handwriting font face (`Jelek Type`).

---

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/mniPoojaPatra/Luna.git
   ```
2. Navigate to the project root and launch a local web server (e.g., via node `http-server` or VS Code Live Server):
   ```bash
   npx http-server -p 8080
   ```
3. Open `http://127.0.0.1:8080` in your web browser.
