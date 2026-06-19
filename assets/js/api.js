// Spotify Clone Hybrid API Client (LocalStorage + MongoDB Atlas Data API)

const DB_CONFIG_KEY = 'spotify_atlas_config';

// Datos de prueba iniciales de la guía
const DEFAULT_USUARIOS = [
  {
    "_id": "usr_001",
    "nombre": "Camila Rojas",
    "email": "camila@email.com",
    "pais": "Chile",
    "suscripcion": {
      "tipo": "Premium",
      "activa": true,
      "precio_clp": 4150
    }
  },
  {
    "_id": "usr_002",
    "nombre": "Andrés Soto",
    "email": "andres@email.com",
    "pais": "Argentina",
    "suscripcion": {
      "tipo": "Free",
      "activa": true,
      "precio_clp": 0
    }
  }
];

const DEFAULT_ARTISTAS = [
  {
    "_id": "art_101",
    "nombre": "The Rockers",
    "generos": ["Rock", "Indie", "Alternativo"],
    "oyentes_mensuales": 1500000
  },
  {
    "_id": "art_102",
    "nombre": "DJ Synth",
    "generos": ["Electrónica", "House"],
    "oyentes_mensuales": 850000
  }
];

const DEFAULT_CANCIONES = [
  {
    "_id": "trk_001",
    "id_artista": "art_101",
    "titulo": "Ecos del Mañana",
    "duracion_segundos": 215,
    "reproducciones": 5400000,
    "detalles_audio": {
      "bpm": 120,
      "explicito": false
    }
  },
  {
    "_id": "trk_002",
    "id_artista": "art_102",
    "titulo": "Noches de Neón",
    "duracion_segundos": 198,
    "reproducciones": 3200000,
    "detalles_audio": {
      "bpm": 128,
      "explicito": true
    }
  }
];

const DEFAULT_PLAYLISTS = [
  {
    "_id": "pl_001",
    "id_usuario": "usr_001",
    "nombre": "Mis Favoritas para Entrenar",
    "publica": true,
    "canciones": [
      { "id_cancion": "trk_001", "fecha_agregada": "2026-06-19" },
      { "id_cancion": "trk_002", "fecha_agregada": "2026-06-20" }
    ]
  }
];

// Helper to initialize local storage if empty
function initLocalStorageDB() {
  if (!localStorage.getItem('db_usuarios')) localStorage.setItem('db_usuarios', JSON.stringify(DEFAULT_USUARIOS));
  if (!localStorage.getItem('db_artistas')) localStorage.setItem('db_artistas', JSON.stringify(DEFAULT_ARTISTAS));
  if (!localStorage.getItem('db_canciones')) localStorage.setItem('db_canciones', JSON.stringify(DEFAULT_CANCIONES));
  if (!localStorage.getItem('db_playlists')) localStorage.setItem('db_playlists', JSON.stringify(DEFAULT_PLAYLISTS));
}

// Get config from localStorage
function getAtlasConfig() {
  const config = localStorage.getItem(DB_CONFIG_KEY);
  return config ? JSON.parse(config) : null;
}

// REST helper for Atlas Data API
async function callAtlasAPI(action, collection, payload = {}) {
  const config = getAtlasConfig();
  if (!config) throw new Error("No Atlas configuration found");

  const url = `${config.region}/app/${config.appId}/endpoint/data/v1/action/${action}`;
  
  const body = {
    dataSource: config.cluster,
    database: 'spotify_clone',
    collection: collection,
    ...payload
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Request-Headers': '*',
      'api-key': config.apiKey
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Error in Atlas Data API action ${action}`);
  }
  return data;
}

const SpotifyAPI = {
  // Check Mode
  isAtlasMode() {
    return getAtlasConfig() !== null;
  },

  // ==========================================
  // GENERAL & STATUS
  // ==========================================
  async getStatus() {
    if (this.isAtlasMode()) {
      try {
        // En Atlas sumamos todo
        const u = await this.getUsuarios();
        const a = await this.getArtistas();
        const c = await this.getCanciones();
        const p = await this.getPlaylists();
        const totalRepros = c.reduce((sum, s) => sum + (Number(s.reproducciones) || 0), 0);

        return {
          connected: true,
          usuarios: u.length,
          artistas: a.length,
          canciones: c.length,
          playlists: p.length,
          total_reproducciones: totalRepros
        };
      } catch (error) {
        console.error("Atlas status error:", error);
        return { connected: false, error: error.message };
      }
    } else {
      // LocalStorage mode
      initLocalStorageDB();
      const u = JSON.parse(localStorage.getItem('db_usuarios'));
      const a = JSON.parse(localStorage.getItem('db_artistas'));
      const c = JSON.parse(localStorage.getItem('db_canciones'));
      const p = JSON.parse(localStorage.getItem('db_playlists'));
      const totalRepros = c.reduce((sum, s) => sum + (Number(s.reproducciones) || 0), 0);

      return {
        connected: true,
        usuarios: u.length,
        artistas: a.length,
        canciones: c.length,
        playlists: p.length,
        total_reproducciones: totalRepros
      };
    }
  },

  // ==========================================
  // USUARIOS API
  // ==========================================
  async getUsuarios(tipo = '') {
    if (this.isAtlasMode()) {
      const filter = {};
      if (tipo) {
        // Dot notation filter for Atlas Data API
        filter["suscripcion.tipo"] = tipo;
      }
      const res = await callAtlasAPI('find', 'usuarios', { filter });
      return res.documents || [];
    } else {
      initLocalStorageDB();
      let usuarios = JSON.parse(localStorage.getItem('db_usuarios'));
      if (tipo) {
        // Dot notation filtering simulation in local JS
        usuarios = usuarios.filter(u => u.suscripcion && u.suscripcion.tipo === tipo);
      }
      return usuarios;
    }
  },

  async createUsuario(usuarioData) {
    if (this.isAtlasMode()) {
      // Validar si ya existe
      const existing = await callAtlasAPI('findOne', 'usuarios', { filter: { _id: usuarioData._id } });
      if (existing.document) throw new Error("El ID de usuario ya existe en Atlas.");

      await callAtlasAPI('insertOne', 'usuarios', { document: usuarioData });
      return usuarioData;
    } else {
      initLocalStorageDB();
      const usuarios = JSON.parse(localStorage.getItem('db_usuarios'));
      if (usuarios.some(u => u._id === usuarioData._id)) {
        throw new Error("El ID de usuario ya existe localmente.");
      }
      usuarios.push(usuarioData);
      localStorage.setItem('db_usuarios', JSON.stringify(usuarios));
      return usuarioData;
    }
  },

  async updateUsuarioSuscripcion(id, suscripcionData) {
    if (this.isAtlasMode()) {
      // Dot notation updates in MongoDB Atlas Data API
      const updateFields = {};
      if (suscripcionData.tipo !== undefined) updateFields["suscripcion.tipo"] = suscripcionData.tipo;
      if (suscripcionData.activa !== undefined) updateFields["suscripcion.activa"] = suscripcionData.activa;
      if (suscripcionData.precio_clp !== undefined) updateFields["suscripcion.precio_clp"] = Number(suscripcionData.precio_clp);

      await callAtlasAPI('updateOne', 'usuarios', {
        filter: { _id: id },
        update: { $set: updateFields }
      });
      
      const res = await callAtlasAPI('findOne', 'usuarios', { filter: { _id: id } });
      return res.document;
    } else {
      initLocalStorageDB();
      const usuarios = JSON.parse(localStorage.getItem('db_usuarios'));
      const index = usuarios.findIndex(u => u._id === id);
      if (index === -1) throw new Error("Usuario no encontrado.");
      
      // Update subdocument fields using local dot notation style
      if (!usuarios[index].suscripcion) usuarios[index].suscripcion = {};
      if (suscripcionData.tipo !== undefined) usuarios[index].suscripcion.tipo = suscripcionData.tipo;
      if (suscripcionData.activa !== undefined) usuarios[index].suscripcion.activa = suscripcionData.activa;
      if (suscripcionData.precio_clp !== undefined) usuarios[index].suscripcion.precio_clp = Number(suscripcionData.precio_clp);
      
      localStorage.setItem('db_usuarios', JSON.stringify(usuarios));
      return usuarios[index];
    }
  },

  async deleteUsuario(id) {
    if (this.isAtlasMode()) {
      await callAtlasAPI('deleteOne', 'usuarios', { filter: { _id: id } });
      return { message: "Usuario eliminado" };
    } else {
      initLocalStorageDB();
      let usuarios = JSON.parse(localStorage.getItem('db_usuarios'));
      usuarios = usuarios.filter(u => u._id !== id);
      localStorage.setItem('db_usuarios', JSON.stringify(usuarios));
      return { message: "Usuario eliminado" };
    }
  },

  // ==========================================
  // ARTISTAS API
  // ==========================================
  async getArtistas() {
    if (this.isAtlasMode()) {
      const res = await callAtlasAPI('find', 'artistas');
      return res.documents || [];
    } else {
      initLocalStorageDB();
      return JSON.parse(localStorage.getItem('db_artistas'));
    }
  },

  async createArtista(artistaData) {
    if (this.isAtlasMode()) {
      const existing = await callAtlasAPI('findOne', 'artistas', { filter: { _id: artistaData._id } });
      if (existing.document) throw new Error("El ID de artista ya existe en Atlas.");

      await callAtlasAPI('insertOne', 'artistas', { document: artistaData });
      return artistaData;
    } else {
      initLocalStorageDB();
      const artistas = JSON.parse(localStorage.getItem('db_artistas'));
      if (artistas.some(a => a._id === artistaData._id)) {
        throw new Error("El ID de artista ya existe localmente.");
      }
      artistas.push(artistaData);
      localStorage.setItem('db_artistas', JSON.stringify(artistas));
      return artistaData;
    }
  },

  async deleteArtista(id) {
    if (this.isAtlasMode()) {
      await callAtlasAPI('deleteOne', 'artistas', { filter: { _id: id } });
      return { message: "Artista eliminado" };
    } else {
      initLocalStorageDB();
      let artistas = JSON.parse(localStorage.getItem('db_artistas'));
      artistas = artistas.filter(a => a._id !== id);
      localStorage.setItem('db_artistas', JSON.stringify(artistas));
      return { message: "Artista eliminado" };
    }
  },

  // ==========================================
  // CANCIONES API
  // ==========================================
  async getCanciones(search = '', exitos = false) {
    if (this.isAtlasMode()) {
      const filter = {};
      
      // 1. Expresión regular ($regex)
      if (search) {
        filter["titulo"] = { $regex: search, $options: "i" };
      }
      
      // 2. Operador Relacional ($gt)
      if (exitos) {
        filter["reproducciones"] = { $gt: 5000000 };
      }

      const res = await callAtlasAPI('find', 'canciones', { filter });
      return res.documents || [];
    } else {
      initLocalStorageDB();
      let canciones = JSON.parse(localStorage.getItem('db_canciones'));
      
      // 1. Simulación Regex
      if (search) {
        const regex = new RegExp(search, 'i');
        canciones = canciones.filter(c => regex.test(c.titulo));
      }
      
      // 2. Simulación operador relacional ($gt)
      if (exitos) {
        canciones = canciones.filter(c => c.reproducciones > 5000000);
      }
      
      return canciones;
    }
  },

  async createCancion(cancionData) {
    if (this.isAtlasMode()) {
      // Verificar si el artista existe (Seguridad Referencial)
      const artRes = await callAtlasAPI('findOne', 'artistas', { filter: { _id: cancionData.id_artista } });
      if (!artRes.document) {
        throw new Error(`Seguridad Referencial: El artista con ID '${cancionData.id_artista}' no existe.`);
      }

      const existing = await callAtlasAPI('findOne', 'canciones', { filter: { _id: cancionData._id } });
      if (existing.document) throw new Error("El ID de canción ya existe en Atlas.");

      await callAtlasAPI('insertOne', 'canciones', { document: cancionData });
      return cancionData;
    } else {
      initLocalStorageDB();
      const canciones = JSON.parse(localStorage.getItem('db_canciones'));
      const artistas = JSON.parse(localStorage.getItem('db_artistas'));
      
      // Verificar si el artista existe (Seguridad Referencial)
      if (!artistas.some(a => a._id === cancionData.id_artista)) {
        throw new Error(`Seguridad Referencial: El artista con ID '${cancionData.id_artista}' no existe.`);
      }

      if (canciones.some(c => c._id === cancionData._id)) {
        throw new Error("El ID de canción ya existe localmente.");
      }

      canciones.push(cancionData);
      localStorage.setItem('db_canciones', JSON.stringify(canciones));
      return cancionData;
    }
  },

  async deleteCancion(id) {
    if (this.isAtlasMode()) {
      await callAtlasAPI('deleteOne', 'canciones', { filter: { _id: id } });
      return { message: "Canción eliminada" };
    } else {
      initLocalStorageDB();
      let canciones = JSON.parse(localStorage.getItem('db_canciones'));
      canciones = canciones.filter(c => c._id !== id);
      localStorage.setItem('db_canciones', JSON.stringify(canciones));
      return { message: "Canción eliminada" };
    }
  },

  // ==========================================
  // PLAYLISTS API
  // ==========================================
  async getPlaylists() {
    let playlists = [];
    let canciones = [];
    let artistas = [];
    let usuarios = [];

    if (this.isAtlasMode()) {
      const pRes = await callAtlasAPI('find', 'playlists');
      playlists = pRes.documents || [];
      const cRes = await callAtlasAPI('find', 'canciones');
      canciones = cRes.documents || [];
      const aRes = await callAtlasAPI('find', 'artistas');
      artistas = aRes.documents || [];
      const uRes = await callAtlasAPI('find', 'usuarios');
      usuarios = uRes.documents || [];
    } else {
      initLocalStorageDB();
      playlists = JSON.parse(localStorage.getItem('db_playlists')) || [];
      canciones = JSON.parse(localStorage.getItem('db_canciones')) || [];
      artistas = JSON.parse(localStorage.getItem('db_artistas')) || [];
      usuarios = JSON.parse(localStorage.getItem('db_usuarios')) || [];
    }

    // Resoluciones en memoria del lado del cliente
    const songsMap = {};
    canciones.forEach(s => {
      const art = artistas.find(a => a._id === s.id_artista);
      songsMap[s._id] = {
        ...s,
        artista_nombre: art ? art.nombre : "Artista Desconocido"
      };
    });

    const usersMap = {};
    usuarios.forEach(u => {
      usersMap[u._id] = u.nombre;
    });

    return playlists.map(p => {
      const resolvedSongs = (p.canciones || []).map(item => {
        const songDetail = songsMap[item.id_cancion];
        return {
          id_cancion: item.id_cancion,
          fecha_agregada: item.fecha_agregada,
          detalles: songDetail || { titulo: "Canción no disponible", duracion_segundos: 0, artista_nombre: "N/A" }
        };
      });

      return {
        ...p,
        usuario_nombre: usersMap[p.id_usuario] || "Usuario Desconocido",
        canciones: resolvedSongs
      };
    });
  },

  async createPlaylist(playlistData) {
    if (this.isAtlasMode()) {
      // Validar usuario existente
      const uRes = await callAtlasAPI('findOne', 'usuarios', { filter: { _id: playlistData.id_usuario } });
      if (!uRes.document) throw new Error("El usuario dueño no existe en Atlas.");

      const existing = await callAtlasAPI('findOne', 'playlists', { filter: { _id: playlistData._id } });
      if (existing.document) throw new Error("El ID de playlist ya existe en Atlas.");

      await callAtlasAPI('insertOne', 'playlists', { document: playlistData });
      return playlistData;
    } else {
      initLocalStorageDB();
      const playlists = JSON.parse(localStorage.getItem('db_playlists'));
      const usuarios = JSON.parse(localStorage.getItem('db_usuarios'));
      
      if (!usuarios.some(u => u._id === playlistData.id_usuario)) {
        throw new Error("El usuario creador de la playlist no existe localmente.");
      }

      if (playlists.some(p => p._id === playlistData._id)) {
        throw new Error("El ID de playlist ya existe localmente.");
      }

      playlists.push(playlistData);
      localStorage.setItem('db_playlists', JSON.stringify(playlists));
      return playlistData;
    }
  },

  async addCancionToPlaylist(playlistId, songId) {
    if (this.isAtlasMode()) {
      // Evitar duplicados
      const playlistRes = await callAtlasAPI('findOne', 'playlists', { filter: { _id: playlistId } });
      const playlist = playlistRes.document;
      if (!playlist) throw new Error("La playlist no existe.");

      const yaExiste = (playlist.canciones || []).some(c => c.id_cancion === songId);
      if (yaExiste) throw new Error("La canción ya está en la playlist.");

      const newTrackSubdoc = {
        id_cancion: songId,
        fecha_agregada: new Date().toISOString().split('T')[0]
      };

      // $push en Atlas Data API
      await callAtlasAPI('updateOne', 'playlists', {
        filter: { _id: playlistId },
        update: { $push: { canciones: newTrackSubdoc } }
      });

      return { message: "Añadida", item: newTrackSubdoc };
    } else {
      initLocalStorageDB();
      const playlists = JSON.parse(localStorage.getItem('db_playlists'));
      const index = playlists.findIndex(p => p._id === playlistId);
      if (index === -1) throw new Error("La playlist no existe localmente.");

      if (!playlists[index].canciones) playlists[index].canciones = [];
      const yaExiste = playlists[index].canciones.some(c => c.id_cancion === songId);
      if (yaExiste) throw new Error("La canción ya está en la playlist.");

      const newTrackSubdoc = {
        id_cancion: songId,
        fecha_agregada: new Date().toISOString().split('T')[0]
      };

      // Push en arreglo local
      playlists[index].canciones.push(newTrackSubdoc);
      localStorage.setItem('db_playlists', JSON.stringify(playlists));
      return { message: "Añadida", item: newTrackSubdoc };
    }
  },

  async removeCancionFromPlaylist(playlistId, songId) {
    if (this.isAtlasMode()) {
      // $pull en Atlas Data API
      await callAtlasAPI('updateOne', 'playlists', {
        filter: { _id: playlistId },
        update: { $pull: { canciones: { id_cancion: songId } } }
      });
      return { message: "Removida" };
    } else {
      initLocalStorageDB();
      const playlists = JSON.parse(localStorage.getItem('db_playlists'));
      const index = playlists.findIndex(p => p._id === playlistId);
      if (index === -1) throw new Error("La playlist no existe localmente.");

      if (playlists[index].canciones) {
        // Pull en arreglo local
        playlists[index].canciones = playlists[index].canciones.filter(c => c.id_cancion !== songId);
      }
      localStorage.setItem('db_playlists', JSON.stringify(playlists));
      return { message: "Removida" };
    }
  },

  async deletePlaylist(id) {
    if (this.isAtlasMode()) {
      await callAtlasAPI('deleteOne', 'playlists', { filter: { _id: id } });
      return { message: "Playlist eliminada" };
    } else {
      initLocalStorageDB();
      let playlists = JSON.parse(localStorage.getItem('db_playlists'));
      playlists = playlists.filter(p => p._id !== id);
      localStorage.setItem('db_playlists', JSON.stringify(playlists));
      return { message: "Playlist eliminada" };
    }
  }
};

// ==========================================
// DYNAMIC MODAL INJECTION & UI HANDLERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar localStorage si aplica
  if (!SpotifyAPI.isAtlasMode()) {
    initLocalStorageDB();
  }

  // 1. Inyectar el Modal de Configuración en el body
  const modalHTML = `
    <div class="modal fade" id="atlasConfigModal" tabindex="-1" aria-labelledby="atlasConfigModalLabel" aria-hidden="true" style="z-index: 1100;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold" id="atlasConfigModalLabel"><i class="bi bi-database-fill-gear text-success me-2"></i>Conectar MongoDB Atlas</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form id="atlas-config-form">
            <div class="modal-body">
              <p class="text-muted" style="font-size: 0.8rem;">
                Para conectar tu base de datos de MongoDB Atlas en GitHub Pages, debes habilitar la <strong>Data API</strong> de tu cluster en el panel de Atlas y crear una API Key.
              </p>
              
              <div class="mb-3">
                <label for="cfg-app-id" class="form-label">Atlas Data API App ID</label>
                <input type="text" class="form-control" id="cfg-app-id" placeholder="data-xxxxx" required>
              </div>

              <div class="mb-3">
                <label for="cfg-api-key" class="form-label">API Key</label>
                <input type="password" class="form-control" id="cfg-api-key" placeholder="Tu API Key secreta" required>
              </div>

              <div class="row">
                <div class="col-6 mb-3">
                  <label for="cfg-cluster" class="form-label">Cluster Name</label>
                  <input type="text" class="form-control" id="cfg-cluster" value="Cluster0" required>
                </div>
                <div class="col-6 mb-3">
                  <label for="cfg-region" class="form-label">Region/URL Base</label>
                  <input type="text" class="form-control" id="cfg-region" value="https://us-east-1.aws.data.mongodb-api.com" required>
                </div>
              </div>
              
              <div class="text-success text-center fw-bold d-none my-2" id="cfg-test-success">
                <i class="bi bi-check-circle-fill"></i> ¡Conexión Exitosa con Atlas!
              </div>
              <div class="text-danger text-center fw-bold d-none my-2" id="cfg-test-error">
                <i class="bi bi-x-circle-fill"></i> Error de conexión
              </div>
            </div>
            
            <div class="modal-footer d-flex justify-content-between">
              <div>
                <button type="button" class="btn btn-danger btn-sm d-none" id="cfg-disconnect-btn">Desconectar</button>
              </div>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-spotify-outline btn-sm" id="cfg-test-btn">Probar Conexión</button>
                <button type="submit" class="btn btn-spotify btn-sm">Guardar y Recargar</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  
  const divWrapper = document.createElement('div');
  divWrapper.innerHTML = modalHTML;
  document.body.appendChild(divWrapper.firstElementChild);

  // 2. Vincular elementos del modal e iniciar valores
  const modalEl = document.getElementById('atlasConfigModal');
  const form = document.getElementById('atlas-config-form');
  const testBtn = document.getElementById('cfg-test-btn');
  const disconnectBtn = document.getElementById('cfg-disconnect-btn');
  const successMsg = document.getElementById('cfg-test-success');
  const errorMsg = document.getElementById('cfg-test-error');

  // Pre-cargar valores si existen
  const currentConfig = getAtlasConfig();
  if (currentConfig) {
    document.getElementById('cfg-app-id').value = currentConfig.appId;
    document.getElementById('cfg-api-key').value = currentConfig.apiKey;
    document.getElementById('cfg-cluster').value = currentConfig.cluster;
    document.getElementById('cfg-region').value = currentConfig.region;
    if (disconnectBtn) disconnectBtn.classList.remove('d-none');
  }

  // 3. Manejar botón "Probar Conexión"
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      successMsg.classList.add('d-none');
      errorMsg.classList.add('d-none');
      testBtn.disabled = true;
      testBtn.textContent = 'Probando...';

      const testConfig = {
        appId: document.getElementById('cfg-app-id').value,
        apiKey: document.getElementById('cfg-api-key').value,
        cluster: document.getElementById('cfg-cluster').value,
        region: document.getElementById('cfg-region').value
      };

      try {
        // Guardar temporal en localStorage para el helper
        localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(testConfig));
        
        // Intentar hacer una consulta ligera (find en canciones)
        const res = await callAtlasAPI('find', 'canciones', { limit: 1 });
        
        if (res.documents) {
          successMsg.classList.remove('d-none');
        } else {
          throw new Error("No se obtuvieron documentos");
        }
      } catch (err) {
        console.error("Test error details:", err);
        errorMsg.classList.remove('d-none');
        errorMsg.textContent = "Error: " + err.message.slice(0, 45);
        
        // Restaurar anterior
        if (currentConfig) {
          localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(currentConfig));
        } else {
          localStorage.removeItem(DB_CONFIG_KEY);
        }
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Probar Conexión';
      }
    });
  }

  // 4. Guardar configuración
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newConfig = {
        appId: document.getElementById('cfg-app-id').value,
        apiKey: document.getElementById('cfg-api-key').value,
        cluster: document.getElementById('cfg-cluster').value,
        region: document.getElementById('cfg-region').value
      };

      localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(newConfig));
      alert("Configuración de base de datos Atlas guardada con éxito. La página se recargará.");
      window.location.reload();
    });
  }

  // 5. Desconectar
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      if (confirm("¿Seguro que deseas desconectar MongoDB Atlas y regresar a la base de datos local (Demo)?")) {
        localStorage.removeItem(DB_CONFIG_KEY);
        window.location.reload();
      }
    });
  }

  // 6. Actualizar dinámicamente el badge de la base de datos de la página
  const dbStatusText = document.getElementById('db-status-text') || (dbBadge ? dbBadge.querySelector('span:not(.dot)') : null);
  const dbBadge = document.querySelector('.db-badge');
  
  if (dbBadge) {
    // Reemplazar o asegurar que haya un botón de configuración
    dbBadge.style.cursor = 'pointer';
    dbBadge.setAttribute('data-bs-toggle', 'modal');
    dbBadge.setAttribute('data-bs-target', '#atlasConfigModal');
    dbBadge.title = 'Hacer clic para configurar MongoDB Atlas';
    
    // Crear ícono de configuración
    const gearIcon = document.createElement('i');
    gearIcon.className = 'bi bi-gear-fill ms-2';
    dbBadge.appendChild(gearIcon);

    if (SpotifyAPI.isAtlasMode()) {
      dbBadge.style.borderColor = '#1DB954';
      dbBadge.style.backgroundColor = 'rgba(29, 185, 84, 0.15)';
      const dot = dbBadge.querySelector('.dot');
      if (dot) dot.style.backgroundColor = '#1DB954';
      
      if (dbStatusText) {
        dbStatusText.textContent = 'Atlas Conectado';
      }
    } else {
      dbBadge.style.borderColor = '#ffc107';
      dbBadge.style.backgroundColor = 'rgba(255, 193, 7, 0.15)';
      const dot = dbBadge.querySelector('.dot');
      if (dot) dot.style.backgroundColor = '#ffc107';
      
      if (dbStatusText) {
        dbStatusText.textContent = 'Modo Demo (Local)';
      }
    }
  }
});
