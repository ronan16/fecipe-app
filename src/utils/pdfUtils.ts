// src/utils/pdfUtils.ts

import { shareAsync } from "expo-sharing";
import * as Print from "expo-print";
import Toast from "react-native-toast-message";

/**
 * Gera o HTML básico do relatório geral (topProjects e estatísticas).
 * Pode ser estendido para outros relatórios.
 */
function buildGeneralReportHTML(payload: {
  totalProjects: number;
  totalEvaluators: number;
  approved: number;
  rejected: number;
  topProjects: Record<
    string,
    Array<{
      titulo: string;
      finalScore: number;
      evaluations: Array<{
        evaluatorName: string;
        evaluatorEmail: string;
        total: number;
      }>;
    }>
  >;
}) {
  const dateStr = new Date().toLocaleString("pt-BR");

  const sectionsHtml = Object.entries(payload.topProjects)
    .map(([categoria, projects]) => {
      const topHtml = projects
        .map((p, idx) => {
          const safeFinal =
            typeof p.finalScore === "number" ? p.finalScore.toFixed(2) : "--";
          const evalsHtml = p.evaluations
            .map((e, ei) => {
              const safeTotal =
                typeof e.total === "number" ? e.total.toFixed(2) : "--";
              return `
                <div style="margin-bottom:6px; padding:8px; border:1px solid #eee; border-radius:6px;">
                  <div><strong>${ei + 1}º Avaliador:</strong> ${
                e.evaluatorName
              } (${e.evaluatorEmail})</div>
                  <div>Total da avaliação: <strong>${safeTotal}</strong></div>
                </div>
              `;
            })
            .join("");
          return `
            <div style="margin-bottom:16px; padding:12px; border:1px solid #ccc; border-radius:8px;">
              <h3 style="margin:4px 0;">${idx + 1}º lugar: ${p.titulo}</h3>
              <div><strong>Nota Final:</strong> ${safeFinal}</div>
              <div style="margin-top:8px;">
                ${evalsHtml}
              </div>
            </div>
          `;
        })
        .join("");
      return `
        <div style="margin-top:24px;">
          <h2>Top 3 - ${categoria}</h2>
          ${topHtml || "<div>Sem dados</div>"}
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Relatório Geral FECIPE</title>
      <style>
        body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Arial, sans-serif; padding:16px; color:#222; }
        h1 { margin-bottom:4px; font-size:26px; }
        h2 { margin-top:24px; font-size:22px; border-bottom:1px solid #007AFF; padding-bottom:4px; }
        h3 { margin:8px 0; font-size:18px; }
        .summary { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px; }
        .badge { background:#007AFF; color:#fff; padding:6px 12px; border-radius:6px; display:inline-block; font-size:14px; }
        .section { margin-top:20px; }
        .footer { margin-top:40px; font-size:10px; color:#666; border-top:1px solid #ddd; padding-top:8px; }
        .card { border:1px solid #ddd; border-radius:8px; padding:12px; margin-bottom:12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Relatório Geral da FECIPE</h1>
        <div class="small">Gerado em: ${dateStr}</div>
      </div>

      <div class="summary">
        <div class="card">
          <div><strong>Total de Projetos</strong></div>
          <div class="badge">${payload.totalProjects}</div>
        </div>
        <div class="card">
          <div><strong>Total de Avaliadores</strong></div>
          <div class="badge">${payload.totalEvaluators}</div>
        </div>
        <div class="card">
          <div><strong>Aprovados</strong></div>
          <div class="badge">${payload.approved}</div>
        </div>
        <div class="card">
          <div><strong>Reprovados</strong></div>
          <div class="badge">${payload.rejected}</div>
        </div>
      </div>

      ${sectionsHtml}

      <div class="footer">
        FECIPE • Sistema de Avaliação • IFPR • Relatório gerado em ${dateStr}
      </div>
    </body>
    </html>
  `;
}

/**
 * Gera e compartilha o PDF do relatório geral.
 */
export async function generatePDFReport(
  payload: Parameters<typeof buildGeneralReportHTML>[0]
) {
  try {
    console.log("🔍 Exportando PDF - entrada dos dados: ", payload);
    const html = buildGeneralReportHTML(payload);
    const { uri } = await Print.printToFileAsync({ html });
    console.log("🔍 PDF gerado em:", uri);
    await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    Toast.show({ type: "success", text1: "PDF gerado com sucesso!" });
  } catch (err: any) {
    console.error("❌ Erro ao gerar PDF:", err);
    Toast.show({
      type: "error",
      text1: "Erro ao gerar PDF",
      text2: err?.message || "Erro desconhecido",
    });
  }
}
