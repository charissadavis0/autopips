// Firebase removed — replaced by Vercel Blob (lib/upload.js)
// Stub kept so any residual imports don't crash.
async function uploadToStorage() { throw new Error('Firebase Storage removed. Use Vercel Blob.') }
async function deleteFromStorage() {}
function getBucket() { return null }
function initFirebase() { return null }
module.exports = { getBucket, uploadToStorage, deleteFromStorage, initFirebase }
