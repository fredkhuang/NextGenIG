-- Community submissions feed the review queue.
alter table submissions drop constraint submissions_kind_check;
alter table submissions add constraint submissions_kind_check
  check (kind in ('new_company', 'new_site', 'new_announcement', 'correction', 'tip'));
alter table submissions add column submitter_ip_hash text;

alter table proposed_changes add column submission_id uuid references submissions(id) on delete set null;
create index proposed_changes_submission on proposed_changes (submission_id);
