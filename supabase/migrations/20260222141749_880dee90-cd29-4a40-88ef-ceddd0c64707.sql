
-- Categories/Boxes for the main website (Result, Admit Card, Latest Jobs, etc.)
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Links inside each category box
CREATE TABLE public.category_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tablet items (the top quick-access cards)
CREATE TABLE public.tablet_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scrolling update bar text
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job posts (the detail pages - second code)
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_of_post TEXT NOT NULL,
  post_date TEXT,
  short_info TEXT,
  tables_html TEXT, -- stored HTML from Excel editor
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public read access for website visitors
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read category_links" ON public.category_links FOR SELECT USING (true);
CREATE POLICY "Public read tablet_items" ON public.tablet_items FOR SELECT USING (true);
CREATE POLICY "Public read posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);

-- Admin write access (authenticated users)
CREATE POLICY "Admin insert categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update categories" ON public.categories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete categories" ON public.categories FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert category_links" ON public.category_links FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update category_links" ON public.category_links FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete category_links" ON public.category_links FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert tablet_items" ON public.tablet_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update tablet_items" ON public.tablet_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete tablet_items" ON public.tablet_items FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update posts" ON public.posts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete posts" ON public.posts FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert site_settings" ON public.site_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update site_settings" ON public.site_settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete site_settings" ON public.site_settings FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed default categories
INSERT INTO public.categories (name, display_order) VALUES
  ('Latest Jobs', 1),
  ('Admit Card', 2),
  ('Result', 3),
  ('Answer Key', 4),
  ('Syllabus', 5),
  ('Admission', 6),
  ('Certificate Verification', 7),
  ('Important', 8);

-- Seed default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('update_bar_text', 'Latest Updates: SSC CGL Admit Card Released • Railway Group D Results 2026 Out • UP Police Constable Form Last Date Extended • Apply for AIIMS Nursing Jobs Now'),
  ('tagline', 'India''s No.1 Education Portal Sarkari Sewayojan - www.sarkarisewayojan.com'),
  ('contact_text', 'Contract Us- Helpdesk@sarkarisewayojan.com');

-- Seed default tablet items
INSERT INTO public.tablet_items (title, subtitle, url, display_order) VALUES
  ('Railway Group D', 'Apply Online', '#', 1),
  ('RBI Assistant', 'Apply Online', '#', 2),
  ('UPBED 2026', 'Apply Online', '#', 3),
  ('NTA JEE MAIN', 'Apply Online', '#', 4),
  ('RRB Group D', 'CEN 08/2024 Answer Key', '#', 5),
  ('Army Agniveer', 'Apply Online', '#', 6),
  ('NEET UG 2026', 'Apply Online', '#', 7),
  ('UPSC IAS Pre', 'Apply Online', '#', 8);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
