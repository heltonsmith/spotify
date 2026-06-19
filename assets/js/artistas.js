// Spotify Clone - Artistas Page Logic

document.addEventListener('DOMContentLoaded', () => {
  loadArtists();
  setupEventListeners();
});

async function loadArtists() {
  const grid = document.getElementById('artists-grid');
  if (!grid) return;

  try {
    const artistas = await SpotifyAPI.getArtistas();
    grid.innerHTML = '';

    if (artistas.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center py-4 text-muted">No hay artistas disponibles en este momento.</div>`;
      return;
    }

    artistas.forEach(artist => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4 col-lg-3';

      const formattedListeners = new Intl.NumberFormat('es-CL').format(artist.oyentes_mensuales || 0);

      // Render genres tags (arrays mapping)
      const genresHtml = (artist.generos || [])
        .map(g => `<span class="badge-tag">${g}</span>`)
        .join('');

      // Initials for avatar
      const initials = artist.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      col.innerHTML = `
        <div class="spotify-card text-center h-100 d-flex flex-column justify-content-between position-relative">
          <button class="btn btn-sm btn-danger position-absolute end-0 top-0 m-2 delete-artist-btn" 
                  title="Eliminar Artista" 
                  style="border-radius: 50%; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
            <i class="bi bi-trash-fill" style="font-size: 0.85rem;"></i>
          </button>
          <div>
            <div class="artist-card-img">
              ${initials}
            </div>
            <h5 class="card-title-lg text-white" title="${artist.nombre}">${artist.nombre}</h5>
            <p class="card-subtitle-muted mb-3">${formattedListeners} oyentes mensuales</p>
          </div>
          <div class="artist-genres-container mt-2">
            ${genresHtml || '<span class="text-muted" style="font-size: 0.75rem;">Sin géneros</span>'}
          </div>
        </div>
      `;

      // Evento de eliminar
      col.querySelector('.delete-artist-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Estás seguro de que deseas eliminar al artista "${artist.nombre}"? Se perderá la referencia en sus canciones.`)) {
          try {
            await SpotifyAPI.deleteArtista(artist._id);
            alert("Artista eliminado exitosamente.");
            loadArtists();
          } catch (error) {
            alert("Error al eliminar artista: " + error.message);
          }
        }
      });

      grid.appendChild(col);
    });

  } catch (error) {
    console.error("Error al cargar artistas:", error);
    grid.innerHTML = `<div class="col-12 text-center py-4 text-danger">Error al conectar con MongoDB Atlas.</div>`;
  }
}

function setupEventListeners() {
  const form = document.getElementById('add-artist-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const genresInput = document.getElementById('artist-genres').value;
      // Convertir string separado por comas a arreglo de strings
      const generosArray = genresInput
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0);

      const artistData = {
        _id: document.getElementById('artist-id').value,
        nombre: document.getElementById('artist-name').value,
        generos: generosArray,
        oyentes_mensuales: Number(document.getElementById('artist-listeners').value)
      };

      try {
        await SpotifyAPI.createArtista(artistData);
        alert("Artista creado exitosamente.");
        
        form.reset();
        const modalEl = document.getElementById('addArtistModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        loadArtists();
      } catch (error) {
        alert("Error al crear artista: " + error.message);
      }
    });
  }
}
