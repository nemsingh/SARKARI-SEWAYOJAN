
ALTER TABLE public.category_links ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;
ALTER TABLE public.category_links ADD COLUMN IF NOT EXISTS last_date_text text DEFAULT NULL;
