-- Face profiles table
CREATE TABLE IF NOT EXISTS face_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  face_data JSONB NOT NULL,
  face_descriptors TEXT NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Face verification logs table
CREATE TABLE IF NOT EXISTS face_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  verification_status VARCHAR(20),
  confidence_score FLOAT,
  device_info TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_face_user_id ON face_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_face_active ON face_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_verification_user ON face_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON face_verification_logs(verification_status);
