import type { Fatura, EntregaFatura, AjusteFinanceiro } from "@/types/database";
import { TIPO_FATURAMENTO_LABELS } from "@/lib/formatters";
import { formatCurrency, formatDateBR, formatDateTimeBR } from "@/lib/formatters";

function labelPagamentoOp(op: string): string {
  if (op === "faturar") return "Faturado";
  if (op === "pago_na_hora") return "Pago direto";
  if (op === "descontar_saldo") return "Desc. saldo";
  return op;
}

function labelMeioCobranca(meio: string | null): string {
  if (!meio) return "—";
  if (meio === "dinheiro") return "Dinheiro";
  if (meio === "maquina_loja") return "Máquina";
  if (meio === "pix_loja") return "PIX Loja";
  if (meio === "pix_empresa") return "PIX Empresa";
  return meio;
}

export async function generateFaturaPDF(
  fatura: Fatura,
  entregasExtras: Record<string, EntregaFatura[]> = {},
  ajustesData: AjusteFinanceiro[] = [],
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  type JsPDFWithAutoTable = InstanceType<typeof jsPDF> & { lastAutoTable: { finalY: number } };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  // Calcular total de rotas cedo para usar no cabeçalho
  const entregas = [...(entregasExtras[fatura.id] || [])];
  const totalRotas = entregas.reduce((s, e) => s + e.total_rotas, 0);

  // ── Top bar ──
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Leva e Traz", margin, 11.5);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Gerado em ${formatDateTimeBR(new Date())}`, pageW - margin, 11.5, { align: "right" });
  y = 26;

  // ── Card de informações da fatura ──
  const cardY = y;
  const cardH = 46;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cardY, pageW - margin * 2, cardH, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardY, pageW - margin * 2, cardH, 2, 2, "S");

  // Número da fatura
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Fatura ${fatura.numero}`, margin + 4, cardY + 9);

  // Badge de status
  const statusConfig: Record<string, { bg: [number, number, number]; text: [number, number, number] }> = {
    "Aberta":    { bg: [220, 252, 231], text: [21, 128, 61] },
    "Vencida":   { bg: [254, 202, 202], text: [185, 28, 28] },
    "Fechada":   { bg: [219, 234, 254], text: [29, 78, 216] },
    "Paga":      { bg: [219, 234, 254], text: [29, 78, 216] },
    "Cancelada": { bg: [229, 231, 235], text: [55, 65, 81] },
  };
  const sc = statusConfig[fatura.status_geral] ?? { bg: [229, 231, 235] as [number,number,number], text: [55, 65, 81] as [number,number,number] };
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  const badgeW = doc.getTextWidth(fatura.status_geral) + 7;
  const badgeX = pageW - margin - 4 - badgeW;
  doc.setFillColor(...sc.bg);
  doc.roundedRect(badgeX, cardY + 4, badgeW, 7, 1.5, 1.5, "F");
  doc.setTextColor(...sc.text);
  doc.text(fatura.status_geral, badgeX + 3.5, cardY + 9.2);

  // Divisor interno do card
  const divY = cardY + 14;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(margin + 4, divY, pageW - margin - 4, divY);

  // Duas colunas de dados
  const colW = (pageW - margin * 2 - 8) / 2;
  const col1x = margin + 4;
  const col2x = col1x + colW + 4;
  const rowH = 7;
  const dataStartY = divY + 6;
  const labelColor: [number, number, number] = [100, 116, 139];
  const valueColor: [number, number, number] = [15, 23, 42];
  const labelOffset = 24;

  const col1Rows: [string, string][] = [
    ["Cliente",  fatura.cliente_nome],
    ["Tipo",     TIPO_FATURAMENTO_LABELS[fatura.tipo_faturamento] ?? fatura.tipo_faturamento],
    ["Emissão",  formatDateBR(fatura.data_emissao)],
  ];
  const entregasLabel = `${fatura.total_entregas} ${fatura.total_entregas === 1 ? "solicitacao" : "solicitacoes"}  ·  ${totalRotas} ${totalRotas === 1 ? "rota" : "rotas"}`;
  const col2Rows: [string, string][] = [
    ["Vencimento", formatDateBR(fatura.data_vencimento)],
    ["Solicitacoes", entregasLabel],
  ];

  doc.setFontSize(8.5);
  col1Rows.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...labelColor);
    doc.text(label, col1x, dataStartY + i * rowH);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...valueColor);
    doc.text(value, col1x + labelOffset, dataStartY + i * rowH);
  });
  col2Rows.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...labelColor);
    doc.text(label, col2x, dataStartY + i * rowH);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...valueColor);
    doc.text(value, col2x + labelOffset, dataStartY + i * rowH);
  });

  doc.setTextColor(0);
  y = cardY + cardH + 8;

  // ── Resumo Financeiro ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro", margin, y);
  y += 6;

  const ajustes = ajustesData;
  const totalAjustes = ajustes.reduce((sum, a) => sum + (a.tipo === "credito" ? a.valor : -a.valor), 0);
  const saldo = fatura.saldo_liquido ?? 0;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Item", "Valor"]],
    body: [
      ["Créditos Loja", formatCurrency(fatura.total_creditos_loja ?? 0)],
      ["Débitos Loja", formatCurrency(fatura.total_debitos_loja ?? 0)],
      ["Ajustes", formatCurrency(totalAjustes)],
      ["Saldo Líquido", formatCurrency(saldo)],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
  });
  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 6;

  // ── Indicador de saldo (quem paga quem) ──
  if (saldo !== 0) {
    const isRepasse = saldo > 0;
    if (isRepasse) {
      doc.setFillColor(219, 234, 254); // azul claro
    } else {
      doc.setFillColor(254, 243, 199); // âmbar claro
    }
    doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if (isRepasse) {
      doc.setTextColor(30, 64, 175); // azul escuro
    } else {
      doc.setTextColor(146, 64, 14); // âmbar escuro
    }
    const saldoLabel = isRepasse
      ? `Leva e Traz deve repassar ${formatCurrency(saldo)} a loja`
      : `Loja deve pagar ${formatCurrency(Math.abs(saldo))} a Leva e Traz`;
    doc.text(saldoLabel, pageW / 2, y + 6.5, { align: "center" });
    doc.setTextColor(0);
    y += 14;
  }

  // ── Entregas (detalhadas por rota) ──
  if (entregas.length > 0) {
    if (y > 220) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Entregas Incluídas", margin, y);
    y += 7;

    let grandTotalFaturado = 0;
    let grandTotalReceber = 0;

    for (const entrega of entregas) {
      if (y > 245) { doc.addPage(); y = margin; }

      // Faixa de cabeçalho da solicitação
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, pageW - margin * 2, 8, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      const headerLeft = `${entrega.codigo}   |   ${formatDateBR(entrega.data_conclusao)}   |   ${entrega.entregador_nome}`;
      const headerRight = `Coleta: ${entrega.ponto_coleta}`;
      doc.text(headerLeft, margin + 2, y + 5.5);
      doc.text(headerRight, pageW - margin - 2, y + 5.5, { align: "right" });
      doc.setTextColor(0);
      y += 9;

      // valor_taxas ja exclui pago_na_hora e inclui extras — igual ao lancamento gravado
      const solTotalReceber = entrega.rotas.reduce((s, r) => s + (r.valor_receber ?? 0), 0);
      grandTotalFaturado += entrega.valor_taxas;
      grandTotalReceber += solTotalReceber;

      const rotaRows = entrega.rotas.map((r) => {
        const totalExtras = r.taxas_extras.reduce((s, t) => s + t.valor, 0);
        return [
          r.bairro_destino,
          r.responsavel || "—",
          formatCurrency(r.taxa),
          totalExtras > 0 ? formatCurrency(totalExtras) : "—",
          labelPagamentoOp(r.pagamento_operacao),
          r.valor_receber != null ? formatCurrency(r.valor_receber) : "—",
          labelMeioCobranca(r.meio_cobranca_destino),
        ];
      });

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Bairro", "Cliente", "Taxa", "Extra", "Cobranca", "Receber Cliente", "Via Pagto"]],
        body: rotaRows,
        foot: [["Total faturado", "", formatCurrency(entrega.valor_taxas), "", "", formatCurrency(solTotalReceber), ""]],
        theme: "grid",
        headStyles: { fillColor: [71, 85, 105], fontSize: 7.5, textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 7.5 },
        footStyles: { fillColor: [241, 245, 249], fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          2: { halign: "right" },
          3: { halign: "right" },
          5: { halign: "right" },
        },
      });
      y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 5;
    }

    // Total geral de todas as entregas
    if (y > 255) { doc.addPage(); y = margin; }
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: [[
        "TOTAL GERAL",
        "",
        formatCurrency(grandTotalFaturado),
        "",
        "",
        formatCurrency(grandTotalReceber),
        "",
      ]],
      theme: "grid",
      bodyStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        4: { halign: "right" },
      },
    });
    y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 8;
  }

  // ── Ajustes ──
  if (ajustes.length > 0) {
    if (y > 240) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Ajustes Manuais", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Motivo", "Tipo", "Valor", "Data"]],
      body: ajustes.map((a) => [
        a.motivo,
        a.tipo === "credito" ? "Crédito" : "Débito",
        `${a.tipo === "debito" ? "- " : "+ "}${formatCurrency(a.valor)}`,
        formatDateTimeBR(a.created_at),
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 2: { halign: "right" } },
    });
    y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 8;
  }

  // ── Histórico ──
  if (fatura.historico.length > 0) {
    if (y > 250) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Histórico", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Data/Hora", "Descrição"]],
      body: fatura.historico.map((h) => [
        formatDateTimeBR(h.timestamp),
        h.descricao,
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });
  }

  // ── Rodapé em cada página ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Leva e Traz — Fatura ${fatura.numero} — Página ${i}/${totalPages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  doc.save(`fatura-${fatura.numero}.pdf`);
}
