const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes IV for AES-GCM

/**
 * Retrieves the encryption key buffer from environment variables.
 * Ensures the key is exactly 32 bytes (256 bits).
 */
function getEncryptionKey() {
  const hexKey = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('Server configuration error: MESSAGE_ENCRYPTION_KEY is not defined');
  }

  const keyBuffer = Buffer.from(hexKey, 'hex');
  if (keyBuffer.length !== 32) {
    // If not a 32-byte hex string, hash it using SHA-256 to guarantee 32 bytes
    return crypto.createHash('sha256').update(hexKey).digest();
  }

  return keyBuffer;
}

/**
 * Encrypts plaintext message content using AES-256-GCM authenticated encryption.
 * Generates a unique cryptographic IV (nonce) for every message.
 * 
 * @param {string} text - Plaintext message body
 * @returns {Object} { encrypted_content, iv, auth_tag, encryption_version }
 */
function encryptMessage(text) {
  if (typeof text !== 'string') {
    throw new Error('Message text must be a string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted_content: encrypted,
    iv: iv.toString('hex'),
    auth_tag: authTag.toString('hex'),
    encryption_version: ALGORITHM
  };
}

/**
 * Decrypts encrypted message content using AES-256-GCM with authentication tag validation.
 * 
 * @param {Object} encryptedData - { encrypted_content, iv, auth_tag }
 * @returns {string} Plaintext message or friendly fallback on integrity failure
 */
function decryptMessage({ encrypted_content, iv, auth_tag }) {
  try {
    if (!encrypted_content || !iv || !auth_tag) {
      return '[Message content unavailable]';
    }

    const key = getEncryptionKey();
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(auth_tag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(encrypted_content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Return safe fallback if authentication tag verification fails or ciphertext is malformed
    return '[Decryption failed: Message integrity verification failed]';
  }
}

module.exports = {
  encryptMessage,
  decryptMessage
};
