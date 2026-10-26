import React from 'react';
import { ResultadoAnaliseIA } from '../../types/index.js';
import {
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export interface PropsCartaoAnaliseIA {
  analysis?: ResultadoAnaliseIA;
  analise?: ResultadoAnaliseIA;
}

export const AIAnalysisCard: React.FC<PropsCartaoAnaliseIA> = ({ analysis, analise }) => {
  const dadosAnalise = analise || analysis!;

  const estilosConfianca = {
    Alto: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    Médio: 'bg-amber-950 text-amber-400 border-amber-800',
    Baixo: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  };

  const nivel = dadosAnalise.confidenceLevel || 'Médio';

  return (
    <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-800/60 rounded-2xl p-6 shadow-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-purple-800/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-900/80 border border-purple-700 flex items-center justify-center">
            <BrainCircuit className="w-4 h-4 text-purple-300" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">
              Análise por Inteligência Artificial
            </h3>
            <p className="text-[11px] text-purple-300">
              Interpretação analítica e geração de hipóteses plausíveis de causa
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            estilosConfianca[nivel] || estilosConfianca['Médio']
          }`}
        >
          Confiança: {nivel}
        </span>
      </div>

      <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-4">
        <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
          Resumo Analítico
        </span>
        <p className="text-xs text-slate-200 leading-relaxed mt-1">
          {dadosAnalise.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5 mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            Possíveis Causas
          </h4>

          <ul className="space-y-2">
            {dadosAnalise.possibleCauses.map((causa, i) => (
              <li key={i} className="text-xs text-slate-300 flex gap-2">
                <span className="text-amber-500">•</span>
                {causa}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sugestões de Investigação
          </h4>

          <ul className="space-y-2">
            {dadosAnalise.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-slate-300 flex gap-2">
                <span className="text-emerald-400">✓</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {dadosAnalise.identifiedPattern && (
        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-3.5 text-xs text-indigo-200">
          <strong className="text-indigo-400">Padrão Identificado:</strong>{' '}
          {dadosAnalise.identifiedPattern}
        </div>
      )}

      <div className="flex gap-2 p-3 bg-slate-950/90 border border-slate-800 rounded-xl text-[11px] text-slate-400 italic">
        <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
        {dadosAnalise.disclaimer}
      </div>
    </div>
  );
};