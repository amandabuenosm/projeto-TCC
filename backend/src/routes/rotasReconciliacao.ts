import { Router } from 'express';
import { controllerConciliacao } from '../controllers/controllerConciliacao.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const rota = Router();

// rotas da API do backend
rota.get('/ai/status', controllerConciliacao.statusIAconfig);
rota.post('/mapping/suggest', controllerConciliacao.sugerirMapeamento);

rota.post('/files/upload', uploadMiddleware.fields([
    { name: 'fileA', maxCount: 1 },
    { name: 'fileB', maxCount: 1 },
  ]),
  controllerConciliacao.uploadArquivos
);

rota.post('/reconciliation/compare', controllerConciliacao.compararCampos);
rota.get('/reconciliation/:id/summary', controllerConciliacao.resumo);
rota.get('/reconciliation/:id/divergences', controllerConciliacao.divergencias);
rota.post('/reconciliation/:id/analyze', controllerConciliacao.analisarDivergencia);
rota.post('/reconciliation/:id/analyze-batch', controllerConciliacao.analisarLote);
rota.get('/reconciliation/:id/export', controllerConciliacao.exportaRelatorio);

export default rota;