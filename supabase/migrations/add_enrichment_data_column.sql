-- Add enrichmentData JSONB column to recruitments table
ALTER TABLE recruitments ADD COLUMN IF NOT EXISTS enrichment_data jsonb;

-- Create index for performance on enrichment_data queries
CREATE INDEX IF NOT EXISTS idx_recruitments_enrichment_data 
ON recruitments USING gin (enrichment_data);
