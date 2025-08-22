# ProjetoClinica
Sistema de Gestão para Clínicas - SaaS
Este projeto é um Sistema de Gestão completo para Clínicas, desenvolvido como uma aplicação web moderna e modular. A arquitetura foi pensada no modelo SaaS (Software as a Service), permitindo que a plataforma seja facilmente adaptada e implementada para diferentes tipos de clínicas (estética, fisioterapia, consultórios médicos, etc.) com o mínimo de reconfiguração.

O objetivo principal é centralizar todas as operações de uma clínica em uma única interface, substituindo planilhas, agendamentos manuais e sistemas legados. A plataforma transforma dados operacionais em insights estratégicos, otimizando a rotina, reduzindo erros e permitindo que os gestores foquem no crescimento do negócio e na qualidade do atendimento.

✨ Funcionalidades Principais
O sistema é dividido em módulos que cobrem todas as necessidades de gestão de uma clínica moderna:

📊 Dashboard Inteligente: Visão geral e em tempo real dos principais indicadores de desempenho (KPIs), como faturamento, agendamentos do dia, status do estoque e aniversariantes.
👥 Gestão de Clientes (CRM): Cadastro completo de clientes, com histórico de visitas, prontuários, ficha de anamnese detalhada e upload de fotos de "antes e depois".
🗓️ Agenda Inteligente: Calendário interativo para agendamento de consultas, com visualização por dia e mês, facilitando o gerenciamento de horários e profissionais.
💰 Controle Financeiro: Módulo completo para gestão de fluxo de caixa, com registro de todas as entradas (consultas, vendas) e saídas (despesas), além de resumos mensais.
📦 Gestão de Estoque: Controle de produtos e consumíveis, com cadastro, edição, categorização e filtros por status (em estoque, baixo, crítico).
📈 Relatórios Gerenciais: Geração de relatórios detalhados sobre faturamento, procedimentos mais realizados e novos clientes por período, com gráficos e tabelas para análise.
📝 Anamnese e Medidas: Formulários digitais para registro de ficha de anamnese e acompanhamento de medidas corporais dos clientes.

🛠️ Tecnologias Utilizadas
Este projeto foi construído utilizando um stack de tecnologias modernas e robustas, com foco em escalabilidade e manutenibilidade.

Backend
Plataforma: Node.js
Framework: Express.js para a criação da API RESTful e roteamento.
Banco de Dados: MySQL para armazenamento de todos os dados da aplicação.
Autenticação: JSON Web Tokens (JWT) para proteger as rotas da API e gerenciar as sessões dos usuários.
Segurança: bcryptjs para a criptografia de senhas.
Upload de Arquivos: multer para o gerenciamento de uploads de imagens de clientes e produtos.

Frontend
Linguagens: JavaScript (ES6+ Modules, Vanilla JS), HTML5, CSS3.
Arquitetura: Single Page Application (SPA), com carregamento dinâmico de componentes sem a necessidade de recarregar a página.
Visualização de Dados: Chart.js para a criação dos gráficos interativos nos dashboards e relatórios.
Estilização: CSS puro com variáveis para fácil customização e temas (claro/escuro).
