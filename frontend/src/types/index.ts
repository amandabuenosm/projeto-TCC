// Etapas do fluxo da aplicação
export type Etapa =
  | 'import'
  | 'mapping'
  | 'config'
  | 'reconciling'
  | 'results'
  | 'patterns'
  | 'export';

// Status do pareamento
export type StatusConciliacao =
  | 'CONCILIADA'
  | 'DIVERGENTE'
  | 'AUSENTE_FONTE_A'
  | 'AUSENTE_FONTE_B'
  | 'DUPLICADA';

// Gravidade e nível de confiança
export type GravidadeDivergencia = 'LOW' | 'MEDIUM' | 'HIGH';
export type NivelConfianca = 'Baixo' | 'Médio' | 'Alto';

// Registros brutos
export interface RegistroBruto {
  [chave: string]: any;
}

// Mapeamento das colunas
export interface MapeamentoCampos {
  documentA: string;
  documentB: string;
  amountA: string;
  amountB: string;
  dateA: string;
  dateB: string;
  descriptionA?: string;
  descriptionB?: string;
  additionalKeys?: { fieldA: string; fieldB: string }[];
}

// Configuração de correspondência
export interface ConfigCorrespondencia {
  primaryKeys: string[];
  amountTolerance: number;
}

// Diferença encontrada em um campo
export interface DiferencaCampo {
  fieldName: string;
  valueA: any;
  valueB: any;
}

// Resultado da análise individual por IA
export interface ResultadoAnaliseIA {
  summary: string;
  possibleCauses: string[];
  identifiedPattern?: string;
  recommendations: string[];
  confidenceLevel: NivelConfianca;
  disclaimer: string;
}

// Item individual de divergência
export interface ItemDivergencia {
  id: string;
  status: StatusConciliacao;
  identifier: string;
  recordA: RegistroBruto | null;
  recordB: RegistroBruto | null;
  dateA: string | null;
  dateB: string | null;
  amountA: number | null;
  amountB: number | null;
  amountDiff: number | null;
  divergentFields: DiferencaCampo[];
  aiAnalyzed: boolean;
  aiAnalysis?: ResultadoAnaliseIA;
}

// Item de anomalia estatística
export interface ItemAnomalia {
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

// Resumo dos indicadores da reconciliação
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

// Resultado da análise agregada em lote
export interface ResultadoPadraoLote {
  observedFacts: string[];
  aiHypotheses: string[];
  concentrations: string[];
  overallRiskAssessment: string;
  recommendedActionPlan: string[];
}

// Dados dos arquivos após extração inicial
export interface DadosFonteProcessada {
  filename?: string;
  name: string;
  headers: string[];
  totalRecords: number;
  preview: RegistroBruto[];
  rawRecords: RegistroBruto[];
}

// Aliases para compatibilidade
export type Step = Etapa;
export type MatchStatus = StatusConciliacao;
export type DivergenceSeverity = GravidadeDivergencia;
export type ConfidenceLevel = NivelConfianca;
export type RawRecord = RegistroBruto;
export type FieldMapping = MapeamentoCampos;
export type MatchingConfig = ConfigCorrespondencia;
export type FieldDiff = DiferencaCampo;
export type AIAnalysisResult = ResultadoAnaliseIA;
export type DivergenceItem = ItemDivergencia;
export type AnomalyItem = ItemAnomalia;
export type ReconciliationSummary = ResumoConciliacao;
export type BatchPatternResult = ResultadoPadraoLote;
export type ParsedSourceData = DadosFonteProcessada;