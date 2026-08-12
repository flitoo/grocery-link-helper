-- Grocery Link Helper - seed data
-- Safe to run more than once.

INSERT INTO STORES (name) VALUES
    ('Walmart'),
    ('Costco'),
    ('T&T Supermarket');

-- Demo customer. The password hash is a placeholder (bcrypt-shaped) - there is
-- no login screen in this slice, the frontend posts with this user's id.
INSERT INTO USERS (email, password_hash, phone_number, role) VALUES
    ('demo@student.senecapolytechnic.ca',
     '$2b$10$DEMOPLACEHOLDERHASHDEMOPLACEHOLDERHASHDEMOPLACEHOLDERxx',
     '4165550123',
     'Customer')
ON CONFLICT (email) DO NOTHING;
