-- Seed creators + premium garment database for SmartSearch & Virtual Wear
insert into creators (name, slug, discipline, city, credibility_score, is_promoted, promotion_kind) values
  ('Maki Oh', 'maki-oh', 'fashion', 'Lagos', 95, true, 'credibility'),
  ('Mai Atafo', 'mai-atafo', 'fashion', 'Lagos', 92, true, 'credibility'),
  ('Andrea Iyamah', 'andrea-iyamah', 'fashion', 'Lagos', 90, true, 'credibility'),
  ('Tubo', 'tubo', 'fashion', 'Lagos', 88, true, 'paid'),
  ('Orange Culture', 'orange-culture', 'fashion', 'Lagos', 85, false, null),
  ('Emmy Kasbit', 'emmy-kasbit', 'fashion', 'Lagos', 84, false, null),
  ('Lisa Folawiyo', 'lisa-folawiyo', 'fashion', 'Lagos', 91, true, 'credibility'),
  ('Deola Sagoe', 'deola-sagoe', 'fashion', 'Lagos', 93, true, 'credibility')
on conflict (slug) do nothing;

-- Garments: one insert per creator style combo
insert into garments (creator_id, name, part, style, event_tags, colours, gender, price_ngn, is_premium)
select c.id, g.name, g.part, g.style, g.events, g.colours, g.gender, g.price, true
from creators c
cross join lateral (values
  ('Coral Agbada Set', 'main_outfit', 'Agbada', array['wedding','festival','traditional'], array['Coral','Gold'], 'male', 285000),
  ('Royal Lace Gown', 'main_outfit', 'Gown', array['wedding','evening'], array['White','Gold'], 'female', 320000),
  ('Aso-Oke Gele', 'head_piece', 'Aso-Oke', array['wedding','traditional'], array['Coral','Gold'], 'female', 45000),
  ('Beaded Clutch', 'bag', 'Ankara', array['wedding','corporate'], array['Gold'], 'female', 35000),
  ('Embroidered Kaftan', 'main_outfit', 'Kaftan', array['corporate','casual'], array['Emerald'], 'male', 165000),
  ('Senator Suit', 'main_outfit', 'Senator', array['corporate','wedding'], array['Navy'], 'male', 195000),
  ('Ankara Two-Piece', 'main_outfit', 'Two-piece', array['casual','festival'], array['Ankara'], 'female', 98000),
  ('Gold Heels', 'shoes', 'Gown', array['wedding','evening'], array['Gold'], 'female', 55000)
) as g(name, part, style, events, colours, gender, price)
where c.slug = 'maki-oh'
on conflict do nothing;

-- Repeat pattern for other creators (abbreviated — Mai Atafo, Andrea Iyamah)
insert into garments (creator_id, name, part, style, event_tags, colours, gender, price_ngn, is_premium)
select c.id, g.name, g.part, g.style, g.events, g.colours, g.gender, g.price, true
from creators c, (values
  ('Midnight Agbada', 'main_outfit', 'Agbada', array['wedding','traditional'], array['Navy','Gold'], 'male', 310000),
  ('Silk Senator', 'main_outfit', 'Senator', array['corporate'], array['Charcoal'], 'male', 175000)
) as g(name, part, style, events, colours, gender, price)
where c.slug = 'mai-atafo';

insert into garments (creator_id, name, part, style, event_tags, colours, gender, price_ngn, is_premium)
select c.id, g.name, g.part, g.style, g.events, g.colours, g.gender, g.price, true
from creators c, (values
  ('Coral Bridal Lace', 'main_outfit', 'Lace', array['wedding'], array['Coral','White'], 'female', 450000),
  ('Bridal Veil Set', 'head_piece', 'Lace', array['wedding'], array['White'], 'female', 65000)
) as g(name, part, style, events, colours, gender, price)
where c.slug = 'andrea-iyamah';

-- Sample events
insert into events (title, description, venue, city, starts_at, is_published) values
  ('Lagos Fashion Week Preview', 'Runway preview of top African designers.', 'Eko Hotel', 'Lagos', now() + interval '14 days', true),
  ('Abuja Bridal Expo', 'Bridal fashion, makeup and photography showcase.', 'Transcorp Hilton', 'Abuja', now() + interval '30 days', true);
