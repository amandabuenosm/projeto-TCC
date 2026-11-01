"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MappingSuggestionService = exports.servicoSugestaoMapeamento = exports.ServicoSugestaoMapeamento = void 0;
class ServicoSugestaoMapeamento {
    static LIMITE_REGISTROS = 100;
    static selecionarColunaDocumento(cabecalhos) {
        const normalizar = (valor) => valor
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
        const candidatos = cabecalhos
            .map((cabecalho) => {
            const nome = normalizar(cabecalho);
            let pontuacao = 0;
            if (/\b(chave de acesso|chave nfe)\b/.test(nome)) {
                pontuacao = 100;
            }
            else if (/\b(numero|nro|nr|num)\b.*\b(documento|doc|nota|fiscal)\b/.test(nome)) {
                pontuacao = 95;
            }
            else if (/\b(documento|document|invoice|fatura)\b/.test(nome)) {
                pontuacao = 90;
            }
            else if (/\b(nfe|nfce|nota fiscal)\b/.test(nome)) {
                pontuacao = 85;
            }
            return { cabecalho, pontuacao };
        })
            .filter((candidato) => candidato.pontuacao > 0)
            .sort((a, b) => b.pontuacao - a.pontuacao);
        return candidatos[0]?.cabecalho || '';
    }
    static sugerir(cabecalhosA, cabecalhosB, registrosA = [], registrosB = []) {
        const amostraA = registrosA.slice(0, this.LIMITE_REGISTROS);
        const amostraB = registrosB.slice(0, this.LIMITE_REGISTROS);
        const colunasA = this.analisarColunas(cabecalhosA, amostraA);
        const colunasB = this.analisarColunas(cabecalhosB, amostraB);
        const pares = this.criarPares(colunasA, colunasB);
        const parDocumento = this.selecionarParDocumento(pares);
        const parValor = this.selecionarParPorTipo(pares, 'numero', new Set([
            parDocumento?.colunaA.cabecalho || '',
            parDocumento?.colunaB.cabecalho || '',
        ]));
        const parData = this.selecionarParPorTipo(pares, 'data', new Set([
            parDocumento?.colunaA.cabecalho || '',
            parDocumento?.colunaB.cabecalho || '',
            parValor?.colunaA.cabecalho || '',
            parValor?.colunaB.cabecalho || '',
        ]));
        const parDescricao = this.selecionarParDescricao(pares, new Set([
            parDocumento?.colunaA.cabecalho || '',
            parDocumento?.colunaB.cabecalho || '',
            parValor?.colunaA.cabecalho || '',
            parValor?.colunaB.cabecalho || '',
            parData?.colunaA.cabecalho || '',
            parData?.colunaB.cabecalho || '',
        ]));
        const usadosA = new Set();
        const usadosB = new Set();
        const reservar = (par) => {
            if (!par)
                return;
            usadosA.add(par.colunaA.cabecalho);
            usadosB.add(par.colunaB.cabecalho);
        };
        reservar(parDocumento);
        reservar(parValor);
        reservar(parData);
        reservar(parDescricao);
        const paresAdicionais = pares
            .filter((par) => !usadosA.has(par.colunaA.cabecalho) &&
            !usadosB.has(par.colunaB.cabecalho) &&
            par.pontuacao >= 0.45)
            .sort((a, b) => b.pontuacao - a.pontuacao);
        const additionalKeys = [];
        const adicionaisA = new Set();
        const adicionaisB = new Set();
        for (const par of paresAdicionais) {
            const campoA = par.colunaA.cabecalho;
            const campoB = par.colunaB.cabecalho;
            if (adicionaisA.has(campoA) || adicionaisB.has(campoB))
                continue;
            additionalKeys.push({ fieldA: campoA, fieldB: campoB });
            adicionaisA.add(campoA);
            adicionaisB.add(campoB);
        }
        return {
            documentA: parDocumento?.colunaA.cabecalho || '',
            documentB: parDocumento?.colunaB.cabecalho || '',
            amountA: parValor?.colunaA.cabecalho || '',
            amountB: parValor?.colunaB.cabecalho || '',
            dateA: parData?.colunaA.cabecalho || '',
            dateB: parData?.colunaB.cabecalho || '',
            descriptionA: parDescricao?.colunaA.cabecalho || undefined,
            descriptionB: parDescricao?.colunaB.cabecalho || undefined,
            additionalKeys,
        };
    }
    static analisarColunas(cabecalhos, registros) {
        return cabecalhos.map((cabecalho) => {
            const valores = registros.map((registro) => this.normalizarValor(registro?.[cabecalho]));
            const preenchidos = valores.filter((valor) => valor !== '');
            const unicos = new Set(preenchidos);
            let quantidadeNumerica = 0;
            let quantidadeData = 0;
            let quantidadeMonetaria = 0;
            for (const valorOriginal of registros.map((registro) => registro?.[cabecalho])) {
                if (this.ehData(valorOriginal))
                    quantidadeData++;
                if (this.ehNumero(valorOriginal))
                    quantidadeNumerica++;
                if (this.ehMonetario(valorOriginal))
                    quantidadeMonetaria++;
            }
            const total = registros.length || 1;
            const proporcaoNumerica = quantidadeNumerica / total;
            const proporcaoData = quantidadeData / total;
            const proporcaoMonetaria = quantidadeMonetaria / total;
            let tipo = 'vazio';
            if (preenchidos.length > 0) {
                if (proporcaoData >= 0.6 && proporcaoData >= proporcaoNumerica) {
                    tipo = 'data';
                }
                else if (proporcaoNumerica >= 0.6) {
                    tipo = 'numero';
                }
                else {
                    tipo = 'texto';
                }
            }
            return {
                cabecalho,
                valores,
                valoresPreenchidos: preenchidos,
                valoresUnicos: unicos.size,
                proporcaoPreenchida: preenchidos.length / total,
                proporcaoUnica: preenchidos.length ? unicos.size / preenchidos.length : 0,
                tipo,
                proporcaoNumerica,
                proporcaoData,
                proporcaoMonetaria,
            };
        });
    }
    static criarPares(colunasA, colunasB) {
        const pares = [];
        for (const colunaA of colunasA) {
            for (const colunaB of colunasB) {
                pares.push({
                    colunaA,
                    colunaB,
                    pontuacao: this.pontuarPar(colunaA, colunaB),
                });
            }
        }
        return pares.sort((a, b) => b.pontuacao - a.pontuacao);
    }
    static pontuarPar(colunaA, colunaB) {
        if (colunaA.tipo === 'vazio' || colunaB.tipo === 'vazio')
            return 0;
        const valoresA = new Set(colunaA.valoresPreenchidos);
        const valoresB = new Set(colunaB.valoresPreenchidos);
        let intersecao = 0;
        for (const valor of valoresA) {
            if (valoresB.has(valor))
                intersecao++;
        }
        const denominador = Math.max(1, Math.min(valoresA.size, valoresB.size));
        const sobreposicao = intersecao / denominador;
        const tiposCompativeis = colunaA.tipo === colunaB.tipo ? 1 : 0;
        const semelhancaPreenchimento = 1 - Math.abs(colunaA.proporcaoPreenchida - colunaB.proporcaoPreenchida);
        const semelhancaUnicidade = 1 - Math.abs(colunaA.proporcaoUnica - colunaB.proporcaoUnica);
        const semelhancaNumerica = 1 - Math.abs(colunaA.proporcaoNumerica - colunaB.proporcaoNumerica);
        const semelhancaData = 1 - Math.abs(colunaA.proporcaoData - colunaB.proporcaoData);
        const semelhancaMonetaria = 1 - Math.abs(colunaA.proporcaoMonetaria - colunaB.proporcaoMonetaria);
        let pontuacao = sobreposicao * 0.50 +
            tiposCompativeis * 0.20 +
            semelhancaPreenchimento * 0.10 +
            semelhancaUnicidade * 0.08 +
            semelhancaNumerica * 0.04 +
            semelhancaData * 0.04 +
            semelhancaMonetaria * 0.04;
        // Colunas de datas não devem ser preferidas como identificadores
        // quando há outras candidatas com correspondência equivalente.
        if (colunaA.tipo === 'data' && colunaB.tipo === 'data') {
            pontuacao *= 0.85;
        }
        return Math.min(1, pontuacao);
    }
    static selecionarParDocumento(pares) {
        const candidatos = pares.filter(({ colunaA, colunaB }) => {
            if (colunaA.tipo === 'vazio' || colunaB.tipo === 'vazio')
                return false;
            if (colunaA.tipo === 'numero' && colunaB.tipo === 'numero')
                return false;
            if (colunaA.tipo === 'data' || colunaB.tipo === 'data')
                return false;
            return colunaA.proporcaoUnica >= 0.5 && colunaB.proporcaoUnica >= 0.5;
        });
        return candidatos
            .map((par) => ({
            ...par,
            pontuacao: par.pontuacao * 0.65 +
                ((par.colunaA.proporcaoUnica + par.colunaB.proporcaoUnica) / 2) * 0.35,
        }))
            .sort((a, b) => b.pontuacao - a.pontuacao)[0];
    }
    static selecionarParPorTipo(pares, tipo, excluidos) {
        return pares
            .filter(({ colunaA, colunaB }) => colunaA.tipo === tipo &&
            colunaB.tipo === tipo &&
            !excluidos.has(colunaA.cabecalho) &&
            !excluidos.has(colunaB.cabecalho))
            .map((par) => ({
            ...par,
            pontuacao: this.pontuacaoPapel(par, tipo),
        }))
            .sort((a, b) => b.pontuacao - a.pontuacao)[0];
    }
    static pontuacaoPapel(par, tipo) {
        let pontuacao = par.pontuacao;
        if (tipo === 'numero') {
            const proporcaoMonetaria = (par.colunaA.proporcaoMonetaria + par.colunaB.proporcaoMonetaria) / 2;
            pontuacao += proporcaoMonetaria * 0.15;
        }
        return pontuacao;
    }
    static selecionarParDescricao(pares, excluidos) {
        return pares
            .filter(({ colunaA, colunaB }) => colunaA.tipo === 'texto' &&
            colunaB.tipo === 'texto' &&
            !excluidos.has(colunaA.cabecalho) &&
            !excluidos.has(colunaB.cabecalho))
            .sort((a, b) => b.pontuacao - a.pontuacao)[0];
    }
    static ehData(valor) {
        if (valor instanceof Date && !Number.isNaN(valor.getTime()))
            return true;
        if (typeof valor !== 'string' && typeof valor !== 'number')
            return false;
        const texto = String(valor).trim();
        if (!texto)
            return false;
        if (/^\d{4}-\d{1,2}-\d{1,2}(?:[T\s].*)?$/.test(texto))
            return true;
        if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(texto))
            return true;
        if (/^\d{1,2}[.-]\d{1,2}[.-]\d{2,4}$/.test(texto))
            return true;
        return false;
    }
    static ehNumero(valor) {
        if (typeof valor === 'number')
            return Number.isFinite(valor);
        if (typeof valor !== 'string')
            return false;
        const texto = valor.trim();
        if (!texto || this.ehData(texto))
            return false;
        const limpo = texto
            .replace(/[R$€£¥\s]/g, '')
            .replace(/[()]/g, '')
            .replace(/%$/, '');
        if (!limpo)
            return false;
        return /^-?\d+(?:[.,]\d+)?$/.test(limpo) ||
            /^-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?$/.test(limpo);
    }
    static ehMonetario(valor) {
        if (typeof valor === 'number')
            return false;
        if (typeof valor !== 'string')
            return false;
        const texto = valor.trim();
        return /R\$|[$€£¥]/.test(texto) ||
            /^\(?-?\d+[.,]\d{2}\)?$/.test(texto);
    }
    static normalizarValor(valor) {
        if (valor === null || valor === undefined)
            return '';
        if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
            return valor.toISOString().slice(0, 10);
        }
        let texto = String(valor).trim();
        if (!texto)
            return '';
        texto = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        texto = texto.replace(/\s+/g, ' ').toLowerCase();
        if (this.ehData(texto)) {
            const dataISO = this.converterDataISO(texto);
            if (dataISO)
                return dataISO;
        }
        return texto;
    }
    static converterDataISO(valor) {
        const iso = valor.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (iso) {
            return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
        }
        const local = valor.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
        if (local) {
            const dia = local[1].padStart(2, '0');
            const mes = local[2].padStart(2, '0');
            let ano = local[3];
            if (ano.length === 2)
                ano = Number(ano) >= 50 ? `19${ano}` : `20${ano}`;
            return `${ano}-${mes}-${dia}`;
        }
        return undefined;
    }
}
exports.ServicoSugestaoMapeamento = ServicoSugestaoMapeamento;
exports.servicoSugestaoMapeamento = ServicoSugestaoMapeamento;
exports.MappingSuggestionService = ServicoSugestaoMapeamento;
