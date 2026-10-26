import { SessaoConciliacao, DivergenciaIndividual, DiferencaDeCampo } from '../models/tipos.js';

export class UtilitariosExportacao {
  /**
   * Converte a sessão de reconciliação em formato CSV codificado em UTF-8 com separador ponto e vírgula (;)
   */
  public static gerarRelatorioCsv(sessao: SessaoConciliacao): string {
    const { summary, divergences } = sessao;
    const rotuloIdentificador = summary.identifierLabel || 'Documento';

    const linhas = [
      '"RELATÓRIO DE RECONCILIAÇÃO"',
      `"ID da Sessão";"${sessao.id}"`,
      `"Data do Processamento";"${sessao.createdAt}"`,
      `"Fonte de Dados 1";"${sessao.sourceAName}"`,
      `"Fonte de Dados 2";"${sessao.sourceBName}"`,
      `"Resumo";"Total Analisado: ${summary.totalAnalyzed} | Conciliados: ${summary.conciliadaCount} (${summary.reconciliationPercentage}%) | Divergentes: ${summary.divergenteCount}"`,
      '',
      `"Status";"${rotuloIdentificador}";"Diferenças";"Analisado por IA"`,
    ];

    divergences.forEach((div: DivergenciaIndividual) => {
      const diferencas = div.divergentFields
        .map((f: DiferencaDeCampo) => `Campo: ${f.fieldName}. Diferença: ${f.valueA} na fonte 1, e ${f.valueB} na fonte 2`)
        .join(' | ')
        .replace(/"/g, '""');

      linhas.push(
        `"${div.status}";"${div.identifier}";"${diferencas}";"${div.aiAnalyzed ? 'SIM' : 'NÃO'}"`
      );
    });

    return linhas.join('\r\n');
  }

  // Alias para compatibilidade
  public static generateCsvReport = UtilitariosExportacao.gerarRelatorioCsv;
}

// Alias para compatibilidade
export const ExportUtils = UtilitariosExportacao;