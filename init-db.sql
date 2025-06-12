-- Initialize database for DataFog PII Detector
-- This script creates the necessary extensions and initial setup

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text similarity searches (useful for fuzzy matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create database user if not exists (Docker will handle this, but keeping for reference)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'datafog_user') THEN
--         CREATE ROLE datafog_user WITH LOGIN PASSWORD 'datafog_secure_password';
--     END IF;
-- END
-- $$;

-- Grant necessary permissions
-- GRANT ALL PRIVILEGES ON DATABASE datafog TO datafog_user;

-- Set timezone to UTC for consistency
SET timezone = 'UTC';

-- Create indexes for better performance (will be created by Drizzle migrations)
-- These are commented out as Drizzle will handle schema creation
-- But keeping for reference of recommended indexes:

-- Performance indexes for common queries:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_status ON files(status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detections_file_id ON detections(file_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detections_type ON detections(type);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detections_risk_level ON detections(risk_level);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_created_at ON cases(created_at);

-- Full-text search indexes for content:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detections_context_fts ON detections USING gin(to_tsvector('portuguese', context));
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_original_name_fts ON files USING gin(to_tsvector('portuguese', original_name));

COMMIT;