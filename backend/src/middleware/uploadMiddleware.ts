import multer from 'multer';

// configura o Multer para receber e validar arquivos enviados pelo frontend
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const formatosPermitidos = /\.(csv|xlsx|xls|txt|pdf|docx)$/i;

    if (!formatosPermitidos.test(file.originalname)) {
      return cb(new Error('Formato de arquivo inválido. Formatos aceitos: CSV, XLSX, XLS, TXT, PDF, DOCX.'));
    }

    cb(null, true);
  },
});