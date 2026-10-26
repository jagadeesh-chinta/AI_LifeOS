import React, { useState, useEffect } from 'react';
import { getBudgetSummary, createBudgetEntry, deleteBudgetEntry } from '../../services/dashboardTools.service';
import {
  Wallet, DollarSign, TrendingUp, TrendingDown, Plus,
  Trash2, X, AlertCircle, Sparkles, PieChart, ArrowUpRight,
  ArrowDownRight, CheckCircle2, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'Salary & Wages',
  'Investments & Dividends',
  'Housing & Rent',
  'Groceries & Food',
  'Utilities & Bills',
  'Transit & Fuel',
  'Education & Books',
  'Health & Fitness',
  'Entertainment & Dining',
  'Other Expenses'
];

const BudgetCalculatorModal = ({ isOpen, onClose }) => {
  const [period, setPeriod] = useState('Monthly');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    remainingBalance: 0,
    savingsRate: 0,
    categoryTotals: {}
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    type: 'EXPENSE',
    category: 'Groceries & Food',
    amount: '',
    period: 'Monthly',
    description: '',
    entry_date: new Date().toISOString().slice(0, 10)
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBudget();
    }
  }, [isOpen, period]);

  const loadBudget = async () => {
    setLoading(true);
    try {
      const data = await getBudgetSummary(period);
      if (data) {
        setEntries(data.entries || []);
        setSummary(data.summary || {
          totalIncome: 0,
          totalExpenses: 0,
          remainingBalance: 0,
          savingsRate: 0,
          categoryTotals: {}
        });
      }
    } catch (err) {
      console.error('Failed to load budget:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.category || !form.amount) {
      setError('Category and amount are required');
      return;
    }
    const numAmount = parseFloat(form.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    setSubmitting(true);
    try {
      await createBudgetEntry({
        ...form,
        amount: numAmount
      });
      await loadBudget();
      setShowAddForm(false);
      setForm({
        type: 'EXPENSE',
        category: 'Groceries & Food',
        amount: '',
        period,
        description: '',
        entry_date: new Date().toISOString().slice(0, 10)
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBudgetEntry(id);
      await loadBudget();
    } catch (err) {
      alert('Failed to delete budget entry: ' + err.message);
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-textPrimary">Income & Budget Calculator</h2>
              <p className="text-xs text-textSecondary">
                Track revenue streams, monitor living expenses, and calculate net financial velocity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!showAddForm && (
              <button
                onClick={() => {
                  setForm((f) => ({ ...f, period }));
                  setShowAddForm(true);
                }}
                className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Plus size={16} /> Add Transaction
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

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 pt-3">
          {['Monthly', 'Weekly', 'Annual', 'ALL'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary bg-surface/50 border border-border/60'
              }`}
            >
              {p} Budget
            </button>
          ))}
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* Top Dynamic Financial KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Total Income */}
            <div className="glass-card p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
              <span className="text-xs text-textSecondary flex items-center gap-1">
                <ArrowUpRight size={14} className="text-emerald-400" /> Total Income
              </span>
              <div className="text-xl font-extrabold text-emerald-400 mt-2">
                ${summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Total Expenses */}
            <div className="glass-card p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex flex-col justify-between">
              <span className="text-xs text-textSecondary flex items-center gap-1">
                <ArrowDownRight size={14} className="text-rose-400" /> Total Expenses
              </span>
              <div className="text-xl font-extrabold text-rose-400 mt-2">
                ${summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Remaining Balance */}
            <div className="glass-card p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 flex flex-col justify-between">
              <span className="text-xs text-textSecondary flex items-center gap-1">
                <DollarSign size={14} className="text-cyan-400" /> Net Balance
              </span>
              <div
                className={`text-xl font-extrabold mt-2 ${
                  summary.remainingBalance >= 0 ? 'text-cyan-400' : 'text-rose-400'
                }`}
              >
                ${summary.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Savings Rate */}
            <div className="glass-card p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex flex-col justify-between">
              <span className="text-xs text-textSecondary flex items-center gap-1">
                <TrendingUp size={14} className="text-purple-400" /> Savings Rate
              </span>
              <div className="text-xl font-extrabold text-purple-400 mt-2">
                {summary.savingsRate}%
              </div>
            </div>
          </div>

          {/* Add Transaction Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="glass-card p-6 rounded-2xl border border-emerald-500/30 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-400" />
                    Record Income or Expense
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Transaction Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            type: 'INCOME',
                            category: 'Salary & Wages'
                          })
                        }
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          form.type === 'INCOME'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-surface border border-border text-textSecondary'
                        }`}
                      >
                        + Income
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            type: 'EXPENSE',
                            category: 'Groceries & Food'
                          })
                        }
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          form.type === 'EXPENSE'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                            : 'bg-surface border border-border text-textSecondary'
                        }`}
                      >
                        – Expense
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Amount ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 150.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="input-field text-sm cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Description / Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Weekly organic market groceries"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={form.entry_date}
                      onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                      className="input-field text-sm cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
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
                    className="btn-primary text-xs shadow-md shadow-emerald-500/20"
                  >
                    {submitting ? 'Recording...' : 'Record Transaction'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Category Breakdown Progress Bars */}
          {Object.keys(summary.categoryTotals).length > 0 && (
            <div className="glass-card p-5 rounded-xl border border-border/70 space-y-3">
              <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider flex items-center gap-1.5">
                <PieChart size={14} className="text-cyan-400" />
                Expense Distribution by Category
              </h4>
              <div className="space-y-2.5">
                {Object.entries(summary.categoryTotals).map(([cat, total]) => {
                  const pct = summary.totalExpenses > 0 ? Math.round((total / summary.totalExpenses) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-textPrimary">{cat}</span>
                        <span className="text-textSecondary">
                          ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transactions List */}
          <div>
            <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3">
              Recorded Entries ({entries.length})
            </h4>

            {loading ? (
              <div className="py-12 text-center text-xs text-textSecondary">
                Loading budget items...
              </div>
            ) : entries.length === 0 && !showAddForm ? (
              <div className="glass-card p-10 text-center rounded-2xl border-dashed border-border/80">
                <Wallet size={36} className="mx-auto text-emerald-400/40 mb-3" />
                <h4 className="text-sm font-semibold text-textPrimary">No budget records yet</h4>
                <p className="text-xs text-textSecondary mt-1 max-w-sm mx-auto">
                  Click "+ Add Transaction" above to start tracking real income and expenses.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card p-3.5 rounded-xl border border-border/60 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          item.type === 'INCOME'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {item.type === 'INCOME' ? '+' : '–'}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-textPrimary truncate">
                          {item.category}
                        </h5>
                        <p className="text-[11px] text-textSecondary truncate">
                          {item.description || item.period} ·{' '}
                          {item.entry_date
                            ? new Date(item.entry_date).toLocaleDateString()
                            : new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-sm font-extrabold ${
                          item.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.type === 'INCOME' ? '+' : '–'}$
                        {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-textSecondary hover:text-rose-400 rounded-md hover:bg-surface-elevated transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
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

export default BudgetCalculatorModal;
