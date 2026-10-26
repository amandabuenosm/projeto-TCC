"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsearArquivos = exports.ParserArquivos = void 0;
const sync_1 = require("csv-parse/sync");
const xlsx = __importStar(require("xlsx"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
class ParserArquivos {
    // Converte o buffer de um arquivo em uma lista de registros brutos
    static async parsear(buffer, nomeArquivo) {
        const extensao = nomeArquivo.split('.').pop()?.toLowerCase();
        let resultado;
        switch (extensao) {
            case 'csv':
            case 'txt':
                resultado = this.parseCsv(buffer);
                break;
            case 'xlsx':
            case 'xls':
                resultado = this.parseExcel(buffer);
                break;
            case 'pdf':
                resultado = await this.parsePdf(buffer);
                break;
            case 'docx':
                resultado = await this.parseDocx(buffer);
                break;
            default:
                throw new Error(`Formato não suportado: .${extensao}. Use .csv, .xlsx, .xls, .txt, .pdf ou .docx.`);
        }
        return {
            registros: resultado.registros,
            cabecalhos: resultado.cabecalhos,
            records: resultado.registros,
            headers: resultado.cabecalhos,
        };
    }
    // Parse de arquivos CSV com detecção de cabeçalho flexível
    static parseCsv(buffer) {
        const conteudo = buffer.toString('utf-8');
        const linhasBrutas = conteudo.split(/\r?\n/);
        const primeiraLinha = linhasBrutas[0] || '';
        const virgulas = primeiraLinha.match(/,/g)?.length || 0;
        const pontoEVirgula = primeiraLinha.match(/;/g)?.length || 0;
        const delimitador = pontoEVirgula > virgulas ? ';' : ',';
        // Descobre a linha do cabeçalho (procura nas primeiras 5 linhas a que tiver mais colunas válidas)
        let linhaCabecalhoIndex = 0;
        let maxColunas = 0;
        const linhasAnalise = linhasBrutas.slice(0, Math.min(5, linhasBrutas.length));
        linhasAnalise.forEach((linha, index) => {
            const colunasTemp = (0, sync_1.parse)(linha, { delimiter: delimitador, relax_column_count: true })[0] || [];
            const colunasValidas = colunasTemp.filter((c) => c && c.trim() !== '').length;
            if (colunasValidas > maxColunas) {
                maxColunas = colunasValidas;
                linhaCabecalhoIndex = index;
            }
        });
        const registros = (0, sync_1.parse)(conteudo, {
            columns: (header) => header.map((h) => h ? h.trim() : ''),
            from_line: linhaCabecalhoIndex + 1, // Pula as linhas vazias/títulos acima do cabeçalho
            skip_empty_lines: true,
            trim: true,
            delimiter: delimitador,
            relax_column_count: true,
        });
        const cabecalhosReais = registros.length ? Object.keys(registros[0]).filter(Boolean) : [];
        return {
            registros,
            cabecalhos: cabecalhosReais,
        };
    }
    // Parse de arquivos Excel (XLSX / XLS) com detecção de cabeçalho flexível
    static parseExcel(buffer) {
        const pastaTrabalho = xlsx.read(buffer, { type: 'buffer', cellDates: true });
        const nomePlanilha = pastaTrabalho.SheetNames[0];
        if (!nomePlanilha) {
            throw new Error('O arquivo Excel está vazio ou não possui planilhas válidas.');
        }
        const planilha = pastaTrabalho.Sheets[nomePlanilha];
        // Converte a planilha em matriz de linhas (array de arrays) para analisar onde está o cabeçalho
        const linhasMatriz = xlsx.utils.sheet_to_json(planilha, { header: 1, defval: '' });
        if (!linhasMatriz.length) {
            throw new Error('A planilha Excel está vazia.');
        }
        // Procura nas primeiras 5 linhas aquela que possui mais células preenchidas (provável cabeçalho)
        let linhaCabecalhoIndex = 0;
        let maxPreenchidas = 0;
        const limiteBusca = Math.min(5, linhasMatriz.length);
        for (let i = 0; i < limiteBusca; i++) {
            const celulasPreenchidas = linhasMatriz[i].filter(cell => cell !== null && String(cell).trim() !== '').length;
            if (celulasPreenchidas > maxPreenchidas) {
                maxPreenchidas = celulasPreenchidas;
                linhaCabecalhoIndex = i;
            }
        }
        // Realiza o parse oficial do SheetJS utilizando a linha correta como cabeçalho
        const registros = xlsx.utils.sheet_to_json(planilha, {
            range: linhaCabecalhoIndex, // Define dinamicamente onde o cabeçalho começa
            defval: '',
        });
        // Limpa chaves vazias ou __EMPTY caso existam colunas sobrando
        const cabecalhosReais = registros.length
            ? Object.keys(registros[0]).filter(k => k && !k.startsWith('__EMPTY'))
            : [];
        return {
            registros,
            cabecalhos: cabecalhosReais,
        };
    }
    // Parse de arquivos PDF: extrai dados tabulares do texto
    static async parsePdf(buffer) {
        const dados = await (0, pdf_parse_1.default)(buffer);
        const linhas = dados.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (linhas.length < 2) {
            throw new Error('Não foi possível identificar uma tabela neste PDF. Utilize um PDF com colunas bem definidas, ou prefira CSV/XLSX.');
        }
        const dividirLinha = (linha) => linha.split(/\t|\s{2,}/).map((c) => c.trim()).filter(Boolean);
        const cabecalhos = dividirLinha(linhas[0]);
        if (cabecalhos.length < 2) {
            throw new Error('Não foi possível identificar colunas separadas neste PDF. Utilize um PDF com colunas bem definidas, ou prefira CSV/XLSX.');
        }
        const registros = linhas.slice(1).map((linha) => {
            const colunas = dividirLinha(linha);
            return Object.fromEntries(cabecalhos.map((cabecalho, indice) => [cabecalho, colunas[indice] || '']));
        });
        if (!registros.length) {
            throw new Error('Nenhuma linha de dados foi reconhecida neste PDF. Utilize um PDF com colunas bem definidas, ou prefira CSV/XLSX.');
        }
        return { registros, cabecalhos };
    }
    // Parse de arquivos DOCX: extrai tabela do documento Word
    static async parseDocx(buffer) {
        const { value: html } = await mammoth_1.default.convertToHtml({ buffer });
        const tabela = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
        if (!tabela) {
            throw new Error('Nenhuma tabela foi encontrada neste documento Word. Insira os dados em uma tabela no documento, ou prefira CSV/XLSX.');
        }
        const linhas = [...tabela.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
        if (linhas.length < 2) {
            throw new Error('A tabela encontrada no documento Word não possui linhas de dados suficientes.');
        }
        const limparHtml = (textoHtml) => textoHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
        const obterCelulas = (linhaHtml) => [...linhaHtml.matchAll(/<t[dh][\s\S]*?<\/t[dh]>/gi)].map((m) => limparHtml(m[0]));
        const cabecalhos = obterCelulas(linhas[0][0]);
        if (cabecalhos.length < 2) {
            throw new Error('Não foi possível identificar colunas na tabela do documento Word.');
        }
        const registros = linhas.slice(1).map((linhaMatch) => Object.fromEntries(cabecalhos.map((cabecalho, indice) => [cabecalho, obterCelulas(linhaMatch[0])[indice] || ''])));
        if (!registros.length) {
            throw new Error('Nenhuma linha de dados foi reconhecida na tabela do documento Word.');
        }
        return { registros, cabecalhos };
    }
    // Compatibilidade com chamadas anteriores
    static async parsearArquivos(buffer, nomeArquivo) {
        return this.parsear(buffer, nomeArquivo);
    }
}
exports.ParserArquivos = ParserArquivos;
// Aliases para compatibilidade
exports.parsearArquivos = ParserArquivos;
