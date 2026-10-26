# AI LifeOS

AI LifeOS is a full-stack AI-powered personal productivity and life-management platform. It takes your tasks, goals, habits, events, and preferences, and generates a personalized daily schedule using AI.

## Features
- **AI Daily Planning**: Intelligent scheduling based on your tasks, goals, and habits.
- **Smart Tasks**: Manage tasks with priorities and deadlines.
- **Goal Tracking**: Set and track progress towards long-term goals.
- **Habit Tracking**: Build consistency with habit tracking and streaks.
- **Calendar**: Manage events and your AI-generated schedule.
- **Notes**: Keep your thoughts organized.
- **Productivity Insights**: Monitor your progress.

## Technology Stack
- **Frontend**: React.js, Vite, Tailwind CSS, React Router DOM, Framer Motion, Three.js
- **Backend**: Node.js, Express.js, MySQL, JWT Authentication

## Architecture
The application uses a clean MVC/service-based architecture on the backend, and a component-based structure on the frontend.
The database is MySQL, storing users, tasks, goals, habits, events, schedules, and preferences.
The AI Service modularly integrates with AI providers (like OpenAI or Gemini) to generate personalized daily schedules. A fallback rule-based scheduler is included in case the AI provider is unavailable.

## Setup Instructions

### Database Setup
1. Open MySQL Workbench.
2. Run the SQL commands located in `database/schema.sql` to create the database and tables.

### Environment Variables
1. Navigate to the `backend/` directory.
2. Copy `.env.example` to `.env`.
3. Fill in your MySQL credentials (`DB_PASSWORD`) and JWT secret.
4. Add your preferred AI Provider configuration (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`).

### Backend Installation & Running
```bash
cd backend
npm install
npm run dev
```

### Frontend Installation & Running
```bash
cd frontend
npm install
npm run dev
```

## Future Improvements
- Deeper AI insights based on past schedule completion.
- Push notifications for schedule items.
- Mobile application using React Native.
