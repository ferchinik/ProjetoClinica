// clinica/public/js/component-loader.js

export function loadComponent(containerId, componentPath) {
    const container = document.getElementById(containerId);

    console.log(`[Loader] Carregando ${componentPath} em #${containerId}`);

    if (!container) {
        console.error(`[Loader] ERRO: Container #${containerId} não encontrado para ${componentPath}.`);
        return;
    }

    fetch(componentPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status} ao carregar ${componentPath}`);
            }
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            console.log(`[Loader] HTML de ${componentPath} inserido em #${containerId}. Disparando 'componentLoaded'.`);
            document.dispatchEvent(new CustomEvent('componentLoaded', {
                detail: { id: containerId, url: componentPath }
            }));
        })
        .catch(error => {
            console.error(`[Loader] Falha ao carregar ${componentPath} em #${containerId}:`, error);
            container.innerHTML = `<p style="color:red; padding:10px;">Erro ao carregar ${componentPath}. Verifique o console.</p>`;
        });
}

export function loadInitialComponents() {
    const componentsToLoad = [
        { id: 'sidebar-container', url: 'components/sidebar.html' },

        { id: 'include-dashboard', url: 'components/dashboard.html' },
        { id: 'include-clientes', url: 'components/clientes.html' },
        { id: 'agendamento-container', url: 'components/agendamento.html' },
        { id: 'include-financeiro', url: 'components/financeiro.html' },
        { id: 'estoque-container', url: 'components/estoque.html' },
        { id: 'include-lembretes', url: 'components/lembretes.html' },
        { id: 'relatorios-container', url: 'components/relatorios.html' },
        { id: 'include-prontuarios', url: 'components/prontuarios.html' },

        { id: 'include-cliente-detalhes', url: 'components/cliente-detalhes.html' },
        { id: 'include-novo-cliente', url: 'components/novo-cliente.html' },
        { id: 'include-cliente-editar', url: 'components/cliente-editar.html' },
        { id: 'include-nova-medida', url: 'components/nova-medida.html' },
        { id: 'include-anamnese-form', url: 'components/anamnese-form.html' },

        { id: 'include-nueva-cita', url: 'components/nueva-cita.html' },
        { id: 'include-editar-cita', url: 'components/editar-cita.html' },

        { id: 'include-novo-registro-financeiro', url: 'components/novo-registro-financeiro.html'},
        { id: 'include-financeiro-editar', url: 'components/financeiro-editar.html' },

        { id: 'include-novo-produto', url: 'components/novo-produto.html' },
        { id: 'include-editar-produto', url: 'components/editar-produto.html' },
        { id: 'include-dia-agendamentos', url: 'components/dia-agendamentos.html' }
    ];

    console.log("[Loader] Iniciando carregamento de componentes iniciais...");
    componentsToLoad.forEach(component => {
        if (document.getElementById(component.id)) {
            loadComponent(component.id, component.url);
        } else {
            console.warn(`[Loader] AVISO: Container #${component.id} (para ${component.url}) não encontrado no index.html durante o carregamento inicial.`);
        }
    });
    console.log("[Loader] Solicitação de carregamento de componentes iniciais concluída.");
}