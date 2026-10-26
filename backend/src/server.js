const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { initSocket } = require('./socket');
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const goalRoutes = require('./routes/goal.routes');
const habitRoutes = require('./routes/habit.routes');
const eventRoutes = require('./routes/event.routes');
const preferenceRoutes = require('./routes/preference.routes');
const aiRoutes = require('./routes/ai.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const noteRoutes = require('./routes/note.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const documentRoutes = require('./routes/document.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const travelRoutes = require('./routes/travel.routes');
const timetableRoutes = require('./routes/timetable.routes');
const budgetRoutes = require('./routes/budget.routes');
const connectionRoutes = require('./routes/connection.routes');
const ecosystemRoutes = require('./routes/ecosystem.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-planner', aiRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/ecosystem', ecosystemRoutes);
app.post('/api/help-requests', require('./controllers/admin.controller').submitHelpRequest);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy' });
});

// Error handling middleware
app.use(errorHandler);

// Create HTTP server and initialize Socket.IO
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Socket.IO enabled`);
});
