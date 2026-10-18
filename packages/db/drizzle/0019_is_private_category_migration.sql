-- Migration 0017: Migrate from PERSONAL category type to orthogonal is_private boolean flag
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE categories SET is_private = TRUE, type = 'EVERYDAY' WHERE type = 'PERSONAL';
