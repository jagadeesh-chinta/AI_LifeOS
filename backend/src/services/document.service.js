const pool = require('../config/db');
const AppError = require('../utils/AppError');
const fs = require('fs');
const path = require('path');

exports.saveDocumentRecord = async (userId, fileData) => {
  const { original_name, file_name, file_path, mime_type, file_size, file_extension, note_id } = fileData;

  const [result] = await pool.query(
    `INSERT INTO documents 
     (user_id, note_id, original_name, file_name, file_path, mime_type, file_size, file_extension) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      note_id || null,
      original_name,
      file_name,
      file_path,
      mime_type || null,
      file_size,
      file_extension || null
    ]
  );

  return this.getDocumentById(userId, result.insertId);
};

exports.getDocuments = async (userId, search) => {
  let query = 'SELECT * FROM documents WHERE user_id = ?';
  const params = [userId];

  if (search && search.trim()) {
    query += ' AND original_name LIKE ?';
    params.push(`%${search.trim()}%`);
  }

  query += ' ORDER BY created_at DESC';

  const [docs] = await pool.query(query, params);
  return docs;
};

exports.getDocumentById = async (userId, docId) => {
  const [docs] = await pool.query(
    'SELECT * FROM documents WHERE id = ? AND user_id = ?',
    [docId, userId]
  );

  if (docs.length === 0) {
    throw new AppError('Document not found or access denied', 404);
  }

  return docs[0];
};

exports.deleteDocument = async (userId, docId) => {
  const doc = await this.getDocumentById(userId, docId);

  // Remove physical file from disk if exists
  if (doc.file_path && fs.existsSync(doc.file_path)) {
    try {
      fs.unlinkSync(doc.file_path);
    } catch (err) {
      console.warn('Failed to delete physical file from disk:', err.message);
    }
  }

  await pool.query('DELETE FROM documents WHERE id = ? AND user_id = ?', [docId, userId]);
  return { success: true, message: 'Document deleted successfully' };
};
