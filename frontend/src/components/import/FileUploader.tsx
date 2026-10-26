import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, FileText } from 'lucide-react';
import { DadosFonteProcessada } from '../../types/index.js';

export interface PropsUploadArquivos {
  onFilesSelected?: (arquivoA?: File, arquivoB?: File) => void;
  aoSelecionarArquivos?: (arquivoA?: File, arquivoB?: File) => void;
  isLoading?: boolean;
  carregando?: boolean;
  sourceAData?: DadosFonteProcessada | null;
  dadosFonteA?: DadosFonteProcessada | null;
  sourceBData?: DadosFonteProcessada | null;
  dadosFonteB?: DadosFonteProcessada | null;
  onProceedToMapping?: () => void;
  aoAvancarParaMapeamento?: () => void;
}

const EXTENSOES_ACEITAS = '.csv,.xlsx,.xls,.pdf,.txt,.docx';
const ROTULO_EXTENSOES = 'CSV, XLSX, XLS, PDF, TXT, DOCX';

export const FileUploader: React.FC<PropsUploadArquivos> = ({
  onFilesSelected,
  aoSelecionarArquivos,
  isLoading = false,
  carregando = false,
  sourceAData,
  dadosFonteA,
  sourceBData,
  dadosFonteB,
  onProceedToMapping,
  aoAvancarParaMapeamento,
}) => {
  const notificarArquivos = aoSelecionarArquivos || onFilesSelected || (() => {});
  const avancar = aoAvancarParaMapeamento || onProceedToMapping || (() => {});
  const estaCarregando = carregando || isLoading;
  const fonteA = dadosFonteA !== undefined ? dadosFonteA : sourceAData;
  const fonteB = dadosFonteB !== undefined ? dadosFonteB : sourceBData;

  const [arquivos, setArquivos] = useState<(File | undefined)[]>([]);
  const referenciasInput = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const manipularArquivo = (indice: number, arquivo?: File) => {
    if (!arquivo) return;

    const atualizados = [...arquivos];
    atualizados[indice] = arquivo;
    setArquivos(atualizados);

    notificarArquivos(atualizados[0], atualizados[1]);
  };

  const manipularDrop = (indice: number, evento: React.DragEvent) => {
    evento.preventDefault();
    manipularArquivo(indice, evento.dataTransfer.files[0]);
  };

  const fontes = [fonteA, fonteB];
  const cores = ['cyan', 'purple'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 border border-cyan-800 rounded-2xl p-6 shadow-xl">
        <h2 className="!text-white text-xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 !text-white" />
          Importação dos Relatórios para Reconciliação
        </h2>

        <p className="text-sm text-gray-200 max-w-2xl mt-2">
          Selecione ou arraste os dois arquivos que deseja comparar
          (formatos <strong>{ROTULO_EXTENSOES}</strong>). O sistema detectará
          automaticamente as colunas para o mapeamento dos campos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fontes.map((fonte, indice) => {
          const cor = cores[indice];
          const arquivo = arquivos[indice];

          return (
            <div
              key={indice}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-md bg-${cor}-950 text-${cor}-400 font-bold text-xs flex items-center justify-center border border-${cor}-800`}
                  >
                    {indice + 1}
                  </span>

                  <h3 className="font-bold text-slate-100">
                    Fonte de Dados {indice + 1}
                  </h3>
                </div>

                {fonte && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {fonte.totalRecords} registros
                  </span>
                )}
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => manipularDrop(indice, e)}
                onClick={() => referenciasInput[indice].current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  fonte
                    ? `border-${cor}-500/50 bg-${cor}-950/20`
                    : `border-slate-700 hover:border-${cor}-500/50 bg-slate-950/40 hover:bg-slate-900/60`
                }`}
              >
                <input
                  ref={referenciasInput[indice]}
                  type="file"
                  accept={EXTENSOES_ACEITAS}
                  className="hidden"
                  onChange={(e) => manipularArquivo(indice, e.target.files?.[0])}
                />

                <UploadCloud
                  className={`w-12 h-12 text-${cor}-400 mx-auto mb-3 opacity-80`}
                />

                <p className="text-sm font-semibold text-slate-200">
                  {arquivo?.name ||
                    fonte?.filename ||
                    `Clique ou arraste o arquivo da Fonte de Dados ${indice + 1}`}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Formatos aceitos: {ROTULO_EXTENSOES}
                </p>
              </div>

              {fonte && (
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium">
                    Colunas detectadas ({fonte.headers.length}):
                  </span>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {fonte.headers.slice(0, 6).map((cabecalho) => (
                      <span
                        key={cabecalho}
                        className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono"
                      >
                        {cabecalho}
                      </span>
                    ))}

                    {fonte.headers.length > 6 && (
                      <span className="text-slate-500 text-[11px] self-center">
                        +{fonte.headers.length - 6} mais
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {fonteA && fonteB && (
        <div className="flex justify-end pt-4">
          <button
            onClick={avancar}
            disabled={estaCarregando}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            Avançar para Mapeamento de Campos
            <FileText className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};