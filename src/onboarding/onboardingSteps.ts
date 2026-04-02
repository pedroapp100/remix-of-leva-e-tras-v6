// =============================================================================
// ONBOARDING STEPS — Central registry of all guided tour steps
// Each tour is keyed by role + page path
// =============================================================================

export interface OnboardingStep {
  /** CSS selector for the target element to highlight */
  target: string;
  /** Short title shown in the tooltip */
  title: string;
  /** Descriptive text explaining the element/feature */
  content: string;
  /** Preferred placement of the tooltip */
  placement?: "top" | "bottom" | "left" | "right";
}

export interface OnboardingTour {
  /** Unique tour ID (role-page) */
  id: string;
  /** Page path that triggers this tour */
  path: string;
  /** Role that sees this tour */
  role: "admin" | "cliente" | "entregador";
  /** Tour title shown in the welcome step */
  tourTitle: string;
  /** Steps in order */
  steps: OnboardingStep[];
}

// ─── Admin Tours ─────────────────────────────────────────────────────────────

const adminDashboard: OnboardingTour = {
  id: "admin-dashboard",
  path: "/admin",
  role: "admin",
  tourTitle: "Painel Administrativo",
  steps: [
    {
      target: "[data-onboarding='metric-cards']",
      title: "Métricas do dia",
      content: "Aqui você vê os indicadores-chave: solicitações pendentes, entregas do dia, faturamento e ticket médio. Os dados atualizam em tempo real.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='recent-requests']",
      title: "Solicitações recentes",
      content: "Lista rápida das últimas solicitações recebidas. Clique em qualquer uma para ver detalhes ou atribuir um entregador.",
      placement: "top",
    },
    {
      target: "[data-onboarding='sidebar-nav']",
      title: "Menu de navegação",
      content: "Use o menu lateral para acessar todas as áreas: Solicitações, Clientes, Entregadores, Faturas, Financeiro, Relatórios e Configurações.",
      placement: "right",
    },
  ],
};

const adminSolicitacoes: OnboardingTour = {
  id: "admin-solicitacoes",
  path: "/admin/solicitacoes",
  role: "admin",
  tourTitle: "Gestão de Solicitações",
  steps: [
    {
      target: "[data-onboarding='status-tabs']",
      title: "Filtros por status",
      content: "Filtre solicitações por status: Pendentes aguardam aprovação, Em Andamento já têm entregador, Concluídas foram finalizadas.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='new-request-btn']",
      title: "Nova solicitação",
      content: "Crie uma nova solicitação de entrega manualmente. Selecione o cliente, endereços de coleta e entrega, e o tipo de serviço.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='request-actions']",
      title: "Ações rápidas",
      content: "Em cada solicitação você pode: visualizar detalhes, atribuir entregador, conciliar pagamento ou cancelar.",
      placement: "left",
    },
  ],
};

const adminClientes: OnboardingTour = {
  id: "admin-clientes",
  path: "/admin/clientes",
  role: "admin",
  tourTitle: "Gestão de Clientes",
  steps: [
    {
      target: "[data-onboarding='client-search']",
      title: "Busca de clientes",
      content: "Pesquise clientes por nome, email ou telefone. Use os filtros para encontrar clientes por tipo (PJ/PF) ou status.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='add-client-btn']",
      title: "Tipo de cliente",
      content: "PJ (Pessoa Jurídica) recebe faturas mensais com prazo de pagamento. PF (Pessoa Física) geralmente paga na entrega. Cadastre novos clientes aqui.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='add-client-btn']",
      title: "Novo cliente",
      content: "Cadastre um novo cliente preenchendo dados de contato, endereço principal e condições comerciais.",
      placement: "left",
    },
  ],
};

const adminEntregadores: OnboardingTour = {
  id: "admin-entregadores",
  path: "/admin/entregadores",
  role: "admin",
  tourTitle: "Gestão de Entregadores",
  steps: [
    {
      target: "[data-onboarding='driver-list']",
      title: "Lista de entregadores",
      content: "Veja todos os entregadores cadastrados com status (ativo/inativo), região de atuação e veículo.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='add-driver-btn']",
      title: "Novo entregador",
      content: "Cadastre um entregador com dados pessoais, veículo, região e percentual de comissão.",
      placement: "left",
    },
  ],
};

const adminFaturas: OnboardingTour = {
  id: "admin-faturas",
  path: "/admin/faturas",
  role: "admin",
  tourTitle: "Gestão de Faturas",
  steps: [
    {
      target: "[data-onboarding='invoice-filters']",
      title: "Filtros de faturas",
      content: "Filtre por status: Abertas (em período de acúmulo), Fechadas (prontas para cobrança), Pagas ou Vencidas.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='invoice-filters']",
      title: "Detalhes da fatura",
      content: "Clique em qualquer fatura para ver os itens, ajustes e histórico de pagamentos. Faturas PJ são geradas automaticamente no fechamento mensal.",
      placement: "top",
    },
  ],
};

const adminFinanceiro: OnboardingTour = {
  id: "admin-financeiro",
  path: "/admin/financeiro",
  role: "admin",
  tourTitle: "Controle Financeiro",
  steps: [
    {
      target: "[data-onboarding='finance-tabs']",
      title: "Áreas financeiras",
      content: "Navegue entre Receitas (entradas), Despesas (saídas) e Livro Caixa (visão consolidada do fluxo diário).",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='finance-summary']",
      title: "Resumo do período",
      content: "Cards com total de receitas, despesas e saldo do período selecionado. Use o filtro de datas para ajustar.",
      placement: "bottom",
    },
  ],
};

const adminRelatorios: OnboardingTour = {
  id: "admin-relatorios",
  path: "/admin/relatorios",
  role: "admin",
  tourTitle: "Relatórios",
  steps: [
    {
      target: "[data-onboarding='report-tabs']",
      title: "Tipos de relatório",
      content: "Resumo Financeiro (visão geral), Comissões (repasses aos entregadores) e Despesas (detalhamento por categoria).",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='export-btn']",
      title: "Exportar dados",
      content: "Exporte relatórios em PDF ou Excel para análise externa ou arquivamento.",
      placement: "left",
    },
  ],
};

const adminConfiguracoes: OnboardingTour = {
  id: "admin-configuracoes",
  path: "/admin/configuracoes",
  role: "admin",
  tourTitle: "Configurações do Sistema",
  steps: [
    {
      target: "[data-onboarding='settings-tabs']",
      title: "Áreas de configuração",
      content: "Configure Tabela de Preços, Bairros, Regiões, Taxas Extras, Formas de Pagamento e Cargos.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='price-table']",
      title: "Tabela de preços",
      content: "Defina preços por região e tipo de serviço. Preços específicos de cliente têm precedência sobre a tabela geral.",
      placement: "bottom",
    },
  ],
};

// ─── Cliente Tours ───────────────────────────────────────────────────────────

const clienteDashboard: OnboardingTour = {
  id: "cliente-dashboard",
  path: "/cliente",
  role: "cliente",
  tourTitle: "Seu Painel",
  steps: [
    {
      target: "[data-onboarding='client-metrics']",
      title: "Suas métricas",
      content: "Veja o total de entregas do mês, valor gasto e entregas em andamento de forma rápida.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='client-recent']",
      title: "Entregas recentes",
      content: "Acompanhe o status das suas últimas solicitações. Clique para ver detalhes de cada entrega.",
      placement: "top",
    },
  ],
};

const clienteSolicitacoes: OnboardingTour = {
  id: "cliente-solicitacoes",
  path: "/cliente/solicitacoes",
  role: "cliente",
  tourTitle: "Suas Solicitações",
  steps: [
    {
      target: "[data-onboarding='request-status-client']",
      title: "Filtros por status",
      content: "Filtre suas solicitações por status para acompanhar cada etapa: Pendente → Aceita → Em Trânsito → Concluída.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='request-status-client']",
      title: "Status da solicitação",
      content: "Acompanhe cada etapa: Pendente → Aceita → Em Trânsito → Concluída. Você recebe notificações a cada mudança.",
      placement: "left",
    },
  ],
};

const clienteFinanceiro: OnboardingTour = {
  id: "cliente-financeiro",
  path: "/cliente/financeiro",
  role: "cliente",
  tourTitle: "Seu Financeiro",
  steps: [
    {
      target: "[data-onboarding='client-balance']",
      title: "Saldo e faturas",
      content: "Visualize suas faturas abertas e pagas. Clientes PJ recebem fatura mensal consolidada.",
      placement: "bottom",
    },
  ],
};

const clientePerfil: OnboardingTour = {
  id: "cliente-perfil",
  path: "/cliente/perfil",
  role: "cliente",
  tourTitle: "Seu Perfil",
  steps: [
    {
      target: "[data-onboarding='client-profile-form']",
      title: "Dados cadastrais",
      content: "Mantenha seus dados atualizados: nome, telefone, endereço principal e preferências de contato.",
      placement: "bottom",
    },
  ],
};

// ─── Entregador Tours ────────────────────────────────────────────────────────

const entregadorDashboard: OnboardingTour = {
  id: "entregador-dashboard",
  path: "/entregador",
  role: "entregador",
  tourTitle: "Seu Painel",
  steps: [
    {
      target: "[data-onboarding='driver-metrics']",
      title: "Suas métricas",
      content: "Entregas do dia, comissão acumulada no mês e avaliação média. Acompanhe seu desempenho diário.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='driver-pending']",
      title: "Entregas pendentes",
      content: "Entregas atribuídas a você que aguardam execução. Aceite ou recuse conforme sua disponibilidade.",
      placement: "top",
    },
  ],
};

const entregadorHistorico: OnboardingTour = {
  id: "entregador-historico",
  path: "/entregador/historico",
  role: "entregador",
  tourTitle: "Histórico de Entregas",
  steps: [
    {
      target: "[data-onboarding='driver-history-filters']",
      title: "Filtros de período",
      content: "Filtre seu histórico por data para ver entregas concluídas e respectivas comissões ganhas.",
      placement: "bottom",
    },
  ],
};

const entregadorFinanceiro: OnboardingTour = {
  id: "entregador-financeiro",
  path: "/entregador/financeiro",
  role: "entregador",
  tourTitle: "Seu Financeiro",
  steps: [
    {
      target: "[data-onboarding='driver-earnings']",
      title: "Seus ganhos",
      content: "Veja comissões pendentes e já recebidas. A comissão é calculada sobre a receita operacional de cada entrega.",
      placement: "bottom",
    },
    {
      target: "[data-onboarding='driver-payouts']",
      title: "Repasses",
      content: "Histórico de repasses realizados pela empresa. Repasses são feitos conforme acordo (semanal/quinzenal).",
      placement: "top",
    },
  ],
};

const entregadorPerfil: OnboardingTour = {
  id: "entregador-perfil",
  path: "/entregador/perfil",
  role: "entregador",
  tourTitle: "Seu Perfil",
  steps: [
    {
      target: "[data-onboarding='driver-profile-form']",
      title: "Dados cadastrais",
      content: "Mantenha seus dados atualizados: telefone, veículo, CNH e região de atuação.",
      placement: "bottom",
    },
  ],
};

// ─── Export all tours ────────────────────────────────────────────────────────

export const ALL_TOURS: OnboardingTour[] = [
  // Admin
  adminDashboard,
  adminSolicitacoes,
  adminClientes,
  adminEntregadores,
  adminFaturas,
  adminFinanceiro,
  adminRelatorios,
  adminConfiguracoes,
  // Cliente
  clienteDashboard,
  clienteSolicitacoes,
  clienteFinanceiro,
  clientePerfil,
  // Entregador
  entregadorDashboard,
  entregadorHistorico,
  entregadorFinanceiro,
  entregadorPerfil,
];

/** Find tour for a given role and path */
export function findTourForPage(role: string, path: string): OnboardingTour | undefined {
  // Exact match first
  const exact = ALL_TOURS.find((t) => t.role === role && t.path === path);
  if (exact) return exact;

  // For index routes like /admin → match /admin
  const normalized = path.replace(/\/$/, "") || "/";
  return ALL_TOURS.find((t) => t.role === role && t.path === normalized);
}
