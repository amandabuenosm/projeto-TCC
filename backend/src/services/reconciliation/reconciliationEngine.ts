import {
  RegistroBruto,
  MapeamentoCampos,
  ConfigCorrespondencia,
  SessaoConciliacao,
} from '../../models/tipos.js';
import { ServicoNormalizacao } from '../normalization/normalizationService.js';
import { ServicoCorrespondencia } from '../matching/matchingService.js';
import { ServicoDeteccaoAnomalias } from '../anomaly/servicoDeteccaoAnomalia.js';
import { v4 as uuidv4 } from 'uuid';

export class MotorConciliacao {
  /**
   * Executa o fluxo completo de reconciliação determinística: Normalização -> Matching -> Anomalias -> Estatísticas
   */
  public static processarConciliacao(
    nomeFonteA: string,
    nomeFonteB: string,
    registrosA: RegistroBruto[],
    registrosB: RegistroBruto[],
    mapeamento: MapeamentoCampos,
    config: ConfigCorrespondencia
  ): SessaoConciliacao {
    const idSessao = uuidv4();
    const criadoEm = new Date().toISOString();

    const normalizadoA = registrosA.map((r, i) =>
      ServicoNormalizacao.normalizarRegistro(
        r,
        i,
        mapeamento.documentA,
        mapeamento.amountA,
        mapeamento.dateA,
        mapeamento.descriptionA
      )
    );

    const normalizadoB = registrosB.map((r, i) =>
      ServicoNormalizacao.normalizarRegistro(
        r,
        i,
        mapeamento.documentB,
        mapeamento.amountB,
        mapeamento.dateB,
        mapeamento.descriptionB
      )
    );

    const { divergencias, contagemConciliadas } = ServicoCorrespondencia.executarCorrespondencia(
      normalizadoA,
      normalizadoB,
      mapeamento,
      config
    );

    const anomalias = ServicoDeteccaoAnomalias.detectarAnomalias(
      normalizadoA,
      normalizadoB,
      divergencias
    );

    const totalRegistrosA = registrosA.length;
    const totalRegistrosB = registrosB.length;
    const totalAnalisados = Math.max(totalRegistrosA, totalRegistrosB);

    const contagemDivergentes = divergencias.filter((d) => d.status === 'DIVERGENTE').length;
    const contagemAusentesFonteA = divergencias.filter((d) => d.status === 'AUSENTE_FONTE_A').length;
    const contagemAusentesFonteB = divergencias.filter((d) => d.status === 'AUSENTE_FONTE_B').length;
    const contagemDuplicadas = divergencias.filter((d) => d.status === 'DUPLICADA').length;

    const percentualConciliacao =
      totalAnalisados > 0
        ? Math.round((contagemConciliadas / totalAnalisados) * 1000) / 10
        : 100;

    const valorTotalA = normalizadoA.reduce(
      (soma, r) => soma + (r.normalizedAmount || 0),
      0
    );

    const valorTotalB = normalizadoB.reduce(
      (soma, r) => soma + (r.normalizedAmount || 0),
      0
    );

    const diferencaValorTotal = divergencias.reduce(
      (soma, d) => soma + (d.amountDiff || 0),
      0
    );

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
  private static inferirRotuloIdentificador(campoA: string, campoB: string): string {
    const textoCampos = `${campoA || ''} ${campoB || ''}`.toLowerCase();

    if (/\bnota\b|\bnf\b|nf-?e/.test(textoCampos)) return 'Nota';
    if (/t[ií]tulo/.test(textoCampos)) return 'Título';
    if (/lan[cç](amento|to)/.test(textoCampos)) return 'Lançamento';
    if (/documento|\bdoc\b/.test(textoCampos)) return 'Documento';

    return 'Documento';
  }

  // Alias para compatibilidade
  public static processReconciliation = MotorConciliacao.processarConciliacao;
}

// Alias para compatibilidade
export const ReconciliationEngine = MotorConciliacao;
