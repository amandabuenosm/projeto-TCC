import { parse } from 'csv-parse/sync';
import * as xlsx from 'xlsx';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { isUtf8 } from 'node:buffer';
import { TextDecoder } from 'node:util';
import { RegistroBruto } from '../models/tipos.js';

export interface ResultadoParseArquivo {
  registros: RegistroBruto[];
  cabecalhos: string[];
  // Aliases para compatibilidade
  records?: RegistroBruto[];
  headers?: string[];
}

export class ParserArquivos {
  // Converte o buffer de um arquivo em uma lista de registros brutos
  public static async parsear(buffer: Buffer, nomeArquivo: string): Promise<ResultadoParseArquivo> {
    const extensao = nomeArquivo.split('.').pop()?.toLowerCase();

    let resultado: { registros: RegistroBruto[]; cabecalhos: string[] };

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
  private static parseCsv(buffer: Buffer): { registros: RegistroBruto[]; cabecalhos: string[] } {
    const conteudo = (isUtf8(buffer)
      ? buffer.toString('utf-8')
      : new TextDecoder('windows-1252').decode(buffer)
    ).replace(/^\uFEFF/, '');
    const linhasBrutas = conteudo.split(/\r?\n/);
    const delimitadores = ['|', '\t', ';', ','];
    const linhasAnalise = linhasBrutas.slice(0, Math.min(10, linhasBrutas.length));
    const pontuarDelimitador = (delimitador: string) =>
      Math.max(
        ...linhasAnalise.map((linha) => {
          const colunas = parse(linha, {
            delimiter: delimitador,
            relax_column_count: true,
          })[0] || [];
          return colunas.filter((coluna: string) => coluna && coluna.trim() !== '').length;
        })
      );
    const delimitador = delimitadores.reduce((melhor, atual) =>
      pontuarDelimitador(atual) > pontuarDelimitador(melhor) ? atual : melhor
    );

    // Procura a linha mais estruturada no início, ignorando títulos e separadores.
    let linhaCabecalhoIndex = 0;
    let maxColunas = 0;

    linhasAnalise.forEach((linha, index) => {
      if (/^[\s\-_=+|]+$/.test(linha)) return;

      const colunasTemp = parse(linha, { delimiter: delimitador, relax_column_count: true })[0] || [];
      const colunasValidas = colunasTemp.filter((c: string) => c && c.trim() !== '').length;
      if (colunasValidas > maxColunas) {
        maxColunas = colunasValidas;
        linhaCabecalhoIndex = index;
      }
    });

    const conteudoTabela = linhasBrutas
      .slice(linhaCabecalhoIndex)
      .filter((linha) => !/^[\s\-_=+|]+$/.test(linha))
      .join('\n');

    const registros: RegistroBruto[] = parse(conteudoTabela, {
      columns: (header) => header.map((h: string) => h ? h.trim() : ''),
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
  private static parseExcel(buffer: Buffer): { registros: RegistroBruto[]; cabecalhos: string[] } {
    const pastaTrabalho = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const nomePlanilha = pastaTrabalho.SheetNames[0];

    if (!nomePlanilha) {
      throw new Error('O arquivo Excel está vazio ou não possui planilhas válidas.');
    }

    const planilha = pastaTrabalho.Sheets[nomePlanilha];
    
    // Converte a planilha em matriz de linhas (array de arrays) para analisar onde está o cabeçalho
    const linhasMatriz: any[][] = xlsx.utils.sheet_to_json(planilha, { header: 1, defval: '' });

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
    const registros: RegistroBruto[] = xlsx.utils.sheet_to_json(planilha, {
      range: linhaCabecalhoIndex, // Define dinamicamente onde o cabeçalho começa
      defval: '',
      raw: false,
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
  private static async parsePdf(buffer: Buffer): Promise<{ registros: RegistroBruto[]; cabecalhos: string[] }> {
    const dados = await pdfParse(buffer);
    const linhas = dados.text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);

    if (linhas.length < 2) {
      throw new Error('Não foi possível identificar uma tabela neste PDF. Utilize um PDF com colunas bem definidas, ou prefira CSV/XLSX.');
    }

    const resultadoCte = this.parsePdfRelatorioCte(linhas);
    if (resultadoCte) {
      return resultadoCte;
    }

    const resultadoNfse = this.parsePdfRelatorioNfse(linhas);
    if (resultadoNfse) {
      return resultadoNfse;
    }

    const resultadoFiscal = this.parsePdfRelatorioFiscal(linhas);
    if (resultadoFiscal) {
      return resultadoFiscal;
    }

    const resultadoPerformance = this.parsePdfRelatorioPerformance(linhas);
    if (resultadoPerformance) {
      return resultadoPerformance;
    }

    const dividirLinha = (linha: string) => linha.split(/\t|\s{2,}/).map((c: string) => c.trim()).filter(Boolean);
    const cabecalhos = dividirLinha(linhas[0]);

    if (cabecalhos.length < 2) {
      throw new Error('Não foi possível identificar colunas separadas neste PDF. Utilize um PDF com colunas bem definidas, ou prefira CSV/XLSX.');
    }

    const registros = linhas.slice(1).map((linha: string) => {
      const colunas = dividirLinha(linha);
      return Object.fromEntries(cabecalhos.map((cabecalho: string, indice: number) => [cabecalho, colunas[indice] || '']));
    });

    if (!registros.length) {
      throw new Error('Nenhuma linha de dados foi reconhecida neste PDF. Utilize um PDF com colunas bem definidas, ou prefira CSV/XLSX.');
    }

    return { registros, cabecalhos };
  }

  private static parsePdfRelatorioNfse(
    linhas: string[]
  ): { registros: RegistroBruto[]; cabecalhos: string[] } | null {
    const normalizar = (texto: string) =>
      texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const indiceCabecalho = linhas.findIndex((linha) => {
      const cabecalho = normalizar(linha);
      return cabecalho.includes('numero da nfse') &&
        cabecalho.includes('cnpj do tomador') &&
        cabecalho.includes('razao social do tomador') &&
        cabecalho.includes('total de retencoes');
    });

    if (indiceCabecalho === -1) {
      return null;
    }

    const cabecalhos = [
      'Numero da NFSe',
      'CNPJ do Tomador',
      'Razao Social do Tomador',
      'Data de Emissão',
      'Código do Serviço',
      'Descrição do Serviço',
      'Valor Bruto',
      'Base de Cálculo IRRF',
      'Valor IRRF Retido',
      'Valor CSRF Retido',
      'Base de Cálculo ISS',
      'Valor ISS Retido',
      'Total de Retenções',
    ];
    const padraoRegistro =
      /^(\d+)(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})(.*)$/;
    const padraoData = /^(.+?)(\d{2}\/\d{2}\/\d{4})(.*)$/;
    const padraoMoeda = /(\d[\d.]*,\d{2})\s*R\$/g;
    const registros: RegistroBruto[] = [];

    for (const linha of linhas.slice(indiceCabecalho + 1)) {
      const partesRegistro = linha.match(padraoRegistro);
      if (!partesRegistro) continue;

      const [, numeroNfse, cnpj, restante] = partesRegistro;
      const partesData = restante.match(padraoData);
      if (!partesData) continue;

      const [, razaoSocial, dataEmissao, aposData] = partesData;
      const partesServico = aposData.match(/^(\d{3,4})(.*)$/);
      if (!partesServico) continue;

      const [, codigoServico, descricaoEValores] = partesServico;
      const valoresEncontrados = [...descricaoEValores.matchAll(padraoMoeda)];
      if (valoresEncontrados.length !== 7) continue;

      const descricaoServico = descricaoEValores
        .slice(0, valoresEncontrados[0].index)
        .trim();
      const valores = valoresEncontrados.map((valor) => valor[1]);

      registros.push(Object.fromEntries([
        [cabecalhos[0], numeroNfse],
        [cabecalhos[1], cnpj],
        [cabecalhos[2], razaoSocial],
        [cabecalhos[3], dataEmissao],
        [cabecalhos[4], codigoServico],
        [cabecalhos[5], descricaoServico],
        ...valores.map((valor, indice) => [cabecalhos[indice + 6], valor]),
      ]));
    }

    if (!registros.length) {
      throw new Error('O cabeçalho do relatório de NFS-e foi identificado, mas nenhuma linha de dados pôde ser extraída.');
    }

    return { registros, cabecalhos };
  }

  private static parsePdfRelatorioCte(
    linhas: string[]
  ): { registros: RegistroBruto[]; cabecalhos: string[] } | null {
    const normalizar = (texto: string) =>
      texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const indiceCabecalho = linhas.findIndex((linha) => {
      const cabecalho = normalizar(linha);
      return cabecalho.includes('numero do ct-e') &&
        cabecalho.includes('cpf/cnpj do cliente') &&
        cabecalho.includes('municipio do destinatario');
    });

    if (indiceCabecalho === -1) {
      return null;
    }

    const cabecalhos = linhas[indiceCabecalho].match(
      /Número do CT-e|CPF\/CNPJ do Cliente|Razão Social\/Nome do Cliente|Data de Emissão|Valor da Operação|UF do Remetente|Município do Remetente|UF do Destinatário|Município do Destinatário/gi
    ) || [];

    if (cabecalhos.length !== 9) {
      throw new Error('Não foi possível identificar todas as colunas do relatório de CT-e neste PDF.');
    }

    const ufs = 'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO';
    const padraoRegistro =
      /^(\d{15})(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})(.+)$/;
    const registros: RegistroBruto[] = [];

    for (const linha of linhas.slice(indiceCabecalho + 1)) {
      const partesIdentificacao = linha.match(padraoRegistro);
      if (!partesIdentificacao) continue;

      const [, numeroCte, documento, restante] = partesIdentificacao;
      const partesDataEValor = restante.match(
        /^(.+?)(\d{2}\/\d{2}\/\d{4})([\d.,]+)([A-Z]{2})(.+)$/
      );
      if (!partesDataEValor) continue;

      const [, nomeCliente, dataEmissao, valorOperacao, ufRemetente, municipios] = partesDataEValor;
      const partesMunicipios = municipios.match(
        new RegExp(`^(.+?)(${ufs})(.+)$`)
      );
      if (!partesMunicipios) continue;

      const [, municipioRemetente, ufDestinatario, municipioDestinatario] = partesMunicipios;
      registros.push({
        [cabecalhos[0]]: numeroCte,
        [cabecalhos[1]]: documento,
        [cabecalhos[2]]: nomeCliente,
        [cabecalhos[3]]: dataEmissao,
        [cabecalhos[4]]: valorOperacao,
        [cabecalhos[5]]: ufRemetente,
        [cabecalhos[6]]: municipioRemetente,
        [cabecalhos[7]]: ufDestinatario,
        [cabecalhos[8]]: municipioDestinatario,
      });
    }

    if (!registros.length) {
      throw new Error('O cabeçalho do relatório de CT-e foi identificado, mas nenhuma linha de dados pôde ser extraída.');
    }

    return { registros, cabecalhos };
  }

  private static parsePdfRelatorioFiscal(
    linhas: string[]
  ): { registros: RegistroBruto[]; cabecalhos: string[] } | null {
    const indiceCabecalho = linhas.findIndex((linha) =>
      /^CNPJ(?:\s+do\s+cliente)?/i.test(linha) &&
      /Regime\s+Tributário/i.test(linha)
    );

    if (indiceCabecalho === -1) {
      return null;
    }

    const cabecalhos = linhas[indiceCabecalho].match(
      /CNPJ(?:\s+do\s+cliente)?|Razão\s+Social(?:\s+do\s+cliente)?|Situação\s+Cadastral|CNAE(?:\s+principal)?|Regime\s+Tributário/gi
    ) || [];

    if (cabecalhos.length !== 5) {
      return null;
    }

    const padraoRegistro =
      /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})(.*)$/;
    const padraoDemaisCampos =
      /^(.*?)(Inativa|Ativa|Nula|Suspensa|Baixada)(\d{4}-\d\/\d{2})?$/i;
    const padraoRegime =
      /(Produtor Rural Pessoa Física|Simples Nacional|Lucro Presumido|Lucro Real|MEI)$/i;
    const registros: RegistroBruto[] = [];

    for (const linha of linhas.slice(indiceCabecalho + 1)) {
      const partesRegistro = linha.match(padraoRegistro);
      if (!partesRegistro) continue;

      const [, cnpj, restante] = partesRegistro;
      const partesRegime = restante.match(padraoRegime);
      if (!partesRegime) continue;

      const regime = partesRegime[1];
      const partesDemaisCampos = restante
        .slice(0, -regime.length)
        .match(padraoDemaisCampos);
      if (!partesDemaisCampos) continue;

      const [, razaoSocial, situacaoCadastral, cnae = ''] = partesDemaisCampos;
      registros.push({
        [cabecalhos[0]]: cnpj,
        [cabecalhos[1]]: razaoSocial,
        [cabecalhos[2]]: situacaoCadastral,
        [cabecalhos[3]]: cnae,
        [cabecalhos[4]]: regime,
      });
    }

    return registros.length ? { registros, cabecalhos } : null;
  }

  private static parsePdfRelatorioPerformance(
    linhas: string[]
  ): { registros: RegistroBruto[]; cabecalhos: string[] } | null {
    const normalizar = (texto: string) =>
      texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const indiceCabecalho = linhas.findIndex((linha) => {
      const cabecalho = normalizar(linha);
      return cabecalho.includes('nome do projeto') &&
        cabecalho.includes('data de inicio') &&
        cabecalho.includes('crescimento percentual');
    });

    if (indiceCabecalho === -1) {
      return null;
    }

    const cabecalhos = [
      'Nome do Projeto',
      'Data de Início',
      'Data de Fim',
      'Investimento Total (R$)',
      'Custos Adicionais (R$)',
      'Retorno Financeiro Bruto (R$)',
      'Lucro Líquido Gerado (R$)',
      'ROI (%)',
      'Receita Antes do Investimento (R$)',
      'Receita Após o Investimento (R$)',
      'Crescimento Percentual (%)',
    ];
    const valorMonetario = 'R\\$\\s*([\\d.]+,\\d{2})';
    const percentual = '(-?[\\d.]+,\\d{2}%|N/A)';
    const padraoRegistro = new RegExp(
      `^(.+?)(\\d{2}\\/\\d{2}\\/\\d{4})(\\d{2}\\/\\d{2}\\/\\d{4})` +
        `${valorMonetario}${valorMonetario}${valorMonetario}${valorMonetario}` +
        `${percentual}${valorMonetario}${valorMonetario}${percentual}$`,
      'i'
    );
    const registros: RegistroBruto[] = [];

    for (const linha of linhas.slice(indiceCabecalho + 1)) {
      const partes = linha.match(padraoRegistro);
      if (!partes) continue;

      const valores = partes.slice(1);
      registros.push(Object.fromEntries(
        cabecalhos.map((cabecalho, indice) => [cabecalho, valores[indice]])
      ));
    }

    if (!registros.length) {
      throw new Error('O cabeçalho do relatório de performance foi identificado, mas nenhuma linha de dados pôde ser extraída.');
    }

    return { registros, cabecalhos };
  }

  // Parse de arquivos DOCX: extrai tabela do documento Word
  private static async parseDocx(buffer: Buffer): Promise<{ registros: RegistroBruto[]; cabecalhos: string[] }> {
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const tabela = html.match(/<table[\s\S]*?<\/table>/i)?.[0];

    if (!tabela) {
      throw new Error('Nenhuma tabela foi encontrada neste documento Word. Insira os dados em uma tabela no documento, ou prefira CSV/XLSX.');
    }

    const linhas = [...tabela.matchAll(/<tr[\s\S]*?<\/tr>/gi)];

    if (linhas.length < 2) {
      throw new Error('A tabela encontrada no documento Word não possui linhas de dados suficientes.');
    }

    const limparHtml = (textoHtml: string) =>
      textoHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();

    const obterCelulas = (linhaHtml: string) =>
      [...linhaHtml.matchAll(/<t[dh][\s\S]*?<\/t[dh]>/gi)].map((m) => limparHtml(m[0]));

    const celulasPorLinha = linhas.map((linha) => obterCelulas(linha[0]));
    let indiceCabecalho = 0;
    let maxCelulasPreenchidas = 0;

    celulasPorLinha.forEach((celulas, indice) => {
      const celulasPreenchidas = celulas.filter((celula) => celula.trim() !== '').length;
      if (celulasPreenchidas > maxCelulasPreenchidas) {
        maxCelulasPreenchidas = celulasPreenchidas;
        indiceCabecalho = indice;
      }
    });

    const cabecalhos = celulasPorLinha[indiceCabecalho];

    if (maxCelulasPreenchidas < 2) {
      throw new Error('Não foi possível identificar colunas na tabela do documento Word.');
    }

    const registros = celulasPorLinha.slice(indiceCabecalho + 1).map((celulas) =>
      Object.fromEntries(cabecalhos.map((cabecalho: string, indice: number) => [cabecalho, celulas[indice] || '']))
    );

    if (!registros.length) {
      throw new Error('Nenhuma linha de dados foi reconhecida na tabela do documento Word.');
    }

    return { registros, cabecalhos };
  }

  // Compatibilidade com chamadas anteriores
  public static async parsearArquivos(buffer: Buffer, nomeArquivo: string): Promise<ResultadoParseArquivo> {
    return this.parsear(buffer, nomeArquivo);
  }
}

// Aliases para compatibilidade
export const parsearArquivos = ParserArquivos;
