const AudioSynth = {
  audio: null,
  isPlaying: false,

  init() {
    if (this.audio) return;
    
    // Create HTMLAudioElement with Pixabay's Nature Birds Forest sound
    this.audio = new Audio('https://cdn.pixabay.com/download/audio/2025/11/30/audio_b96506e0f1.mp3?filename=soundreality-birds-forest-nature-445379.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.5; // default volume
  },

  async start() {
    this.init();
    try {
      await this.audio.play();
      this.isPlaying = true;
    } catch (err) {
      console.error('Audio play failed:', err);
    }
  },

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }
  },

  setRainVolume(volume) {
    // dummy method to avoid breaking other scripts calling it
  },

  setFireVolume(volume) {
    // dummy method to avoid breaking other scripts calling it
  },

  setMasterVolume(volume) {
    this.init();
    if (this.audio) {
      this.audio.volume = parseFloat(volume);
    }
  }
};

export default AudioSynth;
