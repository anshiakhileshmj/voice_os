
// Utility functions converted from TypeScript

// Class name utility (similar to cn function)
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Date formatting utilities
function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
}

// String utilities
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str, length = 100) {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Validation utilities
function isEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password) {
  return password.length >= 6;
}

// File utilities
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

// DOM utilities
function createElement(tag, className, textContent) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// Local storage utilities
function setLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function getLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

// Export utilities to global scope
window.Utils = {
  cn,
  formatDate,
  capitalizeFirst,
  truncate,
  isEmail,
  isValidPassword,
  formatFileSize,
  getFileExtension,
  createElement,
  removeAllChildren,
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage
};
