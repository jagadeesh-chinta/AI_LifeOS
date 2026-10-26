const pool = require('../config/db');
const AppError = require('../utils/AppError');

function formatMySqlDateTime(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

exports.createEvent = async (userId, data) => {
  const { title, description, start_time, end_time, event_type, location } = data;
  
  const formattedStart = formatMySqlDateTime(start_time);
  const formattedEnd = formatMySqlDateTime(end_time);

  const [result] = await pool.query(
    `INSERT INTO events (user_id, title, description, start_time, end_time, event_type, location) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, description || null, formattedStart, formattedEnd, event_type || null, location || null]
  );
  
  return this.getEventById(userId, result.insertId);
};

exports.getEvents = async (userId) => {
  const [events] = await pool.query('SELECT * FROM events WHERE user_id = ? ORDER BY start_time ASC', [userId]);
  return events;
};

exports.getEventById = async (userId, eventId) => {
  const [events] = await pool.query('SELECT * FROM events WHERE id = ? AND user_id = ?', [eventId, userId]);
  
  if (events.length === 0) {
    throw new AppError('Event not found', 404);
  }
  
  return events[0];
};

exports.updateEvent = async (userId, eventId, data) => {
  await this.getEventById(userId, eventId);

  const updates = [];
  const params = [];

  const fields = ['title', 'description', 'start_time', 'end_time', 'event_type', 'location'];
  
  fields.forEach(field => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      let val = data[field];
      if (['start_time', 'end_time'].includes(field)) {
        val = formatMySqlDateTime(val);
      }
      params.push(val);
    }
  });

  if (updates.length === 0) return this.getEventById(userId, eventId);

  params.push(eventId, userId);
  
  await pool.query(
    `UPDATE events SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );
  
  return this.getEventById(userId, eventId);
};

exports.deleteEvent = async (userId, eventId) => {
  const [result] = await pool.query('DELETE FROM events WHERE id = ? AND user_id = ?', [eventId, userId]);
  
  if (result.affectedRows === 0) {
    throw new AppError('Event not found', 404);
  }
  
  return true;
};
