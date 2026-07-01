/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const crypto = require('crypto');

// Encryption key from environment - MUST be 32 bytes for AES-256
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  if (Buffer.from(key, 'hex').length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
  return Buffer.from(key, 'hex');
};

// Encrypt sensitive data using AES-256-GCM
const encrypt = (plaintext) => {
  try {
    if (!plaintext) return null;

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encryptedData (all hex for easy storage)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt sensitive data
const decrypt = (encryptedData) => {
  try {
    if (!encryptedData) return null;

    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data');
  }
};

// Generate a strong encryption key (for setup)
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash for comparisons (not reversible, for data validation)
const hashData = (data) => {
  return crypto.createHash('sha256').update(String(data)).digest('hex');
};

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey,
  hashData,
  getEncryptionKey
};
