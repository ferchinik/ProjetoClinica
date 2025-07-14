const pageToContainerMap = {
    'dashboard': 'include-dashboard',
    'clientes': 'include-clientes',
    'cliente-detalhes': 'include-cliente-detalhes',
    'clientes-novo': 'include-novo-cliente',
    'cliente-editar': 'include-cliente-editar',
    'agendamento': 'agendamento-container',
    'nueva-cita': 'include-nueva-cita',
    'editar-cita': 'include-editar-cita',
    'dia-agendamentos': 'include-dia-agendamentos',
    'financeiro': 'include-financeiro',
    'financeiro-novo': 'include-novo-registro-financeiro',
    'financeiro-editar': 'include-financeiro-editar',
    'estoque': 'estoque-container',
    'produto-novo': 'include-novo-produto',
    'produto-editar': 'include-editar-produto',
    'lembretes': 'include-lembretes',
    'relatorios': 'relatorios-container',
    'prontuarios': 'include-prontuarios',
    'medidas-novo': 'include-nova-medida',
    'anamnese-form-page': 'include-anamnese-form'
};

let isNavigatingTo = null;
let navigationTimeout = null;

export function navigateTo(pageId) {
    const targetPageId = pageId || 'dashboard';

    console.log(`%c[Navegação] Tentativa para: #${targetPageId}`, "color: blue; font-weight:bold;");

    if (navigationTimeout) clearTimeout(navigationTimeout);
    navigationTimeout = setTimeout(() => {
        if (isNavigatingTo) {
            console.warn(`[Navegação] Timeout de navegação para #${isNavigatingTo}. Liberando flag.`);
            isNavigatingTo = null;
        }
    }, 1500);

    if (isNavigatingTo === targetPageId && targetPageId !== 'dashboard') {
        console.log(`[Navegação] Bloqueando re-entrada para: #${targetPageId} (já navegando para lá)`);
        return;
    }
    isNavigatingTo = targetPageId;
    console.log(`[Navegação] Processando para: #${targetPageId}`);

    let pagesDeactivatedCount = 0;
    document.querySelectorAll('main.content .page.active').forEach(activePage => {
        console.log(`[Navegação] Desativando página anteriormente ativa: #${activePage.id}`);
        activePage.classList.remove('active');
        pagesDeactivatedCount++;
    });
    if (pagesDeactivatedCount > 1) {
        console.warn(`[Navegação] ALERTA: ${pagesDeactivatedCount} páginas estavam ativas. Apenas uma deveria estar.`);
    } else if (pagesDeactivatedCount === 0 && (window.location.hash || pageId !== 'dashboard')) {
        console.warn(`[Navegação] Nenhuma página ativa foi encontrada para desativar ao navegar para #${targetPageId}.`);
    }

    document.querySelectorAll('.menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === targetPageId) {
            link.classList.add('active');
        }
    });

    const currentHash = window.location.hash.substring(1) || 'dashboard';
    if (targetPageId !== currentHash) {
        const newHash = (targetPageId === 'dashboard') ? '' : targetPageId;
        try {
            history.pushState({ page: targetPageId }, '', `#${newHash}`);
            console.log(`[Navegação] Histórico e hash atualizados para: #${newHash}`);
        } catch (e) {
            console.warn("[Navegação] Não foi possível usar pushState (provavelmente file://). Usando location.hash:", e.message);
            window.location.hash = newHash;
        }
    }

    sessionStorage.setItem('hasNavigated', 'true');

    const activatePageAndDispatchEvent = (id) => {
        const pageElement = document.getElementById(id);
        if (pageElement && pageElement.classList.contains('page')) {
            document.querySelectorAll('main.content .page.active').forEach(p => {
                if (p.id !== id) {
                    console.warn(`[Navegação Ativação] Desativando ${p.id} pois ${id} será ativada.`);
                    p.classList.remove('active');
                }
            });

            console.log(`[Navegação] Ativando página: #${id}`);
            pageElement.classList.add('active');
            window.scrollTo(0, 0);

            document.dispatchEvent(new CustomEvent('pageActivated', {
                bubbles: true,
                detail: { pageId: id }
            }));
        } else {
            console.error(`[Navegação ERRO] Página #${id} não encontrada ou sem classe .page para ativar.`);
        }

        if (!document.getElementById(id)) {
            console.error(`[Navegação ERRO FATAL] Página #${id} desapareceu do DOM após carregamento. Redirecionando para dashboard.`);
            if (id !== 'dashboard') {
                isNavigatingTo = null;
                navigateTo('dashboard');
            }
            return;
        }
        console.log(`[Navegação] Concluída para: #${id}. Liberando flag.`);
        isNavigatingTo = null;
        if (navigationTimeout) clearTimeout(navigationTimeout);
    };

    const targetPageElement = document.getElementById(targetPageId);

    if (targetPageElement && targetPageElement.classList.contains('page')) {
        console.log(`[Navegação] Página #${targetPageId} já no DOM. Ativando...`);
        activatePageAndDispatchEvent(targetPageId);
    } else {
        const containerDivId = pageToContainerMap[targetPageId];
        if (!containerDivId) {
            console.error(`[Navegação ERRO] Container não mapeado para '${targetPageId}'.`);
            isNavigatingTo = null;
            if (targetPageId !== 'dashboard') navigateTo('dashboard');
            return;
        }

        const containerElement = document.getElementById(containerDivId);
        if (!containerElement) {
            console.error(`[Navegação ERRO] Container DIV #${containerDivId} NÃO ENCONTRADO no index.html para carregar ${targetPageId}.`);
            isNavigatingTo = null;
            if (targetPageId !== 'dashboard') navigateTo('dashboard');
            return;
        }

        console.log(`[Navegação] Página #${targetPageId} não no DOM (ou não é .page). Container de destino: #${containerDivId}. Aguardando 'componentLoaded'...`);

        const waitForComponentToLoad = function(event) {
            if (event.detail?.id === containerDivId) {
                console.log(`[Navegação] 'componentLoaded' recebido para container #${containerDivId} (esperado para página #${targetPageId}).`);
                document.removeEventListener('componentLoaded', waitForComponentToLoad);

                requestAnimationFrame(() => {
                    const newlyLoadedPageElement = document.getElementById(targetPageId);
                    if (newlyLoadedPageElement && newlyLoadedPageElement.classList.contains('page')) {
                        console.log(`[Navegação] Página #${targetPageId} encontrada após 'componentLoaded'. Ativando...`);
                        activatePageAndDispatchEvent(targetPageId);
                    } else {
                        console.error(`[Navegação ERRO] Página #${targetPageId} AINDA não encontrada ou sem classe 'page' após 'componentLoaded' do container #${containerDivId}. Verifique o HTML de ${targetPageId}.html e se o ID da seção principal é '${targetPageId}' e tem a classe 'page'.`);
                        isNavigatingTo = null;
                        if (targetPageId !== 'dashboard') navigateTo('dashboard');
                    }
                });
            }
        };
        document.addEventListener('componentLoaded', waitForComponentToLoad);
    }
}

export function initNavigation() {
    if (document.body.dataset.navigationInitialized === 'true') {
        console.log("[Navegação] Listeners globais já inicializados.");
        return;
    }
    console.log("[Navegação] Inicializando listeners globais (click e popstate)...");

    document.addEventListener('click', (event) => {
        const link = event.target.closest('[data-page]');
        if (link) {
            event.preventDefault();
            const pageId = link.dataset.page;
            if (pageId) {
                navigateTo(pageId);
            } else {
                console.warn("[Navegação] Link com 'data-page' sem valor.", link);
            }
        }
    });

    window.addEventListener('popstate', (event) => {
        const pageId = event.state?.page || (window.location.hash.substring(1) || 'dashboard');
        console.log(`[Navegação] Evento 'popstate'. Navegando para: #${pageId}`);
        navigateTo(pageId);
    });

    document.body.dataset.navigationInitialized = 'true';
    console.log("[Navegação] Listeners globais configurados.");
}