-- Seed the 5 WAPM services
-- Run this once in the Supabase SQL editor to populate the services table.
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING.

INSERT INTO services (name, slug, icon, description, content, contact_info, opening_hours, display_order, updated_at)
VALUES
  (
    'Community Transport',
    'community-transport',
    '🚗',
    'Door-to-door transport for residents of Plas Madoc and South Wrexham — hospital appointments, shopping, social events and visiting family.',
    'Our Community Transport Scheme provides door-to-door transport for residents of Plas Madoc and South Wrexham. Whether you need to get to a hospital appointment, do your weekly shopping, attend a social event or visit family, our friendly volunteer drivers are here to help.
The service is available to anyone in Plas Madoc or South Wrexham who has difficulty accessing public transport. We use electric automatic vehicles, making the service both sustainable and comfortable.
To book a journey, simply call our transport line and we''ll arrange a driver for you.',
    '📞 07423503836',
    'Monday - Friday, 9am - 5pm',
    1,
    now()
  ),
  (
    'The Land Adventure Playground',
    'the-land',
    '🌿',
    'A unique outdoor space where children can explore, create and play freely in a natural, ever-changing environment. Free and open to all.',
    'The Land is a unique adventure playground where children can explore, create and play freely in a natural, ever-changing environment. Unlike traditional playgrounds, The Land encourages children to take risks, build with loose parts, and use their imagination to shape the space around them.
Our trained playworkers create a safe but challenging environment that supports children''s confidence, resilience and development. Children are trusted to follow their own ideas, try things out, and learn through real play experiences.
The Land is free to attend and open to all children living in Plas Madoc and the surrounding communities.',
    '📞 01978 813912',
    NULL,
    2,
    now()
  ),
  (
    'Kettle Club',
    'kettle-club',
    '☕',
    'A warm, welcoming space to enjoy a free breakfast, a hot cup of tea and friendly conversation — no booking needed, just drop in.',
    'Kettle Club is a warm, welcoming space where residents can come together to enjoy a free breakfast, a hot cup of tea and friendly conversation. It''s a relaxed, informal place to meet new people, catch up with neighbours and start the day with good company.
Created to help reduce loneliness and isolation, Kettle Club brings people together in a supportive, community-led environment.
There''s no need to book — just drop in and say hello.',
    '📞 01978 813912',
    'Weekly sessions — contact us for schedule',
    3,
    now()
  ),
  (
    'Homegrown',
    'homegrown',
    '🌻',
    'A community-led hub where residents come together to cook, share food, learn new skills and support one another.',
    'Homegrown is a community-led hub in Plas Madoc where local residents come together to cook, share food, learn new skills and support one another. It''s a welcoming space designed around connection, creativity and practical help for families, children, young people and adults.
At Homegrown, people can enjoy community meals, join groups and activities, or simply drop in for a chat. Many of our staff and volunteers are local residents themselves, bringing lived experience and a deep understanding of the community.
Homegrown is more than a building — it''s a place where people feel valued, connected and supported. It grows with the community, led by the ideas, skills and strengths of the people who use it.',
    '📞 01978 813912',
    NULL,
    4,
    now()
  ),
  (
    'Community Pantry',
    'community-pantry',
    '🛒',
    'Low-cost essential food and household items for residents in Plas Madoc and surrounding areas. No referral needed — everyone is welcome.',
    'Our Community Pantry provides low-cost, essential food and household items for residents in Plas Madoc and the surrounding areas. It''s a friendly, welcoming space where people can choose the items they need, helping to stretch budgets and reduce financial pressure.
The pantry is stocked through a mix of surplus food partnerships, community donations and regular purchasing to ensure a good range of fresh, chilled, ambient and household essentials. By reducing waste and increasing access to affordable food, the pantry supports both families and the environment.
Everyone is welcome, and there''s no referral needed. The pantry is designed to offer choice, dignity and support, with volunteers and staff on hand for a chat, a warm welcome or help with anything else you might need.',
    '📞 01978 813912',
    NULL,
    5,
    now()
  )
ON CONFLICT (slug) DO NOTHING;
