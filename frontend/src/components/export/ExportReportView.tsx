import React from 'react';
import {
  ResumoConciliacao,
  ItemDivergencia,
  ResultadoPadraoLote,
} from '../../types/index.js';
import { api } from '../../services/api.js';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

export interface PropsVisualizacaoRelatorioExportacao {
  summary?: ResumoConciliacao;
  resumo?: ResumoConciliacao;
  divergences?: ItemDivergencia[];
  divergencias?: ItemDivergencia[];
  batchAnalysis?: ResultadoPadraoLote;
  analiseLote?: ResultadoPadraoLote;
}

export const ExportReportView: React.FC<PropsVisualizacaoRelatorioExportacao> = ({
  summary,
  resumo,
  divergences,
  divergencias,
  batchAnalysis,
  analiseLote,
}) => {
  const dadosResumo = resumo || summary!;
  const listaDivergencias = divergencias || divergences || [];
  const dadosLote = analiseLote || batchAnalysis;

  const urlExportacao = api.obterUrlExportacao(dadosResumo.sessionId);

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);

  const cartoesResumo = [
    ['Total Analisado', dadosResumo.totalAnalyzed, 'text-white'],
    [
      'Conciliadas',
      `${dadosResumo.conciliadaCount} (${dadosResumo.reconciliationPercentage}%)`,
      'text-emerald-400',
    ],
    ['Total de Divergências', dadosResumo.divergenteCount, 'text-amber-400'],
    ['Diferença de Valores', formatarMoeda(dadosResumo.totalAmountDiff), 'text-red-400'],
  ];

  const cartoesStatus = [
    ['Divergentes', dadosResumo.divergenteCount, 'text-red-400'],
    ['Ausente Fonte A', dadosResumo.ausenteFonteACount, 'text-purple-400'],
    ['Ausente Fonte B', dadosResumo.ausenteFonteBCount, 'text-indigo-400'],
    ['Duplicadas', dadosResumo.duplicadaCount, 'text-blue-400'],
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="w-6 h-6 text-cyan-400" />
            Relatório de Reconciliação & Exportação de Resultados
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Exporte os resultados detalhados em CSV ou visualize a síntese abaixo.
          </p>
        </div>

        <a
          href={urlExportacao}
          download={`reconciliacao_${dadosResumo.sessionId}.csv`}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 transition-all hover:scale-[1.02]"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Baixar Relatório Completo (.CSV)
        </a>
      </div>

      {/* Relatório */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8 max-w-5xl mx-auto">
        {/* Identificação */}
        <div className="border-b border-slate-800 pb-6">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            RECONCILIAÇÃO COM INTELIGÊNCIA ARTIFICIAL
          </span>

          <h1 className="text-2xl font-extrabold text-white mt-1">
            RELATÓRIO DE RECONCILIAÇÃO
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            Sessão: <span className="font-mono">{dadosResumo.sessionId}</span> |
            Gerado em: {new Date(dadosResumo.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {cartoesResumo.map(([rotulo, valor, cor]) => (
            <div
              key={rotulo}
              className="bg-slate-950/70 p-4 rounded-xl border border-slate-800"
            >
              <span className="text-[11px] text-slate-400 block">
                {rotulo}
              </span>

              <span className={`text-xl font-bold ${cor}`}>
                {valor}
              </span>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Distribuição dos Status
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {cartoesStatus.map(([rotulo, valor, cor]) => (
              <div
                key={rotulo}
                className="bg-slate-950 p-3 rounded-lg border border-slate-800"
              >
                <span className="text-slate-500 block text-[10px]">
                  {rotulo}
                </span>

                <span className={`font-bold text-sm ${cor}`}>
                  {valor}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Principais divergências */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Principais Divergências da Amostra
          </h3>

          <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">{dadosResumo.identifierLabel}</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Diferenças</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {listaDivergencias.slice(0, 5).map((div) => (
                  <tr key={div.id}>
                    <td className="py-2 px-3 text-white font-mono">
                      {div.identifier}
                    </td>

                    <td className="py-2 px-3 text-slate-300">
                      {div.status}
                    </td>

                    <td className="py-2 px-3 text-slate-400">
                      {div.divergentFields
                        .map((campo) => campo.fieldName)
                        .join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Análise por IA */}
        {dadosLote && (
          <div className="bg-slate-950 p-5 rounded-xl border border-purple-900/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Recomendações da Análise por IA
            </h3>

            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              {dadosLote.recommendedActionPlan.map((acao, index) => (
                <li key={index}>• {acao}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};