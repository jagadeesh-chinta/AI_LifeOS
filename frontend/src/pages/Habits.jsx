import React, { useState, useEffect } from 'react';
import { getHabits, createHabit, deleteHabit, logHabit } from '../services/habit.service';
import { Plus, Activity, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdaptiveHabitCoach from '../components/habits/AdaptiveHabitCoach';

const Habits = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', frequency: 'DAILY' });

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const data = await getHabits();
      setHabits(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newHabit.name.trim()) return;
    
    try {
      const habit = await createHabit(newHabit);
      setHabits([...habits, habit]);
      setNewHabit({ name: '', frequency: 'DAILY' });
      setShowForm(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHabit(id);
      setHabits(habits.filter(h => h.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLog = async (id) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await logHabit(id, { completed_date: today, completed: true });
      fetchHabits();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="text-center text-textSecondary mt-20">Loading habits...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
            <Activity className="text-secondary" size={32} />
            Habits & Consistency Engine
          </h1>
          <p className="text-textSecondary mt-1">Build daily momentum, track calculated streaks, and adapt to busy schedules.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 cursor-pointer">
          <Plus size={20} /> New Habit
        </button>
      </div>

      {/* Feature Three: Adaptive Habit Coach */}
      <AdaptiveHabitCoach onHabitsUpdated={() => fetchHabits()} />

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate} 
            className="mb-8 overflow-hidden"
          >
            <div className="glass-card p-6 flex gap-4">
              <input
                type="text"
                placeholder="Habit Name (e.g., Read 20 pages)"
                className="input-field flex-1"
                value={newHabit.name}
                onChange={(e) => setNewHabit({...newHabit, name: e.target.value})}
                autoFocus
                required
              />
              <select 
                className="input-field w-40 cursor-pointer"
                value={newHabit.frequency}
                onChange={(e) => setNewHabit({...newHabit, frequency: e.target.value})}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
              <button type="submit" className="btn-primary">Add</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.length === 0 && !showForm && (
          <div className="col-span-full text-center py-12 glass-card">
            <h3 className="text-xl font-medium text-textPrimary mb-2">No habits yet</h3>
            <p className="text-textSecondary">Start building consistent habits today.</p>
          </div>
        )}
        
        {habits.map((habit) => (
          <motion.div 
            key={habit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 relative overflow-hidden group shadow-sm hover:shadow-md"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-textPrimary truncate pr-6">{habit.name}</h3>
              <button 
                onClick={() => handleDelete(habit.id)} 
                className="text-textSecondary hover:text-red-500 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="text-xs font-semibold text-secondary mb-6">{habit.frequency}</p>
            
            <button 
              onClick={() => handleLog(habit.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-surface-elevated hover:bg-secondary/15 hover:border-secondary/40 text-textPrimary font-medium transition-all"
            >
              <CheckCircle2 size={18} className="text-emerald-500" />
              Mark Complete
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Habits;
