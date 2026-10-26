const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerValidator, loginValidator } = require('../validators/auth.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const multer = require('multer');

// Memory storage for profile photo uploads (buffered to stream directly to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype?.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP image formats are supported'), false);
    }
  }
});

router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);
router.get('/stats', protect, authController.getStats);

// Profile photo upload via Cloudinary
router.post('/profile-photo', protect, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image size exceeds the 5MB limit' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, authController.uploadProfilePhoto);

// User Tour status completion
router.put('/tour-complete', protect, authController.completeTour);

// Permanently delete user account and all associated data
router.delete('/account', protect, authController.deleteAccount);
router.post('/delete-account', protect, authController.deleteAccount);

module.exports = router;

