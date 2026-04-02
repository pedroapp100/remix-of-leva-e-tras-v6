import { formatDateTimeBR } from "@/lib/formatters";

// ── Generic CSV / PDF export for any tabular data ──

interface ExportConfig {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  filename: string;
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob(["\uFEFF" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV({ headers, rows, filename }: ExportConfig) {
  const csv = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
  downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function exportPDF({ title, subtitle, headers, rows, filename }: ExportConfig) {
  const html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p.sub { color: #666; margin-top: 0; margin-bottom: 16px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e293b; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; }
  td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; font-size: 10px; }
  tr:nth-child(even) { background: #f8fafc; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>${title} — Leva e Traz</h1>
<p class="sub">${subtitle ?? ""} · Gerado em ${formatDateTimeBR(new Date())} · ${rows.length} registros</p>
<table>
<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n")}
</tbody></table>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => {
      w.print();
      URL.revokeObjectURL(url);
    };
  }
}
