export function initThemeSwitcher() {
    console.log('[ThemeSwitcher] Inicializando o alternador de tema...');
    
    // Verifica se o botão existe, se não, adiciona ao sidebar-footer
    let themeSwitch = document.getElementById('theme-switch');
    if (!themeSwitch) {
        console.log('[ThemeSwitcher] Botão de tema não encontrado, verificando sidebar-footer...');
        const sidebarFooter = document.querySelector('.sidebar-footer');
        
        if (sidebarFooter) {
            console.log('[ThemeSwitcher] Sidebar-footer encontrado, adicionando botão de tema...');
            if (!sidebarFooter.querySelector('.theme-toggle')) {
                const themeToggle = document.createElement('div');
                themeToggle.className = 'theme-toggle';
                themeToggle.innerHTML = `
                    <button id="theme-switch" title="Cambiar tema">
                        <i class="fas fa-adjust"></i>
                    </button>
                `;
                sidebarFooter.prepend(themeToggle);
                console.log('[ThemeSwitcher] Botão de tema adicionado ao sidebar-footer');
            }
            themeSwitch = document.getElementById('theme-switch');
        } else {
            console.warn('[ThemeSwitcher] Sidebar-footer não encontrado, não foi possível adicionar o botão de tema');
        }
    }

    const body = document.body;
    
    // Carrega o tema salvo do localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        console.log('[ThemeSwitcher] Tema escuro aplicado do localStorage');
    } else {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        console.log('[ThemeSwitcher] Tema claro aplicado (padrão ou do localStorage)');
    }

    // Adiciona o evento de clique ao botão se ele existir
    if (themeSwitch) {
        themeSwitch.addEventListener('click', function () {
            console.log('[ThemeSwitcher] Botão de tema clicado, alternando tema...');
            if (body.classList.contains('theme-light')) {
                body.classList.remove('theme-light');
                body.classList.add('theme-dark');
                localStorage.setItem('theme', 'dark');
                console.log('[ThemeSwitcher] Tema alterado para escuro');
            } else {
                body.classList.remove('theme-dark');
                body.classList.add('theme-light');
                localStorage.setItem('theme', 'light');
                console.log('[ThemeSwitcher] Tema alterado para claro');
            }
        });
        console.log('[ThemeSwitcher] Evento de clique adicionado ao botão de tema');
    } else {
        console.warn('[ThemeSwitcher] Botão de tema não encontrado após tentativa de adição');
    }
    
    // Adiciona um observador de mutação para garantir que o botão seja adicionado quando o sidebar for carregado
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                const sidebarFooter = document.querySelector('.sidebar-footer');
                if (sidebarFooter && !document.getElementById('theme-switch')) {
                    console.log('[ThemeSwitcher] Sidebar-footer detectado por MutationObserver, adicionando botão de tema...');
                    observer.disconnect(); // Desconecta o observador após encontrar o sidebar-footer
                    initThemeSwitcher(); // Reinicia a inicialização
                }
            }
        });
    });
    
    // Observa o documento para detectar quando o sidebar é carregado
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[ThemeSwitcher] Observador de mutação configurado para detectar carregamento do sidebar');
}