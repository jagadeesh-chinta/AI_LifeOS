const pool = require('../config/db');
const AppError = require('../utils/AppError');

exports.createNote = async (userId, data) => {
  const { title, content, tags } = data;
  
  const [result] = await pool.query(
    `INSERT INTO notes (user_id, title, content, tags) VALUES (?, ?, ?, ?)`,
    [userId, title, content || null, tags || null]
  );
  
  return this.getNoteById(userId, result.insertId);
};

exports.getNotes = async (userId, search) => {
  let query = 'SELECT * FROM notes WHERE user_id = ?';
  const params = [userId];

  if (search) {
    query += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY updated_at DESC';

  const [notes] = await pool.query(query, params);
  return notes;
};

exports.getNoteById = async (userId, noteId) => {
  const [notes] = await pool.query('SELECT * FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  
  if (notes.length === 0) {
    throw new AppError('Note not found', 404);
  }
  
  return notes[0];
};

exports.updateNote = async (userId, noteId, data) => {
  await this.getNoteById(userId, noteId);

  const updates = [];
  const params = [];

  const fields = ['title', 'content', 'tags'];
  
  fields.forEach(field => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  });

  if (updates.length === 0) return this.getNoteById(userId, noteId);

  params.push(noteId, userId);
  
  await pool.query(
    `UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );
  
  return this.getNoteById(userId, noteId);
};

exports.deleteNote = async (userId, noteId) => {
  const [result] = await pool.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  
  if (result.affectedRows === 0) {
    throw new AppError('Note not found', 404);
  }
  
  return true;
};
