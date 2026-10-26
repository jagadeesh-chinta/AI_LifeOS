import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Award, 
  HelpCircle, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  Calendar,
  AlertTriangle,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ecosystemService from '../../services/ecosystem.service';

export default function TopicQuizModal({
  isOpen,
  onClose,
  topic,
  technology,
  stageNumber,
  goalId,
  onQuizCompleted
}) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [revisionScheduled, setRevisionScheduled] = useState(false);

  useEffect(() => {
    if (isOpen && topic) {
      loadQuiz();
    } else {
      setQuizData(null);
      setSelectedAnswers({});
      setResult(null);
      setError(null);
      setRevisionScheduled(false);
    }
  }, [isOpen, topic?.id]);

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedAnswers({});
    try {
      const res = await ecosystemService.generateTopicQuiz({
        goalId,
        stageNumber,
        topicId: topic.id,
        topicTitle: topic.title,
        technologyName: technology?.name || 'General Engineering'
      });
      if (res.success && res.quiz) {
        setQuizData(res.quiz);
      } else {
        setError('Failed to generate quiz questions. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error generating quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionIndex, optionIndex) => {
    if (result) return; // locked after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmit = async () => {
    if (!quizData || !quizData.questions) return;
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < quizData.questions.length) {
      if (!window.confirm(`You have only answered ${answeredCount} of ${quizData.questions.length} questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const answersArray = quizData.questions.map((_, i) => 
        selectedAnswers[i] !== undefined ? selectedAnswers[i] : -1
      );

      const res = await ecosystemService.submitTopicQuiz({
        goalId,
        stageNumber,
        topicId: topic.id,
        answers: answersArray,
        questions: quizData.questions
      });

      if (res.success) {
        setResult(res);
        if (onQuizCompleted) {
          onQuizCompleted(res);
        }
      } else {
        setError('Failed to submit quiz results.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleRevision = async () => {
    setScheduling(true);
    try {
      const res = await ecosystemService.scheduleTopicRevision({
        goalId,
        topicTitle: topic.title,
        preferredDate: new Date().toISOString().split('T')[0]
      });
      if (res.success) {
        setRevisionScheduled(true);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to schedule revision');
    } finally {
      setScheduling(false);
    }
  };

  if (!isOpen || !topic) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="glass-card border border-border/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col bg-surface-elevated/90"
      >
        {/* Header */}
        <div className="p-5 border-b border-border/70 bg-surface/50 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                <BrainCircuit size={16} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Skill Mastery Quiz
              </span>
              <span className="text-xs text-textSecondary">• {technology?.name}</span>
            </div>
            <h2 className="text-lg font-bold text-textPrimary leading-tight">
              {topic.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface border border-transparent hover:border-border text-textSecondary hover:text-textPrimary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-purple-400 mx-auto" />
              <p className="text-sm font-medium text-textPrimary">Generating adaptive quiz with AI...</p>
              <p className="text-xs text-textSecondary">Crafting 4 targeted questions based on this topic's key concepts.</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={loadQuiz}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && quizData && (
            <div className="space-y-6">
              {/* Quiz Results Banner */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-2xl border ${
                    result.score >= 75
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Award size={20} className={result.score >= 75 ? 'text-emerald-400' : 'text-amber-400'} />
                        <h4 className="text-base font-bold text-textPrimary">
                          Quiz Score: {result.score}% ({result.correctCount}/{result.totalQuestions})
                        </h4>
                      </div>
                      <p className="text-xs text-textSecondary mt-1">
                        Updated Mastery Level: <span className="font-semibold text-textPrimary">{result.masteryScore}%</span>
                        {result.needsRevision ? ' • Revision recommended to consolidate concepts' : ' • Solid mastery confirmed!'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadQuiz}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textSecondary flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={13} /> Retake
                      </button>

                      {result.needsRevision && !revisionScheduled && (
                        <button
                          onClick={handleScheduleRevision}
                          disabled={scheduling}
                          className="px-3 py-1.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          {scheduling ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
                          Send Revision to AI Planner
                        </button>
                      )}

                      {revisionScheduled && (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                          <CheckCircle2 size={13} /> Scheduled!
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Questions List */}
              <div className="space-y-6">
                {quizData.questions.map((q, qIndex) => {
                  const isAnswered = selectedAnswers[qIndex] !== undefined;
                  const chosenOpt = selectedAnswers[qIndex];
                  const isCorrect = result && chosenOpt === q.correct_option;

                  return (
                    <div 
                      key={qIndex}
                      className="p-4 rounded-2xl bg-surface/50 border border-border/80 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                          Question {qIndex + 1} of {quizData.questions.length}
                        </span>
                        {result && (
                          <span className={`text-xs font-semibold flex items-center gap-1 ${
                            isCorrect ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isCorrect ? (
                              <><CheckCircle2 size={14} /> Correct</>
                            ) : (
                              <><XCircle size={14} /> Incorrect</>
                            )}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-textPrimary leading-snug">
                        {q.question}
                      </p>

                      <div className="space-y-2 pt-1">
                        {q.options.map((opt, optIndex) => {
                          const isSelected = chosenOpt === optIndex;
                          let optStyle = 'bg-surface hover:bg-surface-elevated border-border text-textSecondary';

                          if (result) {
                            if (optIndex === q.correct_option) {
                              optStyle = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold';
                            } else if (isSelected && optIndex !== q.correct_option) {
                              optStyle = 'bg-rose-500/15 border-rose-500/40 text-rose-300 line-through';
                            } else {
                              optStyle = 'opacity-50 border-border text-textSecondary';
                            }
                          } else if (isSelected) {
                            optStyle = 'bg-purple-500/20 border-purple-500 text-purple-300 font-medium shadow-sm';
                          }

                          return (
                            <button
                              key={optIndex}
                              type="button"
                              onClick={() => handleSelectOption(qIndex, optIndex)}
                              disabled={Boolean(result)}
                              className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optStyle}`}
                            >
                              <span>{opt}</span>
                              {isSelected && !result && (
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {result && q.explanation && (
                        <div className="mt-2 p-3 rounded-xl bg-surface-elevated/80 border border-border/60 text-xs text-textSecondary space-y-1">
                          <span className="font-bold text-textPrimary">Explanation: </span>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/70 bg-surface/50 flex items-center justify-between">
          <div className="text-xs text-textSecondary">
            {!result ? (
              <span>Answer all 4 questions to calculate accurate mastery score.</span>
            ) : (
              <span>Scores are permanently stored in your career mastery profile.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!result ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || loading || !quizData}
                className="px-5 py-2.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Submit Quiz Answers
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textPrimary cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
