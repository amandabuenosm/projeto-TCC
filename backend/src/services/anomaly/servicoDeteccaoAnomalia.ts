import {
  RegistroNormalizado,
  DivergenciaIndividual,
  AnaliseAnomalia,
} from '../../models/tipos.js';

export class ServicoDeteccaoAnomalias {
  // Executa a detecção de anomalias nos registros normalizados e nos resultados de divergência
  public static detectarAnomalias(
    registrosA: RegistroNormalizado[],
    registrosB: RegistroNormalizado[],
    divergencias: DivergenciaIndividual[]
  ): AnaliseAnomalia[] {
    const anomalias: AnaliseAnomalia[] = [];

    [
      this.detectarValoresAnormais(registrosA, registrosB),
      this.detectarDuplicados(registrosA, 'Fonte A'),
      this.detectarDuplicados(registrosB, 'Fonte B'),
      this.detectarPicosFrequencia(registrosA, registrosB),
      this.detectarConcentracaoDivergencias(divergencias),
    ].forEach((anomalia) => {
      if (anomalia) anomalias.push(anomalia);
    });

    return anomalias;
  }

  // Identifica valores muito acima do padrão nos registros das duas fontes
  private static detectarValoresAnormais(
    registrosA: RegistroNormalizado[],
    registrosB: RegistroNormalizado[]
  ): AnaliseAnomalia | null {
    const todosOsValores = [...registrosA, ...registrosB]
      .map((r) => r.normalizedAmount)
      .filter((v): v is number => v !== null && v > 0);

    if (todosOsValores.length < 5) return null;

    const media = todosOsValores.reduce((soma, v) => soma + v, 0) / todosOsValores.length;
    const desvioPadrao = Math.sqrt(
      todosOsValores.reduce((soma, v) => soma + (v - media) ** 2, 0) / todosOsValores.length
    );

    if (!desvioPadrao) return null;

    const valoresDiscrepantes = todosOsValores.filter((v) => (v - media) / desvioPadrao > 2.5);
    if (!valoresDiscrepantes.length) return null;

    const valorMaximo = Math.max(...valoresDiscrepantes);

    return {
      id: `anom_outlier_${Math.random().toString(36).substring(2, 7)}`,
      type: 'VALUE_OUTLIER',
      description: `Identificados ${valoresDiscrepantes.length} lançamentos com valores atípicos significativamente superiores à média (Média: R$ ${media.toFixed(2)}, Desvio Padrão: R$ ${desvioPadrao.toFixed(2)}).`,
      severity: valorMaximo > media * 4 ? 'HIGH' : 'MEDIUM',
      affectedRecordsCount: valoresDiscrepantes.length,
      evidenceDetails: [
        `Valor máximo atípico detectado: R$ ${valorMaximo.toFixed(2)}`,
        `Limiar estatístico de anomalia (Z > 2.5): R$ ${(media + 2.5 * desvioPadrao).toFixed(2)}`,
      ],
    };
  }

  // Identifica possíveis lançamentos duplicados dentro de uma fonte de dados
  private static detectarDuplicados(
    registros: RegistroNormalizado[],
    nomeFonte: string
  ): AnaliseAnomalia | null {
    const contagens = new Map<string, number>();

    registros.forEach((r) => {
      if (r.normalizedDocument && r.normalizedAmount !== null) {
        const chave = `${r.normalizedDocument}_${r.normalizedAmount}_${r.normalizedDate || ''}`;
        contagens.set(chave, (contagens.get(chave) || 0) + 1);
      }
    });

    const duplicados = [...contagens.entries()].filter(([, contagem]) => contagem > 1);
    if (!duplicados.length) return null;

    const total = duplicados.reduce((soma, [, contagem]) => soma + contagem, 0);
    const detalhes = duplicados.slice(0, 3).map(([chave, contagem]) => {
      const [documento, valor] = chave.split('_');
      return `Documento ${documento} (R$ ${valor}): ${contagem} ocorrências idênticas`;
    });

    return {
      id: `anom_dup_${nomeFonte.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'PROBABLE_DUPLICATE',
      description: `Detectada potencial duplicidade de lançamentos na ${nomeFonte} (${duplicados.length} grupo(s) com dados idênticos de documento, valor e data).`,
      severity: total > 5 ? 'HIGH' : 'MEDIUM',
      affectedRecordsCount: total,
      evidenceDetails: detalhes,
    };
  }

  // Identifica datas com uma quantidade anormalmente alta de lançamentos
  private static detectarPicosFrequencia(
    registrosA: RegistroNormalizado[],
    registrosB: RegistroNormalizado[]
  ): AnaliseAnomalia | null {
    const contagensDatas = new Map<string, number>();

    [...registrosA, ...registrosB].forEach((r) => {
      if (r.normalizedDate) {
        contagensDatas.set(r.normalizedDate, (contagensDatas.get(r.normalizedDate) || 0) + 1);
      }
    });

    if (contagensDatas.size < 3) return null;

    const contagens = [...contagensDatas.values()];
    const media = contagens.reduce((soma, contagem) => soma + contagem, 0) / contagens.length;

    const pico = [...contagensDatas.entries()]
      .filter(([, contagem]) => contagem > media * 2.5)
      .sort((a, b) => b[1] - a[1])[0];

    if (!pico) return null;

    const [data, contagem] = pico;
    const porcentagem = ((contagem / media) * 100).toFixed(0);

    return {
      id: `anom_spike_${Math.random().toString(36).substring(2, 7)}`,
      type: 'UNUSUAL_FREQUENCY',
      description: `Concentração atípica de movimentações na data ${data} (${contagem} registros, representando ${porcentagem}% acima da média diária de ${media.toFixed(1)} registros).`,
      severity: 'MEDIUM',
      affectedRecordsCount: contagem,
      evidenceDetails: [
        `Data de pico: ${data}`,
        `Volume no pico: ${contagem} lançamentos`,
        `Média diária esperada: ${media.toFixed(1)} lançamentos`,
      ],
    };
  }

  // Identifica se as divergências estão concentradas em uma mesma data
  private static detectarConcentracaoDivergencias(
    divergencias: DivergenciaIndividual[]
  ): AnaliseAnomalia | null {
    if (!divergencias.length) return null;

    const contagens = new Map<string, number>();

    divergencias.forEach((d) => {
      const data = d.dateA || d.dateB;
      if (data) contagens.set(data, (contagens.get(data) || 0) + 1);
    });

    const pico = [...contagens.entries()].sort((a, b) => b[1] - a[1])[0];

    if (!pico || pico[1] < 3 || pico[1] < divergencias.length * 0.3) {
      return null;
    }

    const [data, contagem] = pico;
    const porcentagem = ((contagem / divergencias.length) * 100).toFixed(1);

    return {
      id: `anom_conc_${Math.random().toString(36).substring(2, 7)}`,
      type: 'HIGH_DIVERGENCE_CONCENTRATION',
      description: `Alta concentração de divergências na data/período ${data} (${contagem} de ${divergencias.length} divergências).`,
      severity: contagem > 10 ? 'HIGH' : 'MEDIUM',
      affectedRecordsCount: contagem,
      evidenceDetails: [
        `Período crítico: ${data}`,
        `Divergências no período: ${contagem} (${porcentagem}% do total)`,
      ],
    };
  }
}

// Aliases para compatibilidade
export const servicoDeteccaoAnomalias = ServicoDeteccaoAnomalias;
export const AnomalyDetectionService = ServicoDeteccaoAnomalias;
