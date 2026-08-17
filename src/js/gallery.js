/**
 * CAPTO GALLERY CONTROLLER
 * Browse & Play Saved Videos and High-Fidelity Voice Recordings with Category Filtering
 */

class CaptoGallery {
  constructor() {
    this.galleryGrid = document.getElementById('gallery-grid');
    this.btnOpenFolder = document.getElementById('btn-open-folder');
    this.btnClearLibrary = document.getElementById('btn-clear-library');
    this.currentFilter = 'all'; // 'all' | 'video' | 'voice'

    if (this.btnOpenFolder) {
      this.btnOpenFolder.addEventListener('click', () => {
        if (window.electronAPI) {
          window.electronAPI.openRecordingsFolder();
        }
      });
    }

    if (this.btnClearLibrary) {
      this.btnClearLibrary.addEventListener('click', async () => {
        const confirmClear = confirm('Are you sure you want to remove all recordings from the Studio Library? This will permanently delete the files.');
        if (confirmClear && window.electronAPI && window.electronAPI.clearAllRecordings) {
          await window.electronAPI.clearAllRecordings();
          this.loadRecordings();
        }
      });
    }

    // Filter Buttons
    const filterBtns = document.querySelectorAll('.lib-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter || 'all';
        this.loadRecordings();
      });
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

  async loadRecordings() {
    if (!this.galleryGrid) return;

    let recordings = [];
    if (window.electronAPI && window.electronAPI.getRecordingsList) {
      recordings = await window.electronAPI.getRecordingsList();
    }

    this.galleryGrid.innerHTML = '';

    // Apply Category Filter
    let filtered = recordings;
    if (this.currentFilter === 'video') {
      filtered = recordings.filter(r => !r.filename.includes('Voice') && !r.filename.endsWith('.wav'));
    } else if (this.currentFilter === 'voice') {
      filtered = recordings.filter(r => r.filename.includes('Voice') || r.filename.endsWith('.wav'));
    }

    if (filtered.length === 0) {
      const emptyEmoji = this.currentFilter === 'voice' ? '🎙️' : (this.currentFilter === 'video' ? '🎬' : '📁');
      const emptyText = this.currentFilter === 'voice' ? 'No voice recordings yet' : (this.currentFilter === 'video' ? 'No video recordings yet' : 'No recordings in library yet');

      this.galleryGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-tertiary);">
          <div style="font-size: 36px; margin-bottom: 8px;">${emptyEmoji}</div>
          <div style="font-size: 14px; font-weight: 700; color: white;">${emptyText}</div>
          <div style="font-size: 11px; margin-top: 4px;">Recordings will appear here in high quality</div>
        </div>
      `;
      return;
    }

    filtered.forEach(rec => {
      const isVoice = rec.filename.includes('Voice') || rec.filename.endsWith('.wav');
      const isPhoto = rec.filename.endsWith('.png');
      const card = document.createElement('div');
      card.className = isVoice ? 'recording-card audio-recording-card' : 'recording-card';

      const dateStr = new Date(rec.createdAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const sizeMb = (rec.sizeBytes / (1024 * 1024)).toFixed(1);
      const normalizedPath = rec.fullPath.replace(/\\/g, '/');
      const fileUrl = normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;

      if (isVoice) {
        // Voice Audio Card Layout
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

      } else if (isPhoto) {
        // Screenshot Photo Card Layout
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
      } else {
        // Video Card Layout
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
      }

      // Reveal in file explorer
      const revealBtn = card.querySelector('button[data-path]');
      if (revealBtn) {
        revealBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.electronAPI) {
            window.electronAPI.revealFile(rec.fullPath);
          }
        });
      }

      // Delete file button
      const deleteBtn = card.querySelector('button[data-delete-path]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const confirmDel = confirm(`Delete "${rec.filename}"?`);
          if (confirmDel && window.electronAPI && window.electronAPI.deleteRecording) {
            await window.electronAPI.deleteRecording(rec.fullPath);
            this.loadRecordings();
          }
        });
      }

      this.galleryGrid.appendChild(card);
    });
  }
}

window.fligoGallery = new CaptoGallery();
window.refreshGallery = () => window.fligoGallery.loadRecordings();

