// clinica/public/js/estoque.js
import { navigateTo } from './navigation.js';
import { showNotification } from './notification.js';

let currentPage = 1;
const ITEMS_PER_PAGE = 12;

// Funções loadProducts, createProductCard, renderPaginationControls, applyFilters, deleteProduct, 
// loadProductForEdit, handleEditSubmit, initEditarProduto
// DEVEM SER MANTIDAS AQUI COMO VOCÊ AS TINHA NA SUA ÚLTIMA VERSÃO FUNCIONAL.
// Vou colocar placeholders para elas, substitua pelo seu código completo dessas funções.

export function loadProducts(url = `/api/produtos?page=1&limit=${ITEMS_PER_PAGE}`) {
    const inventoryGrid = document.querySelector('.inventory-grid');
    const paginationContainer = document.querySelector('.pagination-controls');

    if (!inventoryGrid || !paginationContainer) {
        console.error('[Estoque JS] Elementos .inventory-grid ou .pagination-controls não encontrados para loadProducts!');
        return;
    }

    inventoryGrid.innerHTML = '<p class="loading-message" style="text-align: center; padding: 20px; color: var(--text-secondary);">Carregando produtos...</p>';
    paginationContainer.innerHTML = '';
    console.log(`[Estoque JS - loadProducts] Carregando produtos com URL: ${url}`);

    fetch(url, { credentials: 'include' })
        .then(async res => {
            if (!res.ok) {
                if (res.status === 401) {
                    window.location.href = '/login.html';
                    throw new Error('Não autorizado (401). Por favor, faça login novamente.');
                }
                const errText = await res.text().catch(() => res.statusText);
                throw new Error(errText || `Erro HTTP ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            inventoryGrid.innerHTML = '';
            const { products = [], totalPages = 1, currentPage: apiPage = 1, totalItems = 0 } = data;
            currentPage = apiPage;

            if (!products.length) {
                inventoryGrid.innerHTML = '<p class="empty-message" style="text-align: center; padding: 20px; color: var(--text-secondary);">Nenhum produto encontrado com os filtros atuais.</p>';
            } else {
                products.forEach(p => inventoryGrid.appendChild(createProductCard(p)));
            }
            renderPaginationControls(totalPages, currentPage, totalItems);
        })
        .catch(err => {
            console.error('[Estoque JS - loadProducts] Erro ao carregar produtos:', err);
            inventoryGrid.innerHTML = `<p class="error-message" style="text-align: center; padding: 20px; color: var(--danger-color);">Erro ao carregar produtos: ${err.message}</p>`;
        });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;

    // Lógica melhorada para tratar o caminho da imagem
    let imageUrl;
    if (!product.foto) {
        // Se não houver foto, usar imagem padrão
        imageUrl = '/img/default.png';
    } else {
        // Normalizar o caminho (substituir \ por /)
        imageUrl = product.foto.replace(/\\/g, '/');
        
        // Se o caminho já começa com /uploads/, está correto
        if (imageUrl.startsWith('/uploads/')) {
            // Manter como está
        }
        // Se começa com uploads/ (sem a barra inicial)
        else if (imageUrl.startsWith('uploads/')) {
            imageUrl = `/${imageUrl}`;
        }
        // Se não tem uploads/ no início, adicionar
        else if (!imageUrl.includes('uploads/')) {
            imageUrl = `/uploads/products/${imageUrl}`;
        }
        // Se tem uploads/ em algum lugar no meio do caminho
        else {
            const uploadsIndex = imageUrl.indexOf('uploads/');
            if (uploadsIndex > 0) {
                imageUrl = `/${imageUrl.substring(uploadsIndex)}`;
            } else if (uploadsIndex === 0 && !imageUrl.startsWith('/')) {
                imageUrl = `/${imageUrl}`;
            }
        }
    }
    
    // Log para debug
    console.log(`[Estoque JS - createProductCard] ID: ${product.id}, Foto original: ${product.foto}, URL final: ${imageUrl}`);

    const preco = (product.preco !== null && !isNaN(product.preco)) ? `₲ ${parseInt(product.preco).toLocaleString('es-PY')}` : '₲ --';
    const estoque = (product.estoque !== null && !isNaN(product.estoque)) ? `${product.estoque} un.` : 'N/D';
    let stockClass = '';
    if (product.estoque !== null && !isNaN(product.estoque)) {
        stockClass = product.estoque <= 0 ? 'stock-low' : (product.estoque <= 10 ? 'stock-low' : 'stock-ok');
    }

    card.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${product.nome || 'Produto'}" 
                 onerror="if (this.src.endsWith('/img/default.png')) { this.onerror=null; this.style.display='none'; console.error('Fallback image /img/default.png also failed to load or is missing.'); } else { this.src='/img/default.png'; console.warn('Product image (${imageUrl}) failed, attempting fallback /img/default.png.'); }" />
        </div>
        <div class="product-details">
            <h3 class="product-name">${product.nome || 'Sem nome'}</h3>
            <p class="product-category">${product.categoria || 'Sem categoria'}</p>
            <div class="product-price-stock-line">
                <span class="product-price">${preco}</span>
                <span class="stock ${stockClass}">${estoque}</span>
            </div>
        </div>
        <div class="product-actions">
            <button class="btn-icon edit-btn" data-product-id="${product.id}" title="Editar Produto"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete-btn" data-product-id="${product.id}" title="Excluir Produto"><i class="fas fa-trash"></i></button>
        </div>
    `;
    return card;
}

function renderPaginationControls(totalPages, current, totalItems) {
    const container = document.querySelector('.pagination-controls');
    if (!container) { console.warn("[Estoque JS - renderPaginationControls] Container de paginação não encontrado."); return; }
    container.innerHTML = '';
    if (totalPages <= 1 && totalItems <= ITEMS_PER_PAGE) return;

    const createBtn = (page, text = page.toString(), disabled = false, active = false, isEllipsis = false) => {
        if (isEllipsis) {
            const span = document.createElement('span');
            span.textContent = text;
            span.classList.add('pagination-ellipsis');
            return span;
        }
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.disabled = disabled;
        if (active) btn.classList.add('active');
        btn.dataset.page = page.toString();
        btn.classList.add('pagination-button');
        return btn;
    };

    if (totalPages > 1) {
        container.appendChild(createBtn(1, '«', current === 1));
        container.appendChild(createBtn(Math.max(1, current - 1), '‹', current === 1));
    }

    const MAX_PAGES_DISPLAYED = 5;
    let startPage = Math.max(1, current - Math.floor(MAX_PAGES_DISPLAYED / 2));
    let endPage = Math.min(totalPages, startPage + MAX_PAGES_DISPLAYED - 1);
    if (endPage - startPage + 1 < MAX_PAGES_DISPLAYED) {
        startPage = Math.max(1, endPage - MAX_PAGES_DISPLAYED + 1);
    }

    if (startPage > 1) {
        container.appendChild(createBtn(1, '1'));
        if (startPage > 2) container.appendChild(createBtn(0, '...', false, false, true));
    }
    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createBtn(i, i.toString(), false, i === current));
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) container.appendChild(createBtn(0, '...', false, false, true));
        container.appendChild(createBtn(totalPages, totalPages.toString()));
    }

    if (totalPages > 1) {
        container.appendChild(createBtn(Math.min(totalPages, current + 1), '›', current === totalPages));
        container.appendChild(createBtn(totalPages, '»', current === totalPages));
    }
}

function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('filter-category');
    const stockSelect = document.getElementById('filter-stock');

    const search = searchInput ? searchInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : '';
    const status = stockSelect ? stockSelect.value : '';

    let url = `/api/produtos?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    console.log(`[Estoque JS - applyFilters] URL para API: ${url}`);
    loadProducts(url);
}

async function deleteProduct(productId) {
    if (!confirm(`Tem certeza que deseja excluir o produto ID ${productId}?`)) return;
    showNotification('Excluindo produto...', 'info');
    try {
        const response = await fetch(`/api/produtos/${productId}`, { method: 'DELETE', credentials: 'include' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro HTTP ${response.status}` }));
            throw new Error(errorData.message);
        }
        const result = await response.json();
        showNotification(result.message || 'Produto excluído com sucesso!', 'success');
        const inventoryGrid = document.querySelector('.inventory-grid');
        const currentProductCount = inventoryGrid ? inventoryGrid.querySelectorAll('.product-card').length - 1 : 0;
        if (currentProductCount === 0 && currentPage > 1) {
            currentPage--;
        }
        applyFilters();
    } catch (error) {
        console.error('[Estoque JS - deleteProduct] Erro ao excluir:', error);
        showNotification(`Erro ao excluir produto: ${error.message}`, 'error');
    }
}
async function loadProductForEdit(productId) {
    console.log(`[Estoque JS] Carregando produto ID ${productId} para edição.`);
    const form = document.getElementById('edit-product-form');
    const imagePreview = document.getElementById('edit-preview-image');
    const categorySelect = form.querySelector('#edit-categoriaSelect');

    if (!form || !imagePreview || !categorySelect) {
        console.error('[Estoque JS] Erro: Elementos do formulário de edição não encontrados.');
        return;
    }

    // Reseta o formulário para garantir que dados antigos não apareçam
    form.reset();
    imagePreview.style.display = 'none';
    imagePreview.src = '';

    try {
        // Passo 1: Buscar os dados do produto na API
        const response = await fetch(`/api/produtos/${productId}`, { credentials: 'include' });

        // Passo 2: Tratar o erro 404 de forma explícita
        if (response.status === 404) {
            const errorData = await response.json().catch(() => ({ message: 'Produto não encontrado.' }));
            throw new Error(errorData.message);
        }
        
        if (!response.ok) {
            throw new Error(`Erro na rede: ${response.statusText}`);
        }

        const product = await response.json();
        if (!product || !product.id) {
             throw new Error("Dados do produto recebidos são inválidos.");
        }
        
        console.log('[Estoque JS] Dados do produto recebidos para edição:', product);

        // Passo 3: Preencher os campos do formulário com os dados recebidos
        form.querySelector('#product-id').value = product.id;
        form.querySelector('#edit-product-title').value = product.titulo || product.nome || '';
        form.querySelector('#edit-product-price').value = product.preco;
        form.querySelector('#edit-product-stock').value = product.estoque;

        // Espera um pouco para garantir que as categorias já foram carregadas no select
        setTimeout(() => {
            if (categorySelect.querySelector(`option[value="${product.categoria_id}"]`)) {
                 categorySelect.value = product.categoria_id;
            } else {
                 console.warn(`Categoria ID ${product.categoria_id} não encontrada no select.`);
            }
        }, 300);


        // Passo 4: Construir a URL da imagem de forma segura e exibi-la
        if (product.foto) {
            // Lógica melhorada para tratar o caminho da imagem
            let imageUrl = product.foto.replace(/\\/g, '/');
            
            // Se o caminho já começa com /uploads/, está correto
            if (imageUrl.startsWith('/uploads/')) {
                // Manter como está
            }
            // Se começa com uploads/ (sem a barra inicial)
            else if (imageUrl.startsWith('uploads/')) {
                imageUrl = `/${imageUrl}`;
            }
            // Se não tem uploads/ no início, adicionar
            else if (!imageUrl.includes('uploads/')) {
                imageUrl = `/uploads/products/${imageUrl}`;
            }
            // Se tem uploads/ em algum lugar no meio do caminho
            else {
                const uploadsIndex = imageUrl.indexOf('uploads/');
                if (uploadsIndex > 0) {
                    imageUrl = `/${imageUrl.substring(uploadsIndex)}`;
                } else if (uploadsIndex === 0 && !imageUrl.startsWith('/')) {
                    imageUrl = `/${imageUrl}`;
                }
            }
            
            console.log(`[Estoque JS] Definindo URL da imagem de preview: ${imageUrl}`);
            console.log(`[Estoque JS] Foto original do produto: ${product.foto}`);
            imagePreview.src = imageUrl;
            imagePreview.style.display = 'block';
        } else {
            console.log('[Estoque JS] O produto não possui uma imagem cadastrada.');
            imagePreview.style.display = 'none';
        }

    } catch (error) {
        console.error('[Estoque JS] Erro grave ao carregar produto para edição:', error);
        showNotification(`Erro ao carregar produto: ${error.message}`, 'error');
        // Redireciona de volta para o estoque, pois não é possível editar
        navigateTo('estoque');
    }
}
async function handleEditSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"].save-btn');
    const productId = form.elements['id'].value;

    if (!productId) {
        showNotification("ID do produto não encontrado para edição.", "error");
        return;
    }
    if (submitButton) submitButton.disabled = true;
    showNotification('Salvando alterações...', 'info');
    const formData = new FormData(form);
    try {
        const response = await fetch(`/api/produtos/${productId}`, {
            method: 'PUT',
            body: formData,
            credentials: 'include'
        });
        const result = await response.json().catch(async () => ({ success: false, message: await response.text() || `Erro ${response.status}` }));
        if (response.ok && result.success) {
            showNotification(result.message || 'Produto atualizado com sucesso!', 'success');
            form.reset();
            sessionStorage.removeItem('editingProductId');
            navigateTo('estoque');
        } else {
            throw new Error(result.message || 'Falha ao atualizar produto.');
        }
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        showNotification(`Erro ao atualizar: ${error.message}`, 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}
export function initEditarProduto() {
    console.log('[Estoque JS] Inicializando página de edição de produto...');
    
    const productId = sessionStorage.getItem('editProductId');
    
    if (!productId) {
        showNotification('ID do produto não fornecido para edição.', 'error');
        navigateTo('estoque');
        return;
    }
    
    loadProductForEdit(productId);

    const form = document.getElementById('edit-product-form');
    if (!form) return;
    const categorySelect = document.getElementById('edit-categoriaSelect');
    if (categorySelect) {
        fetch('/api/categorias', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if(data && Array.isArray(data)) {
                    categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';
                    data.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.id;
                        option.textContent = cat.nome;
                        categorySelect.appendChild(option);
                    });
                }
            })
            .catch(err => console.error('[Estoque JS] Erro ao carregar categorias para edição:', err));
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        
        showNotification('Salvando alterações...', 'info');
        
        try {
            const productId = form.querySelector('#product-id').value;
            if (!productId) throw new Error('ID do produto não encontrado no formulário.');
            
            const formData = new FormData(form);
            
            const imageInput = form.querySelector('#edit-product-photo');
            if (imageInput && imageInput.files.length === 0) {
                formData.delete('foto');
            }
            
            const response = await fetch(`/api/produtos/${productId}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}: ${response.statusText}` }));
                throw new Error(errorData.message || 'Falha ao atualizar produto.');
            }
            
            const result = await response.json();
            showNotification(result.message || 'Produto atualizado com sucesso!', 'success');
            
            sessionStorage.removeItem('editProductId');
            setTimeout(() => navigateTo('estoque'), 1000);
            
        } catch (error) {
            console.error('[Estoque JS] Erro ao atualizar produto:', error);
            showNotification(`Erro: ${error.message}`, 'error');
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    const imageInput = document.getElementById('edit-product-photo');
    const imagePreview = document.getElementById('edit-preview-image');
    
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function(e) {
            const file = this.files[0];
            if (file && file.type.match('image.*')) {
                console.log('[Estoque JS] Nova imagem selecionada:', file.name);
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    const fileLabel = document.querySelector('label[for="edit-product-photo"]');
                    if (fileLabel) {
                        fileLabel.textContent = file.name;
                    }
                };
                reader.readAsDataURL(file);
            } else if (file) {
                showNotification('Por favor, selecione apenas arquivos de imagem.', 'warning');
                this.value = '';
            }
        });
    }
    
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('editProductId');
            navigateTo('estoque');
        });
    }
}

export function initEstoque() {
    console.log('[Estoque JS] initEstoque: Execução iniciada.');

    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    let categorySelect = document.getElementById('filter-category');
    let stockSelect = document.getElementById('filter-stock');
    const newProductBtn = document.getElementById('new-product-btn');
    const setupListener = (element, eventType, handler, logName) => {
        if (element) {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            newElement.addEventListener(eventType, handler); 
            console.log(`[Estoque JS] Listener '${eventType}' configurado para ${logName}.`);
            return newElement; 
        } else {
            console.warn(`[Estoque JS] Elemento para ${logName} NÃO encontrado!`);
        }
        return null;
    };

    setupListener(searchBtn, 'click', () => {
        console.log("[Estoque JS] Botão #search-btn clicado.");
        currentPage = 1;
        applyFilters();
    }, '#search-btn');

    setupListener(searchInput, 'keypress', e => {
        if (e.key === 'Enter') {
            console.log("[Estoque JS] Enter pressionado em #search-input.");
            currentPage = 1;
            applyFilters();
        }
    }, '#search-input');

    setupListener(categorySelect, 'change', (event) => {

        const currentElement = event.target;
        console.log(`[Estoque JS] #filter-category MUDOU! Novo valor: '${currentElement ? currentElement.value : "ERRO: currentElement NULO"}'`);
        currentPage = 1;
        applyFilters();
    }, '#filter-category');

    setupListener(stockSelect, 'change', (event) => {
        const currentElement = event.target;
        console.log(`[Estoque JS] #filter-stock MUDOU! Novo valor: '${currentElement ? currentElement.value : "ERRO: currentElement NULO"}'`);
        currentPage = 1;
        applyFilters();
    }, '#filter-stock');

    setupListener(newProductBtn, 'click', () => navigateTo('produto-novo'), '#new-product-btn');

    const inventoryGrid = document.querySelector('.inventory-grid');
    if (inventoryGrid) {
        if (!inventoryGrid.dataset.actionListenerAttached) {
            inventoryGrid.addEventListener('click', e => {
                const targetElement = e.target;
                const editButton = targetElement.closest('.edit-btn[data-product-id]');
                const deleteButton = targetElement.closest('.delete-btn[data-product-id]');

                if (editButton) {
                    const productId = editButton.dataset.productId;
                    console.log(`[Estoque JS] Botão Editar (grid) clicado para produto ID: ${productId}`);
                    sessionStorage.setItem('editingProductId', productId);
                    navigateTo('produto-editar');
                } else if (deleteButton) {
                    const productId = deleteButton.dataset.productId;
                    console.log(`[Estoque JS] Botão Excluir (grid) clicado para produto ID: ${productId}`);
                    deleteProduct(productId);
                }
            });
            inventoryGrid.dataset.actionListenerAttached = 'true';
            console.log("[Estoque JS] Listener de DELEGAÇÃO para ações nos cards configurado.");
        }
    } else { console.warn("[Estoque JS] .inventory-grid não encontrado para listener de delegação."); }

    const paginationControls = document.querySelector('.pagination-controls');
    if (paginationControls) {
        if (!paginationControls.dataset.listenerAttached) {
            paginationControls.addEventListener('click', e => {
                const btn = e.target.closest('button.pagination-button');
                if (!btn || btn.disabled || btn.classList.contains('active')) return;
                const page = Number(btn.dataset.page);
                if (!isNaN(page) && page > 0) {
                    currentPage = page;
                    applyFilters();
                }
            });
            paginationControls.dataset.listenerAttached = 'true';
            console.log("[Estoque JS] Listener de DELEGAÇÃO para paginação configurado.");
        }
    } else { console.warn("[Estoque JS] .pagination-controls não encontrado para listener de delegação."); }

    console.log("[Estoque JS] Chamando applyFilters() pela primeira vez em initEstoque.");
    applyFilters();
    console.log('[Estoque JS] initEstoque: Execução concluída.');
}