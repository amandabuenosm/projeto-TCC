import React from 'react';
import { Etapa } from '../../types/index.js';
import { Upload, GitMerge, Sliders, Play, Brain, Download, Check } from 'lucide-react';

export interface PropsProgressoEtapas {
  currentStep?: Etapa;
  etapaAtual?: Etapa;
  onStepClick?: (etapa: Etapa) => void;
  aoClicarEtapa?: (etapa: Etapa) => void;
  canNavigate?: (etapa: Etapa) => boolean;
  podeNavegar?: (etapa: Etapa) => boolean;
}

const listaEtapas: {
  id: Etapa;
  rotulo: string;
  icone: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'import', rotulo: 'Importar', icone: Upload },
  { id: 'mapping', rotulo: 'Mapear', icone: GitMerge },
  { id: 'config', rotulo: 'Configurar', icone: Sliders },
  { id: 'reconciling', rotulo: 'Reconciliar', icone: Play },
  { id: 'results', rotulo: 'Analisar', icone: Brain },
  { id: 'export', rotulo: 'Exportar', icone: Download },
];

export const StepProgress: React.FC<PropsProgressoEtapas> = ({
  currentStep,
  etapaAtual,
  onStepClick,
  aoClicarEtapa,
  canNavigate,
  podeNavegar,
}) => {
  const etapaAtiva = etapaAtual || currentStep || 'import';
  const clicarEtapa = aoClicarEtapa || onStepClick || (() => {});
  const checarPodeNavegar = podeNavegar || canNavigate || (() => true);

  const indiceAtual = listaEtapas.findIndex((etapa) => etapa.id === etapaAtiva);

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-4 mb-6">
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2 sm:gap-4 py-1">
        {listaEtapas.map((etapa, indice) => {
          const Icone = etapa.icone;
          const ativa = etapa.id === etapaAtiva;
          const concluida = indice < indiceAtual;
          const habilitada = checarPodeNavegar(etapa.id);

          return (
            <React.Fragment key={etapa.id}>
              <button
                onClick={() => habilitada && clicarEtapa(etapa.id)}
                disabled={!habilitada}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${
                  ativa
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                    : concluida
                    ? 'bg-slate-800/80 text-cyan-300 border border-slate-700'
                    : habilitada
                    ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-900/40 text-slate-600 opacity-50 cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                    ativa
                      ? 'bg-white/20 text-white'
                      : concluida
                      ? 'bg-cyan-950 text-cyan-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {concluida ? <Check className="w-3.5 h-3.5" /> : indice + 1}
                </span>

                <Icone className="w-3.5 h-3.5 hidden sm:block" />
                <span>{etapa.rotulo}</span>
              </button>

              {indice < listaEtapas.length - 1 && (
                <span className="text-slate-700 flex-shrink-0">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};