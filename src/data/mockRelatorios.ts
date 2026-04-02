import { MOCK_CLIENTES } from "@/data/mockClientes";
import { MOCK_SOLICITACOES } from "@/data/mockSolicitacoes";
import { MOCK_FATURAS } from "@/data/mockFaturas";
import { MOCK_RECEITAS, MOCK_DESPESAS } from "@/data/mockFinanceiro";

// ── Clientes por Modalidade ──
export const getClientesPorModalidade = () => {
  const faturados = MOCK_CLIENTES.filter((c) => c.modalidade === "faturado");
  const prePagos = MOCK_CLIENTES.filter((c) => c.modalidade === "pre_pago");

  const faturadosAtivos = faturados.filter((c) => c.status === "ativo").length;
  const prePagosAtivos = prePagos.filter((c) => c.status === "ativo").length;

  // Receita por modalidade (a partir das receitas mock vinculadas a clientes)
  const receitaFaturados = MOCK_RECEITAS
    .filter((r) => {
      const cli = MOCK_CLIENTES.find((c) => c.id === r.cliente_id);
      return cli?.modalidade === "faturado";
    })
    .reduce((s, r) => s + r.valor, 0);

  const receitaPrePagos = MOCK_RECEITAS
    .filter((r) => {
      const cli = MOCK_CLIENTES.find((c) => c.id === r.cliente_id);
      return cli?.modalidade === "pre_pago";
    })
    .reduce((s, r) => s + r.valor, 0);

  // Entregas por modalidade
  const entregasFaturados = MOCK_SOLICITACOES
    .filter((s) => {
      const cli = MOCK_CLIENTES.find((c) => c.id === s.cliente_id);
      return cli?.modalidade === "faturado" && s.status === "concluida";
    }).length;

  const entregasPrePagos = MOCK_SOLICITACOES
    .filter((s) => {
      const cli = MOCK_CLIENTES.find((c) => c.id === s.cliente_id);
      return cli?.modalidade === "pre_pago" && s.status === "concluida";
    }).length;

  // Faturas por status
  const faturasAbertas = MOCK_FATURAS.filter((f) => f.status_geral === "Aberta").length;
  const faturasVencidas = MOCK_FATURAS.filter((f) => f.status_geral === "Vencida").length;
  const faturasPagas = MOCK_FATURAS.filter((f) => f.status_geral === "Paga" || f.status_geral === "Finalizada").length;

  return {
    totalFaturados: faturados.length,
    totalPrePagos: prePagos.length,
    faturadosAtivos,
    prePagosAtivos,
    receitaFaturados,
    receitaPrePagos,
    entregasFaturados,
    entregasPrePagos,
    faturasAbertas,
    faturasVencidas,
    faturasPagas,
    distribuicao: [
      { name: "Faturados", value: faturados.length, fill: "hsl(var(--primary))" },
      { name: "Pré-pagos", value: prePagos.length, fill: "hsl(var(--chart-4))" },
    ],
    receitaPorModalidade: [
      { name: "Faturados", value: receitaFaturados, fill: "hsl(var(--primary))" },
      { name: "Pré-pagos", value: receitaPrePagos, fill: "hsl(var(--chart-4))" },
    ],
    topClientes: MOCK_CLIENTES
      .filter((c) => c.status === "ativo")
      .map((c) => {
        const receita = MOCK_RECEITAS
          .filter((r) => r.cliente_id === c.id)
          .reduce((s, r) => s + r.valor, 0);
        const entregas = MOCK_SOLICITACOES
          .filter((s) => s.cliente_id === c.id && s.status === "concluida").length;
        return { ...c, receita, entregas };
      })
      .sort((a, b) => b.receita - a.receita),
  };
};

// ── Receitas Previstas (projeção baseada em taxas de operação) ──
export const RECEITAS_MENSAIS = [
  { mes: "Out/25", realizado: 8200, previsto: 7800 },
  { mes: "Nov/25", realizado: 9100, previsto: 8500 },
  { mes: "Dez/25", realizado: 11500, previsto: 10000 },
  { mes: "Jan/26", realizado: 9800, previsto: 9500 },
  { mes: "Fev/26", realizado: 10200, previsto: 10800 },
  { mes: "Mar/26", realizado: 4030, previsto: 12500 },
  { mes: "Abr/26", realizado: 0, previsto: 13200 },
  { mes: "Mai/26", realizado: 0, previsto: 14000 },
];

export const RECEITAS_POR_TIPO_OPERACAO = [
  { tipo: "Standard", valor: 2800, fill: "hsl(var(--primary))" },
  { tipo: "Express", valor: 810, fill: "hsl(var(--chart-2))" },
  { tipo: "Retorno", valor: 420, fill: "hsl(var(--chart-4))" },
];

export const RECEITAS_POR_CLIENTE = [
  { id: "rc-1", cliente: "João Silva", receita: 1470, entregas: 15 },
  { id: "rc-2", cliente: "Rest. Sabor & Arte", receita: 1450, entregas: 12 },
  { id: "rc-3", cliente: "Padaria Pão Quente", receita: 800, entregas: 10 },
  { id: "rc-4", cliente: "Farmácia Saúde", receita: 310, entregas: 4 },
];

// ── Despesas Previstas (projeção baseada em recorrências) ──
export const DESPESAS_MENSAIS = [
  { mes: "Out/25", realizado: 6800, previsto: 7000 },
  { mes: "Nov/25", realizado: 7200, previsto: 7100 },
  { mes: "Dez/25", realizado: 8900, previsto: 8200 },
  { mes: "Jan/26", realizado: 7600, previsto: 7800 },
  { mes: "Fev/26", realizado: 8100, previsto: 8000 },
  { mes: "Mar/26", realizado: 5350, previsto: 9500 },
  { mes: "Abr/26", realizado: 0, previsto: 9800 },
  { mes: "Mai/26", realizado: 0, previsto: 10200 },
];

export const DESPESAS_RECORRENTES = [
  { id: "dr-1", descricao: "Aluguel do escritório", categoria: "Aluguel", valor_mensal: 3500, proximo_vencimento: "2026-04-10" },
  { id: "dr-2", descricao: "Seguro da frota", categoria: "Seguros", valor_mensal: 2200, proximo_vencimento: "2026-04-05" },
  { id: "dr-3", descricao: "Combustível - Frota", categoria: "Combustível", valor_mensal: 1850, proximo_vencimento: "2026-04-15" },
  { id: "dr-4", descricao: "Marketing digital", categoria: "Marketing", valor_mensal: 1500, proximo_vencimento: "2026-04-30" },
  { id: "dr-5", descricao: "Contador", categoria: "Serviços", valor_mensal: 1200, proximo_vencimento: "2026-04-25" },
  { id: "dr-6", descricao: "Energia elétrica", categoria: "Utilidades", valor_mensal: 680, proximo_vencimento: "2026-04-22" },
  { id: "dr-7", descricao: "Licença software", categoria: "Software", valor_mensal: 590, proximo_vencimento: "2026-04-28" },
  { id: "dr-8", descricao: "Internet + Telefonia", categoria: "Telecomunicações", valor_mensal: 450, proximo_vencimento: "2026-04-18" },
];

export const getReceitasMetrics = () => {
  const totalRealizado = MOCK_RECEITAS.reduce((s, r) => s + r.valor, 0);
  const metaAtual = RECEITAS_MENSAIS.find((m) => m.mes === "Mar/26")?.previsto ?? 0;
  const percentualMeta = metaAtual > 0 ? (totalRealizado / metaAtual) * 100 : 0;
  const ticketMedio = MOCK_SOLICITACOES.filter((s) => s.status === "concluida").length > 0
    ? totalRealizado / MOCK_SOLICITACOES.filter((s) => s.status === "concluida").length
    : 0;
  const totalPrevistoProximoMes = RECEITAS_MENSAIS.find((m) => m.mes === "Abr/26")?.previsto ?? 0;

  return { totalRealizado, metaAtual, percentualMeta, ticketMedio, totalPrevistoProximoMes };
};

export const getDespesasMetrics = () => {
  const totalRealizado = MOCK_DESPESAS.reduce((s, d) => s + d.valor, 0);
  const totalPendentes = MOCK_DESPESAS.filter((d) => d.status === "Pendente").reduce((s, d) => s + d.valor, 0);
  const totalAtrasadas = MOCK_DESPESAS.filter((d) => d.status === "Atrasado").reduce((s, d) => s + d.valor, 0);
  const totalRecorrente = DESPESAS_RECORRENTES.reduce((s, d) => s + d.valor_mensal, 0);
  const previstoProximoMes = DESPESAS_MENSAIS.find((m) => m.mes === "Abr/26")?.previsto ?? 0;

  return { totalRealizado, totalPendentes, totalAtrasadas, totalRecorrente, previstoProximoMes };
};
