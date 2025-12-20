-- Campaign Templates table
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('MANUAL', 'BIRTHDAY', 'ANNIVERSARY', 'INACTIVE', 'CUSTOM')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('MANUAL', 'BIRTHDAY', 'ANNIVERSARY', 'INACTIVE', 'SCHEDULED', 'AUTOMATIC')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES campaign_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Recipients table (tracks individual message delivery)
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPENED')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaign_templates_salon_id ON campaign_templates(salon_id);
CREATE INDEX idx_campaign_templates_type ON campaign_templates(campaign_type);
CREATE INDEX idx_campaign_templates_created_by ON campaign_templates(created_by);
CREATE INDEX idx_campaigns_salon_id ON campaigns(salon_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at);
CREATE INDEX idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaigns_template_id ON campaigns(template_id);
CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_customer_id ON campaign_recipients(customer_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);

-- Enable RLS
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Campaign Templates policies
CREATE POLICY "Users can view templates in their salon"
  ON campaign_templates FOR SELECT
  USING (salon_id = get_user_salon_id());

CREATE POLICY "Owners can create templates"
  ON campaign_templates FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Owners can update templates"
  ON campaign_templates FOR UPDATE
  USING (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Owners can delete templates"
  ON campaign_templates FOR DELETE
  USING (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Campaigns policies
CREATE POLICY "Users can view campaigns in their salon"
  ON campaigns FOR SELECT
  USING (salon_id = get_user_salon_id());

CREATE POLICY "Owners can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Owners can update campaigns"
  ON campaigns FOR UPDATE
  USING (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Owners can delete campaigns"
  ON campaigns FOR DELETE
  USING (
    salon_id = get_user_salon_id()
    AND created_by = (select auth.uid())
  );

-- Campaign Recipients policies
CREATE POLICY "Users can view recipients in their salon"
  ON campaign_recipients FOR SELECT
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE salon_id = get_user_salon_id())
  );

CREATE POLICY "System can create recipients"
  ON campaign_recipients FOR INSERT
  WITH CHECK (
    campaign_id IN (SELECT id FROM campaigns WHERE salon_id = get_user_salon_id())
  );

CREATE POLICY "System can update recipients"
  ON campaign_recipients FOR UPDATE
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE salon_id = get_user_salon_id())
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_campaign_templates_updated_at
  BEFORE UPDATE ON campaign_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

