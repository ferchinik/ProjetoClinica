// public/js/lembretes.js

let lembretes = [];

export function initLembretes() {
    const form = document.getElementById('lembrete-form');
    const filtro = document.getElementById('filtro-prioridade');
    
    // Carregar lembretes salvos
    loadLembretes();
    
    // Event listeners
    form.addEventListener('submit', handleSubmit);
    filtro.addEventListener('change', filtrarLembretes);
}

function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const lembrete = {
        id: Date.now(), // ID único baseado no timestamp
        titulo: formData.get('titulo'),
        texto: formData.get('texto'),
        prioridade: formData.get('prioridade'),
        data: formData.get('data'),
        criado: new Date().toISOString()
    };
    
    // Adicionar ao array e salvar
    lembretes.unshift(lembrete);
    saveLembretes();
    
    // Atualizar visualização
    renderLembretes();
    
    // Limpar formulário
    e.target.reset();
}

function loadLembretes() {
    const saved = localStorage.getItem('lembretes');
    lembretes = saved ? JSON.parse(saved) : [];
    renderLembretes();
}

function saveLembretes() {
    localStorage.setItem('lembretes', JSON.stringify(lembretes));
}

function filtrarLembretes() {
    const prioridade = document.getElementById('filtro-prioridade').value;
    renderLembretes(prioridade);
}

function renderLembretes(filtro = '') {
    const grid = document.getElementById('lembretes-grid');
    const lembretesFiltrados = filtro 
        ? lembretes.filter(l => l.prioridade === filtro)
        : lembretes;
    
    grid.innerHTML = lembretesFiltrados.map(lembrete => `
        <div class="lembrete-card prioridade-${lembrete.prioridade}">
            <div class="lembrete-header">
                <h4>${lembrete.titulo}</h4>
                <span class="badge badge-${lembrete.prioridade}">
                    ${lembrete.prioridade.charAt(0).toUpperCase() + lembrete.prioridade.slice(1)}
                </span>
            </div>
            <div class="lembrete-body">
                <p>${lembrete.texto}</p>
                ${lembrete.data ? `
                    <div class="lembrete-data">
                        <i class="fas fa-clock"></i>
                        ${new Date(lembrete.data).toLocaleString()}
                    </div>
                ` : ''}
            </div>
            <div class="lembrete-footer">
                <button class="btn-icon delete-btn" onclick="deleteLembrete(${lembrete.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Função global para deletar lembrete
window.deleteLembrete = function(id) {
    if (confirm('¿Desea eliminar esta nota?')) {
        lembretes = lembretes.filter(l => l.id !== id);
        saveLembretes();
        renderLembretes(document.getElementById('filtro-prioridade').value);
    }
};