-- Fix screens_has_content constraint to allow source-only screens
-- A screen is valid if it has any visual content: image, html file, or inline source

ALTER TABLE screens DROP CONSTRAINT IF EXISTS screens_has_content;

DO $$ BEGIN
  ALTER TABLE screens ADD CONSTRAINT screens_has_content
    CHECK (image_url IS NOT NULL OR html_url IS NOT NULL OR source_html IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
