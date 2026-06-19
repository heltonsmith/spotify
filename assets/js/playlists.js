// Spotify Clone - Playlists Page Logic

let selectedPlaylist = null;
let allPlaylists = [];

document.addEventListener('DOMContentLoaded', () => {
  loadPlaylists();
  loadUserOptions();
  setupEventListeners();
});

async function loadPlaylists() {
  const container = document.getElementById('playlist-list-container');
  if (!container) return;

  try {
    allPlaylists = await SpotifyAPI.getPlaylists();
    container.innerHTML = '';

    if (allPlaylists.length === 0) {
      container.innerHTML = `<p class="text-muted text-center py-4">No tienes listas de reproducción. ¡Crea una!</p>`;
      resetDetailView();
      return;
    }

    allPlaylists.forEach(p => {
      const div = document.createElement('div');
      div.className = 'playlist-item';
      if (selectedPlaylist && selectedPlaylist._id === p._id) {
        div.classList.add('active');
        // Actualizar referencia local para que los cambios se reflejen en la vista
        selectedPlaylist = p;
        renderPlaylistDetails(p);
      }

      div.innerHTML = `
        <div>
          <h6 class="mb-1 text-white fw-bold">${p.nombre}</h6>
          <span style="font-size: 0.75rem;" class="text-muted">Por ${p.usuario_nombre}</span>
        </div>
        <i class="bi bi-chevron-right text-muted"></i>
      `;

      div.addEventListener('click', () => {
        // Remover clase activa de las demás
        document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('active'));
        div.classList.add('active');
        
        selectedPlaylist = p;
        renderPlaylistDetails(p);
      });

      container.appendChild(div);
    });

  } catch (error) {
    console.error("Error al cargar playlists:", error);
    container.innerHTML = `<p class="text-danger text-center py-4">Error al cargar datos.</p>`;
  }
}

function renderPlaylistDetails(playlist) {
  const detailContainer = document.getElementById('playlist-detail-container');
  const placeholder = document.getElementById('playlist-placeholder');
  
  if (!detailContainer || !placeholder) return;

  placeholder.classList.add('d-none');
  detailContainer.classList.remove('d-none');

  // Set header details
  document.getElementById('detail-playlist-name').textContent = playlist.nombre;
  document.getElementById('detail-playlist-owner').textContent = playlist.usuario_nombre;
  
  const visibilityBadge = document.getElementById('detail-playlist-visibility');
  if (playlist.publica) {
    visibilityBadge.textContent = 'Pública';
    visibilityBadge.className = 'badge bg-success mb-2';
  } else {
    visibilityBadge.textContent = 'Privada';
    visibilityBadge.className = 'badge bg-secondary mb-2';
  }

  const tracksCount = playlist.canciones ? playlist.canciones.length : 0;
  document.getElementById('detail-playlist-song-count').textContent = `${tracksCount} canción${tracksCount !== 1 ? 'es' : ''}`;

  // Populate tracks
  const tbody = document.getElementById('playlist-tracks-body');
  tbody.innerHTML = '';

  if (tracksCount === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Esta playlist está vacía. Ve a la pestaña Canciones para agregar música.</td></tr>`;
    return;
  }

  playlist.canciones.forEach((item, idx) => {
    const song = item.detalles;
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';

    // Formatear duración
    const duration = song.duracion_segundos || 0;
    const min = Math.floor(duration / 60);
    const sec = duration % 60;
    const secFormatted = sec < 10 ? '0' + sec : sec;

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <div class="d-flex align-items-center">
          <span class="fw-bold text-white">${song.titulo || 'Canción no disponible'}</span>
          ${song.detalles_audio?.explicito ? '<span class="explicit-badge ms-2">E</span>' : ''}
        </div>
      </td>
      <td>${song.artista_nombre || 'N/A'}</td>
      <td class="d-none d-md-table-cell">${item.fecha_agregada}</td>
      <td class="text-end">
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-sm btn-spotify play-playlist-track-btn" title="Reproducir">
            <i class="bi bi-play-fill"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger remove-playlist-track-btn" title="Remover de la playlist" style="border-radius:50px;">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </td>
    `;

    // Clic en fila para reproducir
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.play-playlist-track-btn') || e.target.closest('.remove-playlist-track-btn')) return;
      if (song.titulo !== 'Canción no disponible') {
        playerInstance.playTrack(song);
      }
    });

    tr.querySelector('.play-playlist-track-btn').addEventListener('click', () => {
      if (song.titulo !== 'Canción no disponible') {
        playerInstance.playTrack(song);
      }
    });

    // Remover canción de la playlist ($pull en MongoDB)
    tr.querySelector('.remove-playlist-track-btn').addEventListener('click', async () => {
      if (confirm(`¿Deseas remover la canción "${song.titulo}" de la playlist "${playlist.nombre}"?`)) {
        try {
          await SpotifyAPI.removeCancionFromPlaylist(playlist._id, item.id_cancion);
          alert("Canción removida.");
          loadPlaylists(); // Recargar datos de Atlas
        } catch (error) {
          alert("Error al remover canción: " + error.message);
        }
      }
    });

    tbody.appendChild(tr);
  });
}

function resetDetailView() {
  const detailContainer = document.getElementById('playlist-detail-container');
  const placeholder = document.getElementById('playlist-placeholder');
  if (detailContainer && placeholder) {
    detailContainer.classList.add('d-none');
    placeholder.classList.remove('d-none');
  }
  selectedPlaylist = null;
}

// Cargar usuarios para el creador de la playlist
async function loadUserOptions() {
  const select = document.getElementById('playlist-owner-select');
  if (!select) return;

  try {
    const usuarios = await SpotifyAPI.getUsuarios();
    select.innerHTML = '<option value="">Selecciona un usuario...</option>';
    usuarios.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u._id;
      opt.textContent = `${u.nombre} (${u._id})`;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error("Error al cargar opciones de usuarios:", error);
  }
}

function setupEventListeners() {
  // Crear playlist
  const form = document.getElementById('create-playlist-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const playlistData = {
        _id: document.getElementById('playlist-id').value,
        nombre: document.getElementById('playlist-name-input').value,
        id_usuario: document.getElementById('playlist-owner-select').value,
        publica: document.getElementById('playlist-public').checked
      };

      try {
        await SpotifyAPI.createPlaylist(playlistData);
        alert("Playlist creada exitosamente.");
        
        form.reset();
        const modalEl = document.getElementById('createPlaylistModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        loadPlaylists();
      } catch (error) {
        alert("Error al crear playlist: " + error.message);
      }
    });
  }

  // Eliminar playlist entera
  const deleteBtn = document.getElementById('delete-playlist-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!selectedPlaylist) return;
      if (confirm(`¿Estás seguro de que quieres eliminar la playlist completa "${selectedPlaylist.nombre}"?`)) {
        try {
          await SpotifyAPI.deletePlaylist(selectedPlaylist._id);
          alert("Playlist eliminada.");
          selectedPlaylist = null;
          loadPlaylists();
        } catch (error) {
          alert("Error al eliminar playlist: " + error.message);
        }
      }
    });
  }
}
