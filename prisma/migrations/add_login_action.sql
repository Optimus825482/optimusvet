-- Add LOGIN action to AuditAction enum
-- This allows tracking user login events in audit logs

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN';
