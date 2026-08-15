/**
 * FLIGO GALLERY CONTROLLER
 * Browse, Playback, and Reveal Saved Recordings
 */

class FligoGallery {
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
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-tertiary);">
          <div style="font-size: 32px; margin-bottom: 8px;">🎬</div>
          <div style="font-size: 13px; font-weight: 600;">No recordings yet</div>
          <div style="font-size: 11px;">Your recorded videos will appear here automatically</div>
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
        <div class="recording-thumb" title="Click to play">
          <video src="file://${rec.fullPath}" preload="metadata"></video>
          <div style="position: absolute; font-size: 24px; pointer-events: none; opacity: 0.9;">▶️</div>
        </div>
        <div class="recording-meta">
          <span style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 140px;" title="${rec.filename}">${rec.filename}</span>
          <span>${sizeMb} MB</span>
        </div>
        <div class="recording-meta">
          <span style="font-size: 10px; color: var(--text-tertiary);">${dateStr}</span>
          <button class="glass-btn" style="padding: 2px 8px; font-size: 10px;" data-path="${rec.fullPath}">
            Reveal
          </button>
        </div>
      `;

      // Play video on click
      const thumb = card.querySelector('.recording-thumb');
      const video = card.querySelector('video');
      thumb.addEventListener('click', () => {
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      });

      // Reveal in explorer
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

window.fligoGallery = new FligoGallery();
window.refreshGallery = () => window.fligoGallery.loadRecordings();
