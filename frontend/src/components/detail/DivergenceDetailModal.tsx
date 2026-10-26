import React, { useState } from 'react';
import { ItemDivergencia } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { AIAnalysisCard } from './AIAnalysisCard.js';
import {
  X,
  Sparkles,
  BrainCircuit,
  ArrowRightLeft,
  FileText,
  Loader2,
} from 'lucide-react';

export interface PropsModalDetalhesDivergencia {
  item: ItemDivergencia;
  identifierLabel?: string;
  rotuloIdentificador?: string;
  onClose?: () => void;
  aoFechar?: () => void;
  onAnalyzeAI?: (id: string) => Promise<void>;
  aoAnalisarIA?: (id: string) => Promise<void>;
}

const formatarValor = (valor: any) => {
  if (valor === null || valor === undefined || valor === '') return '-';

  return typeof valor === 'number'
    ? new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
      maximumFractionDigits: 10,
      }).format(valor)
    : String(valor);
};

const CamposRegistro = ({ registro }: { registro: Record<string, any> }) => {
  const campos = Object.entries(registro).filter(
    ([, valor]) => valor !== null && valor !== undefined && valor !== ''
  );

  if (!campos.length) {
    return <p className="text-xs text-slate-500 italic">Nenhum dado disponível.</p>;
  }

  return (
    <div className="space-y-1.5 text-xs max-h-64 overflow-y-auto">
      {campos.map(([chave, valor]) => (
        <div key={chave} className="flex justify-between gap-3">
          <span className="text-slate-400">{chave}:</span>
          <span className="font-mono text-slate-200 text-right break-all">
            {String(valor)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CartaoFonte = ({
  nome,
  registro,
  cor,
}: {
  nome: string;
  registro: Record<string, any> | null;
  cor: 'cyan' | 'purple';
}) => (
  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
    <div className="flex justify-between border-b border-slate-800 pb-2">
      <span className={`text-xs font-bold text-${cor}-400 uppercase tracking-wider`}>
        {nome}
      </span>
      <span className="text-[10px] text-slate-500">
        {registro ? 'Presente' : 'Ausente'}
      </span>
    </div>

    {registro ? (
      <CamposRegistro registro={registro} />
    ) : (
      <div className="py-6 text-center text-slate-500 text-xs italic">
        Registro ausente nesta fonte.
      </div>
    )}
  </div>
);

export const DivergenceDetailModal: React.FC<PropsModalDetalhesDivergencia> = ({
  item,
  identifierLabel,
  rotuloIdentificador,
  onClose,
  aoFechar,
  onAnalyzeAI,
  aoAnalisarIA,
}) => {
  const rotulo = rotuloIdentificador || identifierLabel || 'Documento';
  const fechar = aoFechar || onClose || (() => {});
  const executarAnaliseIA = aoAnalisarIA || onAnalyzeAI || (async () => {});

  const [analisando, setAnalisando] = useState(false);

  const aoAcionarIA = async () => {
    setAnalisando(true);
    try {
      await executarAnaliseIA(item.id);
    } finally {
      setAnalisando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-mono">
                  {rotulo} {item.identifier}
                </h2>
                <StatusBadge status={item.status} />
              </div>

              <p className="text-xs text-slate-400">
                Comparação entre Fonte 1 e Fonte 2
              </p>
            </div>
          </div>

          <button
            onClick={fechar}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Registros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CartaoFonte
              nome="Fonte de Dados 1"
              registro={item.recordA}
              cor="cyan"
            />

            <CartaoFonte
              nome="Fonte de Dados 2"
              registro={item.recordB}
              cor="purple"
            />
          </div>

          {/* Diferenças */}
          {item.divergentFields.length > 0 && (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4" />
                Diferenças encontradas
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {item.divergentFields.map((campo, i) => (
                  <div
                    key={i}
                    className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between"
                  >
                    <span className="font-semibold text-slate-300 font-mono">
                      {campo.fieldName}:
                    </span>

                    <span className="font-mono text-slate-400">
                      <strong className="text-cyan-400">
                        {formatarValor(campo.valueA)}
                      </strong>{' '}
                      →{' '}
                      <strong className="text-purple-400">
                        {formatarValor(campo.valueB)}
                      </strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IA */}
          {item.aiAnalysis ? (
            <AIAnalysisCard analysis={item.aiAnalysis} />
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
              <BrainCircuit className="w-10 h-10 text-purple-400 mx-auto" />

              <h3 className="text-sm font-bold text-white">
                Análise por Inteligência Artificial
              </h3>

              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Analise a divergência para identificar possíveis causas e
                sugestões de investigação.
              </p>

              <button
                onClick={aoAcionarIA}
                disabled={analisando}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs disabled:opacity-50"
              >
                {analisando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analisar divergência com IA
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};