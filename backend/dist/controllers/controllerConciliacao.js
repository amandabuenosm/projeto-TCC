"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controllerConciliacao = exports.ControllerConciliacao = void 0;
const parsearArquivos_js_1 = require("../parsers/parsearArquivos.js");
const reconciliationEngine_js_1 = require("../services/reconciliation/reconciliationEngine.js");
const servicoAnalisePorIA_js_1 = require("../services/ai/servicoAnalisePorIA.js");
const servicoSugestaoMapeamento_js_1 = require("../services/mapping/servicoSugestaoMapeamento.js");
const sessaoArmazenamento_js_1 = require("../utils/sessaoArmazenamento.js");
const exportUtils_js_1 = require("../utils/exportUtils.js");
class ControllerConciliacao {
    static analisesIndividuaisEmAndamento = new Map();
    static analisesLoteEmAndamento = new Map();
    // Informa ao frontend se tem algum provedor de IA configurado antes de iniciar a análise
    static async statusIAconfig(req, res) {
        res.status(200).json({
            configured: !!process.env.GEMINI_API_KEY,
            provider: 'gemini',
        });
    }
    // Recebe os arquivos enviados e realiza a extração inicial dos dados
    static async uploadArquivos(req, res) {
        try {
            const arquivosRecebidos = req.files;
            const arquivoA = arquivosRecebidos?.fileA?.[0] || arquivosRecebidos?.fontededadosA?.[0];
            const arquivoB = arquivosRecebidos?.fileB?.[0] || arquivosRecebidos?.fontededadosB?.[0];
            if (!arquivoA && !arquivoB) {
                res.status(400).json({ error: 'Nenhum arquivo enviado. Envie os arquivos.' });
                return;
            }
            const nomeArquivoA = arquivoA ? ControllerConciliacao.corrigirNomeArquivo(arquivoA.originalname) : undefined;
            const nomeArquivoB = arquivoB ? ControllerConciliacao.corrigirNomeArquivo(arquivoB.originalname) : undefined;
            const resultadoA = arquivoA ? await parsearArquivos_js_1.ParserArquivos.parsear(arquivoA.buffer, nomeArquivoA) : null;
            const resultadoB = arquivoB ? await parsearArquivos_js_1.ParserArquivos.parsear(arquivoB.buffer, nomeArquivoB) : null;
            const formatarResultado = (resultado, nomeArquivo) => resultado
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
        }
        catch (err) {
            res.status(500).json({ error: err.message || 'Erro ao processar upload dos arquivos.' });
        }
    }
    // Corrige nomes de arquivos com acentuação para o padrão UTF-8
    static corrigirNomeArquivo(nomeOriginal) {
        try {
            return Buffer.from(nomeOriginal, 'latin1').toString('utf8');
        }
        catch {
            return nomeOriginal;
        }
    }
    // Sugere o mapeamento dos campos usando IA ou heurística por similaridade de nomes
    static async sugerirMapeamento(req, res) {
        try {
            const { headersA, headersB, headerA, headerB, sampleA, sampleB, amostraA, amostraB, } = req.body;
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
                const mapeamentoIA = await servicoAnalisePorIA_js_1.ServicoAnalisePorIA.sugerirMapeamentoCampos(cabecalhosA, cabecalhosB, dadosAmostraA, dadosAmostraB);
                const documentoA = servicoSugestaoMapeamento_js_1.ServicoSugestaoMapeamento.selecionarColunaDocumento(cabecalhosA);
                const documentoB = servicoSugestaoMapeamento_js_1.ServicoSugestaoMapeamento.selecionarColunaDocumento(cabecalhosB);
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
            }
            catch (err) {
                console.warn('Mapeamento com IA indisponível, usando heurística:', err);
            }
            const mapeamento = servicoSugestaoMapeamento_js_1.ServicoSugestaoMapeamento.sugerir(cabecalhosA, cabecalhosB);
            res.status(200).json({
                success: true,
                source: 'heuristica',
                mapping: mapeamento,
                mapeamento,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message || 'Erro ao sugerir mapeamento de campos.' });
        }
    }
    // Executa o motor determinístico de reconciliação entre os dados fornecidos
    static async compararCampos(req, res) {
        try {
            const { sourceAName, sourceBName, nomeFonteA, nomeFonteB, recordsA, recordsB, registrosA, registrosB, mapping, mapeamento, config, configuracao, } = req.body;
            const listaRegistrosA = registrosA || recordsA;
            const listaRegistrosB = registrosB || recordsB;
            const mapeamentoFinal = (mapeamento || mapping);
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
            const configCorrespondencia = {
                primaryKeys: configRecebida?.primaryKeys || [mapeamentoFinal.documentA],
                amountTolerance: configRecebida?.amountTolerance ?? configRecebida?.toleranciaValor ?? 0.01,
            };
            const sessao = reconciliationEngine_js_1.MotorConciliacao.processarConciliacao(nomeFonteA || sourceAName || 'Fonte A', nomeFonteB || sourceBName || 'Fonte B', listaRegistrosA, listaRegistrosB, mapeamentoFinal, configCorrespondencia);
            sessaoArmazenamento_js_1.sessaoArmazenamento.salvarSessao(sessao);
            res.status(200).json({
                success: true,
                sessionId: sessao.id,
                summary: sessao.summary,
                anomaliesCount: sessao.anomalies.length,
            });
        }
        catch (err) {
            res.status(500).json({
                error: err.message || 'Erro durante a reconciliação determinística.',
            });
        }
    }
    // Retorna indicadores resumidos e anomalias estatísticas da sessão
    static async resumo(req, res) {
        try {
            const sessao = sessaoArmazenamento_js_1.sessaoArmazenamento.obterSessao(req.params.id);
            if (!sessao) {
                res.status(404).json({ error: 'Sessão de reconciliação não encontrada.' });
                return;
            }
            res.status(200).json({
                success: true,
                summary: sessao.summary,
                anomalies: sessao.anomalies,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Retorna a lista de divergências encontradas com filtros
    static async divergencias(req, res) {
        try {
            const sessao = sessaoArmazenamento_js_1.sessaoArmazenamento.obterSessao(req.params.id);
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
                lista = lista.filter((d) => d.identifier.toLowerCase().includes(termo) ||
                    JSON.stringify(d.recordA || '').toLowerCase().includes(termo) ||
                    JSON.stringify(d.recordB || '').toLowerCase().includes(termo));
            }
            res.status(200).json({
                success: true,
                total: lista.length,
                divergences: lista,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Analisa uma divergência individual com a IA
    static async analisarDivergencia(req, res) {
        try {
            const { divergenceId, idDivergencia } = req.body;
            const idBuscado = idDivergencia || divergenceId;
            const sessao = sessaoArmazenamento_js_1.sessaoArmazenamento.obterSessao(req.params.id);
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
            let promessaAnalise = ControllerConciliacao.analisesIndividuaisEmAndamento.get(chaveAnalise);
            if (!promessaAnalise) {
                promessaAnalise = servicoAnalisePorIA_js_1.ServicoAnalisePorIA.analisarDivergencia(divergencia);
                ControllerConciliacao.analisesIndividuaisEmAndamento.set(chaveAnalise, promessaAnalise);
            }
            let analise;
            try {
                analise = await promessaAnalise;
            }
            finally {
                if (ControllerConciliacao.analisesIndividuaisEmAndamento.get(chaveAnalise) ===
                    promessaAnalise) {
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
        }
        catch (err) {
            if (err instanceof servicoAnalisePorIA_js_1.ProvedorIANaoConfig) {
                res.status(503).json({
                    success: false,
                    code: 'AI_NOT_CONFIGURED',
                    error: err.message,
                });
                return;
            }
            if (err instanceof servicoAnalisePorIA_js_1.CotaIAExcedida) {
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
    static async analisarLote(req, res) {
        try {
            const sessao = sessaoArmazenamento_js_1.sessaoArmazenamento.obterSessao(req.params.id);
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
                promessaAnalise = servicoAnalisePorIA_js_1.ServicoAnalisePorIA.analisarPadroesEmLote(sessao.summary, sessao.divergences);
                ControllerConciliacao.analisesLoteEmAndamento.set(sessao.id, promessaAnalise);
            }
            let analiseEmLote;
            try {
                analiseEmLote = await promessaAnalise;
            }
            finally {
                if (ControllerConciliacao.analisesLoteEmAndamento.get(sessao.id) === promessaAnalise) {
                    ControllerConciliacao.analisesLoteEmAndamento.delete(sessao.id);
                }
            }
            sessao.batchAnalysis = analiseEmLote;
            res.status(200).json({
                success: true,
                batchAnalysis: analiseEmLote,
                analiseEmLote,
            });
        }
        catch (err) {
            if (err instanceof servicoAnalisePorIA_js_1.ProvedorIANaoConfig) {
                res.status(503).json({
                    success: false,
                    code: 'AI_NOT_CONFIGURED',
                    error: err.message,
                });
                return;
            }
            if (err instanceof servicoAnalisePorIA_js_1.CotaIAExcedida) {
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
    static async exportaRelatorio(req, res) {
        try {
            const { id } = req.params;
            const sessao = sessaoArmazenamento_js_1.sessaoArmazenamento.obterSessao(id);
            if (!sessao) {
                res.status(404).json({ error: 'Sessão de reconciliação não encontrada.' });
                return;
            }
            const csv = exportUtils_js_1.UtilitariosExportacao.gerarRelatorioCsv(sessao);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="reconciliacao_${id}.csv"`);
            res.status(200).send('\uFEFF' + csv);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.ControllerConciliacao = ControllerConciliacao;
// Alias para compatibilidade
exports.controllerConciliacao = ControllerConciliacao;
