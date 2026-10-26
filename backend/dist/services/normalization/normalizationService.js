"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NormalizationService = exports.ServicoNormalizacao = void 0;
class ServicoNormalizacao {
    /**
     * Normaliza os campos de um registro bruto com base no mapeamento fornecido
     */
    static normalizarRegistro(registro, indice, campoDoc, campoValor, campoData, campoDesc) {
        const docBruto = String(registro[campoDoc] ?? '');
        const valorBruto = registro[campoValor] ?? '';
        const dataBruta = registro[campoData] ?? '';
        const descBruta = String(campoDesc ? registro[campoDesc] ?? '' : '');
        return {
            id: `rec_${indice}_${Math.random().toString(36).substring(2, 7)}`,
            originalData: registro,
            keyFields: {
                docField: campoDoc,
                amountField: campoValor,
                dateField: campoData,
            },
            normalizedDocument: this.normalizarDocumento(docBruto),
            normalizedAmount: this.normalizarValor(valorBruto),
            normalizedDate: this.normalizarData(dataBruta),
            normalizedDescription: this.normalizarTexto(descBruta),
        };
    }
    /**
     * Normaliza o número do documento/identificador (remove prefixos como NF, espaços e zeros à esquerda se for numérico)
     */
    static normalizarDocumento(val) {
        if (val == null)
            return '';
        const texto = String(val).trim().toUpperCase();
        const limpo = texto
            .replace(/^(NF-e|NFE|NF|DOC|REGB|REGA)\s*[-:]?\s*/i, '')
            .replace(/[./-]/g, '')
            .trim();
        if (/^\d+$/.test(limpo)) {
            const resultado = limpo.replace(/^0+/, '');
            return resultado || '0';
        }
        return limpo || texto;
    }
    /**
     * Normaliza valores monetários para um número de ponto flutuante padrão (float/double)
     * Suporta formatos "1.500,00", "R$ 1500,00", "1500.00", "(100.00)" (contábil negativo)
     */
    static normalizarValor(val) {
        if (val == null || val === '')
            return null;
        if (typeof val === 'number') {
            return isNaN(val) ? null : Math.round(val * 100) / 100;
        }
        let texto = String(val).trim();
        if (!texto)
            return null;
        let ehNegativo = false;
        if (texto.startsWith('(') && texto.endsWith(')')) {
            ehNegativo = true;
            texto = texto.slice(1, -1);
        }
        else if (texto.startsWith('-')) {
            ehNegativo = true;
            texto = texto.slice(1);
        }
        texto = texto.replace(/[R$€\s]/g, '');
        if (texto.includes('.') && texto.includes(',')) {
            texto =
                texto.lastIndexOf(',') > texto.lastIndexOf('.')
                    ? texto.replace(/\./g, '').replace(',', '.')
                    : texto.replace(/,/g, '');
        }
        else if (texto.includes(',')) {
            const partes = texto.split(',');
            texto =
                partes.length === 2 && partes[1].length <= 2
                    ? texto.replace(',', '.')
                    : texto.replace(/,/g, '');
        }
        const numero = parseFloat(texto);
        if (isNaN(numero))
            return null;
        const resultado = ehNegativo ? -numero : numero;
        return Math.round(resultado * 100) / 100;
    }
    /**
     * Normaliza datas para a string no padrão ISO YYYY-MM-DD
     */
    static normalizarData(val) {
        if (!val)
            return null;
        if (val instanceof Date) {
            return isNaN(val.getTime()) ? null : val.toISOString().split('T')[0];
        }
        const texto = String(val).trim();
        if (!texto)
            return null;
        const formatoBr = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (formatoBr) {
            return `${formatoBr[3]}-${formatoBr[2].padStart(2, '0')}-${formatoBr[1].padStart(2, '0')}`;
        }
        const formatoIso = texto.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
        if (formatoIso) {
            return `${formatoIso[1]}-${formatoIso[2].padStart(2, '0')}-${formatoIso[3].padStart(2, '0')}`;
        }
        const dataParseada = new Date(texto);
        return isNaN(dataParseada.getTime()) ? null : dataParseada.toISOString().split('T')[0];
    }
    /**
     * Limpeza de strings gerais em maiúsculas
     */
    static normalizarTexto(val) {
        return val ? String(val).trim().replace(/\s+/g, ' ').toUpperCase() : '';
    }
    // Aliases para compatibilidade
    static normalizeRecord = ServicoNormalizacao.normalizarRegistro;
    static normalizeDocument = ServicoNormalizacao.normalizarDocumento;
    static normalizeAmount = ServicoNormalizacao.normalizarValor;
    static normalizeDate = ServicoNormalizacao.normalizarData;
    static normalizeString = ServicoNormalizacao.normalizarTexto;
}
exports.ServicoNormalizacao = ServicoNormalizacao;
// Alias para compatibilidade
exports.NormalizationService = ServicoNormalizacao;
