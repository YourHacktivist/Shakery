-- Full-text search (section 12.1), hand written: drizzle-kit has no virtual tables.
-- Texts are stored already normalized (lower case, no accents) by the repositories, which
-- update this table in the same transaction as the write. The trigram tokenizer finds a
-- substring ("groni" finds Negroni). entity_type: recipe, ingredient, product, notebook_entry,
-- tasting_note, sheet, brand_entry, study_table (D-016).
CREATE VIRTUAL TABLE `search_index` USING fts5(
	entity_type UNINDEXED,
	entity_id UNINDEXED,
	title,
	aliases,
	body,
	tokenize = 'trigram'
);
