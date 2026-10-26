import axios from 'axios';
import {
  MapeamentoCampos,
  ConfigCorrespondencia,
  ResumoConciliacao,
  ItemDivergencia,
  ResultadoAnaliseIA,
  ResultadoPadraoLote,
  ItemAnomalia,
} from '../types/index.js';

const URL_BASE_API = '/api';

// Extrai uma mensagem de erro legível de uma resposta de erro do axios/backend
export function extrairMensagemErro(erro: any, padrao: string): string {
  const dados = erro?.response?.data;

  if (dados?.error && dados?.errorDetail) {
    return `${dados.error} (detalhe: ${dados.errorDetail})`;
  }

  return dados?.error || erro?.message || padrao;
}

export const extractErrorMessage = extrairMensagemErro;

export const api = {
  // Verifica a saúde e conectividade do servidor backend
  async verificarSaude() {
    const resposta = await axios.get(`${URL_BASE_API}/health`);
    return resposta.data;
  },

  // Verifica se há um provedor de IA configurado no backend
  async obterStatusIA(): Promise<{
    configured: boolean;
    provider: 'gemini' | 'openai' | null;
  }> {
    const resposta = await axios.get(`${URL_BASE_API}/ai/status`);
    return resposta.data;
  },

  // Realiza o upload e a extração inicial das colunas dos arquivos
  async enviarArquivos(arquivoA?: File, arquivoB?: File) {
    const formulario = new FormData();

    if (arquivoA) formulario.append('fileA', arquivoA);
    if (arquivoB) formulario.append('fileB', arquivoB);

    const resposta = await axios.post(`${URL_BASE_API}/files/upload`, formulario, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return resposta.data;
  },

  // Sugere um mapeamento inicial de campos cobrindo todas as colunas
  async sugerirMapeamento(
    cabecalhosA: string[],
    cabecalhosB: string[],
    amostraA?: Record<string, any>,
    amostraB?: Record<string, any>
  ): Promise<{ source: 'ia' | 'heuristica'; mapping: MapeamentoCampos }> {
    const resposta = await axios.post(`${URL_BASE_API}/mapping/suggest`, {
      headersA: cabecalhosA,
      headersB: cabecalhosB,
      sampleA: amostraA,
      sampleB: amostraB,
    });

    return resposta.data;
  },

  // Executa o motor determinístico de reconciliação
  async executarConciliacao(dados: {
    sourceAName: string;
    sourceBName: string;
    recordsA: any[];
    recordsB: any[];
    mapping: MapeamentoCampos;
    config: ConfigCorrespondencia;
  }) {
    const resposta = await axios.post(
      `${URL_BASE_API}/reconciliation/compare`,
      dados
    );

    return resposta.data;
  },

  // Obtém o resumo dos indicadores e anomalias de uma sessão
  async obterResumo(
    idSessao: string
  ): Promise<{ summary: ResumoConciliacao; anomalies: ItemAnomalia[] }> {
    const resposta = await axios.get(
      `${URL_BASE_API}/reconciliation/${idSessao}/summary`
    );

    return resposta.data;
  },

  // Obtém a lista de divergências com suporte a filtros
  async obterDivergencias(
    idSessao: string,
    parametros?: {
      status?: string;
      search?: string;
      aiAnalyzed?: boolean;
    }
  ): Promise<{ divergences: ItemDivergencia[]; total: number }> {
    const resposta = await axios.get(
      `${URL_BASE_API}/reconciliation/${idSessao}/divergences`,
      { params: parametros }
    );

    return resposta.data;
  },

  // Aciona a análise por IA de uma divergência individual
  async analisarDivergencia(
    idSessao: string,
    idDivergencia: string
  ): Promise<{ analysis: ResultadoAnaliseIA }> {
    const resposta = await axios.post(
      `${URL_BASE_API}/reconciliation/${idSessao}/analyze`,
      { divergenceId: idDivergencia }
    );

    return resposta.data;
  },

  // Aciona a análise agregada de padrões por IA para a sessão
  async analisarLote(
    idSessao: string
  ): Promise<{ batchAnalysis: ResultadoPadraoLote }> {
    const resposta = await axios.post(
      `${URL_BASE_API}/reconciliation/${idSessao}/analyze-batch`
    );

    return resposta.data;
  },

  // Obtém a URL do endpoint para download do relatório em CSV
  obterUrlExportacao(idSessao: string): string {
    return `${URL_BASE_API}/reconciliation/${idSessao}/export`;
  },

  // Aliases para compatibilidade total
  checkHealth() {
    return this.verificarSaude();
  },
  getAIStatus() {
    return this.obterStatusIA();
  },
  uploadFiles(fileA?: File, fileB?: File) {
    return this.enviarArquivos(fileA, fileB);
  },
  suggestMapping(headersA: string[], headersB: string[], sampleA?: Record<string, any>, sampleB?: Record<string, any>) {
    return this.sugerirMapeamento(headersA, headersB, sampleA, sampleB);
  },
  runReconciliation(payload: {
    sourceAName: string;
    sourceBName: string;
    recordsA: any[];
    recordsB: any[];
    mapping: MapeamentoCampos;
    config: ConfigCorrespondencia;
  }) {
    return this.executarConciliacao(payload);
  },
  getSummary(sessionId: string) {
    return this.obterResumo(sessionId);
  },
  getDivergences(sessionId: string, params?: { status?: string; search?: string; aiAnalyzed?: boolean }) {
    return this.obterDivergencias(sessionId, params);
  },
  analyzeDivergence(sessionId: string, divergenceId: string) {
    return this.analisarDivergencia(sessionId, divergenceId);
  },
  analyzeBatch(sessionId: string) {
    return this.analisarLote(sessionId);
  },
  getExportUrl(sessionId: string) {
    return this.obterUrlExportacao(sessionId);
  },
};