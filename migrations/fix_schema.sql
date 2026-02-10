-- Fix Schema Script
-- Run this if you have existing tables and need to fix/add missing columns

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add location column to timetable if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timetable' AND column_name = 'location'
  ) THEN
    ALTER TABLE timetable ADD COLUMN location TEXT;
  END IF;

  -- Add must_change_password column to users if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false;
  END IF;

  -- Add password_changed_at column to users if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_changed_at'
  ) THEN
    ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Ensure all indexes exist
  -- Create indexes only if the referenced table/column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='period_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_attendance_period ON attendance(period_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='permissions' AND column_name='faculty_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_permissions_faculty ON permissions(faculty_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='uid') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='timetable' AND column_name='day_of_week') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable(day_of_week)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='student_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints(student_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)';
  END IF;
END $$;

-- Fix any constraint issues (only if constraints exist)
DO $$
BEGIN
  -- Update permissions foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'permissions' AND constraint_name LIKE '%faculty_id%'
  ) THEN
    ALTER TABLE permissions 
      DROP CONSTRAINT IF EXISTS permissions_faculty_id_fkey;
    ALTER TABLE permissions
      ADD CONSTRAINT permissions_faculty_id_fkey 
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Update timetable foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'timetable' AND constraint_name LIKE '%faculty_id%'
  ) THEN
    ALTER TABLE timetable 
      DROP CONSTRAINT IF EXISTS timetable_faculty_id_fkey;
    ALTER TABLE timetable
      ADD CONSTRAINT timetable_faculty_id_fkey 
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
