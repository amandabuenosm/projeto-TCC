"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cotaIAExcedida = exports.provedorIANaoConfig = exports.AIAnalysisService = exports.servicoAnalisePorIA = exports.ServicoAnalisePorIA = exports.CotaIAExcedida = exports.ProvedorIANaoConfig = void 0;
const servicoSugestaoMapeamento_js_1 = require("../mapping/servicoSugestaoMapeamento.js");
// Erro lançado quando não há chave de API configurada, impedindo a análise por IA
class ProvedorIANaoConfig extends Error {
    constructor() {
        super('Nenhuma chave de API de IA foi configurada.');
        this.name = 'ProvedorIANaoConfig';
    }
}
exports.ProvedorIANaoConfig = ProvedorIANaoConfig;
// Erro específico para quota esgotada, não deve repetir a requisição
class CotaIAExcedida extends Error {
    constructor(message = 'A cota da Gemini API foi atingida. Verifique seu plano ou tente em outro momento.') {
        super(message);
        this.name = 'CotaIAExcedida';
    }
}
exports.CotaIAExcedida = CotaIAExcedida;
class ServicoAnalisePorIA {
    // Verifica se há um provedor de IA configurado para uso interno e pelo frontend
    static obterConfigProvedor() {
        if (process.env.GEMINI_API_KEY)
            return 'gemini';
        return null;
    }
    // Analisa uma divergência usando exclusivamente o modelo de IA configurado
    static async analisarDivergencia(divergencia) {
        const chaveAPI = process.env.GEMINI_API_KEY;
        if (!chaveAPI) {
            throw new ProvedorIANaoConfig();
        }
        return this.chamarLLMParaDivergenciaIndividual(divergencia);
    }
    // Analisa padrões de todas as divergências, em lote, usando a IA
    static async analisarPadroesEmLote(resumo, divergencias) {
        const chaveAPI = process.env.GEMINI_API_KEY;
        if (!chaveAPI) {
            throw new ProvedorIANaoConfig();
        }
        return this.chamarLLMParaDivergenciaEmLote(resumo, divergencias);
    }
    // Integra APIs de IA externas (divergência individual)
    static async chamarLLMParaDivergenciaIndividual(divergencia) {
        const prompt = `Você é um analista de conciliação de dados.

    Analise a divergência abaixo usando SOMENTE os dados fornecidos:
    - Identificador: ${divergencia.identifier}
    - Status: ${divergencia.status}
    - Fonte 1: ${JSON.stringify(divergencia.recordA)}
    - Fonte 2: ${JSON.stringify(divergencia.recordB)}
    - Diferenças: ${JSON.stringify(divergencia.divergentFields)}

    REGRAS:
    1. Não invente informações ou causas.
    2. Apresente causas apenas como hipóteses ("possível", "provável", "sugere").
    3. Use linguagem simples e objetiva.
    4. Não presuma que o registro envolve produto, mercadoria ou serviço.
    5. Ao recomendar ações, use termos genéricos como "alinhar os registros das duas fontes".
    6. Responda SOMENTE com JSON neste formato:

    {
      "summary": "Resumo da divergência em 2-3 frases",
      "possibleCauses": ["Hipótese 1", "Hipótese 2"],
      "identifiedPattern": "Padrão identificado ou null",
      "recommendations": ["Recomendação 1", "Recomendação 2"],
      "confidenceLevel": "Baixo | Médio | Alto",
      "disclaimer": "A análise é hipotética e deve ser validada por um analista"
    }`;
        const analisada = await this.chamarLLM(prompt, 30000);
        return {
            summary: analisada.summary || 'Divergência analisada pela IA.',
            possibleCauses: analisada.possibleCauses || [],
            identifiedPattern: analisada.identifiedPattern || undefined,
            recommendations: analisada.recommendations || [],
            nivelConfianca: ['Baixo', 'Médio', 'Alto'].includes(analisada.confidenceLevel)
                ? analisada.confidenceLevel
                : 'Médio',
            disclaimer: analisada.disclaimer || 'Análise gerada por IA. As hipóteses devem ser validadas pelo analista.',
        };
    }
    // Integra APIs de IA externas (divergências em lote)
    static async chamarLLMParaDivergenciaEmLote(resumo, divergencias) {
        const prompt = `Você é um analista de dados revisando uma reconciliação entre duas fontes.

    Resumo:
    ${JSON.stringify(resumo, null, 2)}

    Divergências:
    ${JSON.stringify(divergencias.slice(0, 10), null, 2)}

    REGRAS:
    1. Separe fatos observados de hipóteses.
    2. Use SOMENTE os dados fornecidos.
    3. Não invente números ou informações.
    4. Hipóteses devem usar linguagem prudente ("possível", "provável", "sugere").
    5. Use linguagem simples, objetiva e sem jargões.
    6. Não presuma que os registros envolvem produtos ou serviços.
    7. Responda SOMENTE com JSON:

    {
      "observedFacts": ["Fato 1", "Fato 2"],
      "aiHypotheses": ["Hipótese 1", "Hipótese 2"],
      "concentrations": ["Padrão ou concentração identificada"],
      "overallRiskAssessment": "Avaliação em 2-3 frases",
      "recommendedActionPlan": ["Ação 1", "Ação 2"]
    }`;
        const analisada = await this.chamarLLM(prompt, 45000);
        return {
            observedFacts: analisada.observedFacts || [],
            aiHypotheses: analisada.aiHypotheses || [],
            concentrations: analisada.concentrations || [],
            overallRiskAssessment: analisada.overallRiskAssessment || 'Avaliação concluída.',
            recommendedActionPlan: analisada.recommendedActionPlan || [],
        };
    }
    // Sugere o mapeamento de todas as colunas usando IA, permitindo ajustes pelo usuário
    static async sugerirMapeamentoCampos(cabecalhosA, cabecalhosB, amostraA, amostraB) {
        if (!process.env.GEMINI_API_KEY) {
            throw new ProvedorIANaoConfig();
        }
        const prompt = `Você deve mapear as colunas de duas planilhas para permitir a comparação (reconciliação) entre elas.

    Colunas da Fonte de Dados 1: ${JSON.stringify(cabecalhosA)}
    Exemplo de registro da Fonte de Dados 1: ${JSON.stringify(amostraA || {})}

    Colunas da Fonte de Dados 2: ${JSON.stringify(cabecalhosB)}
    Exemplo de registro da Fonte de Dados 2: ${JSON.stringify(amostraB || {})}

    Identifique:
    - qual coluna de cada fonte representa o NÚMERO DA NOTA FISCAL ou do DOCUMENTO usado para parear os registros (documentA, documentB). Nunca use uma coluna de valor monetário, total, saldo ou preço como identificador.
    - qual coluna representa o valor monetário principal (amountA, amountB)
    - qual coluna representa a data principal (dateA, dateB)
    - qual coluna representa uma descrição/histórico, se houver (descriptionA, descriptionB)
    - todos os demais pares de colunas que parecem representar o mesmo dado nas duas fontes (additionalKeys)

    Responda estritamente no seguinte formato JSON, sem nenhum texto fora do JSON.
    Use exatamente os nomes de coluna fornecidos acima e nunca invente nomes:

    {
      "documentA": "nome exato da coluna",
      "documentB": "nome exato da coluna",
      "amountA": "nome exato da coluna",
      "amountB": "nome exato da coluna",
      "dateA": "nome exato da coluna",
      "dateB": "nome exato da coluna",
      "descriptionA": "nome exato da coluna ou null",
      "descriptionB": "nome exato da coluna ou null",
      "additionalKeys": [
        {
          "fieldA": "nome exato da coluna",
          "fieldB": "nome exato da coluna"
        }
      ]
    }`;
        const analisada = await this.chamarLLM(prompt, 30000);
        const validoA = new Set(cabecalhosA);
        const validoB = new Set(cabecalhosB);
        const additionalKeys = Array.isArray(analisada.additionalKeys)
            ? analisada.additionalKeys.filter((p) => p && validoA.has(p.fieldA) && validoB.has(p.fieldB))
            : [];
        return {
            documentA: servicoSugestaoMapeamento_js_1.ServicoSugestaoMapeamento.selecionarColunaDocumento(cabecalhosA),
            documentB: servicoSugestaoMapeamento_js_1.ServicoSugestaoMapeamento.selecionarColunaDocumento(cabecalhosB),
            amountA: validoA.has(analisada.amountA)
                ? analisada.amountA
                : '',
            amountB: validoB.has(analisada.amountB)
                ? analisada.amountB
                : '',
            dateA: validoA.has(analisada.dateA) ? analisada.dateA : '',
            dateB: validoB.has(analisada.dateB) ? analisada.dateB : '',
            descriptionA: validoA.has(analisada.descriptionA) ? analisada.descriptionA : undefined,
            descriptionB: validoB.has(analisada.descriptionB) ? analisada.descriptionB : undefined,
            additionalKeys,
        };
    }
    // Centraliza as chamadas ao provedor de IA com repetições automáticas em erros transitórios
    static async chamarLLM(prompt, tempoLimiteMs) {
        const chaveAPI = process.env.GEMINI_API_KEY;
        if (!chaveAPI) {
            throw new ProvedorIANaoConfig();
        }
        const maxTentativas = 4;
        const atrasosRetentativaPorMs = [2000, 5000, 10000];
        let ultimoErro;
        for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
            try {
                return await this.chamarLLMUmaVez(prompt, chaveAPI, tempoLimiteMs);
            }
            catch (err) {
                ultimoErro = err;
                if (err?.isQuotaExceeded === true) {
                    throw err;
                }
                const serTransitorio = err?.isTransientProviderError === true;
                const serUltimaTentativa = tentativa === maxTentativas;
                if (!serTransitorio || serUltimaTentativa) {
                    throw err;
                }
                const atraso = atrasosRetentativaPorMs[tentativa - 1] ?? 10000;
                console.warn(`[IA] Erro transitório do Gemini (tentativa ${tentativa}/${maxTentativas}). Tentando novamente em ${atraso}ms...`);
                await new Promise((resolve) => setTimeout(resolve, atraso));
            }
        }
        throw ultimoErro;
    }
    // Executa uma única tentativa de chamada ao provedor de IA com timeout
    static async chamarLLMUmaVez(prompt, apiKey, tempoLimiteMs) {
        const controller = new AbortController();
        const tempoLimiteId = setTimeout(() => controller.abort(), tempoLimiteMs);
        try {
            const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json',
                    },
                }),
                signal: controller.signal,
            });
            if (!resposta.ok) {
                const corpoErro = await resposta.text();
                const error = new Error(`Gemini API retornou status ${resposta.status}: ${corpoErro}`);
                const serCotaDiaria = resposta.status === 429 &&
                    /GenerateRequestsPerDayPerProjectPerModel|quota exceeded|RESOURCE_EXHAUSTED/i.test(corpoErro);
                if (serCotaDiaria) {
                    error.isQuotaExceeded = true;
                    throw new CotaIAExcedida('A cota da Gemini API foi atingida. Verifique seu plano ou tente em outro momento.');
                }
                error.isTransientProviderError = this.verificarStatusTransitorio(resposta.status);
                throw error;
            }
            const dados = await resposta.json();
            const resultadoTexto = dados.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (!resultadoTexto) {
                throw new Error('O Gemini retornou uma resposta vazia.');
            }
            return JSON.parse(resultadoTexto);
        }
        catch (err) {
            if (err instanceof CotaIAExcedida) {
                throw err;
            }
            if (err?.name === 'AbortError') {
                const erroTimeout = new Error(`Tempo limite de ${Math.round(tempoLimiteMs / 1000)}s excedido ao aguardar resposta do Gemini.`);
                erroTimeout.isTransientProviderError = true;
                throw erroTimeout;
            }
            if (err instanceof SyntaxError) {
                const erroSintaxe = new Error('O Gemini retornou um conteúdo que não é um JSON válido. Tente novamente.');
                erroSintaxe.isTransientProviderError = true;
                throw erroSintaxe;
            }
            throw err;
        }
        finally {
            clearTimeout(tempoLimiteId);
        }
    }
    // Identifica erros temporários que podem ser resolvidos com nova tentativa
    static verificarStatusTransitorio(status) {
        return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
    }
    // Alias para compatibilidade
    static getConfiguredProvider = ServicoAnalisePorIA.obterConfigProvedor;
}
exports.ServicoAnalisePorIA = ServicoAnalisePorIA;
// Aliases para compatibilidade
exports.servicoAnalisePorIA = ServicoAnalisePorIA;
exports.AIAnalysisService = ServicoAnalisePorIA;
exports.provedorIANaoConfig = ProvedorIANaoConfig;
exports.cotaIAExcedida = CotaIAExcedida;
