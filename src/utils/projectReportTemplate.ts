// src/utils/projectReportTemplate.ts

import { shareAsync } from "expo-sharing";
import * as Print from "expo-print";
import Toast from "react-native-toast-message";

const CRITERIA_WEIGHTS = [0.9, 0.8, 0.7, 0.6, 0.6, 0.4, 0.4, 0.3, 0.3];
const Z = 2.5;

type EvaluationPayload = {
  evaluatorName: string;
  evaluatorEmail: string;
  notas: Record<string, number>;
  total: number;
  comentarios?: string;
};

export function buildProjectReportHTML(payload: {
  project: {
    titulo: string;
    alunos: string[];
    orientador: string;
    categoria: string;
    turma: string;
    anoSemestre: string;
  };
  finalScore: number;
  evaluations: EvaluationPayload[];
}) {
  const dateStr = new Date().toLocaleString("pt-BR");

  // Top 3 avaliações por total (com padronização para ter sempre 3)
  const sortedEvals = [...payload.evaluations]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
  while (sortedEvals.length < 3) {
    sortedEvals.push({
      evaluatorName: "Sem avaliador",
      evaluatorEmail: "-",
      notas: {},
      total: 0,
      comentarios: "",
    });
  }

  const allEvalsHtml = payload.evaluations
    .map((e) => {
      const criteriaRows = Object.entries(e.notas)
        .map(([crit, val]) => {
          const safeVal = typeof val === "number" ? val.toFixed(2) : "--";
          return `
            <tr>
              <td style="padding:4px;border:1px solid #ccc;font-size:12px;">${crit}</td>
              <td style="padding:4px;border:1px solid #ccc;font-size:12px;text-align:right;">${safeVal}</td>
            </tr>
          `;
        })
        .join("");

      const totalStr = typeof e.total === "number" ? e.total.toFixed(2) : "--";

      return `
        <div style="margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:8px;">
          <h3 style="margin:4px 0;">Avaliador: ${e.evaluatorName} (${
        e.evaluatorEmail
      })</h3>
          <p style="margin:2px 0;font-size:13px;">Total da avaliação: <strong>${totalStr}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;">
            <thead>
              <tr>
                <th style="padding:6px;border:1px solid #ccc;background:#f0f0f0;font-size:12px;">Critério</th>
                <th style="padding:6px;border:1px solid #ccc;background:#f0f0f0;font-size:12px;">Nota</th>
              </tr>
            </thead>
            <tbody>
              ${
                criteriaRows ||
                `<tr><td colspan="2" style="padding:4px;border:1px solid #ccc;">Sem notas</td></tr>`
              }
            </tbody>
          </table>
          ${
            e.comentarios
              ? `<div style="margin-top:8px;"><strong>Comentário:</strong><p style="margin:4px 0;font-size:12px;">${e.comentarios}</p></div>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  const top3Html = sortedEvals
    .map((e, i) => {
      const totalStr = typeof e.total === "number" ? e.total.toFixed(2) : "--";
      const criteriaRows = Object.entries(e.notas)
        .map(([crit, val]) => {
          const safeVal = typeof val === "number" ? val.toFixed(2) : "--";
          return `
            <tr>
              <td style="padding:4px;border:1px solid #ccc;font-size:11px;">${crit}</td>
              <td style="padding:4px;border:1px solid #ccc;font-size:11px;text-align:right;">${safeVal}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom:16px; padding:12px; border:1px solid #bbb; border-radius:6px;">
          <h4 style="margin:4px 0;">${i + 1}º Avaliador: ${e.evaluatorName}</h4>
          <p style="margin:0;font-size:12px;">Email: ${e.evaluatorEmail}</p>
          <p style="margin:4px 0;font-size:12px;">Total: <strong>${totalStr}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-top:6px;">
            <thead>
              <tr>
                <th style="padding:6px;border:1px solid #ccc;background:#fafafa;font-size:11px;">Critério</th>
                <th style="padding:6px;border:1px solid #ccc;background:#fafafa;font-size:11px;">Nota</th>
              </tr>
            </thead>
            <tbody>
              ${
                criteriaRows ||
                `<tr><td colspan="2" style="padding:4px;border:1px solid #ccc;">Sem notas</td></tr>`
              }
            </tbody>
          </table>
          ${
            e.comentarios
              ? `<div style="margin-top:6px;"><strong>Comentário:</strong><p style="margin:4px 0;font-size:12px;">${e.comentarios}</p></div>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  const safeFinalScore =
    typeof payload.finalScore === "number"
      ? payload.finalScore.toFixed(2)
      : "--";

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Relatório do Projeto - ${payload.project.titulo}</title>
      <style>
        body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Arial, sans-serif; padding:16px; color:#222; }
        h1 { margin:0; font-size:26px; }
        h2 { margin:8px 0; font-size:20px; border-bottom:2px solid #007AFF; padding-bottom:4px; }
        h3 { margin:6px 0; font-size:18px; }
        h4 { margin:4px 0; font-size:16px; }
        .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #007AFF; padding-bottom:8px; margin-bottom:12px; }
        .logo { height:60px; }
        .meta { font-size:13px; color:#555; margin-bottom:6px; display:flex; flex-wrap:wrap; gap:8px; }
        .badge { display:inline-block; background:#007AFF; color:#fff; padding:6px 12px; border-radius:6px; font-size:14px; }
        .section { margin-top:20px; }
        .footer { margin-top:40px; border-top:1px solid #ddd; padding-top:8px; font-size:10px; color:#666; text-align:center; }
        .card { border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:12px; }
        .sub { margin:4px 0; font-size:14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Relatório do Projeto</h1>
          <div style="font-size:12px;">Gerado em: ${dateStr}</div>
        </div>
        <div>
          <img class="logo" src="https://via.placeholder.com/120x60?text=IFPR" alt="Logo IFPR" />
        </div>
      </div>

      <div class="section">
        <h2>${payload.project.titulo}</h2>
        <div class="meta">
          <div><strong>Alunos:</strong> ${payload.project.alunos.join(
            ", "
          )}</div>
          <div><strong>Orientador:</strong> ${payload.project.orientador}</div>
          <div><strong>Categoria:</strong> ${payload.project.categoria}</div>
          <div><strong>Turma:</strong> ${payload.project.turma}</div>
          <div><strong>Ano/Semestre:</strong> ${
            payload.project.anoSemestre
          }</div>
        </div>
        <div style="margin-top:12px; padding:12px; background:#f0f8ff; border-radius:8px;">
          <h3>Nota Final</h3>
          <div>
            <span class="badge">${safeFinalScore}</span>
            <p style="margin:6px 0;font-size:13px;">
              Nota final calculada com padronização por critério e aplicação dos pesos conforme edital.
              Trabalhos das categorias IFTECH e Robótica usam k=6, os demais k=9.
            </p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Top 3 Avaliadores</h2>
        ${top3Html}
      </div>

      <div class="section">
        <h2>Todas as Avaliações</h2>
        ${allEvalsHtml}
      </div>

      <div class="footer">
        FECIPE • Sistema de Avaliação • IFPR • Relatório gerado em ${dateStr}
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Gera e compartilha o PDF do relatório do projeto.
 */
export async function exportProjectReportPDF(
  payload: Parameters<typeof buildProjectReportHTML>[0]
) {
  try {
    const html = buildProjectReportHTML(payload);
    const { uri } = await Print.printToFileAsync({ html });
    await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    Toast.show({ type: "success", text1: "PDF gerado" });
  } catch (err: any) {
    console.error("Erro exportProjectReportPDF:", err);
    Toast.show({
      type: "error",
      text1: "Erro ao gerar PDF",
      text2: err?.message || "Erro desconhecido",
    });
  }
}
