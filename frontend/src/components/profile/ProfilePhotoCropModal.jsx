import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Camera,
  CheckCircle2
} from 'lucide-react';

const ProfilePhotoCropModal = ({ isOpen, onClose, onPhotoUploaded }) => {
  const { uploadProfilePhoto } = useAuth();

  const [imageSrc, setImageSrc] = useState(null);
  const [imageObj, setImageObj] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCircularRef = useRef(null);
  const previewRoundedRef = useRef(null);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setImageSrc(null);
      setImageObj(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  // Load selected image file
  const handleFileSelect = (file) => {
    setError('');
    setSuccess('');

    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Unsupported file type. Please upload a JPG, PNG, or WebP image.');
      return;
    }

    // Validate size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImageObj(img);
        setImageSrc(e.target.result);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      img.onerror = () => {
        setError('Failed to load the selected image.');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Render crop canvas & live previews
  const renderCanvases = useCallback(() => {
    if (!imageObj || !canvasRef.current) return;

    const mainCanvas = canvasRef.current;
    const ctx = mainCanvas.getContext('2d');
    const size = mainCanvas.width; // 320x320 viewport

    ctx.clearRect(0, 0, size, size);

    // Calculate scaled dimensions to cover the crop box
    const imgAspect = imageObj.width / imageObj.height;
    let drawW, drawH;

    if (imgAspect > 1) {
      drawH = size * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = size * zoom;
      drawH = drawW / imgAspect;
    }

    const drawX = (size - drawW) / 2 + pan.x;
    const drawY = (size - drawH) / 2 + pan.y;

    // Draw the source image
    ctx.drawImage(imageObj, drawX, drawY, drawW, drawH);

    // Update live previews
    const updatePreview = (previewCanvas, isCircle = false) => {
      if (!previewCanvas) return;
      const pCtx = previewCanvas.getContext('2d');
      const pSize = previewCanvas.width;

      pCtx.clearRect(0, 0, pSize, pSize);
      pCtx.save();

      if (isCircle) {
        pCtx.beginPath();
        pCtx.arc(pSize / 2, pSize / 2, pSize / 2, 0, Math.PI * 2);
        pCtx.closePath();
        pCtx.clip();
      } else {
        const radius = 16;
        pCtx.beginPath();
        pCtx.moveTo(radius, 0);
        pCtx.lineTo(pSize - radius, 0);
        pCtx.quadraticCurveTo(pSize, 0, pSize, radius);
        pCtx.lineTo(pSize, pSize - radius);
        pCtx.quadraticCurveTo(pSize, pSize, pSize - radius, pSize);
        pCtx.lineTo(radius, pSize);
        pCtx.quadraticCurveTo(0, pSize, 0, pSize - radius);
        pCtx.lineTo(0, radius);
        pCtx.quadraticCurveTo(0, 0, radius, 0);
        pCtx.closePath();
        pCtx.clip();
      }

      pCtx.drawImage(mainCanvas, 0, 0, pSize, pSize);
      pCtx.restore();
    };

    updatePreview(previewCircularRef.current, true);
    updatePreview(previewRoundedRef.current, false);
  }, [imageObj, zoom, pan]);

  useEffect(() => {
    renderCanvases();
  }, [renderCanvases]);

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomChange = (newZoom) => {
    setZoom(Math.max(0.6, Math.min(3.0, newZoom)));
  };

  const handleResetPosition = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Crop & Upload
  const handleCropAndSave = async () => {
    if (!imageObj) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Create high-res 400x400 output canvas
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = 400;
      outputCanvas.height = 400;
      const outCtx = outputCanvas.getContext('2d');

      const size = 320;
      const scaleFactor = 400 / size;

      const imgAspect = imageObj.width / imageObj.height;
      let drawW, drawH;
      if (imgAspect > 1) {
        drawH = size * zoom;
        drawW = drawH * imgAspect;
      } else {
        drawW = size * zoom;
        drawH = drawW / imgAspect;
      }

      const drawX = (size - drawW) / 2 + pan.x;
      const drawY = (size - drawH) / 2 + pan.y;

      outCtx.drawImage(
        imageObj,
        drawX * scaleFactor,
        drawY * scaleFactor,
        drawW * scaleFactor,
        drawH * scaleFactor
      );

      // Convert to high-quality JPEG blob
      const blob = await new Promise((resolve) =>
        outputCanvas.toBlob(resolve, 'image/jpeg', 0.92)
      );

      if (!blob) {
        throw new Error('Failed to generate cropped image');
      }

      // Create FormData & Upload via AuthContext
      const formData = new FormData();
      formData.append('photo', blob, 'profile_avatar.jpg');

      const data = await uploadProfilePhoto(formData);

      setSuccess('Profile photo updated successfully!');
      if (onPhotoUploaded) {
        onPhotoUploaded(data.avatar);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Photo crop upload failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload cropped photo.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={uploading ? undefined : onClose}
          className="absolute inset-0 bg-[#070b14]/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22 }}
          className="relative max-w-xl w-full bg-surface border border-border/80 shadow-2xl rounded-3xl p-6 md:p-8 z-10 overflow-hidden"
        >
          {/* Top accent bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-textPrimary tracking-tight">
                  Update Profile Photo
                </h3>
                <p className="text-xs text-textSecondary">
                  Square cropping with live zoom and positioning
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={uploading}
              className="text-textSecondary hover:text-textPrimary p-1.5 rounded-xl hover:bg-surface-elevated transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Main Content Area */}
          {!imageSrc ? (
            /* Upload / Drop Area */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-cyan-500/60 rounded-3xl p-8 text-center cursor-pointer transition-all hover:bg-surface-elevated/40 flex flex-col items-center justify-center min-h-[260px] group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud size={30} />
              </div>
              <h4 className="text-base font-bold text-textPrimary mb-1">
                Click or drag image to upload
              </h4>
              <p className="text-xs text-textSecondary max-w-xs mb-3">
                Supports JPG, PNG, or WebP up to 5MB.
              </p>
              <span className="px-3 py-1 bg-surface-elevated text-textSecondary text-[11px] font-semibold rounded-full border border-border">
                Square cropping enabled
              </span>
            </div>
          ) : (
            /* Interactive Cropping View */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                {/* Crop Viewport Box */}
                <div className="relative">
                  <div
                    className="relative w-[300px] h-[300px] rounded-2xl overflow-hidden border-2 border-cyan-500 shadow-xl shadow-cyan-500/10 cursor-grab active:cursor-grabbing bg-black/40 select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={320}
                      className="w-full h-full pointer-events-none"
                    />

                    {/* Rule of thirds grid overlay */}
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-white/15" />
                      <div className="border-r border-white/15" />
                      <div />
                    </div>

                    {/* Drag hint overlay */}
                    <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/60 text-white/80 backdrop-blur-sm pointer-events-none">
                      Drag to reposition
                    </span>
                  </div>
                </div>

                {/* Live Previews: Circular and Rounded-Square */}
                <div className="flex sm:flex-col items-center gap-4">
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                      Circular Avatar
                    </p>
                    <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 to-purple-600 shadow-md">
                      <canvas
                        ref={previewCircularRef}
                        width={120}
                        height={120}
                        className="w-full h-full rounded-full"
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                      Rounded Card
                    </p>
                    <div className="w-16 h-16 rounded-2xl p-[1.5px] bg-gradient-to-tr from-indigo-500 to-cyan-400 shadow-sm">
                      <canvas
                        ref={previewRoundedRef}
                        width={120}
                        height={120}
                        className="w-full h-full rounded-2xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Zoom & Positioning Controls */}
              <div className="bg-surface-elevated/50 p-4 rounded-2xl border border-border/60 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-textSecondary">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn size={14} className="text-cyan-400" /> Zoom Level
                  </span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleZoomChange(zoom - 0.15)}
                    className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-textSecondary hover:text-textPrimary transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>

                  <input
                    type="range"
                    min="0.6"
                    max="3.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-500 h-1.5 bg-border rounded-lg cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => handleZoomChange(zoom + 0.15)}
                    className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-textSecondary hover:text-textPrimary transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPosition}
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-textSecondary hover:text-textPrimary transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Reset Zoom & Pan"
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                </div>
              </div>

              {/* Change Image Button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                  Choose a different photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-surface-elevated text-textSecondary hover:text-textPrimary text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {imageSrc && (
              <button
                type="button"
                onClick={handleCropAndSave}
                disabled={uploading}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Uploading to Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Crop & Save Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfilePhotoCropModal;
