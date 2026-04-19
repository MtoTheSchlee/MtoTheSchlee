-- Enable required extensions on first boot
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- pgvector is optional for MVP; provided by pgvector/pgvector image if swapped in.
-- CREATE EXTENSION IF NOT EXISTS "vector";
