"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
// configura o Multer para receber e validar arquivos enviados pelo frontend
exports.uploadMiddleware = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const formatosPermitidos = /\.(csv|xlsx|xls|txt|pdf|docx)$/i;
        if (!formatosPermitidos.test(file.originalname)) {
            return cb(new Error('Formato de arquivo inválido. Formatos aceitos: CSV, XLSX, XLS, TXT, PDF, DOCX.'));
        }
        cb(null, true);
    },
});
