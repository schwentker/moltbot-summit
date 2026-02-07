-- Migration: Add thread/reply support to posts table
-- Run this after the initial schema (supabase_schema.sql)

-- Add thread columns
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES posts(id);

-- Indexes for efficient thread queries
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON posts(parent_post_id);

-- Composite index: fetch all replies in a thread ordered by time
CREATE INDEX IF NOT EXISTS idx_posts_thread_created ON posts(thread_id, created_at ASC);
