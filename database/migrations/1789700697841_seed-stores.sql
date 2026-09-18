-- Up Migration

INSERT INTO stores (store_name, address, is_active) VALUES
    ('T&T Supermarket', '1800 Sheppard Avenue E, Unit 1115, North York, ON M2J 5A7', TRUE),
    ('No Frills', '4771 Yonge Street, Toronto, ON M2N 0G3', TRUE),
    ('Food Basics', '20 Church Avenue, North York, ON M2N 0B7', TRUE),
    ('Longo''s', '4841 Yonge Street, Level 3, North York, ON M2N 5X2', TRUE);

-- Down Migration

DELETE FROM stores
WHERE store_name IN ('T&T Supermarket', 'No Frills', 'Food Basics', 'Longo''s');
