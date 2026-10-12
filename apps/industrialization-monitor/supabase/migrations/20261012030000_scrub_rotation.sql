-- Rotation for the weekly scrub's per-company web searches.
alter table companies add column last_news_check_at timestamptz;
