/**
 * CAPTO GALLERY CONTROLLER
 * Browse, Playback, and Reveal Saved Recordings
 */

class CaptoGallery {
  constructor() {
    this.galleryGrid = document.getElementById('gallery-grid');
    this.btnOpenFolder = document.getElementById('btn-open-folder');

    if (this.btnOpenFolder) {
      this.btnOpenFolder.addEventListener('click', () => {
        if (window.electronAPI) {
          window.electronAPI.openRecordingsFolder();
        }
      });
    }
  }

  async loadRecordings() {
    if (!this.galleryGrid) return;

    let recordings = [];
    if (window.electronAPI && window.electronAPI.getRecordingsList) {
      recordings = await window.electronAPI.getRecordingsList();
    }

    this.galleryGrid.innerHTML = '';

    if (recordings.length === 0) {
      this.galleryGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
          <div style="font-size: 38px; margin-bottom: 10px;">🎬</div>
          <div style="font-size: 14px; font-weight: 700; color: white;">No recordings yet</div>
          <div style="font-size: 11px; margin-top: 4px;">Your recorded videos will appear here in high quality</div>
        </div>
      `;
      return;
    }

    recordings.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'recording-card';

      const dateStr = new Date(rec.createdAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const sizeMb = (rec.sizeBytes / (1024 * 1024)).toFixed(1);

      card.innerHTML = `
        <div class="recording-thumb" title="Click to play / pause">
          <video src="file://${rec.fullPath}" preload="metadata"></video>
          <div class="play-overlay-pill">▶</div>
        </div>
        <div class="recording-meta">
          <span class="rec-title-text" title="${rec.filename}">${rec.filename}</span>
          <span class="rec-size-badge">${sizeMb} MB</span>
        </div>
        <div class="recording-meta">
          <span style="font-size: 10px; color: var(--text-tertiary);">${dateStr}</span>
          <button class="glass-action-btn" style="padding: 2px 10px; font-size: 10px;" data-path="${rec.fullPath}">
            Reveal
          </button>
        </div>
      `;

      // Play / Pause video on click
      const thumb = card.querySelector('.recording-thumb');
      const video = card.querySelector('video');
      const playPill = card.querySelector('.play-overlay-pill');

      thumb.addEventListener('click', () => {
        if (video.paused) {
          video.play();
          playPill.style.display = 'none';
        } else {
          video.pause();
          playPill.style.display = 'flex';
        }
      });

      video.addEventListener('ended', () => {
        playPill.style.display = 'flex';
      });

      // Reveal in file explorer
      const revealBtn = card.querySelector('button[data-path]');
      revealBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.electronAPI) {
          window.electronAPI.revealFile(rec.fullPath);
        }
      });

      this.galleryGrid.appendChild(card);
    });
  }
}

window.fligoGallery = new CaptoGallery();
window.refreshGallery = () => window.fligoGallery.loadRecordings();
