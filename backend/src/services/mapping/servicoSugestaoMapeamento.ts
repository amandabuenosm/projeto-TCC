import { MapeamentoCampos } from '../../models/tipos.js';

export class ServicoSugestaoMapeamento {
  public static selecionarColunaDocumento(cabecalhos: string[]): string {
    const candidatos = cabecalhos
      .map((cabecalho) => ({
        cabecalho,
        pontuacao: this.pontuarColunaDocumento(cabecalho),
      }))
      .filter((candidato) => candidato.pontuacao > 0)
      .sort((a, b) => b.pontuacao - a.pontuacao);

    return candidatos[0]?.cabecalho || '';
  }

  public static ehColunaMonetaria(cabecalho: string): boolean {
    const normalizado = this.normalizar(cabecalho);
    return /\b(valor|amount|preco|price|total|saldo|liquido|bruto|credito|debito)\b/.test(
      normalizado
    );
  }

  // Sugere o mapeamento de todas as colunas por similaridade de nomes, permitindo ajustes pelo usuário
  public static sugerir(cabecalhosA: string[], cabecalhosB: string[]): MapeamentoCampos {
    const usadosA = new Set<string>();
    const usadosB = new Set<string>();

    const docA = this.selecionarColunaDocumento(cabecalhosA);
    const docB = this.selecionarColunaDocumento(cabecalhosB);
    if (docA) usadosA.add(docA);
    if (docB) usadosB.add(docB);

    const valorA = this.selecionarColuna(cabecalhosA, usadosA, ['valor', 'total', 'amount', 'liquido', 'bruto']);
    const valorB = this.selecionarColuna(cabecalhosB, usadosB, ['valor', 'total', 'amount', 'liquido', 'operacao']);
    if (valorA) usadosA.add(valorA);
    if (valorB) usadosB.add(valorB);

    const dataA = this.selecionarColuna(cabecalhosA, usadosA, ['data', 'emissao', 'date', 'dt']);
    const dataB = this.selecionarColuna(cabecalhosB, usadosB, ['data', 'movimento', 'date', 'dt', 'lancto']);
    if (dataA) usadosA.add(dataA);
    if (dataB) usadosB.add(dataB);

    const descA = this.selecionarColuna(cabecalhosA, usadosA, ['descricao', 'desc', 'historico', 'cliente', 'observacao']);
    const descB = this.selecionarColuna(cabecalhosB, usadosB, ['historico', 'desc', 'descricao', 'canal', 'observacao']);

    if (descA) usadosA.add(descA);
    if (descB) usadosB.add(descB);

    const restantesA = cabecalhosA.filter((h) => !usadosA.has(h));
    const restantesB = cabecalhosB.filter((h) => !usadosB.has(h));
    const chavesAdicionais: Array<{ fieldA: string; fieldB: string }> = [];

    const listaCandidatosB = [...restantesB];

    for (const campoA of restantesA) {
      if (!listaCandidatosB.length) break;

      const indice = this.encontrarIndiceSimilar(campoA, listaCandidatosB);

      if (indice !== -1) {
        chavesAdicionais.push({ fieldA: campoA, fieldB: listaCandidatosB.splice(indice, 1)[0] });
      }
    }

    return {
      documentA: docA,
      documentB: docB,
      amountA: valorA || '',
      amountB: valorB || '',
      dateA: dataA || '',
      dateB: dataB || '',
      descriptionA: descA,
      descriptionB: descB,
      additionalKeys: chavesAdicionais,
    };
  }

  private static pontuarColunaDocumento(cabecalho: string): number {
    if (this.ehColunaMonetaria(cabecalho)) return 0;

    const normalizado = this.normalizar(cabecalho);
    let pontuacao = 0;

    if (/\b(numero|nro|nr|num|n)\b.*\b(documento|doc|nota|nf|fiscal|invoice|fatura)\b/.test(normalizado)) {
      pontuacao = 120;
    } else if (/\b(documento|document|invoice|fatura)\b/.test(normalizado)) {
      pontuacao = 110;
    } else if (/\b(nfe|nfce|nf)\b|\bnota\s*fiscal\b/.test(normalizado)) {
      pontuacao = 100;
    } else if (/\b(chave\s*(de\s*)?acesso|chave\s*(nfe|nf))\b/.test(normalizado)) {
      pontuacao = 95;
    } else if (/\b(nota|doc)\b/.test(normalizado)) {
      pontuacao = 80;
    } else if (/^(id|identificador|referencia|ref)$/.test(normalizado)) {
      pontuacao = 30;
    }

    return pontuacao;
  }

  // Procura nos cabeçalhos uma coluna que corresponda às palavras-chave informadas
  private static selecionarColuna(
    cabecalhos: string[],
    usados: Set<string>,
    palavrasChave: string[]
  ): string | undefined {
    for (const palavraChave of palavrasChave) {
      const correspondencia = cabecalhos.find(
        (h) => !usados.has(h) && this.normalizar(h).includes(palavraChave)
      );
      if (correspondencia) return correspondencia;
    }
  }

  // Encontra, entre os campos disponíveis, o nome mais parecido com um campo de referência
  private static encontrarIndiceSimilar(campoA: string, candidatosB: string[]): number {
    const normA = this.normalizar(campoA);
    let melhorIndice = -1;
    let melhorPontuacao = 0;

    candidatosB.forEach((campoB, idx) => {
      const normB = this.normalizar(campoB);
      const pontuacao =
        normA === normB
          ? 100
          : normA.includes(normB) || normB.includes(normA)
          ? 60
          : this.comprimentoPrefixoComum(normA, normB);

      if (pontuacao > melhorPontuacao) {
        melhorPontuacao = pontuacao;
        melhorIndice = idx;
      }
    });

    return melhorPontuacao > 0 ? melhorIndice : -1;
  }

  // Calcula quantos caracteres iniciais são iguais entre duas strings
  private static comprimentoPrefixoComum(a: string, b: string): number {
    let comprimento = 0;
    while (comprimento < a.length && comprimento < b.length && a[comprimento] === b[comprimento]) {
      comprimento++;
    }
    return comprimento;
  }

  // Normaliza o texto removendo acentos, espaços, símbolos e convertendo para minúsculas
  private static normalizar(val: string): string {
    return val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  // Alias para compatibilidade
  public static sugestao = ServicoSugestaoMapeamento.sugerir;
}

// Aliases para compatibilidade
export const servicoSugestaoMapeamento = ServicoSugestaoMapeamento;
export const MappingSuggestionService = ServicoSugestaoMapeamento;