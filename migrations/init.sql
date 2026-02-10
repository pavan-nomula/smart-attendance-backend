-- Complete Database Schema for Smart Attendance System
-- Run this file to create all tables and indexes

-- Drop existing tables if needed (uncomment if you want to reset)
-- DROP TABLE IF EXISTS complaints CASCADE;
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS permissions CASCADE;
-- DROP TABLE IF EXISTS timetable CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','faculty','incharge','admin')),
  uid TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  department TEXT,
  class_name TEXT,
  must_change_password BOOLEAN DEFAULT false,
  password_changed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Faculty Activation Codes table
CREATE TABLE IF NOT EXISTS activation_codes (
  code TEXT PRIMARY KEY,
  is_used BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'faculty',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  period_id INTEGER,
  status CHAR(1) NOT NULL CHECK (status IN ('P','A')) DEFAULT 'A',
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT,
  CONSTRAINT unique_attendance UNIQUE(student_id, date, period_id)
);

-- Permissions (leave requests)
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Timetable
CREATE TABLE IF NOT EXISTS timetable (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  period_id INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  location TEXT
);

-- Complaints/Suggestions table
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','resolved','dismissed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_period ON attendance(period_id);
CREATE INDEX IF NOT EXISTS idx_permissions_student ON permissions(student_id);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON permissions(status);
CREATE INDEX IF NOT EXISTS idx_permissions_faculty ON permissions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON timetable(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable(day_of_week);
CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- Seed an initial incharge/admin user (password: admin123)
-- NOTE: The password hash below is a placeholder. 
-- To generate a proper hash, run: node scripts/generate_password_hash.js
-- Then update this INSERT statement with the generated hash
-- OR use the signup page to create the admin account instead

-- Placeholder hash (you should replace this with a real hash)
-- For now, use the signup page to create admin account, or generate hash using the script
INSERT INTO users (name, email, password_hash, role)
SELECT 
  'System Admin',
  'admin@vishnu.edu.in',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- This is a valid hash for 'admin123'
  'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@vishnu.edu.in');

-- Add comments for documentation
COMMENT ON TABLE users IS 'Stores all system users (students, faculty, incharge, admin)';
COMMENT ON TABLE attendance IS 'Records attendance for each student per period per date';
COMMENT ON TABLE permissions IS 'Leave/permission requests from students';
COMMENT ON TABLE timetable IS 'Class schedule with periods, subjects, and faculty assignments';
COMMENT ON TABLE complaints IS 'Student complaints and suggestions';

COMMENT ON COLUMN users.uid IS 'RFID/Fingerprint UID for Raspberry Pi integration';
COMMENT ON COLUMN attendance.source IS 'Source of attendance: web (manual) or pi (Raspberry Pi)';
COMMENT ON COLUMN timetable.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
