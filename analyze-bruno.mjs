import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qbumfnkrqqsthmsgrhfi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFidW1mbmtycXFzdGhtc2dyaGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzM0OTIsImV4cCI6MjA5MTI0OTQ5Mn0.CYVliRU5Nk4UktTAKpLbNrZhOwzcslU7IdGGCjCuWe0"
);

const { error: authErr } = await supabase.auth.signInWithPassword({
  email: "pedroaps100@gmail.com",
  password: "Pedro123@",
});
if (authErr) { console.error("Auth falhou:", authErr.message); process.exit(1); }

// ── 1. Buscar entregador Bruno pelo ID conhecido ───────────────────────────
const { data: entregadores, error: eErr } = await supabase
  .from("entregadores")
  .select("id, nome, tipo_comissao, valor_comissao, meta_modo_calculo, status")
  .eq("id", "ca804eeb-5dbc-415b-a864-d889a14b84e7");

if (eErr) { console.error("Erro entregadores:", eErr.message); process.exit(1); }

console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║         ANÁLISE DE COMISSÃO — ENTREGADOR BRUNO        ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

if (!entregadores?.length) { console.log("Nenhum entregador com nome Bruno encontrado."); process.exit(0); }

for (const entregador of entregadores) {
  console.log(`▶ ENTREGADOR: ${entregador.nome} (ID: ${entregador.id})`);
  console.log(`  Status: ${entregador.status}`);
  console.log(`  Tipo comissão: ${entregador.tipo_comissao}`);
  console.log(`  Valor/taxa: ${entregador.valor_comissao}`);
  console.log(`  Modo cálculo meta: ${entregador.meta_modo_calculo ?? "n/a"}`);

  // ── 2. Faixas (se tipo = meta) ───────────────────────────────────────────
  let faixas = [];
  if (entregador.tipo_comissao === "meta") {
    const { data: f, error: fErr } = await supabase
      .from("comissao_faixas")
      .select("de, ate, valor_por_entrega")
      .eq("entregador_id", entregador.id)
      .order("de", { ascending: true });
    if (fErr) { console.error("Erro faixas:", fErr.message); }
    else {
      faixas = f ?? [];
      console.log("\n  FAIXAS CADASTRADAS:");
      console.log("  " + "─".repeat(42));
      console.log("  De     Até    R$/entrega");
      console.log("  " + "─".repeat(42));
      faixas.forEach(f => {
        console.log(`  ${String(f.de).padEnd(6)} ${String(f.ate).padEnd(6)} R$${f.valor_por_entrega.toFixed(2)}`);
      });
    }
  }

  // ── 3. Buscar solicitações concluídas (mês corrente) ─────────────────────
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const fim    = new Date(agora.getFullYear(), agora.getMonth() + 1, 1).toISOString();

  const { data: solicitacoes, error: sErr } = await supabase
    .from("solicitacoes")
    .select("id, status, data_conclusao, valor_total_taxas")
    .eq("entregador_id", entregador.id)
    .eq("status", "concluida")
    .gte("data_conclusao", inicio)
    .lt("data_conclusao", fim)
    .order("data_conclusao", { ascending: true });

  if (sErr) { console.error("Erro solicitações:", sErr.message); continue; }

  const totalValorGerado = (solicitacoes ?? []).reduce((sum, s) => sum + (s.valor_total_taxas ?? 0), 0);

  console.log(`\n  SOLICITAÇÕES CONCLUÍDAS (${inicio.slice(0,7)}):`);
  console.log(`  Total: ${solicitacoes?.length ?? 0} solicitações`);
  console.log(`  Valor total gerado (valor_total_taxas): R$${totalValorGerado.toFixed(2)}`);

  if (solicitacoes?.length) {
    console.log("\n  " + "─".repeat(72));
    console.log("  Nº Solic.         Data Conclusão         Valor Total Taxas");
    console.log("  " + "─".repeat(72));
    solicitacoes.forEach(s => {
      const data = s.data_conclusao ? new Date(s.data_conclusao).toLocaleString("pt-BR") : "—";
      console.log(`  ${s.id.slice(0,8).padEnd(18)} ${data.padEnd(22)} R$${(s.valor_total_taxas ?? 0).toFixed(2)}`);
    });
  }

  // ── 4. Buscar rotas concluídas ligadas a essas solicitações ──────────────
  const solIds = (solicitacoes ?? []).map(s => s.id);
  let rotasConcluidas = [];

  if (solIds.length > 0) {
    const { data: rotas, error: rErr } = await supabase
      .from("rotas")
      .select("id, solicitacao_id, status")
      .in("solicitacao_id", solIds)
      .eq("status", "concluida");

    if (rErr) { console.error("Erro rotas:", rErr.message); }
    else { rotasConcluidas = rotas ?? []; }
  }

  const totalEntregas = rotasConcluidas.length;

  // Mapa: solicitacao_id → qtd rotas concluídas
  const rotasPorSol = {};
  rotasConcluidas.forEach(r => {
    rotasPorSol[r.solicitacao_id] = (rotasPorSol[r.solicitacao_id] ?? 0) + 1;
  });

  console.log(`\n  ROTAS CONCLUÍDAS (entregas): ${totalEntregas}`);

  // Solicitações com mais de 1 rota
  const solComMultiplas = Object.entries(rotasPorSol).filter(([, qtd]) => qtd > 1);
  if (solComMultiplas.length) {
    console.log("  ⚠️  Solicitações com múltiplas rotas:");
    solComMultiplas.forEach(([solId, qtd]) => {
      console.log(`     Sol #${solId.slice(0,8)}: ${qtd} rotas`);
    });
  }

  // ── 5. Calcular comissão esperada ─────────────────────────────────────────
  console.log("\n  CÁLCULO DA COMISSÃO:");
  console.log("  " + "─".repeat(50));

  let comissaoEsperada = 0;

  if (entregador.tipo_comissao === "percentual") {
    comissaoEsperada = (totalValorGerado * entregador.valor_comissao) / 100;
    console.log(`  Tipo: Percentual ${entregador.valor_comissao}% sobre R$${totalValorGerado.toFixed(2)}`);
    console.log(`  Comissão esperada: R$${comissaoEsperada.toFixed(2)}`);

  } else if (entregador.tipo_comissao === "fixo") {
    comissaoEsperada = totalEntregas * entregador.valor_comissao;
    console.log(`  Tipo: Fixo R$${entregador.valor_comissao} × ${totalEntregas} entregas`);
    console.log(`  Comissão esperada: R$${comissaoEsperada.toFixed(2)}`);

  } else if (entregador.tipo_comissao === "meta") {
    const modo = entregador.meta_modo_calculo ?? "escalonado";
    console.log(`  Tipo: Meta — modo ${modo} — ${totalEntregas} entregas`);

    if (modo === "faixa_maxima") {
      const sorted = [...faixas].sort((a, b) => a.de - b.de);
      const faixaAtingida = [...sorted].reverse().find(f => f.de <= totalEntregas);
      if (!faixaAtingida) {
        console.log("  Nenhuma faixa atingida → comissão R$0,00");
      } else {
        comissaoEsperada = totalEntregas * faixaAtingida.valor_por_entrega;
        console.log(`  Faixa mais alta atingida: de ${faixaAtingida.de} — R$${faixaAtingida.valor_por_entrega}/entrega`);
        console.log(`  Total = ${totalEntregas} × R$${faixaAtingida.valor_por_entrega} = R$${comissaoEsperada.toFixed(2)}`);
      }

    } else {
      // Escalonado — passo a passo
      const sorted = [...faixas].sort((a, b) => a.de - b.de);
      let comissao = 0;
      let entregando = 1;
      let ultimoValor = 0;
      const breakdown = [];

      for (const faixa of sorted) {
        if (entregando < faixa.de && ultimoValor > 0) {
          const qtdGap = Math.min(faixa.de - 1, totalEntregas) - entregando + 1;
          if (qtdGap > 0) {
            const sub = qtdGap * ultimoValor;
            breakdown.push({ label: `Gap ${entregando}–${entregando + qtdGap - 1} (herda R$${ultimoValor})`, qtd: qtdGap, valor: ultimoValor, sub });
            comissao += sub;
            entregando += qtdGap;
          }
        }
        if (entregando > totalEntregas) break;
        if (entregando <= faixa.ate) {
          const inicio2 = Math.max(entregando, faixa.de);
          const fim2 = Math.min(faixa.ate, totalEntregas);
          const qtd = fim2 - inicio2 + 1;
          if (qtd > 0) {
            const sub = qtd * faixa.valor_por_entrega;
            breakdown.push({ label: `Faixa ${faixa.de}–${faixa.ate} → entregas ${inicio2}–${fim2}`, qtd, valor: faixa.valor_por_entrega, sub });
            comissao += sub;
            entregando = fim2 + 1;
          }
        }
        ultimoValor = faixa.valor_por_entrega;
      }

      if (entregando <= totalEntregas && ultimoValor > 0) {
        const qtd = totalEntregas - entregando + 1;
        const sub = qtd * ultimoValor;
        breakdown.push({ label: `Além da última faixa (herda R$${ultimoValor}): entregas ${entregando}–${totalEntregas}`, qtd, valor: ultimoValor, sub });
        comissao += sub;
      }

      comissaoEsperada = Math.round(comissao * 100) / 100;

      console.log("  Detalhamento escalonado:");
      breakdown.forEach(b => {
        console.log(`    ${b.label}`);
        console.log(`      ${b.qtd} × R$${b.valor.toFixed(2)} = R$${b.sub.toFixed(2)}`);
      });
      console.log(`  Comissão total esperada: R$${comissaoEsperada.toFixed(2)}`);
    }
  }

  // ── 6. Buscar ciclo fechado do mês (se existir) ──────────────────────────
  const mesRef = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: ciclos, error: cErr } = await supabase
    .from("ciclos_comissao_meta")
    .select("mes_referencia, total_entregas, comissao_calculada, fechado_em")
    .eq("entregador_id", entregador.id)
    .order("mes_referencia", { ascending: false })
    .limit(3);

  if (!cErr && ciclos?.length) {
    console.log("\n  CICLOS FECHADOS RECENTES:");
    console.log("  " + "─".repeat(60));
    ciclos.forEach(c => {
      console.log(`  Mês: ${c.mes_referencia} | Entregas: ${c.total_entregas} | Comissão: R$${(c.comissao_calculada ?? 0).toFixed(2)} | Fechado: ${c.fechado_em ? new Date(c.fechado_em).toLocaleString("pt-BR") : "—"}`);
    });
  }

  console.log("\n" + "═".repeat(60) + "\n");
}
