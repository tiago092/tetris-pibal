-- Repair the update policy created with mojibake difficulty names in the
-- original schema migration. Fresh installations also receive the corrected
-- policy from the original migration.

drop policy if exists "players can update their named score" on public.scores;
create policy "players can update their named score"
on public.scores
for update
to anon
using (true)
with check (
  char_length(name) between 1 and 16
  and score between 0 and 999999999
  and level between 1 and 6
  and diff in (
    'El Diávolo (fácil)',
    'Chorizo Mezcla (medio)',
    'Mansa Gorda (difícil)'
  )
  and char_length(country) <= 40
  and char_length(city) <= 60
  and device in ('', 'desktop', 'touch')
);
