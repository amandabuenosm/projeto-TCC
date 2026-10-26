"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = exports.ServicoCorrespondencia = void 0;
class ServicoCorrespondencia {
    // Executa a comparação determinística entre as fontes e classifica os registros
    static executarCorrespondencia(registrosA, registrosB, mapeamento, config) {
        const divergencias = [];
        let contagemConciliadas = 0;
        let contadorItem = 1;
        if (this.deveUsarPareamentoPorIndice(registrosA, registrosB)) {
            const limite = Math.max(registrosA.length, registrosB.length);
            for (let indice = 0; indice < limite; indice++) {
                const regA = registrosA[indice] || null;
                const regB = registrosB[indice] || null;
                if (regA && regB) {
                    const resultado = this.compararRegistros(contadorItem++, regA, regB, mapeamento, config);
                    if (resultado.status === 'CONCILIADA') {
                        contagemConciliadas++;
                    }
                    else {
                        divergencias.push(resultado);
                    }
                    continue;
                }
                if (regA) {
                    divergencias.push(this.criarItemAusente(contadorItem++, regA, null, 'AUSENTE_FONTE_B'));
                    continue;
                }
                if (regB) {
                    divergencias.push(this.criarItemAusente(contadorItem++, null, regB, 'AUSENTE_FONTE_A'));
                }
            }
            return {
                divergencias,
                contagemConciliadas,
                divergences: divergencias,
                matchedCount: contagemConciliadas,
            };
        }
        const mapaA = this.agruparPorDocumento(registrosA);
        const mapaB = this.agruparPorDocumento(registrosB);
        const todasChaves = new Set([...mapaA.keys(), ...mapaB.keys()]);
        for (const chave of todasChaves) {
            const grupoA = mapaA.get(chave) || [];
            const grupoB = mapaB.get(chave) || [];
            if (grupoA.length > 1 || grupoB.length > 1) {
                divergencias.push(this.criarItemDuplicado(contadorItem++, chave, grupoA, grupoB));
                continue;
            }
            if (grupoA.length === 1 && grupoB.length === 1) {
                const resultado = this.compararRegistros(contadorItem++, grupoA[0], grupoB[0], mapeamento, config);
                if (resultado.status === 'CONCILIADA') {
                    contagemConciliadas++;
                }
                else {
                    divergencias.push(resultado);
                }
            }
            else if (grupoA.length === 1) {
                divergencias.push(this.criarItemAusente(contadorItem++, grupoA[0], null, 'AUSENTE_FONTE_B'));
            }
            else if (grupoB.length === 1) {
                divergencias.push(this.criarItemAusente(contadorItem++, null, grupoB[0], 'AUSENTE_FONTE_A'));
            }
        }
        return {
            divergencias,
            contagemConciliadas,
            divergences: divergencias,
            matchedCount: contagemConciliadas,
        };
    }
    static deveUsarPareamentoPorIndice(registrosA, registrosB) {
        const totalA = registrosA.length;
        const totalB = registrosB.length;
        if (totalA === 0 || totalB === 0)
            return false;
        const comDocumentoA = registrosA.filter((registro) => !!registro.normalizedDocument).length;
        const comDocumentoB = registrosB.filter((registro) => !!registro.normalizedDocument).length;
        const proporcaoA = comDocumentoA / totalA;
        const proporcaoB = comDocumentoB / totalB;
        return proporcaoA < 0.2 && proporcaoB < 0.2;
    }
    /**
     * Agrupa os registros normalizados pelo documento/identificador. Registros sem um documento
     * identificável recebem uma chave sintética única, para que cada um seja tratado individualmente.
     */
    static agruparPorDocumento(registros) {
        const mapa = new Map();
        registros.forEach((reg) => {
            const chave = reg.normalizedDocument || `__SEM_DOC__${reg.id}`;
            mapa.set(chave, [...(mapa.get(chave) || []), reg]);
        });
        return mapa;
    }
    /**
     * Compara um registro individual da Fonte A com o registro correspondente da Fonte B
     */
    static compararRegistros(sequencia, regA, regB, mapeamento, config) {
        const camposDivergentes = [];
        const valorEhIgual = this.verificarValoresIguais(regA.normalizedAmount, regB.normalizedAmount, config.amountTolerance);
        if (!valorEhIgual) {
            camposDivergentes.push({
                fieldName: mapeamento.amountA || 'Valor',
                valueA: regA.normalizedAmount,
                valueB: regB.normalizedAmount,
            });
        }
        if (regA.normalizedDate !== regB.normalizedDate) {
            camposDivergentes.push({
                fieldName: mapeamento.dateA || 'Data',
                valueA: regA.normalizedDate,
                valueB: regB.normalizedDate,
            });
        }
        if (mapeamento.descriptionA && mapeamento.descriptionB) {
            const descA = regA.normalizedDescription;
            const descB = regB.normalizedDescription;
            if (descA && descB && descA !== descB) {
                camposDivergentes.push({
                    fieldName: mapeamento.descriptionA,
                    valueA: regA.originalData[mapeamento.descriptionA],
                    valueB: regB.originalData[mapeamento.descriptionB],
                });
            }
        }
        for (const par of mapeamento.additionalKeys || []) {
            const valA = String(regA.originalData[par.fieldA] ?? '').trim();
            const valB = String(regB.originalData[par.fieldB] ?? '').trim();
            if (valA.toUpperCase() !== valB.toUpperCase()) {
                camposDivergentes.push({
                    fieldName: par.fieldA,
                    valueA: regA.originalData[par.fieldA],
                    valueB: regB.originalData[par.fieldB],
                });
            }
        }
        const diferencaValor = regA.normalizedAmount !== null && regB.normalizedAmount !== null
            ? Math.round(Math.abs(regA.normalizedAmount - regB.normalizedAmount) * 100) / 100
            : null;
        return {
            id: `div_${sequencia}_${Math.random().toString(36).substring(2, 7)}`,
            status: camposDivergentes.length ? 'DIVERGENTE' : 'CONCILIADA',
            identifier: regA.normalizedDocument || regB.normalizedDocument || `SEQ-${sequencia}`,
            recordA: regA.originalData,
            recordB: regB.originalData,
            normalizedA: regA,
            normalizedB: regB,
            dateA: regA.normalizedDate,
            dateB: regB.normalizedDate,
            amountA: regA.normalizedAmount,
            amountB: regB.normalizedAmount,
            amountDiff: diferencaValor,
            divergentFields: camposDivergentes,
            aiAnalyzed: false,
        };
    }
    static criarItemAusente(sequencia, regA, regB, status) {
        const reg = regA || regB;
        return {
            id: `div_${sequencia}_${Math.random().toString(36).substring(2, 7)}`,
            status,
            identifier: reg?.normalizedDocument || `SEM-IDENTIFICADOR-${sequencia}`,
            recordA: regA?.originalData || null,
            recordB: regB?.originalData || null,
            normalizedA: regA,
            normalizedB: regB,
            dateA: regA?.normalizedDate || null,
            dateB: regB?.normalizedDate || null,
            amountA: regA?.normalizedAmount || null,
            amountB: regB?.normalizedAmount || null,
            amountDiff: reg?.normalizedAmount || null,
            divergentFields: [
                {
                    fieldName: 'Registro',
                    valueA: regA ? 'Presente na Fonte A' : 'Ausente na Fonte A',
                    valueB: regB ? 'Presente na Fonte B' : 'Ausente na Fonte B',
                },
            ],
            aiAnalyzed: false,
        };
    }
    static criarItemDuplicado(sequencia, chave, grupoA, grupoB) {
        return {
            id: `div_${sequencia}_${Math.random().toString(36).substring(2, 7)}`,
            status: 'DUPLICADA',
            identifier: chave.startsWith('__SEM_DOC__')
                ? `SEM-IDENTIFICADOR-${sequencia}`
                : chave,
            recordA: grupoA[0]?.originalData || null,
            recordB: grupoB[0]?.originalData || null,
            normalizedA: grupoA[0] || null,
            normalizedB: grupoB[0] || null,
            dateA: grupoA[0]?.normalizedDate || null,
            dateB: grupoB[0]?.normalizedDate || null,
            amountA: grupoA[0]?.normalizedAmount ?? null,
            amountB: grupoB[0]?.normalizedAmount ?? null,
            amountDiff: null,
            divergentFields: [
                {
                    fieldName: 'Ocorrências na Fonte A',
                    valueA: grupoA.length,
                    valueB: '-',
                },
                {
                    fieldName: 'Ocorrências na Fonte B',
                    valueA: '-',
                    valueB: grupoB.length,
                },
            ],
            aiAnalyzed: false,
        };
    }
    static verificarValoresIguais(valorA, valorB, tolerancia) {
        if (valorA === null && valorB === null)
            return true;
        if (valorA === null || valorB === null)
            return false;
        return Math.abs(valorA - valorB) <= tolerancia;
    }
    // Alias para compatibilidade
    static executeMatching = ServicoCorrespondencia.executarCorrespondencia;
}
exports.ServicoCorrespondencia = ServicoCorrespondencia;
// Alias para compatibilidade
exports.MatchingService = ServicoCorrespondencia;
