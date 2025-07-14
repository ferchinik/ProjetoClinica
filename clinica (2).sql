-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 07/07/2025 às 19:44
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `clinica`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `agendamentos`
--

CREATE TABLE `agendamentos` (
  `id` int(11) NOT NULL,
  `paciente_nome` varchar(255) NOT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `data_hora` datetime NOT NULL,
  `tipo_consulta` varchar(255) NOT NULL,
  `valor` decimal(10,2) DEFAULT NULL,
  `profissional_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pendente',
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `agendamentos`
--

INSERT INTO `agendamentos` (`id`, `paciente_nome`, `cliente_id`, `data_hora`, `tipo_consulta`, `valor`, `profissional_id`, `status`, `observacoes`, `created_at`, `updated_at`) VALUES
(18, 'Bruno', 18, '2025-04-24 16:54:00', 'Botox Facial', 350.00, 3, 'Realizado', NULL, '2025-04-24 13:55:06', '2025-05-08 17:08:07'),
(20, 'Joao', 9, '2025-04-24 20:34:00', 'Limpeza Facial', 350.00, 2, 'Realizado', NULL, '2025-04-24 17:34:26', '2025-05-08 17:08:07'),
(21, 'fernada', 15, '2025-04-24 22:27:00', 'Limpeza Facial', 350.00, 2, 'Realizado', NULL, '2025-04-24 22:27:05', '2025-05-08 17:08:07'),
(22, 'Rafaela', 26, '2025-04-25 01:28:00', 'Rinomodelação', 150.00, 3, 'Realizado', NULL, '2025-04-24 22:28:28', '2025-05-08 17:08:07'),
(26, 'Rafaela', 26, '2025-05-06 11:34:00', 'Preenchimento Labial', 150000.00, 3, 'Realizado', NULL, '2025-05-06 10:35:17', '2025-05-08 17:08:07'),
(27, 'Mario', 34, '2025-05-07 15:38:00', 'Skin Care', 100000.00, 2, 'Realizado', NULL, '2025-05-07 10:38:28', '2025-05-08 17:08:07'),
(28, 'lucas', 5, '2025-05-07 13:42:00', 'Consulta Retorno', 150000.00, 3, 'Realizado', NULL, '2025-05-07 10:39:15', '2025-05-08 17:08:07'),
(29, 'Joao', 9, '2025-05-08 13:35:00', 'Consulta Retorno', 150000.00, 3, 'Realizado', NULL, '2025-05-08 10:33:09', '2025-05-08 17:08:07'),
(33, 'Mario', 34, '2025-05-09 10:00:00', 'Harmonização Facial', 300000.00, 2, 'Realizado', NULL, '2025-05-08 16:54:59', '2025-05-08 19:07:14'),
(35, 'fernada', 15, '2025-05-11 07:00:00', 'Preenchimento Labial', 150000.00, 1, 'Pendente', NULL, '2025-05-09 10:35:01', '2025-05-09 10:35:01'),
(36, 'Bruno', 18, '2025-05-11 10:00:00', 'Botox Facial', 200000.00, 2, 'Pendente', NULL, '2025-05-09 10:39:13', '2025-05-09 10:39:13'),
(38, 'Rafaela', 26, '2025-05-09 13:16:00', 'Botox Facial', 200000.00, 2, 'Realizado', NULL, '2025-05-09 13:17:01', '2025-05-09 13:17:03'),
(39, 'Pedro', 42, '2025-05-12 13:00:00', 'Rinomodelação', 300000.00, 2, 'Realizado', NULL, '2025-05-12 11:38:03', '2025-05-13 13:02:27'),
(41, 'Bruno', 18, '2025-05-20 07:31:00', 'Botox Facial', 200000.00, 1, 'Pendente', NULL, '2025-05-20 10:31:32', '2025-05-20 10:31:32'),
(42, 'Bruno', 18, '2025-05-21 10:30:00', 'Harmonização Facial', 300000.00, 3, 'Realizado', NULL, '2025-05-21 16:22:54', '2025-05-21 16:23:22'),
(43, 'Joao', 9, '2025-05-21 13:23:00', 'Botox Facial', 200000.00, 2, 'Pendente', NULL, '2025-05-21 16:23:17', '2025-05-21 16:23:17'),
(45, 'Bruno', 18, '2025-05-22 13:34:00', 'Harmonização Facial', 300000.00, 2, 'Pendente', NULL, '2025-05-22 16:34:25', '2025-05-22 16:34:25'),
(53, 'Fernanda', 15, '2025-06-02 10:37:00', 'Botox Facial', 300000.00, 3, 'Realizado', NULL, '2025-06-02 10:37:24', '2025-06-02 10:37:32'),
(55, 'Bruno', 18, '2025-06-06 10:33:00', 'Consulta Retorno', 200000.00, 2, 'Realizado', NULL, '2025-06-06 10:34:03', '2025-06-06 10:34:05'),
(56, 'Rafaela', 26, '2025-06-06 12:30:00', 'Rinomodelação', 500000.00, 3, 'Realizado', NULL, '2025-06-06 10:34:29', '2025-06-06 10:34:31'),
(57, 'Fernanda', 15, '2025-06-06 13:00:00', 'Botox Facial', 150000.00, 3, 'Realizado', NULL, '2025-06-06 10:35:24', '2025-06-13 10:39:01'),
(62, 'Bruno', 18, '2025-06-17 08:01:00', 'Consulta Retorno', NULL, 3, 'Pendente', NULL, '2025-06-17 11:01:13', '2025-06-27 12:22:52'),
(63, 'Bruno', 18, '2025-06-30 14:29:00', 'Consulta Retorno', 150000.00, 3, 'Pendente', NULL, '2025-06-30 17:30:01', '2025-06-30 17:30:01'),
(64, 'Bruno', 18, '2025-07-01 16:31:00', 'Consulta Retorno', 150000.00, 2, 'Realizado', NULL, '2025-07-01 13:31:46', '2025-07-01 13:34:57'),
(65, 'Fernanda', 15, '2025-07-24 10:40:00', 'Botox Facial', 300000.00, 3, 'Pendente', NULL, '2025-07-01 13:41:00', '2025-07-01 13:41:00'),
(66, 'Bruno', 18, '2025-07-07 14:28:00', 'Botox Facial', 150000.00, 1, 'Pendente', NULL, '2025-07-07 17:28:08', '2025-07-07 17:28:08');

-- --------------------------------------------------------

--
-- Estrutura para tabela `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `categorias`
--

INSERT INTO `categorias` (`id`, `nome`, `created_at`, `updated_at`) VALUES
(1, 'Produtos', '2025-05-29 13:20:55', '2025-05-29 13:20:55'),
(2, 'Outros', '2025-05-29 13:20:56', '2025-05-29 13:20:56'),
(3, 'Procedimentos Esteticos', '2025-05-29 13:20:56', '2025-05-29 13:20:56'),
(4, 'Itens', '2025-05-29 13:20:56', '2025-05-29 13:20:56'),
(7, 'Equipamentos', '2025-06-03 16:37:10', '2025-06-03 16:37:10'),
(9, 'Productos', '2025-07-07 17:28:40', '2025-07-07 17:28:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `categoriasss`
--

CREATE TABLE `categoriasss` (
  `cu` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `categoriasss`
--

INSERT INTO `categoriasss` (`cu`) VALUES
(1),
(2),
(3),
(6);

-- --------------------------------------------------------

--
-- Estrutura para tabela `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `nome_completo` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `data_nascimento` date DEFAULT NULL,
  `endereco` varchar(255) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `documento_identidade` varchar(50) DEFAULT NULL,
  `profissao` varchar(100) DEFAULT NULL,
  `observacoes` text DEFAULT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `data_cadastro` timestamp NOT NULL DEFAULT current_timestamp(),
  `ultima_visita` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `clientes`
--

INSERT INTO `clientes` (`id`, `nome_completo`, `email`, `telefone`, `data_nascimento`, `endereco`, `cidade`, `documento_identidade`, `profissao`, `observacoes`, `foto_perfil`, `data_cadastro`, `ultima_visita`) VALUES
(5, 'lucas', 'fe@hotmail.com', '123', '1899-05-09', '132', 'cde', '3243124', 'fdvd', 'wgfwe', 'uploads/clients/client-1743167214894-169197602.jpg', '2025-03-28 13:06:54', NULL),
(9, 'Joao', 'joao@hotmail.com', '5545998411805', '1899-05-27', '123', 'paraguai', '12345', 'Doutor', '', 'uploads/clients/client-1743511982776-894015768.jpg', '2025-04-01 12:53:02', NULL),
(15, 'Fernanda', 'fechi@hotmail.com', '595123', '2025-07-12', '132', 'cde', '3243124', 'Doutor', '', 'uploads/clients/client-1746724896355-865154510.jpg', '2025-04-22 10:46:57', NULL),
(18, 'Bruno', 'bru@hotmail.com', '5545984292964', '2025-07-07', '132', 'cde', '3243124', 'Doutor', '', 'uploads/clients/client-1745318887031-269041345.jpg', '2025-04-22 10:48:07', NULL),
(26, 'Rafaela ', 'rafau@hotmail.com', '123', '2025-05-07', '132', 'cde', '3243124', 'Doutor', '', 'uploads/clients/client-1745406799040-142136583.jpg', '2025-04-23 11:13:19', NULL),
(34, 'Mario ', 'mario@hotmail.com', '123', '2025-05-31', '132', 'cde', '3243124', 'Doutor', '', 'uploads/clients/client-1745407478907-380241616.jpg', '2025-04-23 11:24:38', NULL),
(42, 'Pedro', 'pedro@hotmail.com', '123', '2025-05-13', 'Avenida República Argentina 531', 'Paraná - Foz do Iguaçu', '3243124', 'Doutor', '', 'uploads/clients/client-1747046564952-841946128.jpg', '2025-05-12 10:42:44', NULL),
(43, 'Gabriela', 'gabi@hotmail.com', '59545984292964', '1999-03-06', '', 'FOZ DO IGUACU', '123', '', '', 'uploads/clients/client-1748342593573-787791692.jpg', '2025-05-27 10:43:13', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `cliente_anamneses`
--

CREATE TABLE `cliente_anamneses` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `data_anamnese` date NOT NULL,
  `queixa_principal` text DEFAULT NULL,
  `historico_doenca_atual` text DEFAULT NULL,
  `antecedentes_pessoais` text DEFAULT NULL,
  `alergias` text DEFAULT NULL,
  `medicamentos_em_uso` text DEFAULT NULL,
  `habitos_vida` text DEFAULT NULL,
  `habitos_nocivos` text DEFAULT NULL,
  `antecedentes_familiares` text DEFAULT NULL,
  `rotina_cuidados_pele` text DEFAULT NULL,
  `procedimentos_esteticos_anteriores` text DEFAULT NULL,
  `expectativas_tratamento` text DEFAULT NULL,
  `observacoes_gerais` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `cliente_anamneses`
--

INSERT INTO `cliente_anamneses` (`id`, `cliente_id`, `data_anamnese`, `queixa_principal`, `historico_doenca_atual`, `antecedentes_pessoais`, `alergias`, `medicamentos_em_uso`, `habitos_vida`, `habitos_nocivos`, `antecedentes_familiares`, `rotina_cuidados_pele`, `procedimentos_esteticos_anteriores`, `expectativas_tratamento`, `observacoes_gerais`, `created_at`, `updated_at`) VALUES
(1, 18, '2025-05-21', 'Emagrecer', 'Engordando muito rapido', 'Nenhuma', 'Nenhuma', 'Nenhuma', 'Nenhuma', 'Nenhuma', 'Nenhuma', 'Nenhuma', 'Nenhuma', 'Nenhuma', '', '2025-05-21 11:08:54', '2025-05-21 11:08:54');

-- --------------------------------------------------------

--
-- Estrutura para tabela `cliente_fotos`
--

CREATE TABLE `cliente_fotos` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `foto_antes_path` varchar(255) NOT NULL,
  `foto_depois_path` varchar(255) NOT NULL,
  `media_type_antes` varchar(10) DEFAULT 'image' COMMENT 'Tipo de mídia ANTES: image ou video',
  `media_type_depois` varchar(10) DEFAULT 'image' COMMENT 'Tipo de mídia DEPOIS: image ou video',
  `media_type` varchar(10) DEFAULT 'image' COMMENT 'Tipo de mídia: image ou video',
  `descricao` varchar(255) DEFAULT NULL,
  `data_registro` datetime DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `cliente_fotos`
--

INSERT INTO `cliente_fotos` (`id`, `cliente_id`, `foto_antes_path`, `foto_depois_path`, `media_type_antes`, `media_type_depois`, `media_type`, `descricao`, `data_registro`, `created_at`, `updated_at`) VALUES
(4, 15, 'clients/before_after/cliente_15-foto_antes-1746731025197-178509018.png', 'clients/before_after/cliente_15-foto_depois-1746731025204-438810071.png', 'image', 'image', 'image', NULL, '2025-05-08 16:03:45', '2025-05-08 19:03:45', '2025-05-08 19:03:45'),
(5, 18, 'clients/before_after/cliente_18-foto_antes-1746787125758-516137364.png', 'clients/before_after/cliente_18-foto_depois-1746787125774-239358187.png', 'image', 'image', 'image', NULL, '2025-05-09 07:38:45', '2025-05-09 10:38:45', '2025-05-09 10:38:45'),
(6, 15, 'clients/before_after/cliente_15-foto_antes-1748520477717-614485331.mp4', 'clients/before_after/cliente_15-foto_depois-1748520477725-679712042.mp4', 'video', 'video', 'image', NULL, '2025-05-29 09:07:57', '2025-05-29 12:07:57', '2025-05-29 12:07:57');

-- --------------------------------------------------------

--
-- Estrutura para tabela `cliente_medidas`
--

CREATE TABLE `cliente_medidas` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `data_medicao` date NOT NULL,
  `peso_kg` decimal(5,2) DEFAULT NULL,
  `altura_cm` int(11) DEFAULT NULL,
  `imc` decimal(4,2) DEFAULT NULL,
  `circ_braco_d_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Braço Direito em cm',
  `circ_braco_e_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Braço Esquerdo em cm',
  `circ_antebraco_d_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Antebraço Direito em cm',
  `circ_antebraco_e_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Antebraço Esquerdo em cm',
  `circ_peitoral_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Peitoral em cm',
  `circ_abdomen_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Abdômen em cm',
  `circ_cintura_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Cintura em cm',
  `circ_quadril_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Quadril em cm',
  `circ_coxa_d_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Coxa Direita em cm',
  `circ_coxa_e_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Coxa Esquerda em cm',
  `circ_panturrilha_d_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Panturrilha Direita em cm',
  `circ_panturrilha_e_cm` decimal(5,2) DEFAULT NULL COMMENT 'Circunferência Panturrilha Esquerda em cm',
  `perc_gordura_corporal` decimal(4,2) DEFAULT NULL COMMENT 'Percentual de Gordura Corporal',
  `massa_muscular_kg` decimal(5,2) DEFAULT NULL COMMENT 'Massa Muscular em kg',
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `cliente_medidas`
--

INSERT INTO `cliente_medidas` (`id`, `cliente_id`, `data_medicao`, `peso_kg`, `altura_cm`, `imc`, `circ_braco_d_cm`, `circ_braco_e_cm`, `circ_antebraco_d_cm`, `circ_antebraco_e_cm`, `circ_peitoral_cm`, `circ_abdomen_cm`, `circ_cintura_cm`, `circ_quadril_cm`, `circ_coxa_d_cm`, `circ_coxa_e_cm`, `circ_panturrilha_d_cm`, `circ_panturrilha_e_cm`, `perc_gordura_corporal`, `massa_muscular_kg`, `observacoes`, `created_at`, `updated_at`) VALUES
(2, 18, '2025-05-21', 80.00, 175, 26.12, 12.00, 12.00, 12.00, 12.00, 12.00, 12.00, 12.00, 12.00, 12.00, 12.00, 12.00, 12.00, 22.50, 60.50, NULL, '2025-05-21 11:00:05', '2025-05-21 11:00:05');

-- --------------------------------------------------------

--
-- Estrutura para tabela `produtos`
--

CREATE TABLE `produtos` (
  `id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `preco` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estoque` int(11) NOT NULL DEFAULT 0,
  `foto` varchar(255) DEFAULT NULL,
  `categoria_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `produtos`
--

INSERT INTO `produtos` (`id`, `titulo`, `preco`, `estoque`, `foto`, `categoria_id`, `created_at`, `updated_at`) VALUES
(3, 'Acido Hialuronico', 13000.00, 10, 'uploads\\photo-1743074256805-520339928.jpeg', 7, '2025-03-27 11:17:36', '2025-07-01 13:38:12'),
(11, 'Radiofrequência', 200000.00, 51, 'uploads/photo-1744374005784-491844036.jpeg', 3, '2025-04-11 12:20:05', '2025-06-05 10:32:06'),
(37, 'Oleo Lavanda', 15000.00, 20, 'uploads/products/photo-1751909319991-612984655.jpeg', 9, '2025-07-07 17:28:40', '2025-07-07 17:28:40');

-- --------------------------------------------------------

--
-- Estrutura para tabela `registro`
--

CREATE TABLE `registro` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `licencia` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `registro`
--

INSERT INTO `registro` (`id`, `nombre`, `apellido`, `email`, `especialidad`, `licencia`, `password`, `created_at`) VALUES
(1, 'Fer', 'Luiza', 'fela@hotmail.com', 'estetica', '123', '$2b$10$3aHqi5LE.BDFgoY4KXb8XuC1Jap5q8zs1nkboZkvk9xe1TgBq44XG', '2025-03-26 18:38:41'),
(2, 'João Pedro', 'Silva', 'joao.pedro@clinica.com', 'Clínico Geral', 'CRM12345', '$2b$10$a/5ry7XZ1l8SIavauU8I5e5P9N7RV8.WdbzBPNYRh.cW5qs2NJzk2', '2025-04-14 12:31:45'),
(3, 'Maria Eduarda', 'Santos', 'maria.eduarda@clinica.com', 'Dermatologia', 'CRM67890', '$2b$10$P/W85EJlQ.bDLkodd0MQdO1ghLbBdzT64Je.73Ux45mrKc9nIuHW6', '2025-04-14 12:31:45'),
(4, 'carlos', 'gomes', 'carlos@hotmail.com', 'fisioterapia', '123', '$2b$10$HAbHA.4Qhh.LQM16NN83gOXYBEeRiH3LCoKKYyT34hVKNjAH8VToi', '2025-05-07 13:11:28'),
(5, 'Eduardo', 'Lucas', 'eduardo@hotmail.com', 'nutricion', '123', '$2b$10$XrvMMQSWGdipmSEdubyRteap8Glg0iSkCnn73lhEGzMUfviKAgF0K', '2025-05-13 13:01:59');

-- --------------------------------------------------------

--
-- Estrutura para tabela `transacoes`
--

CREATE TABLE `transacoes` (
  `id` int(11) NOT NULL,
  `data` date NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `categoria` varchar(100) NOT NULL,
  `tipo` enum('Ingreso','Gasto') NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `transacoes`
--

INSERT INTO `transacoes` (`id`, `data`, `descricao`, `categoria`, `tipo`, `valor`, `data_criacao`) VALUES
(9, '2025-02-03', 'Evento', 'Otros', 'Ingreso', 200.00, '2025-04-04 12:00:06'),
(10, '2025-03-13', 'Curso de harmonização facial', 'Cursos', 'Ingreso', 150.00, '2025-04-07 10:59:42'),
(11, '2025-04-07', 'Consulta Corporal', 'Corporal', 'Ingreso', 200.00, '2025-04-07 11:01:35'),
(12, '2025-04-07', 'Salario de Funcionarios', 'Salario', 'Gasto', 500.00, '2025-04-07 11:02:41'),
(13, '2025-04-15', 'Evento', 'Eventos', 'Ingreso', 300.00, '2025-04-15 12:59:21'),
(16, '2025-04-24', 'Consulta Realizada - Botox Facial com Bruno', 'Corporal', 'Ingreso', 350.00, '2025-04-24 14:10:57'),
(17, '2025-04-24', 'Consulta Realizada - Limpeza Facial com Joao', 'Facial', 'Ingreso', 350.00, '2025-04-24 17:34:31'),
(18, '2025-04-24', 'Consulta Realizada - Limpeza Facial com fernada', 'Facial', 'Ingreso', 350.00, '2025-04-24 22:27:22'),
(19, '2025-04-25', 'Consulta Realizada - Rinomodelação com Rafaela', 'Corporal', 'Ingreso', 150.00, '2025-04-25 11:29:23'),
(20, '2025-04-28', 'Consulta Realizada - Limpeza Facial com Diego', 'Facial', 'Ingreso', 200.00, '2025-04-28 12:01:29'),
(24, '2025-05-05', 'Compra de produtos', 'Gastos Fijos', 'Gasto', 150000.00, '2025-05-05 10:58:44'),
(25, '2025-05-06', 'Consulta Realizada - Preenchimento Labial com Rafaela', 'Procedimientos', 'Ingreso', 250000.00, '2025-05-06 10:40:52'),
(26, '2025-05-06', 'Salario de Funcionarios', 'Salario', 'Gasto', 500000.00, '2025-05-06 13:41:59'),
(29, '2025-05-07', 'Consulta Realizada - Skin Care com Mario', 'Facial', 'Ingreso', 100000.00, '2025-05-07 10:38:35'),
(30, '2025-05-07', 'Consulta Realizada - Consulta Retorno com lucas', 'Corporal', 'Ingreso', 150000.00, '2025-05-07 10:39:39'),
(31, '2025-05-07', 'Compra de produtos', 'Gastos Fixos', 'Gasto', 300000.00, '2025-05-07 10:40:21'),
(33, '2025-05-07', 'Evento ', 'Eventos', 'Ingreso', 300000.00, '2025-05-07 10:48:22'),
(37, '2025-05-08', 'Consulta Realizada - Consulta Retorno com Joao', 'Corporal', 'Ingreso', 150000.00, '2025-05-08 10:33:11'),
(40, '2025-05-09', 'Consulta Realizada - Harmonização Facial com fernada', 'Facial', 'Ingreso', 500000.00, '2025-05-08 16:53:38'),
(41, '2025-05-09', 'Consulta Realizada - Harmonização Facial com Mario', 'Facial', 'Ingreso', 300000.00, '2025-05-08 19:07:14'),
(43, '2025-05-10', 'Consulta Realizada - Botox Facial com Rafaela', 'Corporal', 'Ingreso', 200000.00, '2025-05-09 13:15:26'),
(44, '2025-05-09', 'Consulta Realizada - Botox Facial com Rafaela', 'Facial', 'Ingreso', 200000.00, '2025-05-09 13:17:03'),
(45, '2025-05-12', 'Consulta Realizada - Rinomodelação com Pedro', 'Facial', 'Ingreso', 300000.00, '2025-05-13 13:02:27'),
(46, '2025-05-13', 'Compra de produtos', 'Gastos Fixos', 'Gasto', 250000.00, '2025-05-13 13:05:26'),
(47, '2025-05-21', 'Consulta Realizada - Harmonização Facial com Bruno', 'Corporal', 'Ingreso', 300000.00, '2025-05-21 16:23:22'),
(49, '2025-05-26', 'Consulta Realizada - Consulta Retorno com Bruno', 'Facial', 'Ingreso', 150000.00, '2025-05-27 10:41:24'),
(50, '2025-06-02', 'Consulta Realizada - Consulta Retorno com Bruno', 'Facial', 'Ingreso', 150000.00, '2025-06-02 10:28:43'),
(51, '2025-06-02', 'Compra de produtos', 'Gastos Fijos', 'Gasto', 300.00, '2025-06-02 10:29:08'),
(54, '2025-06-02', 'Salario de Funcionarios', 'Salario', 'Gasto', 500000.00, '2025-06-02 10:36:55'),
(55, '2025-06-02', 'Consulta Realizada - Botox Facial com Fernanda', 'Corporal', 'Ingreso', 300000.00, '2025-06-02 10:37:32'),
(56, '2025-06-04', 'Consulta Realizada - Consulta Retorno com Bruno', 'Facial', 'Ingreso', 150000.00, '2025-06-04 10:26:15'),
(57, '2025-06-06', 'Consulta Realizada - Consulta Retorno com Bruno', 'Facial', 'Ingreso', 200000.00, '2025-06-06 10:34:05'),
(58, '2025-06-06', 'Consulta Realizada - Rinomodelação com Rafaela', 'Corporal', 'Ingreso', 500000.00, '2025-06-06 10:34:31'),
(59, '2025-06-13', 'Consulta Realizada - Limpeza Facial com Rafaela', 'Facial', 'Ingreso', 150000.00, '2025-06-13 10:36:24'),
(60, '2025-06-06', 'Consulta Realizada - Botox Facial com Fernanda', 'Corporal', 'Ingreso', 150000.00, '2025-06-13 10:39:01'),
(61, '2025-07-01', 'Salario de Funcionarios', 'Salario', 'Gasto', 150000.00, '2025-07-01 13:31:18'),
(62, '2025-07-01', 'Evento', 'Eventos', 'Ingreso', 300000.00, '2025-07-01 13:31:31'),
(64, '2025-07-01', 'Consulta Realizada - Consulta Retorno com Bruno', 'Facial', 'Ingreso', 150000.00, '2025-07-01 13:34:57');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `agendamentos`
--
ALTER TABLE `agendamentos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `profissional_id` (`profissional_id`),
  ADD KEY `idx_data_hora` (`data_hora`),
  ADD KEY `idx_cliente_id` (`cliente_id`);

--
-- Índices de tabela `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nome` (`nome`),
  ADD UNIQUE KEY `UQ_NomeCategoria` (`nome`);

--
-- Índices de tabela `categoriasss`
--
ALTER TABLE `categoriasss`
  ADD PRIMARY KEY (`cu`),
  ADD KEY `id` (`cu`) USING BTREE;

--
-- Índices de tabela `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Índices de tabela `cliente_anamneses`
--
ALTER TABLE `cliente_anamneses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cliente_id` (`cliente_id`);

--
-- Índices de tabela `cliente_fotos`
--
ALTER TABLE `cliente_fotos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente_fotos_cliente_id` (`cliente_id`);

--
-- Índices de tabela `cliente_medidas`
--
ALTER TABLE `cliente_medidas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente_medidas_cliente_id` (`cliente_id`),
  ADD KEY `idx_cliente_medidas_data_medicao` (`data_medicao`);

--
-- Índices de tabela `produtos`
--
ALTER TABLE `produtos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categoria` (`categoria_id`);

--
-- Índices de tabela `registro`
--
ALTER TABLE `registro`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Índices de tabela `transacoes`
--
ALTER TABLE `transacoes`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `agendamentos`
--
ALTER TABLE `agendamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT de tabela `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `categoriasss`
--
ALTER TABLE `categoriasss`
  MODIFY `cu` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT de tabela `cliente_anamneses`
--
ALTER TABLE `cliente_anamneses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `cliente_fotos`
--
ALTER TABLE `cliente_fotos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `cliente_medidas`
--
ALTER TABLE `cliente_medidas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `produtos`
--
ALTER TABLE `produtos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT de tabela `registro`
--
ALTER TABLE `registro`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `transacoes`
--
ALTER TABLE `transacoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `agendamentos`
--
ALTER TABLE `agendamentos`
  ADD CONSTRAINT `agendamentos_ibfk_1` FOREIGN KEY (`profissional_id`) REFERENCES `registro` (`id`);

--
-- Restrições para tabelas `cliente_anamneses`
--
ALTER TABLE `cliente_anamneses`
  ADD CONSTRAINT `cliente_anamneses_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `cliente_fotos`
--
ALTER TABLE `cliente_fotos`
  ADD CONSTRAINT `fk_fotos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `cliente_medidas`
--
ALTER TABLE `cliente_medidas`
  ADD CONSTRAINT `cliente_medidas_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `produtos`
--
ALTER TABLE `produtos`
  ADD CONSTRAINT `fk_produtos_categorias` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
