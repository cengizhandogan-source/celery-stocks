-- Add question column to ai_messages for interactive AI questions
ALTER TABLE ai_messages ADD COLUMN question jsonb;
