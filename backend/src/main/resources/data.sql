-- ============================================================
-- Sample seed data for TicketWave
-- Inserts are idempotent: existing rows (by id) are skipped.
-- ============================================================

-- -------------------------
-- Venues
-- -------------------------
INSERT INTO venues (id, name, city, address, seating_type, capacity, rows, seats_per_row) VALUES
(1, 'Madison Square Garden',    'New York',    '4 Pennsylvania Plaza, New York, NY 10001',          'RESERVED',  100, 10, 10),
(2, 'Hollywood Bowl',           'Los Angeles', '2301 N Highland Ave, Los Angeles, CA 90068',         'GENERAL',  100, NULL, NULL),
(3, 'Red Rocks Amphitheatre',   'Denver',      '18300 W Alameda Pkwy, Morrison, CO 80465',           'GENERAL',   500, NULL, NULL),
(4, 'Carnegie Hall',            'New York',    '881 7th Ave, New York, NY 10019',                    'RESERVED',   50,  5,  10),
(5, 'Staples Center',           'Los Angeles', '1111 S Figueroa St, Los Angeles, CA 90015',          'RESERVED',   80,  8,  10),
(6, 'Barclays Center',          'Brooklyn',    '620 Atlantic Ave, Brooklyn, NY 11217',               'RESERVED',   60,  6,  10)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('venues', 'id'), (SELECT MAX(id) FROM venues));

-- -------------------------
-- Events
-- -------------------------
-- Note: poster images are loaded by PosterSeeder (ApplicationRunner) after this script runs.
INSERT INTO events (id, title, description, category, genre, duration_minutes) VALUES
(1,
 'Summer Rock Fest',
 'An electrifying night of rock music featuring top bands from around the world. Expect pyrotechnics, stunning light shows, and non-stop energy.',
 'Music', 'Rock', 180),

(2,
 'Beethoven Symphony Night',
 'Experience the timeless masterpieces of Beethoven performed live by a world-class orchestra. A night of classical elegance not to be missed.',
 'Music', 'Classical', 120),

(3,
 'NBA All-Star Weekend',
 'Watch the biggest stars in basketball showcase their skills in the most entertaining basketball event of the year.',
 'Sports', 'Basketball', 150),

(4,
 'Hamlet – Live on Stage',
 'Shakespeare''s timeless tragedy brought to life by an award-winning cast. A gripping exploration of ambition, betrayal, and revenge.',
 'Theatre', 'Drama', 180),

(5,
 'EDM Rave Night',
 'Dance the night away with world-renowned DJs spinning the hottest electronic beats under dazzling laser lights.',
 'Music', 'Electronic', 240),

(6,
 'Jazz Under the Stars',
 'A magical outdoor jazz evening featuring legendary musicians and smooth tunes beneath the open sky.',
 'Music', 'Jazz', 150),

(7,
 'Comedy Gala',
 'A night of laughter with the country''s top stand-up comedians. Family-friendly fun guaranteed for all ages.',
 'Comedy', 'Stand-up', 120),

(8,
 'International Food & Culture Festival',
 'A vibrant celebration of world cultures with live performances, exotic cuisines, art exhibitions, and interactive workshops.',
 'Festival', 'Cultural', 480)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('events', 'id'), (SELECT MAX(id) FROM events));

-- -------------------------
-- Event Occurrences
-- -------------------------
INSERT INTO event_occurrences (id, event_id, venue_id, start_time, price, status) VALUES
-- Summer Rock Fest – two shows
(1,  1, 1, '2026-11-15 20:00:00+00', 89.99,  'SCHEDULED'),
(2,  1, 5, '2026-11-22 20:00:00+00', 79.99,  'SCHEDULED'),

-- Beethoven Symphony Night – two shows
(3,  2, 4, '2026-11-29 19:00:00+00', 65.00,  'SCHEDULED'),
(4,  2, 4, '2026-12-06 19:00:00+00', 65.00,  'SCHEDULED'),

-- NBA All-Star Weekend
(5,  3, 1, '2026-12-13 18:00:00+00', 120.00, 'SCHEDULED'),
(6,  3, 6, '2026-12-20 18:00:00+00', 110.00, 'SCHEDULED'),

-- Hamlet 
(7,  4, 4, '2026-12-27 19:30:00+00', 55.00,  'SCHEDULED'),
(8,  4, 4, '2027-01-03 19:30:00+00', 55.00,  'SCHEDULED'),
(9,  4, 6, '2027-01-10 19:30:00+00', 60.00,  'SCHEDULED'),

-- EDM Rave Night 
(10, 5, 2, '2027-01-17 22:00:00+00', 45.00,  'SCHEDULED'),
(11, 5, 3, '2027-01-24 22:00:00+00', 40.00,  'SCHEDULED'),

-- Jazz Under the Stars 
(12, 6, 3, '2027-01-31 20:00:00+00', 35.00,  'SCHEDULED'),
(13, 6, 2, '2027-02-07 20:00:00+00', 38.00,  'SCHEDULED'),

-- Comedy Gala (one far future, one last month)
(14, 7, 6, '2027-02-14 19:00:00+00', 50.00,  'SCHEDULED'),
(15, 7, 1, '2026-03-12 19:00:00+00', 55.00,  'SCHEDULED'),

-- International Food & Culture Festival (last month)
(16, 8, 3, '2026-03-19 10:00:00+00', 25.00,  'SCHEDULED'),
(17, 8, 2, '2026-03-26 10:00:00+00', 25.00,  'SCHEDULED')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('event_occurrences', 'id'), (SELECT MAX(id) FROM event_occurrences));

-- -------------------------
-- Seats
-- -------------------------
-- Venue 1: 10 rows × 10 seats = 100  (IDs   1–100)
-- Venue 4:  5 rows × 10 seats =  50  (IDs 101–150)
-- Venue 5:  8 rows × 10 seats =  80  (IDs 151–230)
-- Venue 6:  6 rows × 10 seats =  60  (IDs 231–290)
INSERT INTO seats (id, venue_id, row_number, seat_number, is_active) VALUES
-- Venue 1, row 1
(1,1,1,1,true),(2,1,1,2,true),(3,1,1,3,true),(4,1,1,4,true),(5,1,1,5,true),(6,1,1,6,true),(7,1,1,7,true),(8,1,1,8,true),(9,1,1,9,true),(10,1,1,10,true),
-- Venue 1, row 2
(11,1,2,1,true),(12,1,2,2,true),(13,1,2,3,true),(14,1,2,4,true),(15,1,2,5,true),(16,1,2,6,true),(17,1,2,7,true),(18,1,2,8,true),(19,1,2,9,true),(20,1,2,10,true),
-- Venue 1, row 3
(21,1,3,1,true),(22,1,3,2,true),(23,1,3,3,true),(24,1,3,4,true),(25,1,3,5,true),(26,1,3,6,true),(27,1,3,7,true),(28,1,3,8,true),(29,1,3,9,true),(30,1,3,10,true),
-- Venue 1, row 4
(31,1,4,1,true),(32,1,4,2,true),(33,1,4,3,true),(34,1,4,4,true),(35,1,4,5,true),(36,1,4,6,true),(37,1,4,7,true),(38,1,4,8,true),(39,1,4,9,true),(40,1,4,10,true),
-- Venue 1, row 5
(41,1,5,1,true),(42,1,5,2,true),(43,1,5,3,true),(44,1,5,4,true),(45,1,5,5,true),(46,1,5,6,true),(47,1,5,7,true),(48,1,5,8,true),(49,1,5,9,true),(50,1,5,10,true),
-- Venue 1, row 6
(51,1,6,1,true),(52,1,6,2,true),(53,1,6,3,true),(54,1,6,4,true),(55,1,6,5,true),(56,1,6,6,true),(57,1,6,7,true),(58,1,6,8,true),(59,1,6,9,true),(60,1,6,10,true),
-- Venue 1, row 7
(61,1,7,1,true),(62,1,7,2,true),(63,1,7,3,true),(64,1,7,4,true),(65,1,7,5,true),(66,1,7,6,true),(67,1,7,7,true),(68,1,7,8,true),(69,1,7,9,true),(70,1,7,10,true),
-- Venue 1, row 8
(71,1,8,1,true),(72,1,8,2,true),(73,1,8,3,true),(74,1,8,4,true),(75,1,8,5,true),(76,1,8,6,true),(77,1,8,7,true),(78,1,8,8,true),(79,1,8,9,true),(80,1,8,10,true),
-- Venue 1, row 9
(81,1,9,1,true),(82,1,9,2,true),(83,1,9,3,true),(84,1,9,4,true),(85,1,9,5,true),(86,1,9,6,true),(87,1,9,7,true),(88,1,9,8,true),(89,1,9,9,true),(90,1,9,10,true),
-- Venue 1, row 10
(91,1,10,1,true),(92,1,10,2,true),(93,1,10,3,true),(94,1,10,4,true),(95,1,10,5,true),(96,1,10,6,true),(97,1,10,7,true),(98,1,10,8,true),(99,1,10,9,true),(100,1,10,10,true),
-- Venue 4, row 1
(101,4,1,1,true),(102,4,1,2,true),(103,4,1,3,true),(104,4,1,4,true),(105,4,1,5,true),(106,4,1,6,true),(107,4,1,7,true),(108,4,1,8,true),(109,4,1,9,true),(110,4,1,10,true),
-- Venue 4, row 2
(111,4,2,1,true),(112,4,2,2,true),(113,4,2,3,true),(114,4,2,4,true),(115,4,2,5,true),(116,4,2,6,true),(117,4,2,7,true),(118,4,2,8,true),(119,4,2,9,true),(120,4,2,10,true),
-- Venue 4, row 3
(121,4,3,1,true),(122,4,3,2,true),(123,4,3,3,true),(124,4,3,4,true),(125,4,3,5,true),(126,4,3,6,true),(127,4,3,7,true),(128,4,3,8,true),(129,4,3,9,true),(130,4,3,10,true),
-- Venue 4, row 4
(131,4,4,1,true),(132,4,4,2,true),(133,4,4,3,true),(134,4,4,4,true),(135,4,4,5,true),(136,4,4,6,true),(137,4,4,7,true),(138,4,4,8,true),(139,4,4,9,true),(140,4,4,10,true),
-- Venue 4, row 5
(141,4,5,1,true),(142,4,5,2,true),(143,4,5,3,true),(144,4,5,4,true),(145,4,5,5,true),(146,4,5,6,true),(147,4,5,7,true),(148,4,5,8,true),(149,4,5,9,true),(150,4,5,10,true),
-- Venue 5, row 1
(151,5,1,1,true),(152,5,1,2,true),(153,5,1,3,true),(154,5,1,4,true),(155,5,1,5,true),(156,5,1,6,true),(157,5,1,7,true),(158,5,1,8,true),(159,5,1,9,true),(160,5,1,10,true),
-- Venue 5, row 2
(161,5,2,1,true),(162,5,2,2,true),(163,5,2,3,true),(164,5,2,4,true),(165,5,2,5,true),(166,5,2,6,true),(167,5,2,7,true),(168,5,2,8,true),(169,5,2,9,true),(170,5,2,10,true),
-- Venue 5, row 3
(171,5,3,1,true),(172,5,3,2,true),(173,5,3,3,true),(174,5,3,4,true),(175,5,3,5,true),(176,5,3,6,true),(177,5,3,7,true),(178,5,3,8,true),(179,5,3,9,true),(180,5,3,10,true),
-- Venue 5, row 4
(181,5,4,1,true),(182,5,4,2,true),(183,5,4,3,true),(184,5,4,4,true),(185,5,4,5,true),(186,5,4,6,true),(187,5,4,7,true),(188,5,4,8,true),(189,5,4,9,true),(190,5,4,10,true),
-- Venue 5, row 5
(191,5,5,1,true),(192,5,5,2,true),(193,5,5,3,true),(194,5,5,4,true),(195,5,5,5,true),(196,5,5,6,true),(197,5,5,7,true),(198,5,5,8,true),(199,5,5,9,true),(200,5,5,10,true),
-- Venue 5, row 6
(201,5,6,1,true),(202,5,6,2,true),(203,5,6,3,true),(204,5,6,4,true),(205,5,6,5,true),(206,5,6,6,true),(207,5,6,7,true),(208,5,6,8,true),(209,5,6,9,true),(210,5,6,10,true),
-- Venue 5, row 7
(211,5,7,1,true),(212,5,7,2,true),(213,5,7,3,true),(214,5,7,4,true),(215,5,7,5,true),(216,5,7,6,true),(217,5,7,7,true),(218,5,7,8,true),(219,5,7,9,true),(220,5,7,10,true),
-- Venue 5, row 8
(221,5,8,1,true),(222,5,8,2,true),(223,5,8,3,true),(224,5,8,4,true),(225,5,8,5,true),(226,5,8,6,true),(227,5,8,7,true),(228,5,8,8,true),(229,5,8,9,true),(230,5,8,10,true),
-- Venue 6, row 1
(231,6,1,1,true),(232,6,1,2,true),(233,6,1,3,true),(234,6,1,4,true),(235,6,1,5,true),(236,6,1,6,true),(237,6,1,7,true),(238,6,1,8,true),(239,6,1,9,true),(240,6,1,10,true),
-- Venue 6, row 2
(241,6,2,1,true),(242,6,2,2,true),(243,6,2,3,true),(244,6,2,4,true),(245,6,2,5,true),(246,6,2,6,true),(247,6,2,7,true),(248,6,2,8,true),(249,6,2,9,true),(250,6,2,10,true),
-- Venue 6, row 3
(251,6,3,1,true),(252,6,3,2,true),(253,6,3,3,true),(254,6,3,4,true),(255,6,3,5,true),(256,6,3,6,true),(257,6,3,7,true),(258,6,3,8,true),(259,6,3,9,true),(260,6,3,10,true),
-- Venue 6, row 4
(261,6,4,1,true),(262,6,4,2,true),(263,6,4,3,true),(264,6,4,4,true),(265,6,4,5,true),(266,6,4,6,true),(267,6,4,7,true),(268,6,4,8,true),(269,6,4,9,true),(270,6,4,10,true),
-- Venue 6, row 5
(271,6,5,1,true),(272,6,5,2,true),(273,6,5,3,true),(274,6,5,4,true),(275,6,5,5,true),(276,6,5,6,true),(277,6,5,7,true),(278,6,5,8,true),(279,6,5,9,true),(280,6,5,10,true),
-- Venue 6, row 6
(281,6,6,1,true),(282,6,6,2,true),(283,6,6,3,true),(284,6,6,4,true),(285,6,6,5,true),(286,6,6,6,true),(287,6,6,7,true),(288,6,6,8,true),(289,6,6,9,true),(290,6,6,10,true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('seats', 'id'), (SELECT MAX(id) FROM seats));

-- -------------------------
-- Users
-- -------------------------
INSERT INTO users (user_id, email, password, name, role, created_at) VALUES
(1, 'user@gmail.com', '$2a$10$/rQhjictu6rGQWZ4tY.3d.v1B3iPcgoFezd79e2bd.hUYCZiK12bO', 'user', 'USER', '2026-04-17 14:23:11+00'),
(2, 'alice@example.com', '$2a$10$6xjS8mQxvtMtj17J4H4D8e3gL9hW0v6BvB9j5qFj4k6N1E7d9mL3u', 'Alice Johnson', 'USER',  '2026-01-05 09:15:00+00'),
(3, 'michael@example.com', '$2a$10$8oYwN8xjM4QwL2xWzM3L9.n3k4rD5fQj7yS2bM1qJ6rV3nP8tYk2a', 'Michael Chen', 'USER',  '2026-01-08 11:40:00+00'),
(4, 'admin@example.com', '$2a$10$/rQhjictu6rGQWZ4tY.3d.v1B3iPcgoFezd79e2bd.hUYCZiK12bO', 'Event Admin',  'ADMIN', '2026-01-01 08:00:00+00')
ON CONFLICT (user_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'user_id'), (SELECT MAX(user_id) FROM users));

-- -------------------------
-- Reviews
-- -------------------------
INSERT INTO reviews (id, user_id, event_id, rating, comment, created_at) VALUES
(1, 1, 1, 5, 'Unreal energy from start to finish. The stage effects were incredible.', '2026-06-16 10:20:00+00'),
(2, 2, 1, 4, 'Great lineup and sound quality. Parking was a bit crowded.', '2026-06-16 12:05:00+00'),
(3, 1, 2, 5, 'Beautiful performance and excellent acoustics. Truly memorable.', '2026-07-05 22:10:00+00'),
(4, 3, 4, 4, 'Fantastic cast and pacing. A very strong interpretation of Hamlet.', '2026-08-02 09:30:00+00'),
(5, 2, 6, 5, 'Perfect summer atmosphere and smooth jazz all evening.', '2026-09-06 08:45:00+00'),
(6, 1, 8, 4, 'Amazing variety of food and cultural shows. Worth spending the whole day.', '2026-10-03 19:00:00+00')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('reviews', 'id'), (SELECT MAX(id) FROM reviews));

-- -------------------------
-- Orders
-- -------------------------
-- Spread across multiple users, occurrences, and ticket counts.
-- Orders 13 & 14 are CANCELLED; their tickets are marked invalid.
INSERT INTO orders (id, user_id, event_occurrence_id, total_tickets, total_price, status, created_at) VALUES
-- Single-ticket orders
(1,  1,  1,  1,   89.99, 'COMPLETED', '2026-01-15 10:05:00+00'),  -- user → Rock Fest / MSG
(7,  1,  7,  1,   55.00, 'COMPLETED', '2026-03-12 14:30:00+00'),  -- user → Hamlet / Carnegie Hall
(12, 3,  9,  1,   60.00, 'COMPLETED', '2026-04-15 09:00:00+00'),  -- michael → Hamlet / Barclays
(15, 3, 15,  1,   55.00, 'COMPLETED', '2026-04-18 17:45:00+00'),  -- michael → Comedy / MSG
-- Multi-ticket orders
(2,  2,  1,  3,  269.97, 'COMPLETED', '2026-01-20 11:20:00+00'),  -- alice → Rock Fest / MSG (3 seats)
(3,  3,  3,  2,  130.00, 'COMPLETED', '2026-02-01 16:00:00+00'),  -- michael → Beethoven / Carnegie Hall
(4,  1,  5,  4,  480.00, 'COMPLETED', '2026-02-10 08:45:00+00'),  -- user → NBA / MSG (4 seats)
(5,  2, 10,  5,  225.00, 'COMPLETED', '2026-02-28 20:15:00+00'),  -- alice → EDM / Hollywood Bowl (general)
(6,  3, 12,  2,   70.00, 'COMPLETED', '2026-03-05 13:10:00+00'),  -- michael → Jazz / Red Rocks (general)
(8,  2, 14,  2,  100.00, 'COMPLETED', '2026-03-20 19:00:00+00'),  -- alice → Comedy / Barclays
(9,  3, 16,  6,  150.00, 'COMPLETED', '2026-03-30 11:30:00+00'),  -- michael → Food Festival / Red Rocks (general)
(10, 1,  6,  2,  220.00, 'COMPLETED', '2026-04-05 09:55:00+00'),  -- user → NBA / Barclays
(11, 2,  2,  3,  239.97, 'COMPLETED', '2026-04-10 12:00:00+00'),  -- alice → Rock Fest / Staples Center
(16, 1, 13,  2,   76.00, 'COMPLETED', '2026-04-20 15:20:00+00'),  -- user → Jazz / Hollywood Bowl (general)
-- Cancelled orders (tickets will be marked invalid)
(13, 1,  4,  2,  130.00, 'CANCELLED', '2026-02-20 10:00:00+00'),  -- user cancelled Beethoven / Carnegie Hall
(14, 2, 11,  3,  120.00, 'CANCELLED', '2026-03-15 18:30:00+00')   -- alice cancelled EDM / Red Rocks
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('orders', 'id'), (SELECT MAX(id) FROM orders));

-- -------------------------
-- Tickets
-- -------------------------
-- Reserved venues: seat_id is set. General venues: seat_id is NULL.
-- Cancelled orders (13, 14): is_valid = false.
INSERT INTO tickets (id, order_id, occurrence_id, seat_id, barcode, is_valid) VALUES
-- Order 1: user, Rock Fest / MSG (occurrence 1, venue 1 RESERVED), 1 ticket
(1,  1,  1,   1, 'TW-20260115-00001', true),
-- Order 2: alice, Rock Fest / MSG (occurrence 1, venue 1 RESERVED), 3 tickets
(2,  2,  1,   2, 'TW-20260120-00002', true),
(3,  2,  1,   3, 'TW-20260120-00003', true),
(4,  2,  1,   4, 'TW-20260120-00004', true),
-- Order 3: michael, Beethoven / Carnegie Hall (occurrence 3, venue 4 RESERVED), 2 tickets
(5,  3,  3, 101, 'TW-20260201-00005', true),
(6,  3,  3, 102, 'TW-20260201-00006', true),
-- Order 4: user, NBA / MSG (occurrence 5, venue 1 RESERVED), 4 tickets
(7,  4,  5,  11, 'TW-20260210-00007', true),
(8,  4,  5,  12, 'TW-20260210-00008', true),
(9,  4,  5,  13, 'TW-20260210-00009', true),
(10, 4,  5,  14, 'TW-20260210-00010', true),
-- Order 5: alice, EDM / Hollywood Bowl (occurrence 10, venue 2 GENERAL), 5 tickets
(11, 5, 10, NULL, 'TW-20260228-00011', true),
(12, 5, 10, NULL, 'TW-20260228-00012', true),
(13, 5, 10, NULL, 'TW-20260228-00013', true),
(14, 5, 10, NULL, 'TW-20260228-00014', true),
(15, 5, 10, NULL, 'TW-20260228-00015', true),
-- Order 6: michael, Jazz / Red Rocks (occurrence 12, venue 3 GENERAL), 2 tickets
(16, 6, 12, NULL, 'TW-20260305-00016', true),
(17, 6, 12, NULL, 'TW-20260305-00017', true),
-- Order 7: user, Hamlet / Carnegie Hall (occurrence 7, venue 4 RESERVED), 1 ticket
(18, 7,  7, 103, 'TW-20260312-00018', true),
-- Order 8: alice, Comedy / Barclays (occurrence 14, venue 6 RESERVED), 2 tickets
(19, 8, 14, 231, 'TW-20260320-00019', true),
(20, 8, 14, 232, 'TW-20260320-00020', true),
-- Order 9: michael, Food Festival / Red Rocks (occurrence 16, venue 3 GENERAL), 6 tickets
(21, 9, 16, NULL, 'TW-20260330-00021', true),
(22, 9, 16, NULL, 'TW-20260330-00022', true),
(23, 9, 16, NULL, 'TW-20260330-00023', true),
(24, 9, 16, NULL, 'TW-20260330-00024', true),
(25, 9, 16, NULL, 'TW-20260330-00025', true),
(26, 9, 16, NULL, 'TW-20260330-00026', true),
-- Order 10: user, NBA / Barclays (occurrence 6, venue 6 RESERVED), 2 tickets
(27, 10, 6, 241, 'TW-20260405-00027', true),
(28, 10, 6, 242, 'TW-20260405-00028', true),
-- Order 11: alice, Rock Fest / Staples Center (occurrence 2, venue 5 RESERVED), 3 tickets
(29, 11, 2, 151, 'TW-20260410-00029', true),
(30, 11, 2, 152, 'TW-20260410-00030', true),
(31, 11, 2, 153, 'TW-20260410-00031', true),
-- Order 12: michael, Hamlet / Barclays (occurrence 9, venue 6 RESERVED), 1 ticket
(32, 12, 9, 251, 'TW-20260415-00032', true),
-- Order 13 CANCELLED: user, Beethoven / Carnegie Hall (occurrence 4, venue 4 RESERVED), 2 tickets — invalid
(33, 13, 4, 121, 'TW-20260220-00033', false),
(34, 13, 4, 122, 'TW-20260220-00034', false),
-- Order 14 CANCELLED: alice, EDM / Red Rocks (occurrence 11, venue 3 GENERAL), 3 tickets — invalid
(35, 14, 11, NULL, 'TW-20260315-00035', false),
(36, 14, 11, NULL, 'TW-20260315-00036', false),
(37, 14, 11, NULL, 'TW-20260315-00037', false),
-- Order 15: michael, Comedy / MSG (occurrence 15, venue 1 RESERVED), 1 ticket
(38, 15, 15,  21, 'TW-20260418-00038', true),
-- Order 16: user, Jazz / Hollywood Bowl (occurrence 13, venue 2 GENERAL), 2 tickets
(39, 16, 13, NULL, 'TW-20260420-00039', true),
(40, 16, 13, NULL, 'TW-20260420-00040', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('tickets', 'id'), (SELECT MAX(id) FROM tickets));
