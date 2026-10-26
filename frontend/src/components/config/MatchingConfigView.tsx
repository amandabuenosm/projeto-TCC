import React, { useState } from 'react';
import { MapeamentoCampos, ConfigCorrespondencia, DadosFonteProcessada } from '../../types/index.js';
import { Sliders, Play, Shield } from 'lucide-react';

export interface PropsConfigCorrespondencia {
  sourceA?: DadosFonteProcessada;
  dadosFonteA?: DadosFonteProcessada;
  sourceB?: DadosFonteProcessada;
  dadosFonteB?: DadosFonteProcessada;
  mapping?: MapeamentoCampos;
  mapeamento?: MapeamentoCampos;
  onRunReconciliation?: (config: ConfigCorrespondencia) => void;
  aoExecutarConciliacao?: (config: ConfigCorrespondencia) => void;
  onBack?: () => void;
  aoVoltar?: () => void;
}

export const MatchingConfigView: React.FC<PropsConfigCorrespondencia> = ({
  sourceA,
  dadosFonteA,
  sourceB,
  dadosFonteB,
  mapping,
  mapeamento,
  onRunReconciliation,
  aoExecutarConciliacao,
  onBack,
  aoVoltar,
}) => {
  const fA = dadosFonteA || sourceA!;
  const fB = dadosFonteB || sourceB!;
  const mapCampos = mapeamento || mapping!;
  const executar = aoExecutarConciliacao || onRunReconciliation || (() => {});
  const voltar = aoVoltar || onBack || (() => {});

  const [toleranciaValor, setToleranciaValor] = useState(0.01);

  const aoSubmeter = (e: React.FormEvent) => {
    e.preventDefault();
    executar({
      primaryKeys: [mapCampos.documentA],
      amountTolerance: toleranciaValor,
    });
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <header className="border-b border-slate-800 pb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <Sliders className="h-6 w-6 text-cyan-400" />
          Configuração da Reconciliação
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Defina a tolerância para diferenças de valores antes da análise por IA.
        </p>
      </header>

      <form onSubmit={aoSubmeter} className="space-y-6">
        <div className="max-w-md space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <label className="block text-sm font-bold text-slate-200">
            Tolerância para diferença de valor (R$)
          </label>

          <p className="text-xs text-slate-400">
            Diferenças dentro desse limite serão consideradas como arredondamento.
          </p>

          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={toleranciaValor}
              onChange={(e) => setToleranciaValor(Number(e.target.value) || 0)}
              className="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-cyan-300 focus:ring-2 focus:ring-cyan-500"
            />
            <span className="text-xs text-slate-400">Reais (R$)</span>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-cyan-900/40 bg-slate-950/90 p-5">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Shield className="h-4 w-4" />
            Resumo do processamento
          </h4>

          <div className="grid gap-4 text-xs text-slate-300 sm:grid-cols-2">
            <div>
              <span className="block text-slate-500">Fonte de Dados 1:</span>
              <strong className="text-white">
                {fA.name} ({fA.totalRecords} reg.)
              </strong>
            </div>

            <div>
              <span className="block text-slate-500">Fonte de Dados 2:</span>
              <strong className="text-white">
                {fB.name} ({fB.totalRecords} reg.)
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={voltar}
            className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            Voltar
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-cyan-500"
          >
            <Play className="h-4 w-4 fill-white" />
            Executar Reconciliação
          </button>
        </div>
      </form>
    </div>
  );
};