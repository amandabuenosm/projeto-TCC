"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllerConciliacao_js_1 = require("../controllers/controllerConciliacao.js");
const uploadMiddleware_js_1 = require("../middleware/uploadMiddleware.js");
const rota = (0, express_1.Router)();
// rotas da API do backend
rota.get('/ai/status', controllerConciliacao_js_1.controllerConciliacao.statusIAconfig);
rota.post('/mapping/suggest', controllerConciliacao_js_1.controllerConciliacao.sugerirMapeamento);
rota.post('/files/upload', uploadMiddleware_js_1.uploadMiddleware.fields([
    { name: 'fileA', maxCount: 1 },
    { name: 'fileB', maxCount: 1 },
]), controllerConciliacao_js_1.controllerConciliacao.uploadArquivos);
rota.post('/reconciliation/compare', controllerConciliacao_js_1.controllerConciliacao.compararCampos);
rota.get('/reconciliation/:id/summary', controllerConciliacao_js_1.controllerConciliacao.resumo);
rota.get('/reconciliation/:id/divergences', controllerConciliacao_js_1.controllerConciliacao.divergencias);
rota.post('/reconciliation/:id/analyze', controllerConciliacao_js_1.controllerConciliacao.analisarDivergencia);
rota.post('/reconciliation/:id/analyze-batch', controllerConciliacao_js_1.controllerConciliacao.analisarLote);
rota.get('/reconciliation/:id/export', controllerConciliacao_js_1.controllerConciliacao.exportaRelatorio);
exports.default = rota;
