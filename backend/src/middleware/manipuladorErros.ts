import { Request, Response, NextFunction } from 'express';

// tratamento global de erros do backend e padroniza a resposta enviada ao frontend
export const manipularErros = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('ERRO NÃO TRATADO:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erro interno no servidor de reconciliação.',
  });
};