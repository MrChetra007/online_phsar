-- ---------------------------------------------------------------------
-- 008_customer_role.sql
-- Adds the shopper role. Kept in its own migration because a newly added
-- enum value cannot be used in the same transaction that adds it.
-- ---------------------------------------------------------------------

alter type user_role add value if not exists 'customer';
