-- Migration 002: Multi-project support
-- Add project_id to task tables so each task can belong to a specific project

ALTER TABLE done_tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE in_progress_tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Backfill: copy project_id from parent report to existing tasks
UPDATE done_tasks dt SET project_id = r.project_id FROM reports r WHERE dt.report_id = r.id AND r.project_id IS NOT NULL;
UPDATE in_progress_tasks ip SET project_id = r.project_id FROM reports r WHERE ip.report_id = r.id AND r.project_id IS NOT NULL;

-- Make reports.project_id nullable so multi-project reports don't need a single primary project
ALTER TABLE reports ALTER COLUMN project_id DROP NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_done_tasks_project_id ON done_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_in_progress_tasks_project_id ON in_progress_tasks(project_id);
