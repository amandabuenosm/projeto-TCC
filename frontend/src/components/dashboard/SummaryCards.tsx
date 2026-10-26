import React from 'react';
import { ResumoConciliacao } from '../../types/index.js';
import {
  CheckCircle2,
  AlertTriangle,
  FileMinus,
  Copy,
  FileText,
  Percent,
} from 'lucide-react';

export interface PropsCartoesResumo {
  summary?: ResumoConciliacao;
  resumo?: ResumoConciliacao;
}

export const SummaryCards: React.FC<PropsCartoesResumo> = ({ summary, resumo }) => {
  const dadosResumo = resumo || summary!;

  const cartoes = [
    {
      rotulo: 'Conciliadas',
      valor: dadosResumo.conciliadaCount,
      icone: CheckCircle2,
      tag: 'OK',
      cor: 'emerald',
    },
    {
      rotulo: 'Divergentes',
      valor: dadosResumo.divergenteCount,
      icone: AlertTriangle,
      tag: 'Diverg.',
      cor: 'red',
    },
    {
      rotulo: 'Ausente Fonte A',
      valor: dadosResumo.ausenteFonteACount,
      icone: FileMinus,
      tag: 'Fonte 1',
      cor: 'purple',
    },
    {
      rotulo: 'Ausente Fonte B',
      valor: dadosResumo.ausenteFonteBCount,
      icone: FileMinus,
      tag: 'Fonte 2',
      cor: 'indigo',
    },
    {
      rotulo: 'Duplicadas',
      valor: dadosResumo.duplicadaCount,
      icone: Copy,
      tag: 'Dupl.',
      cor: 'blue',
    },
  ];

  const classesCores: Record<string, string> = {
    emerald: 'border-emerald-900/40 hover:border-emerald-700/50 text-emerald-400',
    red: 'border-red-900/40 hover:border-red-700/50 text-red-400',
    purple: 'border-purple-900/40 hover:border-purple-700/50 text-purple-400',
    indigo: 'border-indigo-900/40 hover:border-indigo-700/50 text-indigo-400',
    blue: 'border-blue-900/40 hover:border-blue-700/50 text-blue-400',
  };

  const coresValores: Record<string, string> = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    purple: 'text-purple-300',
    indigo: 'text-indigo-300',
    blue: 'text-blue-300',
  };

  return (
    <div className="space-y-6">
      {/* Indicadores principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Índice de Conciliação */}
        <div className="bg-gradient-to-br from-white via-white to-cyan-50 border border-cyan-800/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <Percent className="absolute top-4 right-4 w-24 h-24 text-cyan-400 opacity-10" />

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Índice de Conciliação
            </span>

            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              Determinístico
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <span className="text-4xl font-extrabold text-white">
              {dadosResumo.reconciliationPercentage.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">conciliado</span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden my-3">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, dadosResumo.reconciliationPercentage)
                )}%`,
              }}
            />
          </div>

          <p className="text-xs text-slate-400">
            {dadosResumo.conciliadaCount.toLocaleString('pt-BR')} registros pareados sem divergência de um total de{' '}
            {dadosResumo.totalAnalyzed.toLocaleString('pt-BR')} analisados.
          </p>
        </div>

        {/* Volume da Amostra */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Volume da Amostra
            </span>
            <FileText className="w-5 h-5 text-slate-500" />
          </div>

          <div className="grid grid-cols-2 gap-4 my-2">
            <div>
              <span className="text-xs text-slate-500 block">
                Fonte de Dados 1 ({dadosResumo.sourceAName})
              </span>
              <span className="text-2xl font-bold text-slate-100">
                {dadosResumo.totalRecordsA.toLocaleString('pt-BR')}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block">
                Fonte de Dados 2 ({dadosResumo.sourceBName})
              </span>
              <span className="text-2xl font-bold text-slate-100">
                {dadosResumo.totalRecordsB.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Divergências Encontradas:</span>

            <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
              {dadosResumo.divergenteCount} itens
            </span>
          </div>
        </div>
      </div>

      {/* Detalhamento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cartoes.map((cartao) => {
          const Icone = cartao.icone;

          return (
            <div
              key={cartao.rotulo}
              className={`bg-slate-900/90 rounded-xl p-3.5 shadow-md transition-all border ${classesCores[cartao.cor]}`}
            >
              <div className={`flex items-center justify-between mb-1 ${classesCores[cartao.cor].split(' ').pop()}`}>
                <Icone className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">
                  {cartao.tag}
                </span>
              </div>

              <span className="text-xs text-slate-400 block">
                {cartao.rotulo}
              </span>

              <span className={`text-xl font-bold ${coresValores[cartao.cor]}`}>
                {cartao.valor}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};