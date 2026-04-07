/**
 * QR Code Scanner Module using Camera and jsQR library
 * Provides camera access and QR code detection
 */

class QRScanner {
  constructor(options = {}) {
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
    this.videoStream = null;
    this.isScanning = false;
  }

  /**
   * Open scanner modal and start camera
   */
  async start() {
    // Create modal if it doesn't exist
    if (!document.getElementById('qrScannerModal')) {
      this.createModal();
    }

    const modal = document.getElementById('qrScannerModal');
    modal.classList.remove('hidden');

    try {
      // Request camera access
      const constraints = {
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = document.getElementById('qrScannerVideo');
      video.srcObject = this.videoStream;
      
      // Ensure video plays
      video.play().catch(err => {
        console.error('Error playing video:', err);
        this.onError('Could not start video stream');
      });
      
      // Start scanning when video is ready
      setTimeout(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          this.isScanning = true;
          this.scanFrame();
        } else {
          video.onloadedmetadata = () => {
            this.isScanning = true;
            this.scanFrame();
          };
        }
      }, 500);
    } catch (error) {
      console.error('Camera access error:', error);
      let errorMessage = 'Unable to access camera. Please check permissions.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      }
      
      this.onError(errorMessage);
      modal.classList.add('hidden');
    }
  }

  /**
   * Stop camera and close modal
   */
  stop() {
    this.isScanning = false;
    
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    const modal = document.getElementById('qrScannerModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Scan video frame for QR codes
   */
  scanFrame() {
    if (!this.isScanning) return;

    const video = document.getElementById('qrScannerVideo');
    const canvas = document.getElementById('qrScannerCanvas');
    const context = canvas.getContext('2d');

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // Video not ready yet, try again
      requestAnimationFrame(() => this.scanFrame());
      return;
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Try to detect QR code using jsQR
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code) {
      // Extract QR code ID from URL or use as-is
      const qrValue = this.extractQRId(code.data);
      
      console.log('QR Code detected:', qrValue);
      this.stop();
      this.onSuccess(qrValue);
      return;
    }

    // Continue scanning
    requestAnimationFrame(() => this.scanFrame());
  }

  /**
   * Extract QR ID from URL or text
   */
  extractQRId(qrData) {
    // If it's a URL with id parameter, extract it
    if (qrData.includes('id=')) {
      const url = new URL(qrData);
      return url.searchParams.get('id');
    }
    
    // If it's a full URL, extract the last part
    if (qrData.includes('/')) {
      const parts = qrData.split('/');
      return parts[parts.length - 1];
    }
    
    // Otherwise return as-is (assume it's the ID)
    return qrData;
  }

  /**
   * Create scanner modal UI
   */
  createModal() {
    const modal = document.createElement('div');
    modal.id = 'qrScannerModal';
    modal.className = 'hidden fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-bold text-xl">Scan QR Code</h3>
            <button onclick="window.qrScanner?.stop()" class="text-white hover:bg-white/20 p-2 rounded-lg transition">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <p class="text-white/90 text-sm">Point camera at QR code to scan</p>
        </div>

        <!-- Camera View -->
        <div class="relative bg-black aspect-square overflow-hidden">
          <video 
            id="qrScannerVideo" 
            autoplay
            muted
            playsinline
            style="width: 100%; height: 100%; display: block; object-fit: cover;"
          ></video>
          <canvas 
            id="qrScannerCanvas" 
            class="hidden"
          ></canvas>

          <!-- Scanner frame overlay -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="relative w-64 h-64 border-2 border-green-400 rounded-lg opacity-70">
              <!-- Corner indicators -->
              <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
              <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
              <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
              <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
            </div>
          </div>

          <!-- Scanning indicator -->
          <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div class="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur">
              <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span class="text-sm font-medium">Scanning...</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 bg-gray-50 border-t">
          <button 
            onclick="window.qrScanner?.stop()" 
            class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }
}

// Global instance
window.qrScanner = null;

/**
 * Initialize QR Scanner with callbacks
 */
window.initQRScanner = function(onSuccess, onError) {
  window.qrScanner = new QRScanner({
    onSuccess: onSuccess,
    onError: onError || ((err) => alert(err))
  });
};

/**
 * Start scanning
 */
window.startQRScanner = function() {
  if (!window.qrScanner) {
    window.initQRScanner(
      (qrValue) => {
        console.log('QR Code result:', qrValue);
      },
      (error) => {
        alert('Scanner error: ' + error);
      }
    );
  }
  window.qrScanner.start();
};
