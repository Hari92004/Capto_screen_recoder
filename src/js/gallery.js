/**
 * CAPTO GALLERY CONTROLLER
 * Browse & Play Saved Videos and High-Fidelity Voice Recordings with 2-Section Switcher (Video vs Voice)
 */

class CaptoGallery {
  constructor() {
    this.galleryGrid = null;
    this.btnOpenFolder = null;
    this.btnClearLibrary = null;
    this.currentFilter = 'video'; // Default to 'video' section
    this.isInitialized = false;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.galleryGrid = document.getElementById('gallery-grid');
    this.btnOpenFolder = document.getElementById('btn-open-folder');
    this.btnClearLibrary = document.getElementById('btn-clear-library');

    if (this.btnOpenFolder) {
      this.btnOpenFolder.onclick = () => {
        if (window.electronAPI && window.electronAPI.openRecordingsFolder) {
          window.electronAPI.openRecordingsFolder();
        }
      };
    }

    if (this.btnClearLibrary) {
      this.btnClearLibrary.onclick = async () => {
        const confirmClear = confirm('Are you sure you want to remove all recordings from the Studio Library? This will permanently delete the files from your Screen Recordings folder.');
        if (confirmClear && window.electronAPI && window.electronAPI.clearAllRecordings) {
          await window.electronAPI.clearAllRecordings();
          this.loadRecordings();
        }
      };
    }

    // 2-Section Switcher Buttons (Video vs Voice)
    const switchBtns = document.querySelectorAll('.lib-switch-btn');
    switchBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        switchBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.pauseAllMedia();
        this.currentFilter = btn.dataset.filter || 'video';
        this.loadRecordings();
      };
    });

    this.isInitialized = true;
    this.loadRecordings();
  }

  getMediaUrl(fullPath) {
    const normalized = fullPath.replace(/\\/g, '/');
    const rawUrl = normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
    return encodeURI(rawUrl);
  }

  pauseAllMedia(exceptMedia = null) {
    if (!this.galleryGrid) this.galleryGrid = document.getElementById('gallery-grid');
    if (!this.galleryGrid) return;

    const allVideos = this.galleryGrid.querySelectorAll('video');
    allVideos.forEach(v => {
      if (v !== exceptMedia && !v.paused) {
        v.pause();
        const pill = v.parentElement ? v.parentElement.querySelector('.play-overlay-pill') : null;
        if (pill) {
          pill.style.display = 'flex';
          pill.textContent = '▶';
        }
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
    const fileUrl = this.getMediaUrl(rec.fullPath);

    const card = document.createElement('div');
    card.className = 'recording-card audio-recording-card';
    card.innerHTML = `
      <div class="audio-card-body" title="Click to play / pause voice recording">
        <audio src="${fileUrl}" preload="metadata"></audio>
        <div class="audio-main-row">
          <button class="audio-play-btn" title="Play / Pause">▶</button>
          <div class="audio-info-col">
            <span class="rec-title-text" title="${rec.filename}">${rec.filename}</span>
            <span class="audio-tag-pill">🎙️ Voice Note</span>
          </div>
        </div>
        <div class="audio-wave-anim">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <div class="recording-meta">
        <span style="font-size: 10px; color: var(--text-tertiary);">${dateStr}</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span class="rec-size-badge" style="color: #AF52DE;">${sizeMb} MB</span>
          <button class="glass-action-btn" style="padding: 2px 8px; font-size: 10px;" data-path="${rec.fullPath}" title="Reveal in File Explorer">
            📁 Reveal
          </button>
          <button class="glass-action-btn card-delete-btn" style="padding: 2px 8px; font-size: 10px; color: #FF453A;" data-delete-path="${rec.fullPath}" title="Delete Voice Recording">
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
        audio.play().catch(e => console.warn('Audio play error:', e));
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
    const fileUrl = this.getMediaUrl(rec.fullPath);

    const card = document.createElement('div');
    card.className = 'recording-card';
    card.innerHTML = `
      <div class="recording-thumb" title="Click to view screenshot">
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
      if (window.electronAPI && window.electronAPI.revealFile) {
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
    const fileUrl = this.getMediaUrl(rec.fullPath);

    const card = document.createElement('div');
    card.className = 'recording-card';
    card.innerHTML = `
      <div class="recording-thumb" title="Click to play / pause video">
        <video src="${fileUrl}" preload="metadata" playsinline></video>
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

    video.addEventListener('loadeddata', () => {
      try {
        if (video.currentTime === 0) {
          video.currentTime = 0.1;
        }
      } catch (e) {}
    });

    video.addEventListener('play', () => {
      this.pauseAllMedia(video);
      playPill.style.display = 'none';
    });

    video.addEventListener('pause', () => {
      playPill.style.display = 'flex';
      playPill.textContent = '▶';
    });

    video.addEventListener('ended', () => {
      playPill.style.display = 'flex';
      playPill.textContent = '▶';
    });

    thumb.addEventListener('click', () => {
      if (video.paused) {
        this.pauseAllMedia(video);
        video.play().catch(e => console.warn('Video play error:', e));
      } else {
        video.pause();
      }
    });

    return card;
  }

  async loadRecordings() {
    this.galleryGrid = document.getElementById('gallery-grid');
    if (!this.galleryGrid) return;

    let recordings = [];
    if (window.electronAPI && window.electronAPI.getRecordingsList) {
      recordings = await window.electronAPI.getRecordingsList();
    }

    console.log(`[Gallery] Loaded ${recordings.length} items. Active filter: ${this.currentFilter}`);

    // Separate media into categories
    const isPureAudio = (f) => {
      const lower = f.toLowerCase();
      return lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.ogg') || lower.endsWith('.aac') || lower.endsWith('.flac') || (lower.includes('voice') && !lower.endsWith('.mp4'));
    };
    const isPhoto = (f) => {
      const lower = f.toLowerCase();
      return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg');
    };

    const videos = recordings.filter(r => !isPureAudio(r.filename));
    const voiceNotes = recordings.filter(r => isPureAudio(r.filename));

    // Update section badges
    const videoBadge = document.getElementById('video-count-badge');
    if (videoBadge) videoBadge.textContent = String(videos.length);
    const voiceBadge = document.getElementById('voice-count-badge');
    if (voiceBadge) voiceBadge.textContent = String(voiceNotes.length);

    this.galleryGrid.innerHTML = '';

    const attachCardListeners = (container) => {
      const revealBtns = container.querySelectorAll('button[data-path]');
      revealBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.electronAPI && window.electronAPI.revealFile) {
            window.electronAPI.revealFile(btn.dataset.path);
          }
        });
      });

      const deleteBtns = container.querySelectorAll('button[data-delete-path]');
      deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetPath = btn.dataset.deletePath;
          const confirmDelete = confirm('Are you sure you want to delete this recording from your disk?');
          if (confirmDelete && window.electronAPI && window.electronAPI.deleteRecording) {
            await window.electronAPI.deleteRecording(targetPath);
            this.loadRecordings();
          }
        });
      });
    };

    // 1. VIDEO SECTION
    if (this.currentFilter === 'video') {
      if (videos.length === 0) {
        this.galleryGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
            <div style="font-size: 38px; margin-bottom: 10px;">🎬</div>
            <div style="font-size: 15px; font-weight: 700; color: #FFFFFF;">No Video Recordings Yet</div>
            <div style="font-size: 11px; margin-top: 6px; color: rgba(255, 255, 255, 0.6); line-height: 1.4;">
              Screen and webcam recordings saved to <i>Screen Recordings</i> will appear here.
            </div>
          </div>
        `;
        return;
      }

      videos.forEach(v => {
        if (isPhoto(v.filename)) {
          this.galleryGrid.appendChild(this.createPhotoCard(v));
        } else {
          this.galleryGrid.appendChild(this.createVideoCard(v));
        }
      });
      attachCardListeners(this.galleryGrid);
      return;
    }

    // 2. VOICE SECTION
    if (this.currentFilter === 'voice') {
      if (voiceNotes.length === 0) {
        this.galleryGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
            <div style="font-size: 38px; margin-bottom: 10px;">🎙️</div>
            <div style="font-size: 15px; font-weight: 700; color: #FFFFFF;">No Voice Recordings Yet</div>
            <div style="font-size: 11px; margin-top: 6px; color: rgba(255, 255, 255, 0.6); line-height: 1.4;">
              Studio voice clips and AI ANC audio recordings will appear here.
            </div>
          </div>
        `;
        return;
      }

      voiceNotes.forEach(v => this.galleryGrid.appendChild(this.createVoiceCard(v)));
      attachCardListeners(this.galleryGrid);
      return;
    }

    // 3. ALL MEDIA SECTION (Shows both sections: 🎬 Videos & 🎙️ Voice Notes)
    if (this.currentFilter === 'all') {
      if (recordings.length === 0) {
        this.galleryGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
            <div style="font-size: 38px; margin-bottom: 10px;">📁</div>
            <div style="font-size: 15px; font-weight: 700; color: #FFFFFF;">No Media Recordings Yet</div>
            <div style="font-size: 11px; margin-top: 6px; color: rgba(255, 255, 255, 0.6); line-height: 1.4;">
              All screen captures, webcam videos, and voice recordings will appear here.
            </div>
          </div>
        `;
        return;
      }

      if (videos.length > 0) {
        const vHeader = document.createElement('div');
        vHeader.className = 'lib-section-title';
        vHeader.innerHTML = `<span>🎬 Videos & Screen Captures</span> <span class="switch-badge">${videos.length}</span>`;
        this.galleryGrid.appendChild(vHeader);
        videos.forEach(v => this.galleryGrid.appendChild(this.createVideoCard(v)));
      }

      if (voiceNotes.length > 0) {
        const aHeader = document.createElement('div');
        aHeader.className = 'lib-section-title';
        aHeader.innerHTML = `<span>🎙️ Voice Recordings & Audio</span> <span class="switch-badge" style="background: rgba(94, 92, 230, 0.35); color: #FFF;">${voiceNotes.length}</span>`;
        this.galleryGrid.appendChild(aHeader);
        voiceNotes.forEach(v => this.galleryGrid.appendChild(this.createVoiceCard(v)));
      }

      attachCardListeners(this.galleryGrid);
      return;
    }
  }
}

window.fligoGallery = new CaptoGallery();
window.refreshGallery = () => {
  if (window.fligoGallery) {
    window.fligoGallery.loadRecordings();
  }
};
