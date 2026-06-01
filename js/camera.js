const Camera = {
  stream: null,

  async start(videoElement) {
    if (this.stream) {
      this.stop();
    }
    
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'user'
        },
        audio: false
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      videoElement.setAttribute('playsinline', true);
      videoElement.play();
      return { success: true };
    } catch (error) {
      console.warn('Webcam access failed:', error);
      return { 
        success: false, 
        message: 'Could not access camera. Please upload an image or check permissions.' 
      };
    }
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  },

  capture(videoElement) {
    if (!videoElement || videoElement.paused || videoElement.ended) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const size = Math.min(videoElement.videoWidth, videoElement.videoHeight);
    canvas.width = 400;
    canvas.height = 400;

    const ctx = canvas.getContext('2d');
    
    // Draw cropped square from center of video stream
    const sx = (videoElement.videoWidth - size) / 2;
    const sy = (videoElement.videoHeight - size) / 2;
    
    ctx.drawImage(
      videoElement,
      sx, sy, size, size, // source coords
      0, 0, 400, 400      // dest coords
    );

    return canvas.toDataURL('image/jpeg', 0.85);
  }
};

export default Camera;
