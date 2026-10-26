"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportUtils = exports.UtilitariosExportacao = void 0;
class UtilitariosExportacao {
    /**
     * Converte a sessão de reconciliação em formato CSV codificado em UTF-8 com separador ponto e vírgula (;)
     */
    static gerarRelatorioCsv(sessao) {
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
        divergences.forEach((div) => {
            const diferencas = div.divergentFields
                .map((f) => `Campo: ${f.fieldName}. Diferença: ${f.valueA} na fonte 1, e ${f.valueB} na fonte 2`)
                .join(' | ')
                .replace(/"/g, '""');
            linhas.push(`"${div.status}";"${div.identifier}";"${diferencas}";"${div.aiAnalyzed ? 'SIM' : 'NÃO'}"`);
        });
        return linhas.join('\r\n');
    }
    // Alias para compatibilidade
    static generateCsvReport = UtilitariosExportacao.gerarRelatorioCsv;
}
exports.UtilitariosExportacao = UtilitariosExportacao;
// Alias para compatibilidade
exports.ExportUtils = UtilitariosExportacao;
