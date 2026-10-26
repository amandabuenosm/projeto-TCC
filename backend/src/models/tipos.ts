// Resultados da comparação
export type StatusComparacao =
  | 'CONCILIADA'
  | 'DIVERGENTE'
  | 'AUSENTE_FONTE_A'
  | 'AUSENTE_FONTE_B'
  | 'DUPLICADA';

// Gravidade da divergência e nível de confiança da análise de IA
export type GravidadeDivergencia = 'LOW' | 'MEDIUM' | 'HIGH';
export type NivelConfianca = 'Baixo' | 'Médio' | 'Alto';

// Representam os registros originais e dados normalizados
export interface RegistroBruto {
  [chave: string]: any;
}

export interface RegistroNormalizado {
  id: string;
  originalData: RegistroBruto;
  keyFields: Record<string, string>;
  normalizedDocument: string;
  normalizedDate: string | null;
  normalizedAmount: number | null;
  normalizedDescription: string;
}

// Define os campos correspondentes entre as duas fontes
export interface MapeamentoCampos {
  documentA: string;
  documentB: string;
  amountA: string;
  amountB: string;
  dateA: string;
  dateB: string;
  descriptionA?: string;
  descriptionB?: string;
  additionalKeys?: Array<{ fieldA: string; fieldB: string }>;
}

// Configura as chaves e tolerância de valores
export interface ConfigCorrespondencia {
  primaryKeys: string[];
  amountTolerance: number;
}

// Mostra os campos que possuem divergências
export interface DiferencaDeCampo {
  fieldName: string;
  valueA: any;
  valueB: any;
}

// Reúne as informações de uma divergência individual (dados das fontes + análise da IA)
export interface DivergenciaIndividual {
  id: string;
  status: StatusComparacao;
  identifier: string;
  recordA: RegistroBruto | null;
  recordB: RegistroBruto | null;
  normalizedA: RegistroNormalizado | null;
  normalizedB: RegistroNormalizado | null;
  dateA: string | null;
  dateB: string | null;
  amountA: number | null;
  amountB: number | null;
  amountDiff: number | null;
  divergentFields: DiferencaDeCampo[];
  aiAnalyzed: boolean;
  aiAnalysis?: ResultadoAnaliseIA;
}

// Estrutura o resultado produzido pela IA
export interface ResultadoAnaliseIA {
  summary: string;
  possibleCauses: string[];
  identifiedPattern?: string;
  recommendations: string[];
  nivelConfianca: NivelConfianca;
  disclaimer: string;
}

// Armazena os indicadores gerais da reconciliação
export interface ResumoConciliacao {
  sessionId: string;
  createdAt: string;
  sourceAName: string;
  sourceBName: string;
  totalRecordsA: number;
  totalRecordsB: number;
  totalAnalyzed: number;
  identifierLabel: string;
  conciliadaCount: number;
  divergenteCount: number;
  ausenteFonteACount: number;
  ausenteFonteBCount: number;
  duplicadaCount: number;
  reconciliationPercentage: number;
  totalAmountA: number;
  totalAmountB: number;
  totalAmountDiff: number;
}

// Estrutura a análise de padrões de várias divergências
export interface AnaliseLotePadrao {
  observedFacts: string[];
  aiHypotheses: string[];
  concentrations: string[];
  overallRiskAssessment: string;
  recommendedActionPlan: string[];
}

// Representa anomalias identificadas nos dados
export interface AnaliseAnomalia {
  id: string;
  type:
    | 'VALUE_OUTLIER'
    | 'UNUSUAL_FREQUENCY'
    | 'PROBABLE_DUPLICATE'
    | 'HIGH_DIVERGENCE_CONCENTRATION';
  description: string;
  severity: GravidadeDivergencia;
  affectedRecordsCount: number;
  evidenceDetails: string[];
}

// Reúne todas as informações de uma sessão completa de reconciliação
export interface SessaoConciliacao {
  id: string;
  createdAt: string;
  sourceAName: string;
  sourceBName: string;
  recordsA: RegistroBruto[];
  recordsB: RegistroBruto[];
  mapping: MapeamentoCampos;
  config: ConfigCorrespondencia;
  summary: ResumoConciliacao;
  divergences: DivergenciaIndividual[];
  anomalies: AnaliseAnomalia[];
  batchAnalysis?: AnaliseLotePadrao;
}

// Aliases para compatibilidade e padronização
export type statusComparacao = StatusComparacao;
export type gravidadeDivergencia = GravidadeDivergencia;
export type nivelConfianca = NivelConfianca;
export type registroBruto = RegistroBruto;
export type RawRecord = RegistroBruto;
export type registroNormalizado = RegistroNormalizado;
export type NormalizedRecord = RegistroNormalizado;
export type mapeamentoCampos = MapeamentoCampos;
export type FieldMapping = MapeamentoCampos;
export type configCorrespondencia = ConfigCorrespondencia;
export type MatchingConfig = ConfigCorrespondencia;
export type diferencaDeCampo = DiferencaDeCampo;
export type divergenciaIndividual = DivergenciaIndividual;
export type DivergenceItem = DivergenciaIndividual;
export type resultAnaliseIA = ResultadoAnaliseIA;
export type resumoConciliacao = ResumoConciliacao;
export type ReconciliationSummary = ResumoConciliacao;
export type analiseLotePadrao = AnaliseLotePadrao;
export type analiseAnomalia = AnaliseAnomalia;
export type AnomalyItem = AnaliseAnomalia;
export type sessaoConciliacao = SessaoConciliacao;
export type ReconciliationSession = SessaoConciliacao;