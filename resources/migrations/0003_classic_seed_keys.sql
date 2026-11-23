-- The extra classics take a neutral seed key (D-054): same recipes, deleted ones included.
UPDATE `recipes` SET `seed_key` = 'classic.' || substr(`seed_key`, 5) WHERE `seed_key` LIKE 'c24.%';
