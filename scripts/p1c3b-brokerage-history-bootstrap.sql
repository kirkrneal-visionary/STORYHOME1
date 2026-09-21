-- Isolated P1C-3B addendum. Not production.
update public.profiles
   set brokerage_id = '11111111-1111-1111-1111-111111111111'
 where id in (
   'a1111111-1111-1111-1111-111111111111',
   'e5555555-5555-5555-5555-555555555555'
 );
update public.profiles
   set sponsor_name = 'TREC Only', sponsor_license_number = '999999'
 where id = 'c3333333-3333-3333-3333-333333333333';
