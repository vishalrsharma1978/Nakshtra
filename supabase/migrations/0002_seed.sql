-- Seed data: sample experts and today's horoscopes (safe to re-run per unique constraints)

insert into public.experts (display_name, bio, specialties, languages, experience_years, consult_rate_inr, is_active) values
  ('Pt. Ramesh Shastri', 'Vedic astrology specialist with deep expertise in career and finance remedies.', '{career,finance}', '{en,hi}', 18, 699, true),
  ('Dr. Anjali Verma', 'Relationship and marriage compatibility expert; KP system practitioner.', '{love,marriage,family}', '{en,hi}', 12, 599, true),
  ('Acharya Vikram Joshi', 'Health and education astrology; gemstone and mantra remedies.', '{health,education}', '{hi}', 22, 799, true);

insert into public.horoscopes (sign, for_date, language, content)
select s.key, current_date, 'en',
  'A favorable day for ' || s.key || '. Focus on your goals, stay patient with family matters, and avoid impulsive spending. Lucky color: ' || s.element || ' tones.'
from (values
  ('aries','Fire'),('taurus','Earth'),('gemini','Air'),('cancer','Water'),
  ('leo','Fire'),('virgo','Earth'),('libra','Air'),('scorpio','Water'),
  ('sagittarius','Fire'),('capricorn','Earth'),('aquarius','Air'),('pisces','Water')
) as s(key, element)
on conflict (sign, for_date, language) do nothing;
