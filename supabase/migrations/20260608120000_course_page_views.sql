-- Course detail page views (recorded by BFF using service role).
CREATE TABLE IF NOT EXISTS public.course_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  viewer_user_id TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_page_views_course_id
  ON public.course_page_views (course_id);

CREATE INDEX IF NOT EXISTS idx_course_page_views_viewed_at
  ON public.course_page_views (viewed_at DESC);

ALTER TABLE public.course_page_views ENABLE ROW LEVEL SECURITY;
