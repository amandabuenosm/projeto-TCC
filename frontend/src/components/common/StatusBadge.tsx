import React from 'react';
import { StatusConciliacao, GravidadeDivergencia } from '../../types/index.js';

export interface PropsBadgeStatus {
  status?: StatusConciliacao;
  severity?: GravidadeDivergencia;
  gravidade?: GravidadeDivergencia;
  label?: string;
  rotulo?: string;
}

const configGravidade = {
  HIGH: {
    rotulo: '🔴 Divergência Alta',
    ponto: 'bg-red-500 animate-pulse',
    estilo: 'bg-red-950/80 text-red-400 border-red-800/60',
  },
  MEDIUM: {
    rotulo: '🟠 Divergência Média',
    ponto: 'bg-amber-500',
    estilo: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
  },
  LOW: {
    rotulo: '🟡 Divergência Baixa',
    ponto: 'bg-yellow-500',
    estilo: 'bg-yellow-950/80 text-yellow-400 border-yellow-800/60',
  },
};

const configStatus = {
  CONCILIADA: {
    rotulo: '🟢 Conciliada',
    estilo: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
  },
  DIVERGENTE: {
    rotulo: 'Divergente',
    estilo: 'bg-red-950/80 text-red-300 border-red-800/60',
  },
  AUSENTE_FONTE_A: {
    rotulo: 'Ausente na Fonte A',
    estilo: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
  },
  AUSENTE_FONTE_B: {
    rotulo: 'Ausente na Fonte B',
    estilo: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
  },
  DUPLICADA: {
    rotulo: 'Duplicada',
    estilo: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
  },
};

export const StatusBadge: React.FC<PropsBadgeStatus> = ({
  status,
  severity,
  gravidade,
  label,
  rotulo,
}) => {
  const gravidadeAtiva = gravidade || severity;
  const dadosGravidade = gravidadeAtiva && configGravidade[gravidadeAtiva];

  if (dadosGravidade) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${dadosGravidade.estilo}`}
      >
        <span className={`h-2 w-2 rounded-full ${dadosGravidade.ponto}`} />
        {dadosGravidade.rotulo}
      </span>
    );
  }

  const dadosStatus = status && configStatus[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        dadosStatus?.estilo || 'bg-slate-800 text-slate-300 border-slate-700'
      }`}
    >
      {dadosStatus?.rotulo || rotulo || label || 'Padrão'}
    </span>
  );
};