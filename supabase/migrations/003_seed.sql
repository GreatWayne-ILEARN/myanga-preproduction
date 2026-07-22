-- Seed real-ish content for every public section.
insert into reel_config (id) values (1) on conflict (id) do nothing;
insert into categories (name) values ('Bridals'),('Agbada'),('Casual'),('Evening'),('Corporate'),('Aso-Oke'),('Adire') on conflict do nothing;
insert into editorial_picks (kind,title,brand,is_current) values
  ('outfit_of_day','Aso-Oke Reimagined','Maki Oh',true),
  ('bride_of_week','Coral & Lace','Andrea Iyamah',true),
  ('groom_of_week','Midnight Agbada','Mai Atafo',true),
  ('designer_in_focus','Lisa Folawiyo','Jewel by Lisa',true);
insert into listings (name,slug,status) values ('Maki Oh','maki-oh','ACTIVE'),('Mai Atafo','mai-atafo','ACTIVE'),('Tubo','tubo','ACTIVE') on conflict (slug) do nothing;
insert into products (name,price,status) values ('Adire Wrap Dress',45000,'ACTIVE'),('Agbada Set',180000,'ACTIVE'),('Aso-Oke Gele',25000,'ACTIVE'),('Lace Kaftan',95000,'ACTIVE');
insert into discovers (title,excerpt) values ('Lagos Fashion Week Recap','The standout collections.'),('How to Tie Gele 5 Ways','Step-by-step headwrap.');
insert into premium_content (title,tier) values ('Stylist Masterclass','Premium'),('Designer Price Lists','Premium');
insert into reel_brand_placements (caption,impressions_purchased,impressions_delivered,priority) values ('New bridal drop',1000,240,1),('Owambe edit',500,500,2);
