// Spotify Clone Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    // 1. Cargar Estadísticas y Estado de Conexión
    const status = await SpotifyAPI.getStatus();
    const dbStatusText = document.getElementById('db-status-text');
    
    if (status.connected) {
      if (dbStatusText) dbStatusText.textContent = 'MongoDB Conectado';
      
      // Actualizar contadores
      document.getElementById('stat-usuarios').textContent = status.usuarios;
      document.getElementById('stat-artistas').textContent = status.artistas;
      document.getElementById('stat-canciones').textContent = status.canciones;
      document.getElementById('stat-playlists').textContent = status.playlists;
      
      // Formatear total de reproducciones (ej: 8,600,000)
      const formattedRepros = new Intl.NumberFormat('es-CL').format(status.total_reproducciones || 0);
      document.getElementById('stat-reproducciones').textContent = formattedRepros;
    } else {
      if (dbStatusText) {
        dbStatusText.textContent = 'Error de Conexión';
        dbStatusText.parentElement.classList.replace('text-success', 'text-danger');
      }
    }

    // 2. Cargar Canciones Destacadas en la Tabla
    const canciones = await SpotifyAPI.getCanciones();
    const artistas = await SpotifyAPI.getArtistas();
    
    const tbody = document.getElementById('destacadas-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (canciones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No hay canciones disponibles. ¡Agrega algunas canciones en la sección correspondiente!</td></tr>`;
      return;
    }

    // Limitar a las 5 principales destacadas
    const listToShow = canciones.slice(0, 5);

    listToShow.forEach((song, idx) => {
      // Resolver artista en frontend
      const artist = artistas.find(a => a._id === song.id_artista);
      const artistaNombre = artist ? artist.nombre : song.id_artista;
      
      // Guardar el nombre resuelto en el objeto canción
      song.artista_nombre = artistaNombre;

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      
      // Formatear reproducciones
      const reprosFormatted = new Intl.NumberFormat('es-CL').format(song.reproducciones);
      
      // Formatear duración (mm:ss)
      const duration = song.duracion_segundos;
      const min = Math.floor(duration / 60);
      const sec = duration % 60;
      const secFormatted = sec < 10 ? '0' + sec : sec;

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
        <td class="text-end">
          <button class="btn btn-sm btn-spotify play-song-btn" style="padding: 4px 10px; font-size: 0.8rem;">
            <i class="bi bi-play-fill"></i>
          </button>
        </td>
      `;

      // Evento de clic en toda la fila para reproducir
      tr.addEventListener('click', (e) => {
        // Evitar doble evento si se hace clic directamente en el botón
        if (e.target.closest('.play-song-btn')) return;
        playerInstance.playTrack(song);
      });

      // Evento en el botón reproducir
      const btn = tr.querySelector('.play-song-btn');
      btn.addEventListener('click', () => {
        playerInstance.playTrack(song);
      });

      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error al cargar datos del Dashboard:", error);
    const tbody = document.getElementById('destacadas-table-body');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Error al cargar datos de la base de datos Atlas.</td></tr>`;
    }
  }
}
