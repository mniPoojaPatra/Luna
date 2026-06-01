import DB from './db.js';
import AudioSynth from './audio.js';

const ThemeManager = {
  activeTheme: 'theme-forest',
  isAudioPlaying: false,

  init() {
    this.activeTheme = DB.getActiveTheme();
    this.applyTheme(this.activeTheme);
    this.bindEvents();
    this.updateRadioUI();
    this.syncSliders();
  },

  applyTheme(themeName) {
    const body = document.body;
    // Remove other theme classes
    body.className = body.className.replace(/\btheme-\S+/g, '');
    body.classList.add(themeName);
    
    // Save to database
    DB.setActiveTheme(themeName);
    this.activeTheme = themeName;

    // Set active button state
    document.querySelectorAll('.theme-btn').forEach(btn => {
      if (btn.getAttribute('data-theme') === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Optional: adjust particle accents or details
  },

  bindEvents() {
    // Theme switcher buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        this.applyTheme(theme);
      });
    });

    // Retro Radio Play Button
    const playBtn = document.getElementById('radio-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', async () => {
        const radioWidget = document.querySelector('.widget-radio');
        
        if (this.isAudioPlaying) {
          // Stop audio
          AudioSynth.stop();
          this.isAudioPlaying = false;
          playBtn.innerHTML = '▶';
          if (radioWidget) radioWidget.classList.remove('playing');
        } else {
          // Play audio
          await AudioSynth.start();
          this.isAudioPlaying = true;
          playBtn.innerHTML = '⏸';
          if (radioWidget) radioWidget.classList.add('playing');
          
          // Apply current slider values
          this.syncSliders();
        }
      });
    }

    // Radio Volume Knob Dial
    const volumeKnob = document.getElementById('radio-volume-knob');
    const knobRotator = document.getElementById('radio-knob-rotator');
    
    if (volumeKnob && knobRotator) {
      volumeKnob.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const angle = -135 + val * 270;
        knobRotator.style.transform = `rotate(${angle}deg)`;
        AudioSynth.setMasterVolume(val);
      });
    }
  },

  syncSliders() {
    const volumeKnob = document.getElementById('radio-volume-knob');
    const knobRotator = document.getElementById('radio-knob-rotator');
    const masterVal = volumeKnob ? parseFloat(volumeKnob.value) : 0.5;

    if (volumeKnob && knobRotator) {
      const angle = -135 + masterVal * 270;
      knobRotator.style.transform = `rotate(${angle}deg)`;
    }

    AudioSynth.setMasterVolume(masterVal);
    AudioSynth.setRainVolume(0.45); // soft rain sound as default
    AudioSynth.setFireVolume(0.05); // very soft wood crackle default
  },

  updateRadioUI() {
    const playBtn = document.getElementById('radio-play-btn');
    const radioWidget = document.querySelector('.widget-radio');
    if (playBtn && radioWidget) {
      if (this.isAudioPlaying) {
        playBtn.innerHTML = '⏸';
        radioWidget.classList.add('playing');
      } else {
        playBtn.innerHTML = '▶';
        radioWidget.classList.remove('playing');
      }
    }
  },

  // Stop everything when user logs out
  reset() {
    if (this.isAudioPlaying) {
      AudioSynth.stop();
      this.isAudioPlaying = false;
      this.updateRadioUI();
    }
  }
};

export default ThemeManager;
