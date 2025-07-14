import { navigateTo } from './navigation.js';
import { showNotification } from './notification.js';

let currentClientPage = 1;
const CLIENTS_PER_PAGE = 10;

async function loadClients(url = `/api/clientes?page=1&limit=${CLIENTS_PER_PAGE}`) {
  const container = document.getElementById('clients-list-container');
  const paginationContainer = document.getElementById('client-pagination-controls');
  if (!container || !paginationContainer) {
    console.error('[clientes.js] Erro Fatal: Container UI não encontrado.');
    return;
  }
  container.innerHTML = '<p class="loading-message">Cargando clientes...</p>';
  paginationContainer.innerHTML = '';

  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      if (response.status === 401) { window.location.href = '/login.html'; throw new Error('Não autorizado (401)'); }
      let errMsg = `Erro HTTP ${response.status}`; try { errMsg = (await response.json()).message || errMsg; } catch {}
      throw new Error(errMsg);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.clients)) { throw new Error('Resposta da API inválida.'); }

    container.innerHTML = '';
    const { clients, totalPages, currentPage: returnedPage } = data;
    currentClientPage = returnedPage;

    if (clients.length === 0) {
      const params = new URL(url, window.location.origin).searchParams;
      const msg = params.has('search') ? 'Nenhum cliente encontrado.' : 'Nenhum cliente registrado.';
      container.innerHTML = `<p class="empty-message">${msg}</p>`;
    } else {
      clients.forEach(client => {
        if (client && client.id) { container.appendChild(createClientCard(client)); }
        else { console.warn("[clientes.js] Cliente inválido recebido:", client); }
      });
    }
    renderClientPaginationControls(totalPages, currentClientPage);
  } catch (error) {
    console.error('[clientes.js] Erro em loadClients:', error);
    container.innerHTML = `<p class="error-message">Falha ao carregar: ${error.message}</p>`;
    paginationContainer.innerHTML = '';
  }
}

function createClientCard(client) {
  const item = document.createElement('div');
  item.classList.add('client-item');
  item.dataset.clientId = client.id;

  const foto = client.foto_perfil || 'img/users/default-avatar.png';
  const avatar = foto.startsWith('/') || foto.startsWith('http') ? foto : `/${foto.replace(/\\/g, '/')}`;
  const lastVisit = client.ultima_visita ? new Date(client.ultima_visita).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }) : 'Nunca';
  const nome = client.nome_completo || 'Nome N/D';
  const tel = client.telefone || 'N/D';
  const email = client.email || 'N/D';

  item.innerHTML = `
    <div class="client-avatar">
      <img src="${avatar}" alt="Foto de ${nome}" onerror="this.src='/img/users/default-avatar.png'" />
    </div>
    <div class="client-details">
      <h4>${nome}</h4>
      <p><i class="fas fa-phone"></i> ${tel}</p>
      <p><i class="fas fa-envelope"></i> ${email}</p>
      <p><i class="fas fa-calendar-check"></i> Últ. visita: ${lastVisit}</p>
    </div>
    <div class="client-actions">
      <button class="btn-icon view-client-btn" data-client-id="${client.id}" data-page="cliente-detalhes" title="Ver Detalhes">
        <i class="fas fa-eye"></i>
      </button>
      <button class="btn-icon edit-client-btn" data-client-id="${client.id}" title="Editar Cliente">
        <i class="fas fa-edit"></i>
      </button>
      <button class="btn-icon schedule-client-btn" data-client-id="${client.id}" data-page="nueva-cita" title="Agendar Cita">
        <i class="fas fa-calendar-plus"></i>
      </button>
      <button class="btn-icon delete-client-btn" data-client-id="${client.id}" title="Excluir Cliente">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `;
  return item;
}

function renderClientPaginationControls(totalPages, currentPage) {
  const paginationContainer = document.getElementById('client-pagination-controls');
  if (!paginationContainer) return;
  paginationContainer.innerHTML = '';

  function makeBtn(page, text, disabled, active) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.disabled = disabled;
    if (active) btn.classList.add('active');
    btn.onclick = () => { currentClientPage = page; applyClientFilters(); };
    return btn;
  }

  paginationContainer.appendChild(makeBtn(currentPage - 1, 'Anterior', currentPage <= 1));
  for (let i = 1; i <= totalPages; i++) {
    paginationContainer.appendChild(makeBtn(i, i, false, i === currentPage));
  }
  paginationContainer.appendChild(makeBtn(currentPage + 1, 'Próximo', currentPage >= totalPages));
}

function applyClientFilters() {
  const searchInput = document.getElementById('client-search-input');
  const searchTerm = searchInput ? searchInput.value.trim() : '';
  let url = `/api/clientes?page=${currentClientPage}&limit=${CLIENTS_PER_PAGE}`;
  if (searchTerm) {
    url += `&search=${encodeURIComponent(searchTerm)}`;
  }
  loadClients(url);
}

async function deleteClient(clientId) {
  console.log(`[clientes.js] Excluindo cliente ID: ${clientId}`); showNotification('Excluindo cliente...', 'info');
  try { const res = await fetch(`/api/clientes/${clientId}`, { method: 'DELETE', credentials: 'include' }); const data = await res.json().catch(() => ({ message: `Erro ${res.status}` })); if (!res.ok) throw new Error(data.message); showNotification(data.message || 'Cliente excluído!', 'success'); const card = document.querySelector(`.client-item[data-client-id="${clientId}"]`); if (card) { card.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; card.style.opacity = '0'; card.style.transform = 'scale(0.95)'; setTimeout(() => { card.remove(); adjustEmptyClientPage(); }, 300); } else { applyClientFilters(); } } catch (e) { console.error('[clientes.js] Erro ao excluir cliente:', e); showNotification(`Erro ao excluir: ${e.message}`, 'error'); }
}
function adjustEmptyClientPage() {
  const count = document.querySelectorAll('#clients-list-container .client-item').length;
  if (count === 0 && currentClientPage > 1) { console.log("[clientes.js] Página vazia, voltando para anterior."); currentClientPage--; applyClientFilters(); }
  else if (count === 0 && currentClientPage === 1) { applyClientFilters(); }
}
export function initClientesList() {
  console.log('[clientes.js] Iniciando initClientesList...');
  const addBtn = document.getElementById('add-client-btn');
  const searchBtn = document.getElementById('client-search-btn');
  const searchInput = document.getElementById('client-search-input');
  const listContainer = document.getElementById('clients-list-container');

  if (!addBtn || !searchBtn || !searchInput || !listContainer) { console.error('[clientes.js] Erro: Elementos essenciais não encontrados.'); return; }

  addBtn.onclick = () => navigateTo('clientes-novo');
  searchBtn.onclick = () => { currentClientPage = 1; applyClientFilters(); };
  searchInput.onkeypress = e => { if (e.key === 'Enter') { e.preventDefault(); currentClientPage = 1; applyClientFilters(); }};

  if (!listContainer.dataset.listenerAttached) {
    listContainer.addEventListener('click', event => {
      const btn = event.target.closest('button[data-client-id]');
      if (!btn) return;

      const clientId = btn.dataset.clientId;
      console.log(`[clientes.js] CLICK HANDLER - ID CAPTURADO DO BOTÃO: ${clientId}`);

      if (btn.classList.contains('view-client-btn')) {
        console.log(`[clientes.js] CLICK HANDLER - Guardando ID ${clientId} como 'selectedClientId'`);
        sessionStorage.setItem('selectedClientId', clientId);
        console.log(`[clientes.js] CLICK HANDLER - ID na sessionStorage AGORA: ${sessionStorage.getItem('selectedClientId')}`);
        navigateTo('cliente-detalhes');
      }
      else if (btn.classList.contains('edit-client-btn')) {
        console.log(`[clientes.js] Ação: Editar. Guardando ID ${clientId} como 'editingClientId'`);
        sessionStorage.setItem('editingClientId', clientId);
        navigateTo('cliente-editar');
      }
      else if (btn.classList.contains('schedule-client-btn')) {
        console.log(`[clientes.js] Ação: Agendar. Guardando ID ${clientId} como 'schedulingClientId'`);
        sessionStorage.setItem('schedulingClientId', clientId);
        const clientName = btn.closest('.client-item')?.querySelector('h4')?.textContent;
        if (clientName) sessionStorage.setItem('schedulingClientName', clientName);
        navigateTo('nueva-cita');
      }
      else if (btn.classList.contains('delete-client-btn')) {
        console.log(`[clientes.js] Ação: Excluir ID ${clientId}`);
        deleteClient(clientId);
      }
    });
    listContainer.dataset.listenerAttached = 'true';
    console.log("[clientes.js] Listener de delegação adicionado.");
  }

  currentClientPage = 1;
  applyClientFilters();
  console.log('[clientes.js] initClientesList concluído.');
}