import React, { useState, useEffect } from 'react';
import { getTravelPlans, createTravelPlan, deleteTravelPlan } from '../../services/dashboardTools.service';
import {
  Plane, MapPin, Calendar, DollarSign, Plus, Trash2,
  X, CheckCircle2, AlertCircle, Compass, ListOrdered,
  Sparkles, Luggage
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TravelPlannerModal = ({ isOpen, onClose }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    budget: '',
    preferences: ''
  });
  const [itineraryItems, setItineraryItems] = useState([
    { day: 'Day 1', activity: 'Arrival, Hotel Check-in & City Center Exploration' }
  ]);
  const [expenseItems, setExpenseItems] = useState([
    { category: 'Flights / Transit', estimated: 450 },
    { category: 'Hotel / Lodging', estimated: 600 },
    { category: 'Food & Dining', estimated: 300 }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await getTravelPlans();
      setPlans(data || []);
    } catch (err) {
      console.error('Failed to load travel plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItineraryRow = () => {
    const nextDay = `Day ${itineraryItems.length + 1}`;
    setItineraryItems([...itineraryItems, { day: nextDay, activity: '' }]);
  };

  const handleAddExpenseRow = () => {
    setExpenseItems([...expenseItems, { category: '', estimated: 100 }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.destination.trim() || !formData.start_date || !formData.end_date) {
      setError('Destination, start date, and end date are required');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date cannot be earlier than start date');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        destination: formData.destination.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        budget: parseFloat(formData.budget) || 0,
        preferences: formData.preferences.trim() || null,
        itinerary: itineraryItems.filter((i) => i.activity.trim() !== ''),
        estimated_expenses: expenseItems.filter((e) => e.category.trim() !== '')
      };

      const created = await createTravelPlan(payload);
      setPlans([created, ...plans]);
      setShowAddForm(false);
      setFormData({ destination: '', start_date: '', end_date: '', budget: '', preferences: '' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save travel plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this travel plan?')) return;
    try {
      await deleteTravelPlan(id);
      setPlans(plans.filter((p) => p.id !== id));
    } catch (err) {
      alert('Failed to delete travel plan: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="glass-card max-w-4xl w-full max-h-[90vh] flex flex-col p-6 sm:p-8 border border-border/80 shadow-2xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Plane size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-textPrimary">Travel & Trip Planner</h2>
              <p className="text-xs text-textSecondary">
                Plan itineraries, track travel budgets, and store trip details persistently.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                <Plus size={16} /> New Trip
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-textSecondary hover:text-textPrimary rounded-lg hover:bg-surface-elevated transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* Create Trip Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="glass-card p-6 rounded-2xl border border-cyan-500/30 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    New Trip Itinerary & Budget
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-textSecondary hover:text-textPrimary text-xs"
                  >
                    Cancel
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Destination *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tokyo, Japan or Zurich, Switzerland"
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        className="input-field pl-9 text-sm"
                      />
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Total Estimated Budget ($)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="e.g. 2500"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="input-field pl-9 text-sm"
                      />
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Departure Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="input-field text-sm cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Return Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="input-field text-sm cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Trip Preferences / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Scenic walking tours, bullet train transit, local ramen spots, photography"
                    value={formData.preferences}
                    onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                {/* Day-by-Day Itinerary Builder */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered size={14} className="text-cyan-400" />
                      Day-by-Day Itinerary Plan
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItineraryRow}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      <Plus size={13} /> Add Day
                    </button>
                  </div>

                  <div className="space-y-2">
                    {itineraryItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cyan-400 w-16 shrink-0">
                          {item.day}:
                        </span>
                        <input
                          type="text"
                          placeholder="Planned highlight / activities..."
                          value={item.activity}
                          onChange={(e) => {
                            const updated = [...itineraryItems];
                            updated[idx].activity = e.target.value;
                            setItineraryItems(updated);
                          }}
                          className="input-field text-xs flex-1 py-1.5"
                        />
                        {itineraryItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setItineraryItems(itineraryItems.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-textSecondary hover:text-rose-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expense Breakdown Builder */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-400" />
                      Estimated Expense Breakdown
                    </label>
                    <button
                      type="button"
                      onClick={handleAddExpenseRow}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <Plus size={13} /> Add Expense Category
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {expenseItems.map((exp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Category (e.g. Museums)"
                          value={exp.category}
                          onChange={(e) => {
                            const updated = [...expenseItems];
                            updated[idx].category = e.target.value;
                            setExpenseItems(updated);
                          }}
                          className="input-field text-xs flex-1 py-1.5"
                        />
                        <input
                          type="number"
                          placeholder="$"
                          value={exp.estimated}
                          onChange={(e) => {
                            const updated = [...expenseItems];
                            updated[idx].estimated = parseFloat(e.target.value) || 0;
                            setExpenseItems(updated);
                          }}
                          className="input-field text-xs w-20 py-1.5"
                        />
                        {expenseItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpenseItems(expenseItems.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-textSecondary hover:text-rose-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary text-xs shadow-md shadow-cyan-500/20"
                  >
                    {submitting ? 'Saving Plan...' : 'Save Trip to LifeOS'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Saved Travel Plans List */}
          <div>
            <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3">
              Your Saved Trips ({plans.length})
            </h3>

            {loading ? (
              <div className="py-12 text-center text-xs text-textSecondary">
                Loading saved itineraries...
              </div>
            ) : plans.length === 0 && !showAddForm ? (
              <div className="glass-card p-10 text-center rounded-2xl border-dashed border-border/80">
                <Luggage size={36} className="mx-auto text-cyan-400/40 mb-3" />
                <h4 className="text-sm font-semibold text-textPrimary">No planned trips yet</h4>
                <p className="text-xs text-textSecondary mt-1 max-w-sm mx-auto">
                  Click "+ New Trip" above to schedule travel dates, day-by-day itineraries, and budget estimations.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="glass-card p-5 rounded-xl border border-border/70 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold mb-1">
                            <Calendar size={13} />
                            {new Date(plan.start_date).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric'
                            })}{' '}
                            –{' '}
                            {new Date(plan.end_date).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <h4 className="text-base font-bold text-textPrimary flex items-center gap-1.5">
                            <MapPin size={16} className="text-rose-400" />
                            {plan.destination}
                          </h4>
                        </div>

                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="p-1 text-textSecondary hover:text-rose-400 rounded-md hover:bg-surface-elevated transition-colors"
                          title="Delete trip"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {plan.budget > 0 && (
                        <div className="my-2.5 p-2 rounded-lg bg-surface-elevated/60 border border-border/60 flex items-center justify-between text-xs">
                          <span className="text-textSecondary">Target Budget:</span>
                          <span className="font-bold text-emerald-400">
                            ${parseFloat(plan.budget).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {plan.preferences && (
                        <p className="text-xs text-textSecondary italic mb-3">
                          "{plan.preferences}"
                        </p>
                      )}

                      {/* Itinerary Preview */}
                      {plan.itinerary && plan.itinerary.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary block">
                            Itinerary Highlights
                          </span>
                          {plan.itinerary.slice(0, 3).map((item, i) => (
                            <div key={i} className="text-[11px] text-textSecondary flex items-start gap-1.5">
                              <span className="font-bold text-cyan-400 shrink-0">{item.day}:</span>
                              <span className="truncate">{item.activity}</span>
                            </div>
                          ))}
                          {plan.itinerary.length > 3 && (
                            <span className="text-[10px] text-cyan-400 font-medium">
                              +{plan.itinerary.length - 3} more days
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TravelPlannerModal;
