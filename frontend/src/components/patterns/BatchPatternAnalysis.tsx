import React, { useState } from 'react';
import { ResultadoPadraoLote, ItemAnomalia } from '../../types/index.js';
import {
  BrainCircuit,
  Eye,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';

export interface PropsAnalisePadroesLote {
  batchAnalysis?: ResultadoPadraoLote;
  analiseLote?: ResultadoPadraoLote;
  anomalies?: ItemAnomalia[];
  anomalias?: ItemAnomalia[];
  onTriggerBatchAI?: () => Promise<void>;
  aoAcionarIALote?: () => Promise<void>;
}

export const BatchPatternAnalysis: React.FC<PropsAnalisePadroesLote> = ({
  batchAnalysis,
  analiseLote,
  anomalies,
  anomalias,
  onTriggerBatchAI,
  aoAcionarIALote,
}) => {
  const dadosLote = analiseLote || batchAnalysis;
  const listaAnomalias = anomalias || anomalies || [];
  const executarIALote = aoAcionarIALote || onTriggerBatchAI || (async () => {});

  const [carregando, setCarregando] = useState(false);

  const executar = async () => {
    setCarregando(true);
    try {
      await executarIALote();
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
            Análise Agregada de Padrões e Detecção de Anomalias
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualização da amostra com separação entre constatações estatísticas e hipóteses da IA.
          </p>
        </div>

        <button
          onClick={executar}
          disabled={carregando || !!dadosLote}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
        >
          {carregando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sintetizando Padrões...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {dadosLote ? 'Análise Agregada Concluída' : 'Gerar Análise Agregada por IA'}
            </>
          )}
        </button>
      </div>

      {/* Anomalias */}
      {listaAnomalias.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Anomalias Estatísticas ({listaAnomalias.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listaAnomalias.map((anom) => (
              <div
                key={anom.id}
                className="bg-slate-950/70 border border-amber-900/40 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    {anom.type}
                  </span>
                  <span className="text-[10px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded">
                    {anom.affectedRecordsCount} registro(s)
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {anom.description}
                </p>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  {anom.evidenceDetails.map((evidencia, i) => (
                    <div key={i}>• {evidencia}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fatos e hipóteses */}
      {dadosLote && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-slate-900 border border-cyan-900/40 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase flex items-center gap-2">
              <Eye className="w-5 h-5" />
              FATO OBSERVADO — Motor Determinístico
            </h3>

            {dadosLote.observedFacts.map((fato, i) => (
              <div
                key={i}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 flex gap-2"
              >
                <span className="w-5 h-5 rounded-md bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                {fato}
              </div>
            ))}
          </section>

          <section className="bg-slate-900 border border-purple-900/40 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-purple-400 uppercase flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              HIPÓTESE GERADA PELA IA
            </h3>

            {dadosLote.aiHypotheses.map((hipotese, i) => (
              <div
                key={i}
                className="bg-slate-950/60 border border-purple-900/30 rounded-xl p-3 text-xs text-slate-200 flex gap-2"
              >
                <span className="w-5 h-5 rounded-md bg-purple-950 text-purple-300 flex items-center justify-center font-bold">
                  H{i + 1}
                </span>
                {hipotese}
              </div>
            ))}
          </section>
        </div>
      )}

      {/* Plano de ação */}
      {dadosLote && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-emerald-400 uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Plano Recomendado de Ação Preventiva e Corretiva
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {dadosLote.recommendedActionPlan.map((acao, i) => (
              <div
                key={i}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300"
              >
                {acao}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};