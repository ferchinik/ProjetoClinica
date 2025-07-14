/**
 * Client Details module - Handles all client details functionality
 */
import { showNotification } from '../notification.js';
import { formatDateToDisplay } from '../utils/formatters.js';

let currentClientDetailId = null;

/**
 * Renders client photos
 * @param {Array} photos - Array of photo URLs
 */
export function renderClientPhotos(photos = []) {
    const container = document.getElementById('client-photos-container');
    const emptyState = document.getElementById('client-photos-empty');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!photos || photos.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    /**
     * Creates a media element
     * @param {string} url - Media URL
     * @param {string} type - Media type (image or video)
     * @param {string} altText - Alternative text
     * @returns {HTMLElement} The created media element
     */
    const createMediaElement = (url, type, altText) => {
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-item';
        
        let mediaElement;
        
        if (type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.controls = true;
            mediaElement.src = url;
            mediaElement.className = 'client-media video';
        } else {
            // Default to image
            mediaElement = document.createElement('img');
            mediaElement.src = url;
            mediaElement.alt = altText || 'Foto do cliente';
            mediaElement.className = 'client-media image';
            
            // Add lightbox functionality
            mediaElement.addEventListener('click', () => {
                const lightbox = document.getElementById('lightbox');
                const lightboxImg = document.getElementById('lightbox-img');
                
                if (lightbox && lightboxImg) {
                    lightboxImg.src = url;
                    lightbox.style.display = 'flex';
                }
            });
        }
        
        // Error handling
        mediaElement.onerror = () => {
            mediaElement.src = '/img/broken-image.png';
            mediaElement.alt = 'Imagem não disponível';
        };
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-media-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Tem certeza que deseja excluir esta mídia?')) {
                // Extract the filename from the URL
                const filename = url.split('/').pop();
                
                fetch(`/api/clientes/${currentClientDetailId}/photos/${filename}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) throw new Error('Erro ao excluir mídia');
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        mediaContainer.remove();
                        showNotification('Mídia excluída com sucesso', 'success');
                        
                        // Check if there are no more photos
                        if (container.children.length === 0 && emptyState) {
                            emptyState.style.display = 'flex';
                        }
                    } else {
                        throw new Error(data.message || 'Erro ao excluir mídia');
                    }
                })
                .catch(error => {
                    console.error('Erro ao excluir mídia:', error);
                    showNotification('Erro ao excluir mídia', 'error');
                });
            }
        });
        
        mediaContainer.appendChild(mediaElement);
        mediaContainer.appendChild(deleteBtn);
        
        return mediaContainer;
    };
    
    // Render each photo
    photos.forEach(photo => {
        const isVideo = photo.toLowerCase().endsWith('.mp4') || photo.toLowerCase().endsWith('.webm');
        container.appendChild(createMediaElement(photo, isVideo ? 'video' : 'image'));
    });
}

/**
 * Loads and renders client photos
 * @param {string} clientIdToLoad - Client ID
 */
export async function loadAndRenderClientPhotos(clientIdToLoad) {
    if (!clientIdToLoad) return;
    
    try {
        const response = await fetch(`/api/clientes/${clientIdToLoad}/photos`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        renderClientPhotos(data.photos || []);
    } catch (error) {
        console.error('Erro ao carregar fotos do cliente:', error);
        showNotification('Erro ao carregar fotos do cliente', 'error');
    }
}

/**
 * Renders client details
 * @param {Object} clientData - Client data
 */
export function renderClientDetails(clientData = null) {
    if (!clientData) {
        document.getElementById('client-details-container').innerHTML = 
            '<div class="error-state">Erro ao carregar dados do cliente</div>';
        return;
    }
    
    document.getElementById('client-name').textContent = clientData.nome || 'Nome não disponível';
    document.getElementById('client-email').textContent = clientData.email || 'Email não disponível';
    document.getElementById('client-phone').textContent = clientData.telefone || 'Telefone não disponível';
    document.getElementById('client-birth-date').textContent = formatDateToDisplay(clientData.data_nascimento) || 'Data não disponível';
    document.getElementById('client-address').textContent = clientData.endereco || 'Endereço não disponível';
    
    // Set profile photo if available
    const profilePhoto = document.getElementById('client-profile-photo');
    if (profilePhoto) {
        if (clientData.foto) {
            profilePhoto.src = clientData.foto;
            profilePhoto.onerror = () => {
                profilePhoto.src = '/img/default-avatar.png';
            };
        } else {
            profilePhoto.src = '/img/default-avatar.png';
        }
    }
}

/**
 * Loads and renders client measurements
 * @param {string} idDoClienteComoParametro - Client ID
 */
export async function loadAndRenderClientMedidas(idDoClienteComoParametro) {
    if (!idDoClienteComoParametro) return;
    
    const container = document.getElementById('client-medidas-container');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading-indicator">Carregando medidas...</div>';
        
        const response = await fetch(`/api/clientes/${idDoClienteComoParametro}/medidas`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (!data || !data.medidas || data.medidas.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma medida registrada</div>';
            return;
        }
        
        container.innerHTML = '';
        
        // Sort by date (newest first)
        const sortedMedidas = data.medidas.sort((a, b) => {
            return new Date(b.data_registro) - new Date(a.data_registro);
        });
        
        sortedMedidas.forEach(medida => {
            const medidaDiv = document.createElement('div');
            medidaDiv.className = 'medida-item';
            
            const date = formatDateToDisplay(medida.data_registro);
            
            medidaDiv.innerHTML = `
                <div class="medida-header">
                    <h4>Medida de ${date}</h4>
                    <div class="medida-actions">
                        <button class="delete-medida-btn" data-id="${medida.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="medida-details">
                    <div class="medida-row">
                        <span class="medida-label">Peso:</span>
                        <span class="medida-value">${medida.peso || '-'} kg</span>
                    </div>
                    <div class="medida-row">
                        <span class="medida-label">Altura:</span>
                        <span class="medida-value">${medida.altura || '-'} cm</span>
                    </div>
                    <div class="medida-row">
                        <span class="medida-label">IMC:</span>
                        <span class="medida-value">${medida.imc || '-'}</span>
                    </div>
                    ${medida.observacoes ? `
                    <div class="medida-row">
                        <span class="medida-label">Observações:</span>
                        <span class="medida-value">${medida.observacoes}</span>
                    </div>` : ''}
                </div>
            `;
            
            // Add delete button event listener
            const deleteBtn = medidaDiv.querySelector('.delete-medida-btn');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    handleDeleteMedida(medida.id, idDoClienteComoParametro, medidaDiv);
                };
            }
            
            container.appendChild(medidaDiv);
        });
    } catch (error) {
        console.error('Erro ao carregar medidas do cliente:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar medidas</div>';
    }
}

/**
 * Handles deleting a measurement
 * @param {string} medidaId - Measurement ID
 * @param {string} clienteIdParaRecarregar - Client ID to reload
 * @param {HTMLElement} itemDivElement - Element to remove
 */
export async function handleDeleteMedida(medidaId, clienteIdParaRecarregar, itemDivElement) {
    if (!confirm('Tem certeza que deseja excluir esta medida?')) return;
    
    try {
        const response = await fetch(`/api/medidas/${medidaId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (data.success) {
            if (itemDivElement) {
                itemDivElement.remove();
            }
            
            showNotification('Medida excluída com sucesso', 'success');
            
            // Check if there are no more medidas
            const container = document.getElementById('client-medidas-container');
            if (container && container.children.length === 0) {
                container.innerHTML = '<div class="empty-state">Nenhuma medida registrada</div>';
            }
        } else {
            throw new Error(data.message || 'Erro ao excluir medida');
        }
    } catch (error) {
        console.error('Erro ao excluir medida:', error);
        showNotification('Erro ao excluir medida', 'error');
    }
}

/**
 * Loads and renders client anamnesis
 * @param {string} clientId - Client ID
 */
export async function loadAndRenderClientAnamnese(clientId) {
    if (!clientId) return;
    
    const container = document.getElementById('client-anamnese-container');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading-indicator">Carregando anamnese...</div>';
        
        const response = await fetch(`/api/clientes/${clientId}/anamnese`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (!data || !data.anamnese) {
            container.innerHTML = '<div class="empty-state">Nenhuma anamnese registrada</div>';
            return;
        }
        
        const anamnese = data.anamnese;
        
        container.innerHTML = `
            <div class="anamnese-item">
                <div class="anamnese-header">
                    <h4>Anamnese</h4>
                    <div class="anamnese-date">
                        Registrada em: ${formatDateToDisplay(anamnese.data_registro)}
                    </div>
                </div>
                <div class="anamnese-details">
                    ${Object.entries(anamnese)
                        .filter(([key]) => !['id', 'cliente_id', 'data_registro'].includes(key))
                        .map(([key, value]) => {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            return `
                                <div class="anamnese-row">
                                    <span class="anamnese-label">${label}:</span>
                                    <span class="anamnese-value">${value || '-'}</span>
                                </div>
                            `;
                        })
                        .join('')
                    }
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar anamnese do cliente:', error);
        container.innerHTML = '<div class="error-state">Erro ao carregar anamnese</div>';
    }
}

/**
 * Loads and renders client details
 * @param {string} clientId - Client ID
 */
export async function loadAndRenderClientDetails(clientId) {
    if (!clientId) {
        showNotification('ID do cliente não fornecido', 'error');
        return;
    }
    
    currentClientDetailId = clientId;
    
    try {
        // Show loading state
        document.getElementById('client-details-container').innerHTML = 
            '<div class="loading-indicator">Carregando dados do cliente...</div>';
        
        // Fetch client data
        const response = await fetch(`/api/clientes/${clientId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const clientData = await response.json();
        
        // Render client details
        renderClientDetails(clientData);
        
        // Update edit button href
        const editBtn = document.getElementById('edit-client-btn');
        if (editBtn) {
            editBtn.href = `#cliente-editar?id=${clientId}`;
        }
        
        // Load client photos
        loadAndRenderClientPhotos(clientId);
        
        // Load client medidas
        loadAndRenderClientMedidas(clientId);
        
        // Load client anamnese
        loadAndRenderClientAnamnese(clientId);
        
        // Update page title with client name
        document.title = `${clientData.nome} - Detalhes do Cliente`;
        
        // Update breadcrumb
        const breadcrumbClientName = document.getElementById('breadcrumb-client-name');
        if (breadcrumbClientName) {
            breadcrumbClientName.textContent = clientData.nome;
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes do cliente:', error);
        document.getElementById('client-details-container').innerHTML = 
            '<div class="error-state">Erro ao carregar dados do cliente</div>';
        showNotification('Erro ao carregar dados do cliente', 'error');
    }
}

/**
 * Initializes the client details page
 */
export function initClienteDetalhes() {
    console.log('[ClienteDetalhes] Inicializando página de detalhes do cliente...');
    
    // Get client ID from URL
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const clientId = urlParams.get('id');
    
    if (!clientId) {
        showNotification('ID do cliente não fornecido', 'error');
        return;
    }
    
    // Load client details
    loadAndRenderClientDetails(clientId);
    
    // Setup modal functionality
    const setupButtonListener = (buttonId, action) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                // Update hidden client ID field
                const clientIdField = document.getElementById('cliente_id');
                if (clientIdField) {
                    clientIdField.value = clientId;
                }
                
                // Show modal
                const modal = document.getElementById(`${action}-modal`);
                if (modal) {
                    modal.style.display = 'flex';
                }
            });
        }
    };
    
    // Setup button listeners
    setupButtonListener('add-photo-btn', 'add-photo');
    setupButtonListener('add-medida-btn', 'add-medida');
    setupButtonListener('add-anamnese-btn', 'add-anamnese');
    
    // Setup form submissions
    const photoForm = document.getElementById('add-photo-form');
    if (photoForm) {
        photoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(photoForm);
            
            try {
                const response = await fetch(`/api/clientes/${clientId}/photos`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                
                if (data.success) {
                    showNotification('Foto adicionada com sucesso', 'success');
                    
                    // Close modal
                    const modal = document.getElementById('add-photo-modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                    
                    // Reset form
                    photoForm.reset();
                    
                    // Reload photos
                    loadAndRenderClientPhotos(clientId);
                } else {
                    throw new Error(data.message || 'Erro ao adicionar foto');
                }
            } catch (error) {
                console.error('Erro ao adicionar foto:', error);
                showNotification('Erro ao adicionar foto', 'error');
            }
        });
    }
    
    // Close modal functionality
    const closeModal = () => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Reset forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
        });
        
        // Reset previews
        const previews = document.querySelectorAll('.preview-container');
        previews.forEach(preview => {
            preview.style.display = 'none';
        });
        
        const imgPreviews = document.querySelectorAll('.img-preview');
        imgPreviews.forEach(preview => {
            preview.src = '';
        });
        
        const vidPreviews = document.querySelectorAll('.video-preview');
        vidPreviews.forEach(preview => {
            preview.src = '';
        });
    };
    
    // Setup close buttons
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                closeModal();
            }
        });
    });
    
    // Setup file input preview
    const handlePreview = (inputId, imgPreviewId, vidPreviewId, namePreviewId) => {
        const input = document.getElementById(inputId);
        const imgPreview = document.getElementById(imgPreviewId);
        const vidPreview = document.getElementById(vidPreviewId);
        const namePreview = document.getElementById(namePreviewId);
        
        if (!input) return;
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const isVideo = file.type.startsWith('video/');
            const reader = new FileReader();
            
            reader.onload = (e) => {
                if (isVideo) {
                    if (vidPreview) {
                        vidPreview.src = e.target.result;
                        vidPreview.style.display = 'block';
                    }
                    if (imgPreview) {
                        imgPreview.style.display = 'none';
                    }
                } else {
                    if (imgPreview) {
                        imgPreview.src = e.target.result;
                        imgPreview.style.display = 'block';
                    }
                    if (vidPreview) {
                        vidPreview.style.display = 'none';
                    }
                }
                
                if (namePreview) {
                    namePreview.textContent = file.name;
                }
                
                const previewContainer = document.querySelector(`#${inputId}-preview-container`);
                if (previewContainer) {
                    previewContainer.style.display = 'block';
                }
            };
            
            reader.readAsDataURL(file);
        });
    };
    
    // Setup file input previews
    handlePreview('photo_file', 'photo-preview', 'video-preview', 'file-name-preview');
    
    // Setup lightbox
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.addEventListener('click', () => {
            lightbox.style.display = 'none';
        });
    }
}
