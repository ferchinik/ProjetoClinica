import { navigateTo } from './navigation.js';
import { showNotification } from './notification.js';

export function initNovoProduto() {
    console.log("[Novo Produto] Inicializando formulário (com categorias fixas no HTML)...");
    const productForm = document.getElementById('product-form');
    
    if (!productForm) {
        console.error("[Novo Produto] ERRO CRÍTICO: Formulário #product-form não encontrado.");
        showNotification("Erro fatal: Formulário de produto não encontrado.", "error");
        return;
    }
    
    const newProductForm = productForm.cloneNode(true);
    productForm.parentNode.replaceChild(newProductForm, productForm);
    
    const categorySelect = newProductForm.querySelector('#categoriaSelect');
    const novaCategoriaGroup = newProductForm.querySelector('#novaCategoria-group');
    const novaCategoriaInput = newProductForm.querySelector('#novaCategoria');
    const productPhotoInput = newProductForm.querySelector('#product-photo');
    const previewImage = newProductForm.querySelector('#preview-image');
    const fileUploadLabel = newProductForm.querySelector('label[for="product-photo"]');

    if (!categorySelect || !novaCategoriaGroup || !novaCategoriaInput || !productPhotoInput || !previewImage || !fileUploadLabel) {
        console.error("[Novo Produto] Erro: Elementos essenciais do formulário não encontrados após clonagem.");
        return;
    }

    categorySelect.addEventListener('change', () => {
        if (categorySelect.value === 'nueva') {
            novaCategoriaGroup.style.display = 'flex'; 
            novaCategoriaInput.required = true;
            novaCategoriaInput.focus();
        } else {
            novaCategoriaGroup.style.display = 'none';
            novaCategoriaInput.required = false;
            novaCategoriaInput.value = '';
        }
    });

    productPhotoInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                fileUploadLabel.innerHTML = `<i class="fas fa-check-circle"></i> ${file.name.substring(0, 20)}${file.name.length > 20 ? '...' : ''}`;
            }
            reader.readAsDataURL(file);
        } else {
            previewImage.src = '#';
            previewImage.style.display = 'none';
            fileUploadLabel.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Seleccionar Imagen';
            if (file) { 
                showNotification("Por favor, seleccione un archivo de imagen.", "warning");
            }
            this.value = ''; 
        }
    });
    
    newProductForm.addEventListener('submit', handleProductSubmit);
    
    const cancelButton = newProductForm.querySelector('.cancel-btn[data-page="estoque"]');
    if (cancelButton) {
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault();
            newProductForm.reset(); 
            
            const currentPreviewImage = newProductForm.querySelector('#preview-image');
            const currentFileUploadLabel = newProductForm.querySelector('label[for="product-photo"]');
            const currentNovaCategoriaGroup = newProductForm.querySelector('#novaCategoria-group');
            const currentNovaCategoriaInput = newProductForm.querySelector('#novaCategoria');
            const currentCategorySelect = newProductForm.querySelector('#categoriaSelect');

            if(currentPreviewImage) {
                currentPreviewImage.src = '#';
                currentPreviewImage.style.display = 'none';
            }
            if(currentFileUploadLabel) {
                currentFileUploadLabel.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Seleccionar Imagen';
            }
            if(currentNovaCategoriaGroup) {
                currentNovaCategoriaGroup.style.display = 'none';
            }
            if(currentNovaCategoriaInput){
                currentNovaCategoriaInput.required = false;
            }
            if(currentCategorySelect && currentCategorySelect.options.length > 0) {
                currentCategorySelect.selectedIndex = 0; 
            }

            navigateTo('estoque');
        });
    }
    
    console.log("[Novo Produto] Formulário inicializado e listeners adicionados.");
}

async function handleProductSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');

    if (form.elements['categoriaSelect'].value === 'nueva' && !form.elements['novaCategoria'].value.trim()) {
        showNotification('Por favor, ingrese el nombre de la nueva categoría.', 'error');
        form.elements['novaCategoria'].focus();
        return;
    }
     if (!form.elements['title'].value.trim()) {
        showNotification('El título del producto es obligatorio.', 'error');
        form.elements['title'].focus();
        return;
    }
    const price = parseFloat(form.elements['price'].value);
    if (isNaN(price) || price <= 0) {
        showNotification('El valor del producto debe ser un número positivo.', 'error');
        form.elements['price'].focus();
        return;
    }
    const stock = parseInt(form.elements['stock'].value, 10);
    if (isNaN(stock) || stock < 0) {
        showNotification('El stock debe ser un número igual o mayor que cero.', 'error');
        form.elements['stock'].focus();
        return;
    }
    if (!form.elements['photo'].files[0]) {
        showNotification('La foto del producto es obligatoria.', 'error');
        form.elements['photo'].focus();
        return;
    }


    if (submitButton) submitButton.disabled = true;
    showNotification("Guardando producto...", "info");

    const formData = new FormData(form); 
    
    console.log("[Novo Produto handleProductSubmit] FormData antes de enviar:");
    for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? value.name : value);
    }

    try {
        const response = await fetch('/api/produtos', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const result = await response.json().catch(async () => {
            const textResponse = await response.text();
            console.error("[Novo Produto handleProductSubmit] Resposta não JSON da API:", textResponse);
            return { success: false, message: textResponse || `Erro ${response.status}` };
        });

        console.log("[Novo Produto handleProductSubmit] Resposta da API:", result);

        if (response.ok && result.success) {
            showNotification(result.message || 'Producto guardado con éxito!', 'success');
            
            form.reset(); 
            const currentPreviewImage = form.querySelector('#preview-image');
            const currentFileUploadLabel = form.querySelector('label[for="product-photo"]');
            const currentNovaCategoriaGroup = form.querySelector('#novaCategoria-group');
            const currentNovaCategoriaInput = form.querySelector('#novaCategoria');
            const currentCategorySelect = form.querySelector('#categoriaSelect');
            
            if (currentPreviewImage) {
                currentPreviewImage.src = '#';
                currentPreviewImage.style.display = 'none';
            }
            if (currentFileUploadLabel) {
                currentFileUploadLabel.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Seleccionar Imagen';
            }
            if (currentNovaCategoriaGroup) {
                currentNovaCategoriaGroup.style.display = 'none';
            }
             if(currentNovaCategoriaInput){
                currentNovaCategoriaInput.required = false;
            }
            if (currentCategorySelect && currentCategorySelect.options.length > 0) {
                 currentCategorySelect.selectedIndex = 0;
            }

            navigateTo('estoque');
        } else {
            throw new Error(result.message || `Falha ao salvar o produto (Status: ${response.status})`);
        }
    } catch (err) {
        console.error("[Novo Produto handleProductSubmit] Erro ao salvar produto:", err);
        showNotification(`Error al guardar: ${err.message}`, 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}