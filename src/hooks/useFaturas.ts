/**
 * hooks/useFaturas.ts
 * React Query hooks para Faturas, Lançamentos e Ajustes.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Fatura, EntregaFatura, RotaEntregaFatura } from "@/types/database";
import { rowToFatura } from "@/lib/mappers";
import {
  fetchFaturas,
  fetchFaturasByCliente,
  fetchFaturaById,
  createFatura,
  updateFatura,
  fetchLancamentosByCliente,
  fetchLancamentosByFatura,
  createLancamento,
  fetchAjustesByFatura,
  createAjuste,
  fetchHistoricoFatura,
  createHistoricoFatura,
  fetchFaturaIdsComReceita,
  concluirFaturaEntrega,
  reabrirEntregaFaturada,
  excluirEntregaFaturada,
  fecharFaturaPorPeriodo,
  fetchEntregasTransferidasParaFatura,
  type FaturaRow,
  type FaturaInsert,
  type FaturaUpdate,
  type LancamentoRow,
  type LancamentoInsert,
  type AjusteRow,
  type AjusteInsert,
  type HistoricoFaturaRow,
  type HistoricoFaturaInsert,
  type ConcluirFaturaEntregaParams,
  type ConcluirFaturaEntregaResult,
  type ReabrirEntregaFaturadaParams,
  type ReabrirEntregaFaturadaResult,
  type ExcluirEntregaFaturadaParams,
  type ExcluirEntregaFaturadaResult,
  type FecharFaturaPorPeriodoParams,
  type FecharFaturaPorPeriodoResult,
} from "@/services/faturas";
import {
  fetchSolicitacoesByIds,
  fetchSolicitacoesByCodigos,
  fetchRotasBySolicitacaoIds,
  fetchTaxasExtrasByRotaIds,
  fetchPagamentosBySolicitacaoIds,
  type SolicitacaoRow,
  type RotaRow,
} from "@/services/solicitacoes";
import { fetchEntregadores } from "@/services/entregadores";
import { fetchBairros, fetchFormasPagamento } from "@/services/settings";
import { calcularCreditoLojaTotal } from "@/lib/rotasHelpers";

export function useFaturas() {
  return useQuery({
    queryKey: ["faturas"],
    queryFn: fetchFaturas,
    select: (data) => data.map(rowToFatura),
  });
}

export function useFaturaIdsComReceita() {
  return useQuery<Set<string>>({
    queryKey: ["faturas_com_receita"],
    queryFn: fetchFaturaIdsComReceita,
    staleTime: 30_000,
  });
}

export function useFaturasByCliente(clienteId: string) {
  return useQuery<FaturaRow[]>({
    queryKey: ["faturas", "cliente", clienteId],
    queryFn: () => fetchFaturasByCliente(clienteId),
    enabled: Boolean(clienteId),
  });
}

export function useFaturaById(id: string) {
  return useQuery<FaturaRow>({
    queryKey: ["faturas", id],
    queryFn: () => fetchFaturaById(id),
    enabled: Boolean(id),
  });
}

export function useCreateFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FaturaInsert) => createFatura(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faturas"] }),
  });
}

export function useUpdateFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FaturaUpdate }) =>
      updateFatura(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["faturas"] });
      qc.invalidateQueries({ queryKey: ["faturas", id] });
    },
  });
}

export function useLancamentosByCliente(clienteId: string) {
  return useQuery<LancamentoRow[]>({
    queryKey: ["lancamentos", "cliente", clienteId],
    queryFn: () => fetchLancamentosByCliente(clienteId),
    enabled: Boolean(clienteId),
  });
}

export function useLancamentosByFatura(faturaId: string) {
  return useQuery<LancamentoRow[]>({
    queryKey: ["lancamentos", "fatura", faturaId],
    queryFn: () => fetchLancamentosByFatura(faturaId),
    enabled: Boolean(faturaId),
  });
}

export function useCreateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LancamentoInsert) => createLancamento(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lancamentos", "cliente", data.cliente_id] });
      if (data.fatura_id) {
        qc.invalidateQueries({ queryKey: ["lancamentos", "fatura", data.fatura_id] });
      }
      qc.invalidateQueries({ queryKey: ["saldo_pre_pago", data.cliente_id] });
    },
  });
}

export function useAjustesByFatura(faturaId: string) {
  return useQuery<AjusteRow[]>({
    queryKey: ["ajustes", faturaId],
    queryFn: () => fetchAjustesByFatura(faturaId),
    enabled: Boolean(faturaId),
  });
}

export function useCreateAjuste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AjusteInsert) => createAjuste(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ajustes", data.fatura_id] });
      qc.invalidateQueries({ queryKey: ["faturas", data.fatura_id] });
    },
  });
}

export function useHistoricoFatura(faturaId: string) {
  return useQuery<HistoricoFaturaRow[]>({
    queryKey: ["historico_fat", faturaId],
    queryFn: () => fetchHistoricoFatura(faturaId),
    enabled: Boolean(faturaId),
  });
}

export function useCreateHistoricoFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HistoricoFaturaInsert) => createHistoricoFatura(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["historico_fat", data.fatura_id] });
    },
  });
}

export function useConcluirFaturaEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: ConcluirFaturaEntregaParams) => concluirFaturaEntrega(params),
    onSuccess: (result: ConcluirFaturaEntregaResult, params) => {
      qc.invalidateQueries({ queryKey: ["faturas"] });
      if (result.fatura_id) {
        qc.invalidateQueries({ queryKey: ["faturas", result.fatura_id] });
        qc.invalidateQueries({ queryKey: ["lancamentos", "fatura", result.fatura_id] });
        qc.invalidateQueries({ queryKey: ["historico_fat", result.fatura_id] });
        qc.invalidateQueries({ queryKey: ["entregas_fatura", result.fatura_id] });
      }
      qc.invalidateQueries({ queryKey: ["lancamentos", "cliente", params.p_cliente_id] });
      qc.invalidateQueries({ queryKey: ["saldo_pre_pago", params.p_cliente_id] });
      // Refresh solicitacoes table so admin_conciliada_at is always up-to-date after fatura creation
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
    },
  });
}

export function useReabrirEntregaFaturada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: ReabrirEntregaFaturadaParams) => reabrirEntregaFaturada(params),
    onSuccess: (_result: ReabrirEntregaFaturadaResult, params) => {
      qc.invalidateQueries({ queryKey: ["faturas"] });
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      qc.invalidateQueries({ queryKey: ["ajustes"] });
      qc.invalidateQueries({ queryKey: ["historico_fat"] });
      qc.invalidateQueries({ queryKey: ["entregas_fatura"] });
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["rotas", params.p_solicitacao_id] });
      qc.invalidateQueries({ queryKey: ["pagamentos", params.p_solicitacao_id] });
    },
  });
}

export function useExcluirEntregaFaturada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: ExcluirEntregaFaturadaParams) => excluirEntregaFaturada(params),
    onSuccess: (_result: ExcluirEntregaFaturadaResult, params) => {
      qc.invalidateQueries({ queryKey: ["faturas"] });
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      qc.invalidateQueries({ queryKey: ["ajustes"] });
      qc.invalidateQueries({ queryKey: ["historico_fat"] });
      qc.invalidateQueries({ queryKey: ["entregas_fatura"] });
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["rotas", params.p_solicitacao_id] });
      qc.invalidateQueries({ queryKey: ["pagamentos", params.p_solicitacao_id] });
    },
  });
}

export function useFecharFaturaPorPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: FecharFaturaPorPeriodoParams) => fecharFaturaPorPeriodo(params),
    onSuccess: (result: FecharFaturaPorPeriodoResult, params) => {
      qc.invalidateQueries({ queryKey: ["faturas"] });
      qc.invalidateQueries({ queryKey: ["faturas", params.p_fatura_id] });
      qc.invalidateQueries({ queryKey: ["ajustes", params.p_fatura_id] });
      qc.invalidateQueries({ queryKey: ["historico_fat", params.p_fatura_id] });
      qc.invalidateQueries({ queryKey: ["entregas_fatura", params.p_fatura_id] });
      if (result.fatura_nova_id) {
        qc.invalidateQueries({ queryKey: ["faturas", result.fatura_nova_id] });
        qc.invalidateQueries({ queryKey: ["ajustes", result.fatura_nova_id] });
        qc.invalidateQueries({ queryKey: ["historico_fat", result.fatura_nova_id] });
        qc.invalidateQueries({ queryKey: ["entregas_fatura", result.fatura_nova_id] });
      }
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
    },
  });
}

/**
 * Derives EntregaFatura[] from lancamentos_financeiros + historico_faturas → solicitacoes → rotas.
 * Covers both faturado (lançamentos) and pago_na_hora (sem lançamento, só histórico) deliveries.
 */
export function useEntregasByFatura(faturaId: string) {
  return useQuery<EntregaFatura[]>({
    queryKey: ["entregas_fatura", faturaId],
    queryFn: async () => {
      // 1. Fetch lancamentos + historico + entregas transferidas PARA esta fatura, em paralelo
      const [lancamentos, historico, transferidasParaCa] = await Promise.all([
        fetchLancamentosByFatura(faturaId),
        fetchHistoricoFatura(faturaId),
        fetchEntregasTransferidasParaFatura(faturaId),
      ]);

      // 2. Collect sol IDs from lancamentos (faturado/descontar_saldo deliveries)
      const solIdSet = new Set(
        lancamentos
          .map((l) => l.solicitacao_id)
          .filter((id): id is string => id != null)
      );

      // 3. Extract sol codigos from historico (covers pago_na_hora — no lancamento generated)
      const codigosFromHistorico = historico
        .filter((h) => h.tipo === "entrega_adicionada" && h.descricao)
        .map((h) => {
          const match = h.descricao!.match(/Solicitação (LT-\S+) concluída/);
          return match?.[1] ?? null;
        })
        .filter((c): c is string => c !== null);

      // 4. Fetch extra solicitacoes by codigo (only if any found)
      if (codigosFromHistorico.length > 0) {
        const extraSols = await fetchSolicitacoesByCodigos(codigosFromHistorico);
        for (const s of extraSols) solIdSet.add(s.id);
      }

      // 4b. Entregas excluídas via lixeira ou transferidas para outra fatura (via
      // fechamento por período) ficam marcadas em historico_faturas —
      // lancamentos_financeiros é imutável, nunca pode ser apagado ou reapontado —
      // então precisam ser removidas aqui, por último, para sumir de fato da lista.
      const excluidoSet = new Set(
        historico
          .filter((h) => h.tipo === "entrega_excluida" || h.tipo === "entrega_transferida")
          .map((h) => (h.metadata as { solicitacao_id?: string } | null)?.solicitacao_id)
          .filter((id): id is string => id != null)
      );
      for (const id of excluidoSet) solIdSet.delete(id);

      // 4c. Entregas que vieram de outra fatura via fechamento por período —
      // não têm lançamento apontando para esta fatura, mas passam a pertencer
      // a ela a partir de agora.
      for (const id of transferidasParaCa) solIdSet.add(id);

      const solIds = [...solIdSet];
      if (solIds.length === 0) return [];

      // 5. Fetch solicitacoes, rotas, entregadores, bairros, pagamentos e formas in parallel
      const [sols, rotas, entregadores, bairros, pagamentos, formasPagamento] = await Promise.all([
        fetchSolicitacoesByIds(solIds),
        fetchRotasBySolicitacaoIds(solIds),
        fetchEntregadores(),
        fetchBairros(),
        fetchPagamentosBySolicitacaoIds(solIds),
        fetchFormasPagamento(),
      ]);

      const entregadorMap = new Map(entregadores.map((e) => [e.id, e.nome]));
      const bairroMap = new Map(bairros.map((b) => [b.id, b.nome]));
      const rotasBySol = new Map<string, RotaRow[]>();
      for (const r of rotas) {
        const arr = rotasBySol.get(r.solicitacao_id) ?? [];
        arr.push(r);
        rotasBySol.set(r.solicitacao_id, arr);
      }

      // Busca as taxas extras de todas as rotas de uma vez
      const todosRotaIds = rotas.map((r) => r.id);
      const taxasExtrasMap = await fetchTaxasExtrasByRotaIds(todosRotaIds);

      // 6. Map to EntregaFatura[]
      return sols.map((sol): EntregaFatura => {
        const solRotas = rotasBySol.get(sol.id) ?? [];
        const totalTaxasFaturadas = solRotas
          .filter((r) => r.pagamento_operacao !== "pago_na_hora")
          .reduce((s, r) => {
            const extras = taxasExtrasMap.get(r.id) ?? [];
            return s + (r.taxa_resolvida ?? 0) + extras.reduce((a, t) => a + t.valor, 0);
          }, 0);
        // Crédito da loja: usa o que foi realmente conciliado (pagamentos_solicitacao),
        // só cai no plano estático da rota quando ainda não há conciliação registrada.
        const totalRecebido = calcularCreditoLojaTotal(solRotas, pagamentos, formasPagamento);

        // Rotas canceladas (corrigidas via deleteOrCancelRota após uma reabertura) já têm
        // taxa_resolvida/valor_a_receber zerados — não entram mais nos totais acima, mas sem
        // esse filtro continuariam aparecendo na lista expandida como um registro fantasma.
        const rotasVisiveis = solRotas.filter((r) => r.status !== "cancelada");

        const mappedRotas: RotaEntregaFatura[] = rotasVisiveis.map((r) => {
          // Se já existe conciliação real pra essa rota, o badge exibido reflete
          // o pagamento de fato registrado — não o plano feito na criação da rota.
          const pagamentosLoja = pagamentos.filter((p) => p.rota_id === r.id && p.pertence_a === "loja");
          let meioCobranca = r.meio_cobranca_destino ?? null;
          let destinoDinheiro = (r.destino_dinheiro as "devolver_loja" | "repassar_empresa" | null) ?? null;
          if (pagamentosLoja.length > 0) {
            const forma = formasPagamento.find((f) => f.id === pagamentosLoja[0].forma_pagamento_id);
            if (forma?.retido_pela_loja) {
              meioCobranca = "maquina_loja";
              destinoDinheiro = null;
            } else if (forma) {
              const chegouViaPix = forma.name.toLowerCase().includes("pix");
              meioCobranca = chegouViaPix ? "pix_empresa" : "dinheiro";
              destinoDinheiro = chegouViaPix ? null : "repassar_empresa";
            }
          }

          return {
            bairro_destino: bairroMap.get(r.bairro_destino_id) ?? r.bairro_destino_id,
            responsavel: r.responsavel,
            telefone: r.telefone,
            taxa: r.taxa_resolvida ?? 0,
            taxas_extras: taxasExtrasMap.get(r.id) ?? [],
            valor_receber: r.receber_do_cliente ? (r.valor_a_receber ?? null) : null,
            status: "concluida",
            pagamento_operacao: r.pagamento_operacao,
            meio_cobranca_destino: meioCobranca,
            destino_dinheiro: destinoDinheiro,
          };
        });

        return {
          solicitacao_id: sol.id,
          codigo: sol.codigo,
          entregador_nome: sol.entregador_id
            ? (entregadorMap.get(sol.entregador_id) ?? "—")
            : "—",
          data_conclusao: sol.data_conclusao ?? sol.updated_at,
          total_rotas: rotasVisiveis.length,
          valor_taxas: totalTaxasFaturadas,
          valor_recebido_cliente: totalRecebido,
          status: sol.status === "cancelada" ? "cancelada" : "concluida",
          ponto_coleta: sol.ponto_coleta,
          rotas: mappedRotas,
        };
      });
    },
    enabled: Boolean(faturaId),
  });
}
