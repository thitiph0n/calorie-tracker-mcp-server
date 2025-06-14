// Export all tool handlers
export { addEntryHandler } from './add-entry.js';
export { listEntriesHandler } from './list-entries.js';
export { updateEntryHandler } from './update-entry.js';
export { deleteEntryHandler } from './delete-entry.js';
export { registerUserHandler } from './register-user.js';
export { revokeUserHandler } from './revoke-user.js';
export { getProfile } from './get-profile.js';
export { updateProfile } from './update-profile.js';
export { getProfileHistory } from './get-profile-history.js';

// Re-export types and utilities for convenience
export * from '../types/index.js';
export * from '../utils/responses.js';
