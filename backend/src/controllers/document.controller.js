const documentService = require('../services/document.service');
const AppError = require('../utils/AppError');
const path = require('path');
const fs = require('fs');

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const noteId = req.body.note_id ? parseInt(req.body.note_id, 10) : null;

    const fileData = {
      original_name: req.file.originalname,
      file_name: req.file.filename,
      file_path: req.file.path,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      file_extension: ext,
      note_id: noteId
    };

    const document = await documentService.saveDocumentRecord(req.user.id, fileData);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    // If upload fails after multer wrote file to disk, clean up temp file
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const { search } = req.query;
    const documents = await documentService.getDocuments(req.user.id, search);
    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await documentService.getDocumentById(req.user.id, id);

    if (!fs.existsSync(document.file_path)) {
      throw new AppError('File not found on storage', 404);
    }

    res.download(document.file_path, document.original_name);
  } catch (error) {
    next(error);
  }
};

exports.previewDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await documentService.getDocumentById(req.user.id, id);

    if (!fs.existsSync(document.file_path)) {
      throw new AppError('File not found on storage', 404);
    }

    // Set content type for inline viewing
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.original_name}"`);

    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await documentService.deleteDocument(req.user.id, id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
