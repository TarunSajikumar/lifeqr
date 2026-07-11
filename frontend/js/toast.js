// Toast notification system for LifeQR
window.showToast = function(message, type = 'info', duration = 5000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Set icons based on status
  let icon = 'info';
  if (type === 'success') icon = 'check_circle';
  if (type === 'error') icon = 'cancel';
  if (type === 'warning') icon = 'warning';
  if (type === 'emergency') icon = 'emergency';

  toast.innerHTML = `
    <span class="material-symbols-outlined">${icon}</span>
    <div style="flex-1; font-weight: 600;">${message}</div>
    <span class="material-symbols-outlined" style="cursor: pointer; opacity: 0.6;" onclick="this.parentElement.remove()">close</span>
  `;

  container.appendChild(toast);

  // Play audio sound on emergency alert triggers
  if (type === 'emergency') {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch alert tone
      osc.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5); // beep duration
    } catch (e) {
      console.warn('Audio play alert blocked by browser autoplay policy.');
    }
  }

  // Remove toast automatically
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
};
