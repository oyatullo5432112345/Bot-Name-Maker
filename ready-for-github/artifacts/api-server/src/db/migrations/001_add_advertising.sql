-- Advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  link_url VARCHAR(500),
  advertiser_name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  "position" VARCHAR(50) DEFAULT 'sidebar',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  views_count INT DEFAULT 0,
  clicks_count INT DEFAULT 0,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Ad analytics table
CREATE TABLE IF NOT EXISTS ad_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL,
  user_id UUID,
  event_type VARCHAR(50) CHECK (event_type IN ('view', 'click')),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Advertisement slots table (where ads can be placed)
CREATE TABLE IF NOT EXISTS advertisement_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_name VARCHAR(100) NOT NULL UNIQUE,
  slot_type VARCHAR(50),
  max_ads INT DEFAULT 1,
  width INT,
  height INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad placements (links ads to slots)
CREATE TABLE IF NOT EXISTS ad_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL,
  advertisement_slot_id UUID NOT NULL,
  priority INT DEFAULT 0,
  rotation_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE,
  FOREIGN KEY (advertisement_slot_id) REFERENCES advertisement_slots(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ads_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_ads_dates ON advertisements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ads_created_by ON advertisements(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_ad_id ON ad_analytics(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON ad_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON ad_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_placements_ad_id ON ad_placements(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_placements_slot_id ON ad_placements(advertisement_slot_id);

-- Initial ad slots
INSERT INTO advertisement_slots (slot_name, slot_type, width, height) VALUES
  ('sidebar_dashboard', 'sidebar', 300, 250),
  ('banner_home', 'banner', 728, 90),
  ('popup_modal', 'popup', 400, 300),
  ('footer_page', 'footer', 970, 90),
  ('telegram_menu', 'telegram', 640, 360)
ON CONFLICT (slot_name) DO NOTHING;
