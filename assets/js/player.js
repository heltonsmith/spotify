// Spotify Clone Interactive Music Player

const audioUrls = {
  'trk_001': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Rock style loop
  'trk_002': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', // Synth/Electronic loop
  'default': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
};

class SpotifyPlayer {
  constructor() {
    this.audio = new Audio();
    this.currentTrack = null;
    this.isPlaying = false;
    this.initDone = false;
  }

  init() {
    if (this.initDone) return;

    // Get elements
    this.playBtn = document.getElementById('player-play-btn');
    this.playIcon = this.playBtn ? this.playBtn.querySelector('i') : null;
    this.songTitle = document.getElementById('player-title');
    this.artistName = document.getElementById('player-artist');
    this.albumArt = document.getElementById('player-art');
    this.visualizer = document.getElementById('player-visualizer');
    
    this.currentTimeEl = document.getElementById('player-current-time');
    this.totalTimeEl = document.getElementById('player-total-time');
    this.progressBar = document.getElementById('player-progress-bar');
    this.progressFill = document.getElementById('player-progress-fill');
    
    this.volumeBar = document.getElementById('player-volume-bar');
    this.volumeFill = document.getElementById('player-volume-fill');
    this.volumeBtn = document.getElementById('player-volume-btn');

    // Bind events
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => this.togglePlay());
    }

    if (this.progressBar) {
      this.progressBar.addEventListener('click', (e) => this.seek(e));
    }

    if (this.volumeBar) {
      this.volumeBar.addEventListener('click', (e) => this.changeVolume(e));
    }

    if (this.volumeBtn) {
      this.volumeBtn.addEventListener('click', () => this.toggleMute());
    }

    // Audio Object events
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.totalTimeEl) this.totalTimeEl.textContent = this.formatTime(this.audio.duration);
    });
    this.audio.addEventListener('ended', () => this.nextTrack());

    // Init volume
    this.audio.volume = 0.7;
    if (this.volumeFill) this.volumeFill.style.width = '70%';

    this.initDone = true;
    console.log("SpotifyPlayer inicializado");
  }

  playTrack(track) {
    this.init(); // Asegurar inicialización
    this.currentTrack = track;

    // Map URL
    const url = audioUrls[track._id] || audioUrls['default'];
    this.audio.src = url;
    
    // Update UI info
    if (this.songTitle) this.songTitle.textContent = track.titulo;
    if (this.artistName) this.artistName.textContent = track.artista_nombre || track.id_artista;
    
    // Reset progress
    if (this.progressFill) this.progressFill.style.width = '0%';
    if (this.currentTimeEl) this.currentTimeEl.textContent = '0:00';

    this.play();
  }

  play() {
    if (!this.audio.src) return;
    this.audio.play()
      .then(() => {
        this.isPlaying = true;
        this.updatePlayerUI();
      })
      .catch(err => console.error("Error al reproducir audio:", err));
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.updatePlayerUI();
  }

  togglePlay() {
    if (!this.audio.src) {
      // Si no hay canción cargada, reproducir la primera de la lista de canciones
      this.playDefault();
      return;
    }
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  async playDefault() {
    try {
      const canciones = await SpotifyAPI.getCanciones();
      if (canciones.length > 0) {
        // Cargar nombres de artistas
        const artistas = await SpotifyAPI.getArtistas();
        const artist = artistas.find(a => a._id === canciones[0].id_artista);
        canciones[0].artista_nombre = artist ? artist.nombre : canciones[0].id_artista;
        this.playTrack(canciones[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  updatePlayerUI() {
    if (this.playIcon) {
      if (this.isPlaying) {
        this.playIcon.className = 'bi bi-pause-fill';
      } else {
        this.playIcon.className = 'bi bi-play-fill';
      }
    }

    if (this.albumArt) {
      if (this.isPlaying) {
        this.albumArt.classList.add('playing');
      } else {
        this.albumArt.classList.remove('playing');
      }
    }

    if (this.visualizer) {
      if (this.isPlaying) {
        this.visualizer.classList.add('active');
      } else {
        this.visualizer.classList.remove('active');
      }
    }
  }

  updateProgress() {
    if (!this.audio.duration) return;
    
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    if (this.progressFill) this.progressFill.style.width = `${pct}%`;
    if (this.currentTimeEl) this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
  }

  seek(e) {
    if (!this.audio.duration) return;
    
    const rect = this.progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const pct = clickX / width;
    
    this.audio.currentTime = pct * this.audio.duration;
  }

  changeVolume(e) {
    const rect = this.volumeBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    let pct = clickX / width;
    
    // Clamp between 0 and 1
    pct = Math.max(0, Math.min(1, pct));
    
    this.audio.volume = pct;
    this.audio.muted = false;
    
    if (this.volumeFill) this.volumeFill.style.width = `${pct * 100}%`;
    this.updateVolumeIcon(pct);
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    if (this.audio.muted) {
      if (this.volumeFill) this.volumeFill.style.width = '0%';
      if (this.volumeBtn) this.volumeBtn.querySelector('i').className = 'bi bi-volume-mute-fill';
    } else {
      const pct = this.audio.volume;
      if (this.volumeFill) this.volumeFill.style.width = `${pct * 100}%`;
      this.updateVolumeIcon(pct);
    }
  }

  updateVolumeIcon(pct) {
    if (!this.volumeBtn) return;
    const icon = this.volumeBtn.querySelector('i');
    if (pct === 0) {
      icon.className = 'bi bi-volume-mute-fill';
    } else if (pct < 0.4) {
      icon.className = 'bi bi-volume-down-fill';
    } else {
      icon.className = 'bi bi-volume-up-fill';
    }
  }

  nextTrack() {
    // Para simplificar, vuelve a iniciar la misma pista o la siguiente si tuviéramos una lista de reproducción en cola
    this.audio.currentTime = 0;
    this.play();
  }

  formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
}

// Global instance
const playerInstance = new SpotifyPlayer();

// Initialize when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  playerInstance.init();
});
