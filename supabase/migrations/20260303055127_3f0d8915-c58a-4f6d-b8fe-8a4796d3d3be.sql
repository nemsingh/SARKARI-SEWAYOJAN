
-- Add Hindi translation columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS name_of_post_hi text DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_date_hi text DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS short_info_hi text DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tables_html_hi text DEFAULT NULL;

-- Add slug column for SEO-friendly URLs
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS slug text UNIQUE;
