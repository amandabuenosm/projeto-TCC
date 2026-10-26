import React from 'react';
import { Loader2 } from 'lucide-react';

export interface PropsSobreposicaoCarregamento {
  message?: string;
  subMessage?: string;
  mensagem?: string;
  subMensagem?: string;
}

export const LoadingOverlay: React.FC<PropsSobreposicaoCarregamento> = ({
  message = 'Processando reconciliação...',
  subMessage = 'Executando motor determinístico e análise de anomalias',
  mensagem,
  subMensagem,
}) => {
  const textoPrincipal = mensagem || message;
  const textoSecundario = subMensagem || subMessage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-cyan-400" />

        <div>
          <h3 className="text-lg font-bold text-slate-100">{textoPrincipal}</h3>
          <p className="text-sm text-slate-400">{textoSecundario}</p>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" />
        </div>
      </div>
    </div>
  );
};