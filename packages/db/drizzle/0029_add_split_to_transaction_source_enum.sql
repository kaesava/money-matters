-- Migration 0027: Add SPLIT to transaction_source_enum
ALTER TYPE "transaction_source_enum" ADD VALUE IF NOT EXISTS 'SPLIT';
