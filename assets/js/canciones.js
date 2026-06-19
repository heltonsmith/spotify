// Spotify Clone - Canciones Page Logic

let filterExitos = false;
let currentSearch = '';

document.addEventListener('DOMContentLoaded', () => {
  loadSongs();
  loadArtistOptions();
  setupEventListeners();
});

async function loadSongs() {
  const tbody = document.getElementById('songs-table-body');
  if (!tbody) return;
  
  try {
    const canciones = await SpotifyAPI.getCanciones(currentSearch, filterExitos);
    const artistas = await SpotifyAPI.getArtistas();
    
    tbody.innerHTML = '';
    
    if (canciones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron canciones con los filtros actuales.</td></tr>`;
      return;
    }

    canciones.forEach((song, idx) => {
      // Resolver artista
      const artist = artistas.find(a => a._id === song.id_artista);
      const artistaNombre = artist ? artist.nombre : song.id_artista;
      
      // Guardar el nombre resuelto en el objeto canción
      song.artista_nombre = artistaNombre;

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      
      // Formatear duración
      const duration = song.duracion_segundos;
      const min = Math.floor(duration / 60);
      const sec = duration % 60;
      const secFormatted = sec < 10 ? '0' + sec : sec;
      
      // Formatear reproducciones
      const reprosFormatted = new Intl.NumberFormat('es-CL').format(song.reproducciones);

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>
          <div class="d-flex align-items-center">
            <span class="fw-bold text-white">${song.titulo}</span>
            ${song.detalles_audio?.explicito ? '<span class="explicit-badge ms-2">E</span>' : ''}
          </div>
        </td>
        <td>${artistaNombre}</td>
        <td class="d-none d-md-table-cell">${reprosFormatted}</td>
        <td>${song.detalles_audio?.bpm || 120} BPM</td>
        <td>${min}:${secFormatted}</td>
        <td class="text-end">
          <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-spotify play-btn" title="Reproducir">
              <i class="bi bi-play-fill"></i>
            </button>
            <button class="btn btn-sm btn-spotify-outline add-playlist-btn" title="Añadir a Playlist" data-bs-toggle="modal" data-bs-target="#addToPlaylistModal">
              <i class="bi bi-plus-lg"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-btn" title="Eliminar" style="border-radius:50px;">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      `;

      // Eventos
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.play-btn') || e.target.closest('.add-playlist-btn') || e.target.closest('.delete-btn')) return;
        playerInstance.playTrack(song);
      });

      tr.querySelector('.play-btn').addEventListener('click', () => {
        playerInstance.playTrack(song);
      });

      tr.querySelector('.add-playlist-btn').addEventListener('click', () => {
        document.getElementById('add-to-playlist-song-id').value = song._id;
        loadPlaylistOptions();
      });

      tr.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`¿Estás seguro de que quieres eliminar la canción "${song.titulo}"?`)) {
          try {
            await SpotifyAPI.deleteCancion(song._id);
            alert("Canción eliminada exitosamente.");
            loadSongs();
          } catch (error) {
            alert("Error al eliminar la canción: " + error.message);
          }
        }
      });

      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error al cargar canciones:", error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error al cargar datos desde MongoDB Atlas.</td></tr>`;
  }
}

// Cargar artistas para el select en el modal de añadir canción
async function loadArtistOptions() {
  const select = document.getElementById('song-artist');
  if (!select) return;
  
  try {
    const artistas = await SpotifyAPI.getArtistas();
    select.innerHTML = '<option value="">Selecciona un artista...</option>';
    artistas.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a._id;
      opt.textContent = `${a.nombre} (${a._id})`;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error("Error al cargar opciones de artistas:", error);
  }
}

// Cargar playlists para el modal de añadir a playlist
async function loadPlaylistOptions() {
  const select = document.getElementById('playlist-select');
  if (!select) return;
  
  try {
    const playlists = await SpotifyAPI.getPlaylists();
    select.innerHTML = '<option value="">Selecciona una playlist...</option>';
    playlists.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p._id;
      opt.textContent = p.nombre;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error("Error al cargar opciones de playlists:", error);
    select.innerHTML = '<option value="">Error al cargar playlists</option>';
  }
}

function setupEventListeners() {
  // Búsqueda en tiempo real (Regex)
  const searchInput = document.getElementById('song-search-input');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      currentSearch = e.target.value;
      timeout = setTimeout(() => {
        loadSongs();
      }, 300); // Debounce para no saturar Atlas de consultas
    });
  }

  // Filtro de éxitos (Operador relacional $gt)
  const filterHitsBtn = document.getElementById('filter-hits-btn');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  
  if (filterHitsBtn) {
    filterHitsBtn.addEventListener('click', () => {
      filterExitos = !filterExitos;
      if (filterExitos) {
        filterHitsBtn.className = 'btn btn-spotify';
        if (clearFiltersBtn) clearFiltersBtn.classList.remove('d-none');
      } else {
        filterHitsBtn.className = 'btn btn-spotify-outline';
        if (clearFiltersBtn && !currentSearch) clearFiltersBtn.classList.add('d-none');
      }
      loadSongs();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      filterExitos = false;
      currentSearch = '';
      if (searchInput) searchInput.value = '';
      if (filterHitsBtn) filterHitsBtn.className = 'btn btn-spotify-outline';
      clearFiltersBtn.classList.add('d-none');
      loadSongs();
    });
  }

  // Formulario de añadir canción
  const form = document.getElementById('add-song-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const songData = {
        _id: document.getElementById('song-id').value,
        id_artista: document.getElementById('song-artist').value,
        titulo: document.getElementById('song-title').value,
        duracion_segundos: Number(document.getElementById('song-duration').value),
        reproducciones: Number(document.getElementById('song-reproductions').value),
        detalles_audio: {
          bpm: Number(document.getElementById('song-bpm').value),
          explicito: document.getElementById('song-explicit').checked
        }
      };

      try {
        await SpotifyAPI.createCancion(songData);
        alert("Canción agregada exitosamente.");
        
        // Reset y cerrar modal
        form.reset();
        const modalEl = document.getElementById('addSongModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        loadSongs();
      } catch (error) {
        alert("Error al agregar canción: " + error.message);
      }
    });
  }

  // Confirmar añadir canción a playlist (Arreglo de subdocumentos $push)
  const confirmBtn = document.getElementById('confirm-add-to-playlist-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const playlistId = document.getElementById('playlist-select').value;
      const songId = document.getElementById('add-to-playlist-song-id').value;

      if (!playlistId) {
        alert("Por favor selecciona una playlist.");
        return;
      }

      try {
        await SpotifyAPI.addCancionToPlaylist(playlistId, songId);
        alert("Canción añadida a la playlist con éxito.");
        
        const modalEl = document.getElementById('addToPlaylistModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      } catch (error) {
        alert("Error: " + error.message);
      }
    });
  }
}
