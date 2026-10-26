"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationEngine = exports.MotorConciliacao = void 0;
const normalizationService_js_1 = require("../normalization/normalizationService.js");
const matchingService_js_1 = require("../matching/matchingService.js");
const servicoDeteccaoAnomalia_js_1 = require("../anomaly/servicoDeteccaoAnomalia.js");
const uuid_1 = require("uuid");
class MotorConciliacao {
    /**
     * Executa o fluxo completo de reconciliação determinística: Normalização -> Matching -> Anomalias -> Estatísticas
     */
    static processarConciliacao(nomeFonteA, nomeFonteB, registrosA, registrosB, mapeamento, config) {
        const idSessao = (0, uuid_1.v4)();
        const criadoEm = new Date().toISOString();
        const normalizadoA = registrosA.map((r, i) => normalizationService_js_1.ServicoNormalizacao.normalizarRegistro(r, i, mapeamento.documentA, mapeamento.amountA, mapeamento.dateA, mapeamento.descriptionA));
        const normalizadoB = registrosB.map((r, i) => normalizationService_js_1.ServicoNormalizacao.normalizarRegistro(r, i, mapeamento.documentB, mapeamento.amountB, mapeamento.dateB, mapeamento.descriptionB));
        const { divergencias, contagemConciliadas } = matchingService_js_1.ServicoCorrespondencia.executarCorrespondencia(normalizadoA, normalizadoB, mapeamento, config);
        const anomalias = servicoDeteccaoAnomalia_js_1.ServicoDeteccaoAnomalias.detectarAnomalias(normalizadoA, normalizadoB, divergencias);
        const totalRegistrosA = registrosA.length;
        const totalRegistrosB = registrosB.length;
        const totalAnalisados = Math.max(totalRegistrosA, totalRegistrosB);
        const contagemDivergentes = divergencias.filter((d) => d.status === 'DIVERGENTE').length;
        const contagemAusentesFonteA = divergencias.filter((d) => d.status === 'AUSENTE_FONTE_A').length;
        const contagemAusentesFonteB = divergencias.filter((d) => d.status === 'AUSENTE_FONTE_B').length;
        const contagemDuplicadas = divergencias.filter((d) => d.status === 'DUPLICADA').length;
        const percentualConciliacao = totalAnalisados > 0
            ? Math.round((contagemConciliadas / totalAnalisados) * 1000) / 10
            : 100;
        const valorTotalA = normalizadoA.reduce((soma, r) => soma + (r.normalizedAmount || 0), 0);
        const valorTotalB = normalizadoB.reduce((soma, r) => soma + (r.normalizedAmount || 0), 0);
        const diferencaValorTotal = divergencias.reduce((soma, d) => soma + (d.amountDiff || 0), 0);
        const resumo = {
            sessionId: idSessao,
            createdAt: criadoEm,
            sourceAName: nomeFonteA,
            sourceBName: nomeFonteB,
            totalRecordsA: totalRegistrosA,
            totalRecordsB: totalRegistrosB,
            totalAnalyzed: totalAnalisados,
            identifierLabel: this.inferirRotuloIdentificador(mapeamento.documentA, mapeamento.documentB),
            conciliadaCount: contagemConciliadas,
            divergenteCount: contagemDivergentes,
            ausenteFonteACount: contagemAusentesFonteA,
            ausenteFonteBCount: contagemAusentesFonteB,
            duplicadaCount: contagemDuplicadas,
            reconciliationPercentage: percentualConciliacao,
            totalAmountA: Math.round(valorTotalA * 100) / 100,
            totalAmountB: Math.round(valorTotalB * 100) / 100,
            totalAmountDiff: Math.round(diferencaValorTotal * 100) / 100,
        };
        return {
            id: idSessao,
            createdAt: criadoEm,
            sourceAName: nomeFonteA,
            sourceBName: nomeFonteB,
            recordsA: registrosA,
            recordsB: registrosB,
            mapping: mapeamento,
            config,
            summary: resumo,
            divergences: divergencias,
            anomalies: anomalias,
        };
    }
    /**
     * Infere um rótulo amigável para o identificador de pareamento a partir do nome das colunas.
     */
    static inferirRotuloIdentificador(campoA, campoB) {
        const textoCampos = `${campoA || ''} ${campoB || ''}`.toLowerCase();
        if (/\bnota\b|\bnf\b|nf-?e/.test(textoCampos))
            return 'Nota';
        if (/t[ií]tulo/.test(textoCampos))
            return 'Título';
        if (/lan[cç](amento|to)/.test(textoCampos))
            return 'Lançamento';
        if (/documento|\bdoc\b/.test(textoCampos))
            return 'Documento';
        return 'Documento';
    }
    // Alias para compatibilidade
    static processReconciliation = MotorConciliacao.processarConciliacao;
}
exports.MotorConciliacao = MotorConciliacao;
// Alias para compatibilidade
exports.ReconciliationEngine = MotorConciliacao;
