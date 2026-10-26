import React, { useEffect, useState } from 'react';
import { MapeamentoCampos, DadosFonteProcessada } from '../../types/index.js';
import { api } from '../../services/api.js';
import {
  GitMerge,
  ArrowRight,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  Wand2,
} from 'lucide-react';

export interface PropsMapeamentoColunas {
  sourceA?: DadosFonteProcessada;
  dadosFonteA?: DadosFonteProcessada;
  sourceB?: DadosFonteProcessada;
  dadosFonteB?: DadosFonteProcessada;
  initialMapping?: MapeamentoCampos;
  mapeamentoInicial?: MapeamentoCampos;
  onConfirmMapping?: (mapeamento: MapeamentoCampos) => void;
  aoConfirmarMapeamento?: (mapeamento: MapeamentoCampos) => void;
  onBack?: () => void;
  aoVoltar?: () => void;
}

type ParAdicional = {
  fieldA: string;
  fieldB: string;
};

type PropsSeletorCampo = {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  cabecalhos: string[];
  opcional?: boolean;
};

const SeletorCampo: React.FC<PropsSeletorCampo> = ({
  rotulo,
  valor,
  aoMudar,
  cabecalhos,
  opcional = false,
}) => (
  <div>
    {rotulo && (
      <span className="text-[11px] text-slate-400 block mb-1">
        {rotulo}
      </span>
    )}

    <select
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-cyan-500"
    >
      <option value="">
        {opcional ? 'Nenhum (Opcional)' : 'Selecione...'}
      </option>

      {cabecalhos.map((cabecalho) => (
        <option key={cabecalho} value={cabecalho}>
          {cabecalho}
        </option>
      ))}
    </select>
  </div>
);

type PropsCampoMapeamento = {
  titulo: string;
  cor: string;
  campoA: string;
  campoB: string;
  aoMudarA: (valor: string) => void;
  aoMudarB: (valor: string) => void;
  fonteA: DadosFonteProcessada;
  fonteB: DadosFonteProcessada;
  opcional?: boolean;
};

const CampoMapeamento: React.FC<PropsCampoMapeamento> = ({
  titulo,
  cor,
  campoA,
  campoB,
  aoMudarA,
  aoMudarB,
  fonteA,
  fonteB,
  opcional = false,
}) => (
  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
    <label className={`text-xs font-bold ${cor} uppercase tracking-wider`}>
      {titulo}
    </label>

    <div className="grid grid-cols-2 gap-3">
      <SeletorCampo
        rotulo="Fonte de Dados 1"
        valor={campoA}
        aoMudar={aoMudarA}
        cabecalhos={fonteA.headers}
        opcional={opcional}
      />

      <SeletorCampo
        rotulo="Fonte de Dados 2"
        valor={campoB}
        aoMudar={aoMudarB}
        cabecalhos={fonteB.headers}
        opcional={opcional}
      />
    </div>
  </div>
);

export const ColumnMapper: React.FC<PropsMapeamentoColunas> = ({
  sourceA,
  dadosFonteA,
  sourceB,
  dadosFonteB,
  initialMapping,
  mapeamentoInicial,
  onConfirmMapping,
  aoConfirmarMapeamento,
  onBack,
  aoVoltar,
}) => {
  const fA = dadosFonteA || sourceA!;
  const fB = dadosFonteB || sourceB!;
  const mapInicial = mapeamentoInicial || initialMapping;
  const confirmar = aoConfirmarMapeamento || onConfirmMapping || (() => {});
  const voltar = aoVoltar || onBack || (() => {});

  const [mapeamento, setMapeamento] = useState({
    documentA: '',
    documentB: '',
    amountA: '',
    amountB: '',
    dateA: '',
    dateB: '',
    descriptionA: '',
    descriptionB: '',
  });

  const normalizarCabecalho = (valor: string) =>
    valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const ehCampoMonetario = (cabecalho: string) =>
    /\b(valor|amount|preco|price|total|saldo|liquido|bruto|credito|debito)\b/.test(
      normalizarCabecalho(cabecalho)
    );

  const encontrarCampoDocumento = (cabecalhos: string[]) => {
    const pontuar = (cabecalho: string) => {
      if (ehCampoMonetario(cabecalho)) return 0;

      const normalizado = normalizarCabecalho(cabecalho);
      if (/\b(numero|nro|nr|num|n)\b.*\b(documento|doc|nota|nf|fiscal|invoice|fatura)\b/.test(normalizado)) {
        return 120;
      }
      if (/\b(documento|document|invoice|fatura)\b/.test(normalizado)) return 110;
      if (/\b(nfe|nfce|nf)\b|\bnota\s*fiscal\b/.test(normalizado)) return 100;
      if (/\b(chave\s*(de\s*)?acesso|chave\s*(nfe|nf))\b/.test(normalizado)) return 95;
      if (/\b(nota|doc)\b/.test(normalizado)) return 80;
      if (/^(id|identificador|referencia|ref)$/.test(normalizado)) return 30;
      return 0;
    };

    return cabecalhos.reduce(
      (melhor, cabecalho) =>
        pontuar(cabecalho) > pontuar(melhor) ? cabecalho : melhor,
      ''
    );
  };

  const encontrarCabecalhoMaisProvavel = (
    cabecalhos: string[],
    palavrasChave: string[],
    ignorar = new Set<string>()
  ) => {
    if (!cabecalhos.length) return '';

    for (const palavraChave of palavrasChave) {
      const palavraNormalizada = normalizarCabecalho(palavraChave);
      const cabecalho = cabecalhos.find(
        (header) =>
          !ignorar.has(header) &&
          normalizarCabecalho(header).includes(palavraNormalizada)
      );

      if (cabecalho) return cabecalho;
    }

    return '';
  };

  const inferirCamposAutomaticos = (base: Partial<typeof mapeamento>) => {
    const preenchido = {
      documentA: base.documentA || '',
      documentB: base.documentB || '',
      amountA: base.amountA || '',
      amountB: base.amountB || '',
      dateA: base.dateA || '',
      dateB: base.dateB || '',
      descriptionA: base.descriptionA || '',
      descriptionB: base.descriptionB || '',
    };

    const ignorarA = new Set<string>();
    const ignorarB = new Set<string>();

    const documentoA = encontrarCampoDocumento(fA.headers);
    const documentoB = encontrarCampoDocumento(fB.headers);
    preenchido.documentA = documentoA;
    preenchido.documentB = documentoB;

    ignorarA.add(preenchido.documentA);
    ignorarB.add(preenchido.documentB);
    preenchido.amountA = encontrarCabecalhoMaisProvavel(
      fA.headers,
      ['valor', 'total', 'amount', 'liquido', 'bruto', 'operacao'],
      ignorarA
    );
    preenchido.amountB = encontrarCabecalhoMaisProvavel(
      fB.headers,
      ['valor', 'total', 'amount', 'liquido', 'bruto', 'operacao'],
      ignorarB
    );
    if (preenchido.amountA) ignorarA.add(preenchido.amountA);
    if (preenchido.amountB) ignorarB.add(preenchido.amountB);

    preenchido.dateA = encontrarCabecalhoMaisProvavel(
      fA.headers,
      ['data', 'emissao', 'movimento', 'date', 'dt'],
      ignorarA
    );
    preenchido.dateB = encontrarCabecalhoMaisProvavel(
      fB.headers,
      ['data', 'emissao', 'movimento', 'date', 'dt'],
      ignorarB
    );
    if (preenchido.dateA) ignorarA.add(preenchido.dateA);
    if (preenchido.dateB) ignorarB.add(preenchido.dateB);

    preenchido.descriptionA = encontrarCabecalhoMaisProvavel(
      fA.headers,
      ['descricao', 'historico', 'observacao', 'cliente'],
      ignorarA
    );
    preenchido.descriptionB = encontrarCabecalhoMaisProvavel(
      fB.headers,
      ['descricao', 'historico', 'observacao', 'cliente'],
      ignorarB
    );

    return preenchido;
  };

  const [paresAdicionais, setParesAdicionais] = useState<ParAdicional[]>([]);
  const [sugerindo, setSugerindo] = useState(false);
  const [origemSugestao, setOrigemSugestao] = useState<'ia' | 'heuristica' | null>(null);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);

  const atualizarMapeamento = (campo: keyof typeof mapeamento, valor: string) => {
    setMapeamento((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const aplicarMapeamento = (m: MapeamentoCampos) => {
    const preenchido = inferirCamposAutomaticos({
      documentA: m.documentA || '',
      documentB: m.documentB || '',
      amountA: m.amountA || '',
      amountB: m.amountB || '',
      dateA: m.dateA || '',
      dateB: m.dateB || '',
      descriptionA: m.descriptionA || '',
      descriptionB: m.descriptionB || '',
    });

    setMapeamento(preenchido);
    const paresSugeridos = [
      { fieldA: preenchido.amountA, fieldB: preenchido.amountB },
      { fieldA: preenchido.dateA, fieldB: preenchido.dateB },
      { fieldA: preenchido.descriptionA, fieldB: preenchido.descriptionB },
    ].filter((par) => par.fieldA && par.fieldB);
    const paresExistentes = (m.additionalKeys || []).filter(
      (par) => par.fieldA !== preenchido.documentA && par.fieldB !== preenchido.documentB
    );
    const paresUnicos = [...paresSugeridos, ...paresExistentes].filter(
      (par, indice, pares) =>
        pares.findIndex(
          (outro) => outro.fieldA === par.fieldA && outro.fieldB === par.fieldB
        ) === indice
    );
    setParesAdicionais(paresUnicos);
  };

  useEffect(() => {
    if (mapInicial) {
      aplicarMapeamento(mapInicial);
      return;
    }

    let cancelado = false;

    setSugerindo(true);
    setErroSugestao(null);

    api
      .sugerirMapeamento(
        fA.headers,
        fB.headers,
        fA.rawRecords?.[0],
        fB.rawRecords?.[0]
      )
      .then((res) => {
        if (cancelado) return;

        aplicarMapeamento(res.mapping);
        setOrigemSugestao(res.source);
      })
      .catch((err: any) => {
        if (cancelado) return;

        setErroSugestao(
          err?.response?.data?.error ||
            'Não foi possível gerar uma sugestão automática. Mapeie os campos manualmente abaixo.'
        );
      })
      .finally(() => {
        if (!cancelado) setSugerindo(false);
      });

    return () => {
      cancelado = true;
    };
  }, [fA, fB, mapInicial]);

  const usadosA = new Set(
    [mapeamento.documentA, ...paresAdicionais.map((p) => p.fieldA)].filter(Boolean)
  );

  const usadosB = new Set(
    [mapeamento.documentB, ...paresAdicionais.map((p) => p.fieldB)].filter(Boolean)
  );

  const naoUsadosRestantesA = fA.headers.filter((header) => !usadosA.has(header));
  const naoUsadosRestantesB = fB.headers.filter((header) => !usadosB.has(header));

  const adicionarPar = () => {
    const proximoA = fA.headers.find((header) => !usadosA.has(header)) || '';
    const proximoB = fB.headers.find((header) => !usadosB.has(header)) || '';

    setParesAdicionais((prev) => [
      ...prev,
      {
        fieldA: proximoA,
        fieldB: proximoB,
      },
    ]);
  };

  const removerPar = (indice: number) => {
    setParesAdicionais((prev) => prev.filter((_, i) => i !== indice));
  };

  const atualizarPar = (
    indice: number,
    lado: 'fieldA' | 'fieldB',
    valor: string
  ) => {
    setParesAdicionais((prev) =>
      prev.map((par, i) =>
        i === indice
          ? {
              ...par,
              [lado]: valor,
            }
          : par
      )
    );
  };

  const formularioValido =
    mapeamento.documentA &&
    mapeamento.documentB;

  const classificarCampoOpcional = (campo: string) => {
    const normalizado = normalizarCabecalho(campo);
    if (/\b(valor|amount|preco|price|total|saldo|liquido|bruto|credito|debito)\b/.test(normalizado)) {
      return 'amount';
    }
    if (/\b(data|date|emissao|movimento|lancamento|lancto)\b/.test(normalizado)) {
      return 'date';
    }
    if (/\b(descricao|historico|observacao|cliente|description)\b/.test(normalizado)) {
      return 'description';
    }
    return null;
  };

  const aoSubmeter = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formularioValido) return;

    const mapeamentoFinal = inferirCamposAutomaticos(mapeamento);
    const paresEspeciais = new Set<ParAdicional>();
    const camposEspeciais = {
      amountA: '',
      amountB: '',
      dateA: '',
      dateB: '',
      descriptionA: '',
      descriptionB: '',
    };

    for (const par of paresAdicionais) {
      const tipoA = classificarCampoOpcional(par.fieldA);
      if (!tipoA || tipoA !== classificarCampoOpcional(par.fieldB)) continue;

      if (tipoA === 'amount' && !camposEspeciais.amountA) {
        camposEspeciais.amountA = par.fieldA;
        camposEspeciais.amountB = par.fieldB;
        paresEspeciais.add(par);
      } else if (tipoA === 'date' && !camposEspeciais.dateA) {
        camposEspeciais.dateA = par.fieldA;
        camposEspeciais.dateB = par.fieldB;
        paresEspeciais.add(par);
      } else if (tipoA === 'description' && !camposEspeciais.descriptionA) {
        camposEspeciais.descriptionA = par.fieldA;
        camposEspeciais.descriptionB = par.fieldB;
        paresEspeciais.add(par);
      }
    }

    confirmar({
      documentA: mapeamentoFinal.documentA,
      documentB: mapeamentoFinal.documentB,
      ...camposEspeciais,
      additionalKeys: paresAdicionais.filter(
        (par) => par.fieldA && par.fieldB && !paresEspeciais.has(par)
      ),
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GitMerge className="w-6 h-6 text-cyan-400" />
            Mapeamento de Correspondência de Campos
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Defina a associação entre os campos da Fonte de Dados 1 ({fA.name}) e da Fonte de Dados 2 ({fB.name}) para que o motor determinístico execute a comparação.
          </p>
        </div>
      </div>

      {/* Status da sugestão */}
      {sugerindo && (
        <div className="flex items-center gap-2 p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-xl text-cyan-300 text-xs">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>Gerando sugestão automática de mapeamento para todas as colunas...</span>
        </div>
      )}

      {!sugerindo && origemSugestao && (
        <div className="flex items-center gap-2 p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs">
          {origemSugestao === 'ia' ? (
            <Sparkles className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Wand2 className="w-4 h-4 flex-shrink-0" />
          )}

          <span>
            {origemSugestao === 'ia'
              ? 'Sugestão gerada pela IA configurada. Revise e ajuste os campos abaixo antes de confirmar.'
              : 'Sugestão gerada por heurística automática (nenhuma IA configurada). Revise e ajuste os campos abaixo antes de confirmar.'}
          </span>
        </div>
      )}

      {erroSugestao && (
        <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{erroSugestao}</span>
        </div>
      )}

      <form onSubmit={aoSubmeter} className="space-y-6">
        {/* Campo principal */}
        <div className="grid grid-cols-1 gap-6">
          <CampoMapeamento
            titulo="1. Número do Documento / Nota Fiscal *"
            cor="text-cyan-400"
            campoA={mapeamento.documentA}
            campoB={mapeamento.documentB}
            aoMudarA={(valor) => atualizarMapeamento('documentA', valor)}
            aoMudarB={(valor) => atualizarMapeamento('documentB', valor)}
            fonteA={{
              ...fA,
              headers: fA.headers.filter((cabecalho) => !ehCampoMonetario(cabecalho)),
            }}
            fonteB={{
              ...fB,
              headers: fB.headers.filter((cabecalho) => !ehCampoMonetario(cabecalho)),
            }}
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-slate-300 text-xs">
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>Use o número da nota fiscal ou do documento como identificador. Valor, data e descrição podem ser incluídos ou removidos na seção opcional abaixo.</span>
        </div>

        {/* Campos adicionais */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              2. Demais Campos Comparados (Opcional)
            </label>

            <span className="text-[11px] text-slate-500">
              {naoUsadosRestantesA.length} coluna(s) restante(s) na Fonte 1 ·{' '}
              {naoUsadosRestantesB.length} na Fonte 2
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Selecione aqui pares de colunas adicionais, incluindo valor, data do lançamento e descrição, se desejar compará-los.
          </p>

          <div className="space-y-2">
            {paresAdicionais.map((par, indice) => (
              <div
                key={indice}
                className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center"
              >
                <SeletorCampo
                  rotulo=""
                  valor={par.fieldA}
                  aoMudar={(valor) => atualizarPar(indice, 'fieldA', valor)}
                  cabecalhos={fA.headers}
                />

                <SeletorCampo
                  rotulo=""
                  valor={par.fieldB}
                  aoMudar={(valor) => atualizarPar(indice, 'fieldB', valor)}
                  cabecalhos={fB.headers}
                />

                <button
                  type="button"
                  onClick={() => removerPar(indice)}
                  className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/60 transition-colors"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={adicionarPar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar campo
            </button>
          </div>
        </div>

        {/* Validação */}
        {!formularioValido && (
          <div className="flex items-center gap-2 p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Selecione o número da nota fiscal ou do documento em ambas as fontes para prosseguir.</span>
          </div>
        )}

        {/* Botões */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={voltar}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
          >
            Voltar
          </button>

          <button
            type="submit"
            disabled={!formularioValido}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
          >
            <span>Confirmar Mapeamento & Configurar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};