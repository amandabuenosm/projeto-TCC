import { Request, Response } from 'express';
import { ParserArquivos } from '../parsers/parsearArquivos.js';
import { MotorConciliacao } from '../services/reconciliation/reconciliationEngine.js';
import {
  ServicoAnalisePorIA,
  ProvedorIANaoConfig,
  CotaIAExcedida,
} from '../services/ai/servicoAnalisePorIA.js';
import { ServicoSugestaoMapeamento } from '../services/mapping/servicoSugestaoMapeamento.js';
import { sessaoArmazenamento } from '../utils/sessaoArmazenamento.js';
import { UtilitariosExportacao } from '../utils/exportUtils.js';
import {
  MapeamentoCampos,
  ConfigCorrespondencia,
  ResultadoAnaliseIA,
  AnaliseLotePadrao,
} from '../models/tipos.js';

export class ControllerConciliacao {
  private static analisesIndividuaisEmAndamento = new Map<
    string,
    Promise<ResultadoAnaliseIA>
  >();
  private static analisesLoteEmAndamento = new Map<string, Promise<AnaliseLotePadrao>>();

  // Informa ao frontend se tem algum provedor de IA configurado antes de iniciar a análise
  public static async statusIAconfig(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      configured: !!process.env.GEMINI_API_KEY,
      provider: 'gemini',
    });
  }

  // Recebe os arquivos enviados e realiza a extração inicial dos dados
  public static async uploadArquivos(req: Request, res: Response): Promise<void> {
    try {
      const arquivosRecebidos = req.files as { [campo: string]: Express.Multer.File[] } | undefined;

      const arquivoA = arquivosRecebidos?.fileA?.[0] || arquivosRecebidos?.fontededadosA?.[0];
      const arquivoB = arquivosRecebidos?.fileB?.[0] || arquivosRecebidos?.fontededadosB?.[0];

      if (!arquivoA && !arquivoB) {
        res.status(400).json({ error: 'Nenhum arquivo enviado. Envie os arquivos.' });
        return;
      }

      const nomeArquivoA = arquivoA ? ControllerConciliacao.corrigirNomeArquivo(arquivoA.originalname) : undefined;
      const nomeArquivoB = arquivoB ? ControllerConciliacao.corrigirNomeArquivo(arquivoB.originalname) : undefined;

      const resultadoA = arquivoA ? await ParserArquivos.parsear(arquivoA.buffer, nomeArquivoA!) : null;
      const resultadoB = arquivoB ? await ParserArquivos.parsear(arquivoB.buffer, nomeArquivoB!) : null;

      const formatarResultado = (resultado: any, nomeArquivo?: string) =>
        resultado
          ? {
              filename: nomeArquivo,
              headers: resultado.cabecalhos || resultado.headers,
              totalRecords: (resultado.registros || resultado.records || []).length,
              preview: (resultado.registros || resultado.records || []).slice(0, 5),
              rawRecords: resultado.registros || resultado.records,
            }
          : null;

      res.status(200).json({
        success: true,
        sourceA: formatarResultado(resultadoA, nomeArquivoA),
        sourceB: formatarResultado(resultadoB, nomeArquivoB),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao processar upload dos arquivos.' });
    }
  }

  // Corrige nomes de arquivos com acentuação para o padrão UTF-8
  private static corrigirNomeArquivo(nomeOriginal: string): string {
    try {
      return Buffer.from(nomeOriginal, 'latin1').toString('utf8');
    } catch {
      return nomeOriginal;
    }
  }

  // Sugere o mapeamento dos campos usando IA ou heurística por similaridade de nomes
  public static async sugerirMapeamento(req: Request, res: Response): Promise<void> {
    try {
      const {
        headersA,
        headersB,
        headerA,
        headerB,
        sampleA,
        sampleB,
        amostraA,
        amostraB,
      } = req.body;

      const cabecalhosA = headersA || headerA;
      const cabecalhosB = headersB || headerB;
      const dadosAmostraA = sampleA || amostraA;
      const dadosAmostraB = sampleB || amostraB;

      if (!cabecalhosA?.length || !cabecalhosB?.length) {
        res.status(400).json({
          error: 'Cabeçalho A e Cabeçalho B são obrigatórios e não podem estar vazios.',
        });
        return;
      }

      try {
        const mapeamentoIA = await ServicoAnalisePorIA.sugerirMapeamentoCampos(
          cabecalhosA,
          cabecalhosB,
          dadosAmostraA,
          dadosAmostraB
        );
        const documentoA = ServicoSugestaoMapeamento.selecionarColunaDocumento(cabecalhosA);
        const documentoB = ServicoSugestaoMapeamento.selecionarColunaDocumento(cabecalhosB);
        const mapeamento = {
          ...mapeamentoIA,
          documentA: documentoA || '',
          documentB: documentoB || '',
        };

        res.status(200).json({
          success: true,
          source: 'ia',
          mapping: mapeamento,
          mapeamento,
        });
        return;
      } catch (err) {
        console.warn('Mapeamento com IA indisponível, usando heurística:', err);
      }

      const mapeamento = ServicoSugestaoMapeamento.sugerir(cabecalhosA, cabecalhosB);

      res.status(200).json({
        success: true,
        source: 'heuristica',
        mapping: mapeamento,
        mapeamento,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao sugerir mapeamento de campos.' });
    }
  }

  // Executa o motor determinístico de reconciliação entre os dados fornecidos
  public static async compararCampos(req: Request, res: Response): Promise<void> {
    try {
      const {
        sourceAName,
        sourceBName,
        nomeFonteA,
        nomeFonteB,
        recordsA,
        recordsB,
        registrosA,
        registrosB,
        mapping,
        mapeamento,
        config,
        configuracao,
      } = req.body;

      const listaRegistrosA = registrosA || recordsA;
      const listaRegistrosB = registrosB || recordsB;
      const mapeamentoFinal = (mapeamento || mapping) as MapeamentoCampos;
      const configRecebida = configuracao || config;

      if (!Array.isArray(listaRegistrosA) || !Array.isArray(listaRegistrosB)) {
        res.status(400).json({ error: 'Registros das Fontes A e B são obrigatórios.' });
        return;
      }

      if (!mapeamentoFinal?.documentA || !mapeamentoFinal?.documentB) {
        res.status(400).json({
          error: 'Mapeamento de colunas inválido. Mapeie os campos de documento/identificador.',
        });
        return;
      }

      const configCorrespondencia: ConfigCorrespondencia = {
        primaryKeys: configRecebida?.primaryKeys || [mapeamentoFinal.documentA],
        amountTolerance:
          configRecebida?.amountTolerance ?? configRecebida?.toleranciaValor ?? 0.01,
      };

      const sessao = MotorConciliacao.processarConciliacao(
        nomeFonteA || sourceAName || 'Fonte A',
        nomeFonteB || sourceBName || 'Fonte B',
        listaRegistrosA,
        listaRegistrosB,
        mapeamentoFinal,
        configCorrespondencia
      );

      sessaoArmazenamento.salvarSessao(sessao);

      res.status(200).json({
        success: true,
        sessionId: sessao.id,
        summary: sessao.summary,
        anomaliesCount: sessao.anomalies.length,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err.message || 'Erro durante a reconciliação determinística.',
      });
    }
  }

  // Retorna indicadores resumidos e anomalias estatísticas da sessão
  public static async resumo(req: Request, res: Response): Promise<void> {
    try {
      const sessao = sessaoArmazenamento.obterSessao(req.params.id);

      if (!sessao) {
        res.status(404).json({ error: 'Sessão de reconciliação não encontrada.' });
        return;
      }

      res.status(200).json({
        success: true,
        summary: sessao.summary,
        anomalies: sessao.anomalies,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Retorna a lista de divergências encontradas com filtros
  public static async divergencias(req: Request, res: Response): Promise<void> {
    try {
      const sessao = sessaoArmazenamento.obterSessao(req.params.id);

      if (!sessao) {
        res.status(404).json({ error: 'Sessão de reconciliação não encontrada.' });
        return;
      }

      let lista = sessao.divergences;
      const { status, pesquisa, search, analisadoPorIA, aiAnalyzed } = req.query;

      if (status) {
        lista = lista.filter((d) => d.status === status);
      }

      const filtroIA = analisadoPorIA !== undefined ? analisadoPorIA : aiAnalyzed;
      if (filtroIA !== undefined) {
        lista = lista.filter((d) => d.aiAnalyzed === (filtroIA === 'true'));
      }

      const termoBusca = pesquisa || search;
      if (termoBusca) {
        const termo = String(termoBusca).toLowerCase();
        lista = lista.filter(
          (d) =>
            d.identifier.toLowerCase().includes(termo) ||
            JSON.stringify(d.recordA || '').toLowerCase().includes(termo) ||
            JSON.stringify(d.recordB || '').toLowerCase().includes(termo)
        );
      }

      res.status(200).json({
        success: true,
        total: lista.length,
        divergences: lista,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Analisa uma divergência individual com a IA
  public static async analisarDivergencia(req: Request, res: Response): Promise<void> {
    try {
      const { divergenceId, idDivergencia } = req.body;
      const idBuscado = idDivergencia || divergenceId;

      const sessao = sessaoArmazenamento.obterSessao(req.params.id);

      if (!sessao) {
        res.status(404).json({ error: 'Sessão de reconciliação não encontrada.' });
        return;
      }

      const divergencia = sessao.divergences.find((d) => d.id === idBuscado);

      if (!divergencia) {
        res.status(404).json({ error: 'Divergência não encontrada na sessão.' });
        return;
      }

      if (divergencia.aiAnalysis) {
        res.status(200).json({
          success: true,
          divergenceId: idBuscado,
          idDivergencia: idBuscado,
          analysis: divergencia.aiAnalysis,
        });
        return;
      }

      const chaveAnalise = JSON.stringify([sessao.id, divergencia.id]);
      let promessaAnalise =
        ControllerConciliacao.analisesIndividuaisEmAndamento.get(chaveAnalise);

      if (!promessaAnalise) {
        promessaAnalise = ServicoAnalisePorIA.analisarDivergencia(divergencia);
        ControllerConciliacao.analisesIndividuaisEmAndamento.set(chaveAnalise, promessaAnalise);
      }

      let analise: ResultadoAnaliseIA;
      try {
        analise = await promessaAnalise;
      } finally {
        if (
          ControllerConciliacao.analisesIndividuaisEmAndamento.get(chaveAnalise) ===
          promessaAnalise
        ) {
          ControllerConciliacao.analisesIndividuaisEmAndamento.delete(chaveAnalise);
        }
      }

      divergencia.aiAnalyzed = true;
      divergencia.aiAnalysis = analise;

      res.status(200).json({
        success: true,
        divergenceId: idBuscado,
        idDivergencia: idBuscado,
        analysis: analise,
      });
    } catch (err: any) {
      if (err instanceof ProvedorIANaoConfig) {
        res.status(503).json({
          success: false,
          code: 'AI_NOT_CONFIGURED',
          error: err.message,
        });
        return;
      }

      if (err instanceof CotaIAExcedida) {
        res.status(429).json({
          success: false,
          code: 'AI_QUOTA_EXCEEDED',
          error: 'A quota da Gemini API foi atingida. Verifique o plano e o faturamento do projeto.',
        });
        return;
      }

      console.error('[IA] Falha ao analisar divergência:', err);

      res.status(502).json({
        success: false,
        code: 'AI_CALL_FAILED',
        error: 'Não foi possível concluir a análise por IA. Tente novamente em instantes.',
        errorDetail: err.message,
      });
    }
  }

  // Faz a análise em lote de todas as divergências encontradas
  public static async analisarLote(req: Request, res: Response): Promise<void> {
    try {
      const sessao = sessaoArmazenamento.obterSessao(req.params.id);

      if (!sessao) {
        res.status(404).json({ error: 'Sessão de reconciliação não encontrada.' });
        return;
      }

      if (sessao.batchAnalysis) {
        res.status(200).json({
          success: true,
          batchAnalysis: sessao.batchAnalysis,
          analiseEmLote: sessao.batchAnalysis,
        });
        return;
      }

      let promessaAnalise = ControllerConciliacao.analisesLoteEmAndamento.get(sessao.id);

      if (!promessaAnalise) {
        promessaAnalise = ServicoAnalisePorIA.analisarPadroesEmLote(
          sessao.summary,
          sessao.divergences
        );
        ControllerConciliacao.analisesLoteEmAndamento.set(sessao.id, promessaAnalise);
      }

      let analiseEmLote: AnaliseLotePadrao;
      try {
        analiseEmLote = await promessaAnalise;
      } finally {
        if (
          ControllerConciliacao.analisesLoteEmAndamento.get(sessao.id) === promessaAnalise
        ) {
          ControllerConciliacao.analisesLoteEmAndamento.delete(sessao.id);
        }
      }

      sessao.batchAnalysis = analiseEmLote;

      res.status(200).json({
        success: true,
        batchAnalysis: analiseEmLote,
        analiseEmLote,
      });
    } catch (err: any) {
      if (err instanceof ProvedorIANaoConfig) {
        res.status(503).json({
          success: false,
          code: 'AI_NOT_CONFIGURED',
          error: err.message,
        });
        return;
      }

      if (err instanceof CotaIAExcedida) {
        res.status(429).json({
          success: false,
          code: 'AI_QUOTA_EXCEEDED',
          error: 'A quota da Gemini API foi atingida. Verifique o plano e o faturamento do projeto.',
        });
        return;
      }

      console.error('[IA] Falha ao analisar padrões agregados:', err);

      res.status(502).json({
        success: false,
        code: 'AI_CALL_FAILED',
        error: 'Não foi possível concluir a análise agregada por IA. Tente novamente em instantes.',
        errorDetail: err.message,
      });
    }
  }

  // Gera um relatório CSV completo das divergências
  public static async exportaRelatorio(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sessao = sessaoArmazenamento.obterSessao(id);

      if (!sessao) {
        res.status(404).json({ error: 'Sessão de reconciliação não encontrada.' });
        return;
      }

      const csv = UtilitariosExportacao.gerarRelatorioCsv(sessao);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reconciliacao_${id}.csv"`);
      res.status(200).send('\uFEFF' + csv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

// Alias para compatibilidade
export const controllerConciliacao = ControllerConciliacao;