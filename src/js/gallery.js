/**
 * CAPTO GALLERY CONTROLLER
 * Browse & Play Saved Videos and High-Fidelity Voice Recordings with Category Filtering
 */

class CaptoGallery {
  constructor() {
    this.galleryGrid = null;
    this.btnOpenFolder = null;
    this.btnClearLibrary = null;
    this.currentFilter = 'all'; // 'all' | 'video' | 'voice'
    this.isInitialized = false;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.galleryGrid = document.getElementById('gallery-grid');
    this.btnOpenFolder = document.getElementById('btn-open-folder');
    this.btnClearLibrary = document.getElementById('btn-clear-library');

    if (this.btnOpenFolder) {
      this.btnOpenFolder.onclick = () => {
        if (window.electronAPI) {
          window.electronAPI.openRecordingsFolder();
        }
      };
    }

    if (this.btnClearLibrary) {
      this.btnClearLibrary.onclick = async () => {
        const confirmClear = confirm('Are you sure you want to remove all recordings from the Studio Library? This will permanently delete the files.');
        if (confirmClear && window.electronAPI && window.electronAPI.clearAllRecordings) {
          await window.electronAPI.clearAllRecordings();
          this.loadRecordings();
        }
      };
    }

    // Filter Buttons
    const filterBtns = document.querySelectorAll('.lib-filter-btn');
    filterBtns.forEach(btn => {
      btn.onclick = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter || 'all';
        this.loadRecordings();
      };
    });

    // Initial Load
    this.loadRecordings();
  }

  pauseAllMedia(exceptMedia = null) {
    if (!this.galleryGrid) return;
    const allVideos = this.galleryGrid.querySelectorAll('video');
    allVideos.forEach(v => {
      if (v !== exceptMedia && !v.paused) {
        v.pause();
        const pill = v.parentElement ? v.parentElement.querySelector('.play-overlay-pill') : null;
        if (pill) pill.style.display = 'flex';
      }
    });

    const allAudios = this.galleryGrid.querySelectorAll('audio');
    allAudios.forEach(a => {
      if (a !== exceptMedia && !a.paused) {
        a.pause();
        const card = a.closest('.recording-card');
        const playBtn = card ? card.querySelector('.audio-play-btn') : null;
        if (playBtn) playBtn.textContent = '▶';
        const wave = card ? card.querySelector('.audio-wave-anim') : null;
        if (wave) wave.classList.remove('playing');
      }
    });
  }

  pauseAllVideos() {
    this.pauseAllMedia();
  }

  createVoiceCard(rec) {
    const dateStr = new Date(rec.createdAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const sizeMb = (rec.sizeBytes / (1024 * 1024)).toFixed(1);
    const normalizedPath = rec.fullPath.replace(/\\/g, '/');
    const fileUrl = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;

    const card = document.createElement('div');
    card.className = 'recording-card audio-recording-card';
    card.innerHTML = `
      <div class="audio-card-body" title="Click to play / pause voice recording">
        <audio src="${fileUrl}" preload="metadata"></audio>
        <div class="audio-main-row">
          <button class="audio-play-btn" title="Play / Pause">▶</button>
          <div class="audio-info-col">
            <span class="rec-title-text" title="${rec.filename}">${rec.filename}</span>
            <span class="audio-tag-pill">🎙️ AI ANC Voice Clip</span>
          </div>
        </div>
        <div class="audio-wave-anim">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <div class="recording-meta">
        <span style="font-size: 10px; color: var(--text-tertiary);">${dateStr}</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span class="rec-size-badge">${sizeMb} MB</span>
          <button class="glass-action-btn" style="padding: 2px 8px; font-size: 10px;" data-path="${rec.fullPath}" title="Reveal in File Explorer">
            📁
          </button>
          <button class="glass-action-btn card-delete-btn" style="padding: 2px 8px; font-size: 10px; color: #FF453A;" data-delete-path="${rec.fullPath}" title="Delete Recording">
            🗑️
          </button>
        </div>
      </div>
    `;

    const audio = card.querySelector('audio');
    const playBtn = card.querySelector('.audio-play-btn');
    const waveAnim = card.querySelector('.audio-wave-anim');
    const cardBody = card.querySelector('.audio-card-body');

    const toggleAudioPlay = () => {
      if (audio.paused) {
        this.pauseAllMedia(audio);
        audio.play().catch(() => {});
        playBtn.textContent = '⏸';
        waveAnim.classList.add('playing');
      } else {
        audio.pause();
        playBtn.textContent = '▶';
        waveAnim.classList.remove('playing');
      }
    };

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAudioPlay();
    });

    cardBody.addEventListener('click', () => {
      toggleAudioPlay();
    });

    audio.addEventListener('ended', () => {
      playBtn.textContent = '▶';
      waveAnim.classList.remove('playing');
    });

    audio.addEventListener('pause', () => {
      playBtn.textContent = '▶';
      waveAnim.classList.remove('playing');
    });

    return card;
  }

  createPhotoCard(rec) {
    const dateStr = new Date(rec.createdAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const sizeMb = (rec.sizeBytes / (1024 * 1024)).toFixed(1);
    const normalizedPath = rec.fullPath.replace(/\\/g, '/');
    const fileUrl = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;

    const card = document.createElement('div');
    card.className = 'recording-card';
    card.innerHTML = `
      <div class="recording-thumb" title="Click to view photo">
        <img src="${fileUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="Screenshot">
        <div class="play-overlay-pill" style="font-size: 11px;">📸 View</div>
      </div>
      <div class="recording-meta">
        <span class="rec-title-text" title="${rec.filename}">${rec.filename}</span>
        <span class="rec-size-badge">${sizeMb} MB</span>
      </div>
      <div class="recording-meta">
        <span style="font-size: 10px; color: var(--text-tertiary);">${dateStr}</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="glass-action-btn" style="padding: 2px 8px; font-size: 10px;" data-path="${rec.fullPath}" title="Reveal in File Explorer">
            📁 Reveal
          </button>
          <button class="glass-action-btn card-delete-btn" style="padding: 2px 8px; font-size: 10px; color: #FF453A;" data-delete-path="${rec.fullPath}" title="Delete Screenshot">
            🗑️
          </button>
        </div>
      </div>
    `;

    const thumb = card.querySelector('.recording-thumb');
    thumb.addEventListener('click', () => {
      if (window.electronAPI) {
        window.electronAPI.revealFile(rec.fullPath);
      }
    });

    return card;
  }

  createVideoCard(rec) {
    const dateStr = new Date(rec.createdAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const sizeMb = (rec.sizeBytes / (1024 * 1024)).toFixed(1);
    const normalizedPath = rec.fullPath.replace(/\\/g, '/');
    const fileUrl = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;

    const card = document.createElement('div');
    card.className = 'recording-card';
    card.innerHTML = `
      <div class="recording-thumb" title="Click to play / pause">
        <video src="${fileUrl}" preload="metadata"></video>
        <div class="play-overlay-pill">▶</div>
      </div>
      <div class="recording-meta">
        <span class="rec-title-text" title="${rec.filename}">${rec.filename}</span>
        <span class="rec-size-badge">${sizeMb} MB</span>
      </div>
      <div class="recording-meta">
        <span style="font-size: 10px; color: var(--text-tertiary);">${dateStr}</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="glass-action-btn" style="padding: 2px 8px; font-size: 10px;" data-path="${rec.fullPath}" title="Reveal in File Explorer">
            📁 Reveal
          </button>
          <button class="glass-action-btn card-delete-btn" style="padding: 2px 8px; font-size: 10px; color: #FF453A;" data-delete-path="${rec.fullPath}" title="Delete Recording">
            🗑️
          </button>
        </div>
      </div>
    `;

    const thumb = card.querySelector('.recording-thumb');
    const video = card.querySelector('video');
    const playPill = card.querySelector('.play-overlay-pill');

    video.addEventListener('play', () => {
      this.pauseAllMedia(video);
      playPill.style.display = 'none';
    });

    video.addEventListener('pause', () => {
      playPill.style.display = 'flex';
    });

    video.addEventListener('ended', () => {
      playPill.style.display = 'flex';
    });

    thumb.addEventListener('click', () => {
      if (video.paused) {
        this.pauseAllMedia(video);
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });

    return card;
  }

  async loadRecordings() {
    if (!this.galleryGrid) {
      this.galleryGrid = document.getElementById('gallery-grid');
    }
    if (!this.galleryGrid) return;

    let recordings = [];
    if (window.electronAPI && window.electronAPI.getRecordingsList) {
      recordings = await window.electronAPI.getRecordingsList();
    }

    this.galleryGrid.innerHTML = '';

    if (recordings.length === 0) {
      this.galleryGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-tertiary);">
          <div style="font-size: 36px; margin-bottom: 8px;">📁</div>
          <div style="font-size: 14px; font-weight: 700; color: white;">No recordings in library yet</div>
          <div style="font-size: 11px; margin-top: 4px;">Recordings and voice notes will appear here automatically</div>
        </div>
      `;
      return;
    }

    const videos = recordings.filter(r => !r.filename.includes('Voice') && !r.filename.endsWith('.wav') && !r.filename.endsWith('.png'));
    const voiceNotes = recordings.filter(r => r.filename.includes('Voice') || r.filename.endsWith('.wav'));
    const photos = recordings.filter(r => r.filename.endsWith('.png'));

    const attachCardListeners = (container) => {
      const revealBtns = container.querySelectorAll('button[data-path]');
      revealBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.electronAPI) {
            window.electronAPI.revealFile(btn.dataset.path);
          }
        });
      });

      const deleteBtns = container.querySelectorAll('button[data-delete-path]');
      deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetPath = btn.dataset.deletePath;
          const confirmDelete = confirm('Are you sure you want to delete this recording?');
          if (confirmDelete && window.electronAPI && window.electronAPI.deleteRecording) {
            await window.electronAPI.deleteRecording(targetPath);
            this.loadRecordings();
          }
        });
      });
    };

    if (this.currentFilter === 'video') {
      if (videos.length === 0) {
        this.galleryGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-tertiary);">
            <div style="font-size: 36px; margin-bottom: 8px;">🎬</div>
            <div style="font-size: 14px; font-weight: 700; color: white;">No video recordings yet</div>
          </div>
        `;
        return;
      }
      const title = document.createElement('div');
      title.className = 'lib-section-title';
      title.innerHTML = `<span>🎬 Recorded Videos</span> <span style="font-size: 10px; color: var(--text-tertiary);">(${videos.length})</span>`;
      this.galleryGrid.appendChild(title);
      videos.forEach(v => this.galleryGrid.appendChild(this.createVideoCard(v)));
      attachCardListeners(this.galleryGrid);
      return;
    }

    if (this.currentFilter === 'voice') {
      if (voiceNotes.length === 0) {
        this.galleryGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-tertiary);">
            <div style="font-size: 36px; margin-bottom: 8px;">🎙️</div>
            <div style="font-size: 14px; font-weight: 700; color: white;">No voice recordings yet</div>
          </div>
        `;
        return;
      }
      const title = document.createElement('div');
      title.className = 'lib-section-title';
      title.innerHTML = `<span>🎙️ Voice Notes & Audio Clips</span> <span style="font-size: 10px; color: var(--text-tertiary);">(${voiceNotes.length})</span>`;
      this.galleryGrid.appendChild(title);
      voiceNotes.forEach(v => this.galleryGrid.appendChild(this.createVoiceCard(v)));
      attachCardListeners(this.galleryGrid);
      return;
    }

    // Default 'all' view: Show sections for videos, voice clips and photos
    if (videos.length > 0) {
      const vTitle = document.createElement('div');
      vTitle.className = 'lib-section-title';
      vTitle.innerHTML = `<span>🎬 Video Recordings</span> <span style="font-size: 10px; color: var(--text-tertiary);">(${videos.length})</span>`;
      this.galleryGrid.appendChild(vTitle);
      videos.forEach(v => this.galleryGrid.appendChild(this.createVideoCard(v)));
    }

    if (voiceNotes.length > 0) {
      const aTitle = document.createElement('div');
      aTitle.className = 'lib-section-title';
      aTitle.innerHTML = `<span>🎙️ Voice Notes</span> <span style="font-size: 10px; color: var(--text-tertiary);">(${voiceNotes.length})</span>`;
      this.galleryGrid.appendChild(aTitle);
      voiceNotes.forEach(a => this.galleryGrid.appendChild(this.createVoiceCard(a)));
    }

    if (photos.length > 0) {
      const pTitle = document.createElement('div');
      pTitle.className = 'lib-section-title';
      pTitle.innerHTML = `<span>📸 Screenshots</span> <span style="font-size: 10px; color: var(--text-tertiary);">(${photos.length})</span>`;
      this.galleryGrid.appendChild(pTitle);
      photos.forEach(p => this.galleryGrid.appendChild(this.createPhotoCard(p)));
    }

    attachCardListeners(this.galleryGrid);
  }
}

window.fligoGallery = new CaptoGallery();
window.refreshGallery = () => window.fligoGallery.loadRecordings();

