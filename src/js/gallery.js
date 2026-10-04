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
            <span class="audio-tag-pill"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>Voice Note</span>
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
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>Reveal
          </button>
          <button class="glass-action-btn card-delete-btn" style="padding: 2px 8px; font-size: 10px; color: #FF453A;" data-delete-path="${rec.fullPath}" title="Delete Voice Recording">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;

    const audio = card.querySelector('audio');
    const playBtn = card.querySelector('.audio-play-btn');
    const waveAnim = card.querySelector('.audio-wave-anim');
    const cardBody = card.querySelector('.audio-card-body');

    const toggleAudioPlay = () => {
      const PLAY_SVG = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';
      const PAUSE_SVG = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>';
      if (audio.paused) {
        this.pauseAllMedia(audio);
        audio.play().catch(e => console.warn('Audio play error:', e));
        playBtn.innerHTML = PAUSE_SVG;
        waveAnim.classList.add('playing');
      } else {
        audio.pause();
        playBtn.innerHTML = PLAY_SVG;
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
      playBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';
      waveAnim.classList.remove('playing');
    });

    audio.addEventListener('pause', () => {
      playBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';
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
        <div class="play-overlay-pill" style="font-size: 11px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>View</div>
      </div>
      <div class="recording-meta">
        <span class="rec-title-text" title="${rec.filename}">${rec.filename}</span>
        <span class="rec-size-badge">${sizeMb} MB</span>
      </div>
      <div class="recording-meta">
        <span style="font-size: 10px; color: var(--text-tertiary);">${dateStr}</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="glass-action-btn" style="padding: 2px 8px; font-size: 10px;" data-path="${rec.fullPath}" title="Reveal in File Explorer">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>Reveal
          </button>
          <button class="glass-action-btn card-delete-btn" style="padding: 2px 8px; font-size: 10px; color: #FF453A;" data-delete-path="${rec.fullPath}" title="Delete Screenshot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
        <div class="play-overlay-pill"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg></div>
      </div>
      <div class="recording-meta">
        <span class="rec-title-text" title="${rec.filename}">${rec.filename}</span>
        <span class="rec-size-badge">${sizeMb} MB</span>
      </div>
      <div class="recording-meta">
        <span style="font-size: 10px; color: var(--text-tertiary);">${dateStr}</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="glass-action-btn" style="padding: 2px 8px; font-size: 10px;" data-path="${rec.fullPath}" title="Reveal in File Explorer">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>Reveal
          </button>
          <button class="glass-action-btn card-delete-btn" style="padding: 2px 8px; font-size: 10px; color: #FF453A;" data-delete-path="${rec.fullPath}" title="Delete Recording">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
            <div style="margin-bottom: 12px;"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg></div>
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
            <div style="margin-bottom: 12px;"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg></div>
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
            <div style="margin-bottom: 12px;"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
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
        vHeader.innerHTML = `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: middle;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>Videos & Screen Captures</span> <span class="switch-badge">${videos.length}</span>`;
        this.galleryGrid.appendChild(vHeader);
        videos.forEach(v => this.galleryGrid.appendChild(this.createVideoCard(v)));
      }

      if (voiceNotes.length > 0) {
        const aHeader = document.createElement('div');
        aHeader.className = 'lib-section-title';
        aHeader.innerHTML = `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: middle;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>Voice Recordings & Audio</span> <span class="switch-badge" style="background: rgba(94, 92, 230, 0.35); color: #FFF;">${voiceNotes.length}</span>`;
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
