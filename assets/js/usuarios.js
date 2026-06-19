// Spotify Clone - Usuarios Page Logic

let currentFilterType = '';

document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
  setupEventListeners();
});

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  try {
    const usuarios = await SpotifyAPI.getUsuarios(currentFilterType);
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron usuarios.</td></tr>`;
      return;
    }

    usuarios.forEach(user => {
      const tr = document.createElement('tr');
      
      const sub = user.suscripcion || { tipo: "Free", activa: true, precio_clp: 0 };
      
      // Suscripcion Badge
      const badgeClass = sub.tipo === 'Premium' ? 'badge badge-premium' : 'badge badge-free';
      
      // Estado Text
      const statusText = sub.activa ? '<span class="text-success fw-bold">Activa</span>' : '<span class="text-danger fw-bold">Inactiva</span>';
      
      // Precio CLP formatting
      const precioFormatted = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(sub.precio_clp || 0);

      tr.innerHTML = `
        <td><code class="text-success">${user._id}</code></td>
        <td class="text-white fw-semibold">${user.nombre}</td>
        <td>${user.email}</td>
        <td>${user.pais}</td>
        <td><span class="${badgeClass}">${sub.tipo}</span></td>
        <td>${statusText}</td>
        <td>${precioFormatted}</td>
        <td class="text-end">
          <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-spotify-outline edit-sub-btn" 
                    data-bs-toggle="modal" 
                    data-bs-target="#updateSubModal"
                    data-id="${user._id}"
                    data-tipo="${sub.tipo}"
                    data-precio="${sub.precio_clp || 0}"
                    data-activa="${sub.activa}">
              Suscripción
            </button>
            <button class="btn btn-sm btn-danger delete-user-btn" style="border-radius:50px;" data-id="${user._id}" data-nombre="${user.nombre}">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      `;

      // Evento de pre-cargar datos de actualización
      tr.querySelector('.edit-sub-btn').addEventListener('click', (e) => {
        const btn = e.target.closest('.edit-sub-btn');
        document.getElementById('update-sub-user-id').value = btn.dataset.id;
        document.getElementById('update-sub-type').value = btn.dataset.tipo;
        document.getElementById('update-sub-price').value = btn.dataset.precio;
        document.getElementById('update-sub-active').checked = btn.dataset.activa === 'true';
      });

      // Evento de eliminar usuario
      tr.querySelector('.delete-user-btn').addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-user-btn');
        if (confirm(`¿Estás seguro de que deseas eliminar al usuario "${btn.dataset.nombre}"?`)) {
          try {
            await SpotifyAPI.deleteUsuario(btn.dataset.id);
            alert("Usuario eliminado.");
            loadUsers();
          } catch (error) {
            alert("Error al eliminar usuario: " + error.message);
          }
        }
      });

      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Error al conectar con MongoDB Atlas.</td></tr>`;
  }
}

function setupEventListeners() {
  // Cambio de filtro (Dot Notation filtering en backend)
  const selectFilter = document.getElementById('filter-sub-select');
  if (selectFilter) {
    selectFilter.addEventListener('change', (e) => {
      currentFilterType = e.target.value;
      loadUsers();
    });
  }

  // Registrar Usuario
  const addForm = document.getElementById('add-user-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userData = {
        _id: document.getElementById('user-id').value,
        nombre: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        pais: document.getElementById('user-country').value,
        suscripcion: {
          tipo: document.getElementById('user-sub-type').value,
          activa: document.getElementById('user-sub-active').checked,
          precio_clp: Number(document.getElementById('user-sub-price').value)
        }
      };

      try {
        await SpotifyAPI.createUsuario(userData);
        alert("Usuario registrado exitosamente.");
        
        addForm.reset();
        const modalEl = document.getElementById('addUserModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        loadUsers();
      } catch (error) {
        alert("Error al registrar usuario: " + error.message);
      }
    });
  }

  // Actualizar Suscripción (Dot Notation update en backend)
  const updateForm = document.getElementById('update-sub-form');
  if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('update-sub-user-id').value;
      const subData = {
        tipo: document.getElementById('update-sub-type').value,
        precio_clp: Number(document.getElementById('update-sub-price').value),
        activa: document.getElementById('update-sub-active').checked
      };

      try {
        await SpotifyAPI.updateUsuarioSuscripcion(id, subData);
        alert("Suscripción actualizada exitosamente.");

        updateForm.reset();
        const modalEl = document.getElementById('updateSubModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        loadUsers();
      } catch (error) {
        alert("Error al actualizar suscripción: " + error.message);
      }
    });
  }
}
