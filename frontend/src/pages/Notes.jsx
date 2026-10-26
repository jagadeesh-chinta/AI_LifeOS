import React, { useState, useEffect, useRef } from 'react';
import { getNotes, createNote, updateNote, deleteNote } from '../services/note.service';
import { getDocuments, uploadDocument, downloadDocument, previewDocument, deleteDocument } from '../services/document.service';
import {
  BookOpen, Plus, Trash2, Tag, Search, Check, X,
  UploadCloud, FileText, FileSpreadsheet, Image as ImageIcon,
  File, Download, Eye, AlertCircle, CheckCircle2,
  FolderOpen, ArrowUpDown, Filter, Sparkles, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper for formatting file sizes
const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Return stylized icon and color for document extension
const getFileIcon = (ext) => {
  const e = (ext || '').toLowerCase();
  if (e === 'pdf') {
    return { icon: <FileText size={22} />, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  }
  if (['doc', 'docx'].includes(e)) {
    return { icon: <FileText size={22} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  }
  if (['xls', 'xlsx', 'csv'].includes(e)) {
    return { icon: <FileSpreadsheet size={22} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  }
  if (['ppt', 'pptx'].includes(e)) {
    return { icon: <FileText size={22} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  }
  if (['png', 'jpg', 'jpeg'].includes(e)) {
    return { icon: <ImageIcon size={22} />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
  }
  return { icon: <File size={22} />, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
};

const Notes = () => {
  // Navigation tab: 'all' | 'notes' | 'documents'
  const [activeTab, setActiveTab] = useState('all');

  // Search query
  const [search, setSearch] = useState('');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', tags: '' });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [docToDelete, setDocToDelete] = useState(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef(null);

  // Fetch initial notes & documents
  useEffect(() => {
    fetchNotes();
  }, [search]);

  useEffect(() => {
    fetchDocs();
  }, [search]);

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const data = await getNotes(search);
      setNotes(data || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchDocs = async () => {
    setLoadingDocs(true);
    try {
      const data = await getDocuments(search);
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Note CRUD handlers
  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNote.title.trim()) return;

    try {
      const note = await createNote(newNote);
      setNotes([note, ...notes]);
      setNewNote({ title: '', content: '', tags: '' });
      setShowNoteForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNote = async (id, updatedData) => {
    try {
      const updated = await updateNote(id, updatedData);
      setNotes(notes.map((n) => (n.id === id ? updated : n)));
      setEditingNoteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await deleteNote(noteToDelete.id);
      setNotes(notes.filter((n) => n.id !== noteToDelete.id));
      setNoteToDelete(null);
    } catch (err) {
      alert('Failed to delete note: ' + err.message);
    }
  };

  // Document Upload handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    setUploadError('');
    setUploadSuccess('');

    // Check size limit (25 MB)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError(`File is too large (${formatBytes(file.size)}). Maximum upload size is 25 MB.`);
      return;
    }

    // Check allowed extension
    const allowed = ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'xls', 'pptx', 'ppt', 'csv', 'png', 'jpg', 'jpeg'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError(`File extension .${ext} is not supported. Supported formats: PDF, Word, Excel, PowerPoint, Text, Images.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = await uploadDocument(file, (progress) => {
        setUploadProgress(progress);
      });
      setDocuments([uploaded, ...documents]);
      setUploadSuccess(`"${file.name}" uploaded successfully!`);
      setTimeout(() => setUploadSuccess(''), 4000);
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Document Download handler
  const handleDownload = async (doc) => {
    try {
      await downloadDocument(doc.id, doc.original_name);
    } catch (err) {
      alert('Failed to download document: ' + (err.response?.data?.message || err.message));
    }
  };

  // Document Preview handler
  const handlePreview = async (doc) => {
    setPreviewDoc(doc);
    setPreviewBlobUrl(null);
    setPreviewLoading(true);

    try {
      const { blobUrl } = await previewDocument(doc.id);
      setPreviewBlobUrl(blobUrl);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewDoc(null);
    setPreviewBlobUrl(null);
  };

  // Document Delete handler
  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      await deleteDocument(docToDelete.id);
      setDocuments(documents.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      alert('Failed to delete document: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30">
              <BookOpen className="text-cyan-400" size={28} />
            </div>
            Knowledge Base & Documents
          </h1>
          <p className="text-textSecondary mt-1">
            Capture thoughts, organize research, and manage your important files and documents.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt,.csv,.png,.jpg,.jpeg"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-sm font-semibold flex items-center gap-2 hover:border-cyan-500/40"
          >
            <UploadCloud size={18} className="text-cyan-400" />
            Upload Document
          </button>

          <button
            onClick={() => setShowNoteForm(!showNoteForm)}
            className="btn-primary text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 whitespace-nowrap"
          >
            <Plus size={18} /> New Note
          </button>
        </div>
      </div>

      {/* Notifications / Progress Bar */}
      {uploading && (
        <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-300 mb-2">
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
              Uploading document...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{uploadSuccess}</span>
        </motion.div>
      )}

      {uploadError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>{uploadError}</span>
        </motion.div>
      )}

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Segmented Filter */}
        <div className="flex items-center p-1 rounded-xl glass-card border border-border/80 self-start">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            All Items ({notes.length + documents.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'notes'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'documents'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Documents ({documents.length})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
          <input
            type="text"
            placeholder="Search notes and files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-xs"
          />
        </div>
      </div>

      {/* Create Note Collapsible Form */}
      <AnimatePresence>
        {showNoteForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateNote}
            className="mb-8 overflow-hidden"
          >
            <div className="glass-card p-6 space-y-4 border border-cyan-500/30 shadow-xl">
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <h3 className="text-base font-bold text-textPrimary flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" />
                  New Knowledge Note
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNoteForm(false)}
                  className="text-textSecondary hover:text-textPrimary"
                >
                  <X size={16} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Note Title"
                className="input-field font-semibold text-base"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                autoFocus
                required
              />

              <textarea
                placeholder="Capture your thoughts, ideas, or meeting notes..."
                rows={5}
                className="input-field text-sm resize-y"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              />

              <div className="flex items-center gap-3">
                <Tag className="text-textSecondary" size={16} />
                <input
                  type="text"
                  placeholder="Tags (comma separated, e.g. research, ideas, sprint)"
                  className="input-field flex-1 text-xs"
                  value={newNote.tags}
                  onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteForm(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs shadow-md shadow-cyan-500/20">
                  Save Note
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="space-y-8">
        {/* SECTION: Uploaded Documents */}
        {(activeTab === 'all' || activeTab === 'documents') && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <FolderOpen className="text-cyan-400" size={20} />
                Documents & Attachments
                <span className="text-xs font-normal text-textSecondary">
                  ({documents.length})
                </span>
              </h2>
            </div>

            {documents.length === 0 ? (
              <div className="glass-card p-8 text-center rounded-2xl border-dashed border-border/80">
                <UploadCloud className="mx-auto text-cyan-400/40 mb-3" size={40} />
                <h4 className="text-sm font-semibold text-textPrimary">No documents uploaded yet</h4>
                <p className="text-xs text-textSecondary mt-1 max-w-sm mx-auto">
                  Upload PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), text, or image files up to 25 MB.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 btn-secondary text-xs inline-flex items-center gap-1.5"
                >
                  <UploadCloud size={14} className="text-cyan-400" /> Choose File
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => {
                  const style = getFileIcon(doc.file_extension);
                  return (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card p-4 rounded-xl border border-border/60 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${style.color}`}>
                          {style.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4
                            className="text-sm font-semibold text-textPrimary truncate"
                            title={doc.original_name}
                          >
                            {doc.original_name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-textSecondary mt-1">
                            <span className="uppercase font-semibold tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border">
                              {doc.file_extension}
                            </span>
                            <span>{formatBytes(doc.file_size)}</span>
                            <span>·</span>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                        <button
                          onClick={() => handlePreview(doc)}
                          className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 p-1 hover:bg-cyan-500/10 rounded-md transition-colors"
                        >
                          <Eye size={14} /> Preview
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-surface-elevated rounded-md transition-colors"
                            title="Download Document"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => setDocToDelete(doc)}
                            className="p-1.5 text-textSecondary hover:text-rose-400 hover:bg-surface-elevated rounded-md transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION: Notes Knowledge Base */}
        {(activeTab === 'all' || activeTab === 'notes') && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <BookOpen className="text-purple-400" size={20} />
                Text Notes
                <span className="text-xs font-normal text-textSecondary">
                  ({notes.length})
                </span>
              </h2>
            </div>

            {notes.length === 0 ? (
              <div className="glass-card p-8 text-center rounded-2xl">
                <BookOpen className="mx-auto text-textSecondary mb-3 opacity-40" size={36} />
                <h4 className="text-sm font-semibold text-textPrimary">No notes found</h4>
                <p className="text-xs text-textSecondary mt-1">
                  Click "+ New Note" to write down your first entry.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {notes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-5 rounded-xl flex flex-col group relative border border-border/60 hover:border-purple-500/40 shadow-sm hover:shadow-md transition-all"
                  >
                    {editingNoteId === note.id ? (
                      <div className="flex flex-col h-full gap-3">
                        <input
                          type="text"
                          className="input-field font-semibold text-sm"
                          defaultValue={note.title}
                          id={`edit-title-${note.id}`}
                        />
                        <textarea
                          className="input-field text-xs flex-1 min-h-[110px] resize-y"
                          defaultValue={note.content}
                          id={`edit-content-${note.id}`}
                        />
                        <input
                          type="text"
                          className="input-field text-xs"
                          defaultValue={note.tags}
                          id={`edit-tags-${note.id}`}
                          placeholder="Tags..."
                        />
                        <div className="flex justify-end gap-2 mt-auto pt-2">
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="p-1.5 text-textSecondary hover:bg-surface-elevated rounded-lg"
                          >
                            <X size={15} />
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateNote(note.id, {
                                title: document.getElementById(`edit-title-${note.id}`).value,
                                content: document.getElementById(`edit-content-${note.id}`).value,
                                tags: document.getElementById(`edit-tags-${note.id}`).value
                              })
                            }
                            className="p-1.5 bg-primary/20 text-primary hover:bg-primary/40 rounded-lg"
                          >
                            <Check size={15} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2.5">
                          <h3 className="text-base font-semibold text-textPrimary truncate pr-14">
                            {note.title}
                          </h3>
                          <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                            <button
                              onClick={() => setEditingNoteId(note.id)}
                              className="text-textSecondary hover:text-cyan-400 p-1 rounded hover:bg-surface-elevated"
                              title="Edit Note"
                            >
                              <Tag size={14} />
                            </button>
                            <button
                              onClick={() => setNoteToDelete(note)}
                              className="text-textSecondary hover:text-rose-400 p-1 rounded hover:bg-surface-elevated"
                              title="Delete Note"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="text-textSecondary text-xs mb-4 line-clamp-4 flex-1 whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>

                        <div className="mt-auto pt-3 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                          {note.tags &&
                            note.tags.split(',').map((tag, idx) => (
                              tag.trim() && (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-surface-elevated border border-border text-textSecondary px-2 py-0.5 rounded-md"
                                >
                                  #{tag.trim()}
                                </span>
                              )
                            ))}
                          <span className="text-[10px] text-textSecondary/60 ml-auto">
                            {new Date(note.updated_at || note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-4xl w-full h-[85vh] flex flex-col p-5 border border-border/80 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-textPrimary truncate">
                      {previewDoc.original_name}
                    </h3>
                    <p className="text-[11px] text-textSecondary">
                      {formatBytes(previewDoc.file_size)} · {previewDoc.mime_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(previewDoc)}
                    className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    onClick={handleClosePreview}
                    className="text-textSecondary hover:text-textPrimary p-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Preview Content Area */}
              <div className="flex-1 overflow-auto my-3 bg-surface-elevated/40 rounded-xl flex items-center justify-center p-2 relative">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
                    <span className="text-xs text-textSecondary">Loading preview...</span>
                  </div>
                ) : previewBlobUrl ? (
                  ['png', 'jpg', 'jpeg'].includes(previewDoc.file_extension?.toLowerCase()) ? (
                    <img
                      src={previewBlobUrl}
                      alt={previewDoc.original_name}
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  ) : previewDoc.file_extension?.toLowerCase() === 'pdf' ? (
                    <iframe
                      src={previewBlobUrl}
                      title={previewDoc.original_name}
                      className="w-full h-full rounded-lg border-0"
                    />
                  ) : (
                    <div className="text-center p-8 max-w-md">
                      <FileText size={48} className="mx-auto text-cyan-400 mb-3 opacity-80" />
                      <h4 className="text-sm font-semibold text-textPrimary">Preview Ready</h4>
                      <p className="text-xs text-textSecondary mt-1">
                        This file format ({previewDoc.file_extension}) can be downloaded directly to view with your native application.
                      </p>
                      <button
                        onClick={() => handleDownload(previewDoc)}
                        className="mt-4 btn-primary text-xs inline-flex items-center gap-2"
                      >
                        <Download size={14} /> Download Now
                      </button>
                    </div>
                  )
                ) : (
                  <div className="text-xs text-textSecondary">Preview unavailable.</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Document Confirmation Modal */}
      <AnimatePresence>
        {docToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-sm w-full p-6 border border-border/80 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <AlertCircle size={22} />
                <h3 className="text-base font-bold text-textPrimary">Delete Document?</h3>
              </div>
              <p className="text-xs text-textSecondary mb-5">
                Are you sure you want to delete <strong className="text-textPrimary">"{docToDelete.original_name}"</strong>? The file will be permanently removed.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDocToDelete(null)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteDoc}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all"
                >
                  Delete File
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Note Confirmation Modal */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-sm w-full p-6 border border-border/80 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <AlertCircle size={22} />
                <h3 className="text-base font-bold text-textPrimary">Delete Note?</h3>
              </div>
              <p className="text-xs text-textSecondary mb-5">
                Are you sure you want to delete <strong className="text-textPrimary">"{noteToDelete.title}"</strong>?
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNoteToDelete(null)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteNote}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all"
                >
                  Delete Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notes;
