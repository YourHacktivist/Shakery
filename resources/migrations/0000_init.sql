CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`batch_hint` text DEFAULT 'ok' NOT NULL,
	`seed_key` text,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "categories_batch_hint_ck" CHECK("categories"."batch_hint" IN ('ok', 'add_at_service', 'fresh'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_seed_key_unique` ON `categories` (`seed_key`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_live_uq` ON `categories` (`slug`) WHERE "categories"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `collection_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`collection_id` text NOT NULL,
	`recipe_id` text,
	`sheet_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`note` text,
	`sale_price_cents` integer,
	`vat_rate_bp` integer,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sheet_id`) REFERENCES `knowledge_sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "collection_items_price_ck" CHECK("collection_items"."sale_price_cents" IS NULL OR "collection_items"."sale_price_cents" >= 0),
	CONSTRAINT "collection_items_target_ck" CHECK(("collection_items"."recipe_id" IS NULL) <> ("collection_items"."sheet_id" IS NULL)),
	CONSTRAINT "collection_items_vat_ck" CHECK("collection_items"."vat_rate_bp" IS NULL OR ("collection_items"."vat_rate_bp" BETWEEN 0 AND 10000))
);
--> statement-breakpoint
CREATE INDEX `collection_items_collection_idx` ON `collection_items` (`collection_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `collection_items_recipe_idx` ON `collection_items` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `collection_items_sheet_idx` ON `collection_items` (`sheet_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`description` text,
	`kind` text DEFAULT 'other' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collections_kind_ck" CHECK("collections"."kind" IN ('menu', 'competition', 'theme', 'other'))
);
--> statement-breakpoint
CREATE TABLE `glasses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`capacity_ml` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`seed_key` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `glasses_seed_key_unique` ON `glasses` (`seed_key`);--> statement-breakpoint
CREATE TABLE `guide_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`guide_id` text NOT NULL,
	`number` integer NOT NULL,
	`text` text NOT NULL,
	FOREIGN KEY (`guide_id`) REFERENCES `study_guides`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "guide_sources_number_ck" CHECK("guide_sources"."number" >= 1)
);
--> statement-breakpoint
CREATE INDEX `guide_sources_guide_idx` ON `guide_sources` (`guide_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `guide_sources_number_uq` ON `guide_sources` (`guide_id`,`number`) WHERE "guide_sources"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `ice_types` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`seed_key` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ice_types_seed_key_unique` ON `ice_types` (`seed_key`);--> statement-breakpoint
CREATE TABLE `ingredient_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`ingredient_id` text NOT NULL,
	`alias` text NOT NULL,
	`alias_normalized` text NOT NULL,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ingredient_aliases_ingredient_idx` ON `ingredient_aliases` (`ingredient_id`);--> statement-breakpoint
CREATE INDEX `ingredient_aliases_normalized_idx` ON `ingredient_aliases` (`alias_normalized`);--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	`category_id` text NOT NULL,
	`default_abv` real,
	`sugar_g_per_l` real,
	`acid_g_per_l` real,
	`composition_source` text,
	`composition_confidence` text,
	`flavor_tags` text DEFAULT '[]' NOT NULL,
	`description` text,
	`allergens` text DEFAULT '[]' NOT NULL,
	`prep_recipe_id` text,
	`is_staple` integer DEFAULT false NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`external_ref` text,
	`seed_key` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prep_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ingredients_abv_ck" CHECK("ingredients"."default_abv" IS NULL OR ("ingredients"."default_abv" >= 0 AND "ingredients"."default_abv" <= 100)),
	CONSTRAINT "ingredients_sugar_ck" CHECK("ingredients"."sugar_g_per_l" IS NULL OR "ingredients"."sugar_g_per_l" >= 0),
	CONSTRAINT "ingredients_acid_ck" CHECK("ingredients"."acid_g_per_l" IS NULL OR "ingredients"."acid_g_per_l" >= 0),
	CONSTRAINT "ingredients_composition_source_ck" CHECK("ingredients"."composition_source" IS NULL OR "ingredients"."composition_source" IN ('ciqual', 'computed', 'label', 'user')),
	CONSTRAINT "ingredients_composition_confidence_ck" CHECK("ingredients"."composition_confidence" IS NULL OR "ingredients"."composition_confidence" IN ('sourced', 'estimated')),
	CONSTRAINT "ingredients_source_ck" CHECK("ingredients"."source" IN ('seed', 'wikidata', 'user'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_seed_key_unique` ON `ingredients` (`seed_key`);--> statement-breakpoint
CREATE INDEX `ingredients_category_idx` ON `ingredients` (`category_id`);--> statement-breakpoint
CREATE INDEX `ingredients_prep_recipe_idx` ON `ingredients` (`prep_recipe_id`);--> statement-breakpoint
CREATE INDEX `ingredients_name_normalized_idx` ON `ingredients` (`name_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_name_category_live_uq` ON `ingredients` (`name_normalized`,`category_id`) WHERE "ingredients"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `knowledge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`section_id` text NOT NULL,
	`kind` text NOT NULL,
	`attr` text,
	`label` text,
	`prompt` text,
	`body` text,
	`actor` text,
	`place` text,
	`date_kind` text,
	`year_from` integer,
	`year_to` integer,
	`list_values` text,
	`linked_recipe_id` text,
	`origin_doc` text,
	`in_socle` integer DEFAULT false NOT NULL,
	`raw_text` text,
	`review_note` text,
	`review_resolution` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `knowledge_sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "knowledge_items_kind_ck" CHECK("knowledge_items"."kind" IN ('text', 'bullet', 'labeled', 'event', 'origin', 'qa', 'variant', 'brand', 'list')),
	CONSTRAINT "knowledge_items_date_kind_ck" CHECK("knowledge_items"."date_kind" IS NULL OR "knowledge_items"."date_kind" IN ('year', 'circa', 'range', 'decade', 'century', 'after', 'before', 'alternatives', 'relative', 'undated')),
	CONSTRAINT "knowledge_items_origin_doc_ck" CHECK("knowledge_items"."origin_doc" IS NULL OR "knowledge_items"."origin_doc" IN ('notebook', 'mind_map', 'mind_map_short', 'user')),
	CONSTRAINT "knowledge_items_qa_ck" CHECK("knowledge_items"."kind" <> 'qa' OR ("knowledge_items"."prompt" IS NOT NULL AND "knowledge_items"."body" IS NOT NULL)),
	CONSTRAINT "knowledge_items_event_ck" CHECK("knowledge_items"."kind" NOT IN ('event', 'origin') OR ("knowledge_items"."label" IS NOT NULL AND "knowledge_items"."date_kind" IS NOT NULL)),
	CONSTRAINT "knowledge_items_date_only_events_ck" CHECK("knowledge_items"."date_kind" IS NULL OR "knowledge_items"."kind" IN ('event', 'origin')),
	CONSTRAINT "knowledge_items_list_ck" CHECK("knowledge_items"."kind" <> 'list' OR ("knowledge_items"."label" IS NOT NULL AND "knowledge_items"."list_values" IS NOT NULL)),
	CONSTRAINT "knowledge_items_brand_ck" CHECK("knowledge_items"."kind" <> 'brand' OR ("knowledge_items"."label" IS NOT NULL AND "knowledge_items"."raw_text" IS NOT NULL)),
	CONSTRAINT "knowledge_items_variant_link_ck" CHECK("knowledge_items"."linked_recipe_id" IS NULL OR "knowledge_items"."kind" = 'variant'),
	CONSTRAINT "knowledge_items_years_ck" CHECK("knowledge_items"."year_from" IS NULL OR "knowledge_items"."year_to" IS NULL OR "knowledge_items"."year_to" >= "knowledge_items"."year_from")
);
--> statement-breakpoint
CREATE INDEX `knowledge_items_section_idx` ON `knowledge_items` (`section_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `knowledge_items_linked_recipe_idx` ON `knowledge_items` (`linked_recipe_id`);--> statement-breakpoint
CREATE TABLE `knowledge_links` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sheet_id` text NOT NULL,
	`item_id` text,
	`recipe_id` text,
	`category_id` text,
	`ingredient_id` text,
	`product_id` text,
	`role` text NOT NULL,
	`is_suggested` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sheet_id`) REFERENCES `knowledge_sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `knowledge_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "knowledge_links_role_ck" CHECK("knowledge_links"."role" IN ('about', 'mentions', 'brand_of', 'lists')),
	CONSTRAINT "knowledge_links_one_target_ck" CHECK(("knowledge_links"."recipe_id" IS NOT NULL) + ("knowledge_links"."category_id" IS NOT NULL) + ("knowledge_links"."ingredient_id" IS NOT NULL) + ("knowledge_links"."product_id" IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE INDEX `knowledge_links_sheet_idx` ON `knowledge_links` (`sheet_id`);--> statement-breakpoint
CREATE INDEX `knowledge_links_item_idx` ON `knowledge_links` (`item_id`);--> statement-breakpoint
CREATE INDEX `knowledge_links_recipe_idx` ON `knowledge_links` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `knowledge_links_category_idx` ON `knowledge_links` (`category_id`);--> statement-breakpoint
CREATE INDEX `knowledge_links_ingredient_idx` ON `knowledge_links` (`ingredient_id`);--> statement-breakpoint
CREATE INDEX `knowledge_links_product_idx` ON `knowledge_links` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_links_recipe_uq` ON `knowledge_links` (`sheet_id`,`role`,`recipe_id`) WHERE "knowledge_links"."deleted_at" IS NULL AND "knowledge_links"."recipe_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_links_category_uq` ON `knowledge_links` (`sheet_id`,`role`,`category_id`) WHERE "knowledge_links"."deleted_at" IS NULL AND "knowledge_links"."category_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_links_ingredient_uq` ON `knowledge_links` (`sheet_id`,`role`,`ingredient_id`) WHERE "knowledge_links"."deleted_at" IS NULL AND "knowledge_links"."ingredient_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_links_product_uq` ON `knowledge_links` (`sheet_id`,`role`,`product_id`) WHERE "knowledge_links"."deleted_at" IS NULL AND "knowledge_links"."product_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `knowledge_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sheet_id` text NOT NULL,
	`key` text NOT NULL,
	`title` text,
	`is_ordered` integer DEFAULT false NOT NULL,
	`source_code` text,
	`source_title` text,
	`source_page` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sheet_id`) REFERENCES `knowledge_sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "knowledge_sections_key_ck" CHECK("knowledge_sections"."key" IN ('technique', 'pro_tips', 'history', 'variants', 'products', 'jury', 'fabrication', 'regulation', 'types_styles', 'tasting', 'service', 'cocktails_jury', 'brands', 'brand_directory', 'other', 'method', 'synthesis', 'reference_products', 'directory_legend', 'owner_groups'))
);
--> statement-breakpoint
CREATE INDEX `knowledge_sections_sheet_idx` ON `knowledge_sections` (`sheet_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `knowledge_sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`guide_id` text,
	`kind` text NOT NULL,
	`recipe_id` text,
	`number` integer,
	`title` text,
	`title_normalized` text,
	`subtitle` text,
	`group_key` text,
	`subgroup_label` text,
	`class_label` text,
	`min_abv_label` text,
	`min_abv_pct` real,
	`origin_label` text,
	`center_label` text,
	`glass_id` text,
	`header_badges` text DEFAULT '[]' NOT NULL,
	`key_takeaway` text,
	FOREIGN KEY (`guide_id`) REFERENCES `study_guides`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`glass_id`) REFERENCES `glasses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "knowledge_sheets_kind_ck" CHECK("knowledge_sheets"."kind" IN ('recipe', 'category', 'guide')),
	CONSTRAINT "knowledge_sheets_recipe_ck" CHECK(("knowledge_sheets"."kind" = 'recipe') = ("knowledge_sheets"."recipe_id" IS NOT NULL)),
	CONSTRAINT "knowledge_sheets_title_ck" CHECK("knowledge_sheets"."kind" = 'recipe' OR "knowledge_sheets"."title" IS NOT NULL),
	CONSTRAINT "knowledge_sheets_min_abv_ck" CHECK("knowledge_sheets"."min_abv_pct" IS NULL OR ("knowledge_sheets"."min_abv_pct" >= 0 AND "knowledge_sheets"."min_abv_pct" <= 100))
);
--> statement-breakpoint
CREATE INDEX `knowledge_sheets_guide_idx` ON `knowledge_sheets` (`guide_id`);--> statement-breakpoint
CREATE INDEX `knowledge_sheets_recipe_idx` ON `knowledge_sheets` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `knowledge_sheets_glass_idx` ON `knowledge_sheets` (`glass_id`);--> statement-breakpoint
CREATE INDEX `knowledge_sheets_title_idx` ON `knowledge_sheets` (`title_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_sheets_guide_number_uq` ON `knowledge_sheets` (`guide_id`,`number`) WHERE "knowledge_sheets"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_sheets_guide_recipe_uq` ON `knowledge_sheets` (`guide_id`,`recipe_id`) WHERE "knowledge_sheets"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `notebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notebook_links` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`entry_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `notebook_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notebook_links_entity_type_ck" CHECK("notebook_links"."entity_type" IN ('recipe', 'ingredient', 'product', 'sheet'))
);
--> statement-breakpoint
CREATE INDEX `notebook_links_entry_idx` ON `notebook_links` (`entry_id`);--> statement-breakpoint
CREATE INDEX `notebook_links_entity_idx` ON `notebook_links` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `off_cache` (
	`barcode` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`session_id` text NOT NULL,
	`question_key` text NOT NULL,
	`generator` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`expected` text NOT NULL,
	`response` text,
	`is_correct` integer,
	`self_graded` integer DEFAULT false NOT NULL,
	`answered_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "practice_answers_subject_type_ck" CHECK("practice_answers"."subject_type" IN ('recipe', 'reference_spec', 'sheet', 'item', 'table_row'))
);
--> statement-breakpoint
CREATE INDEX `practice_answers_session_idx` ON `practice_answers` (`session_id`);--> statement-breakpoint
CREATE INDEX `practice_answers_question_idx` ON `practice_answers` (`question_key`,`answered_at`);--> statement-breakpoint
CREATE INDEX `practice_answers_subject_idx` ON `practice_answers` (`subject_type`,`subject_id`);--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`collection_id` text,
	`score` integer NOT NULL,
	`total` integer NOT NULL,
	`mistakes` text DEFAULT '[]' NOT NULL,
	`finished_at` integer NOT NULL,
	`mode` text DEFAULT 'quiz' NOT NULL,
	`question_types` text,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "practice_sessions_score_ck" CHECK("practice_sessions"."score" >= 0 AND "practice_sessions"."score" <= "practice_sessions"."total"),
	CONSTRAINT "practice_sessions_mode_ck" CHECK("practice_sessions"."mode" IN ('quiz', 'flashcards', 'calc'))
);
--> statement-breakpoint
CREATE INDEX `practice_sessions_collection_idx` ON `practice_sessions` (`collection_id`);--> statement-breakpoint
CREATE TABLE `prep_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`recipe_id` text NOT NULL,
	`made_at` integer NOT NULL,
	`quantity_ml` integer,
	`best_before` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "prep_batches_status_ck" CHECK("prep_batches"."status" IN ('active', 'finished', 'discarded')),
	CONSTRAINT "prep_batches_quantity_ck" CHECK("prep_batches"."quantity_ml" IS NULL OR "prep_batches"."quantity_ml" > 0)
);
--> statement-breakpoint
CREATE INDEX `prep_batches_recipe_idx` ON `prep_batches` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `prep_batches_status_best_before_idx` ON `prep_batches` (`status`,`best_before`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`ingredient_id` text NOT NULL,
	`brand` text,
	`name` text NOT NULL,
	`abv` real,
	`volume_ml` integer,
	`sugar_g_per_l` real,
	`acid_g_per_l` real,
	`barcode` text,
	`purchase_price_cents` integer,
	`owned` integer DEFAULT false NOT NULL,
	`personal_notes` text,
	`allergens` text DEFAULT '[]' NOT NULL,
	`image_path` text,
	`source` text DEFAULT 'user' NOT NULL,
	`pack_quantity` real,
	`pack_unit` text,
	`purchase_price_basis` text,
	`reference_guide_id` text,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reference_guide_id`) REFERENCES `study_guides`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "products_abv_ck" CHECK("products"."abv" IS NULL OR ("products"."abv" >= 0 AND "products"."abv" <= 100)),
	CONSTRAINT "products_volume_ck" CHECK("products"."volume_ml" IS NULL OR "products"."volume_ml" > 0),
	CONSTRAINT "products_price_ck" CHECK("products"."purchase_price_cents" IS NULL OR "products"."purchase_price_cents" >= 0),
	CONSTRAINT "products_source_ck" CHECK("products"."source" IN ('user', 'off')),
	CONSTRAINT "products_pack_pair_ck" CHECK(("products"."pack_quantity" IS NULL) = ("products"."pack_unit" IS NULL)),
	CONSTRAINT "products_pack_quantity_ck" CHECK("products"."pack_quantity" IS NULL OR "products"."pack_quantity" > 0),
	CONSTRAINT "products_pack_unit_ck" CHECK("products"."pack_unit" IS NULL OR "products"."pack_unit" IN ('piece', 'leaf', 'slice', 'wedge', 'barspoon', 'tsp', 'g', 'serving')),
	CONSTRAINT "products_volume_or_pack_ck" CHECK("products"."volume_ml" IS NULL OR "products"."pack_quantity" IS NULL),
	CONSTRAINT "products_price_basis_ck" CHECK("products"."purchase_price_cents" IS NULL OR "products"."purchase_price_basis" IS NOT NULL),
	CONSTRAINT "products_price_basis_value_ck" CHECK("products"."purchase_price_basis" IS NULL OR "products"."purchase_price_basis" IN ('ht', 'ttc'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `products_ingredient_idx` ON `products` (`ingredient_id`);--> statement-breakpoint
CREATE INDEX `products_owned_idx` ON `products` (`owned`);--> statement-breakpoint
CREATE INDEX `products_reference_guide_idx` ON `products` (`reference_guide_id`);--> statement-breakpoint
CREATE TABLE `recent_views` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`viewed_at` integer NOT NULL,
	CONSTRAINT "recent_views_entity_type_ck" CHECK("recent_views"."entity_type" IN ('recipe', 'ingredient', 'product', 'sheet', 'notebook_entry', 'collection'))
);
--> statement-breakpoint
CREATE INDEX `recent_views_viewed_idx` ON `recent_views` (`viewed_at`);--> statement-breakpoint
CREATE INDEX `recent_views_entity_idx` ON `recent_views` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `recipe_history` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`recipe_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`label` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_history_recipe_version_uq` ON `recipe_history` (`recipe_id`,`version`);--> statement-breakpoint
CREATE TABLE `recipe_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`recipe_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`preferred_product_id` text,
	`quantity` real,
	`unit` text NOT NULL,
	`top_estimate_ml` real,
	`is_optional` integer DEFAULT false NOT NULL,
	`is_garnish` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`note` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`preferred_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recipe_lines_unit_ck" CHECK("recipe_lines"."unit" IN ('ml', 'cl', 'oz', 'dash', 'drop', 'barspoon', 'tsp', 'g', 'piece', 'leaf', 'slice', 'wedge', 'top', 'to_taste')),
	CONSTRAINT "recipe_lines_quantity_ck" CHECK("recipe_lines"."quantity" IS NULL OR "recipe_lines"."quantity" >= 0),
	CONSTRAINT "recipe_lines_top_ck" CHECK("recipe_lines"."top_estimate_ml" IS NULL OR "recipe_lines"."top_estimate_ml" >= 0)
);
--> statement-breakpoint
CREATE INDEX `recipe_lines_recipe_idx` ON `recipe_lines` (`recipe_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `recipe_lines_ingredient_idx` ON `recipe_lines` (`ingredient_id`);--> statement-breakpoint
CREATE INDEX `recipe_lines_product_idx` ON `recipe_lines` (`preferred_product_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	`kind` text DEFAULT 'cocktail' NOT NULL,
	`status` text DEFAULT 'idea' NOT NULL,
	`origin` text DEFAULT 'mine' NOT NULL,
	`credit` text,
	`family` text,
	`method` text,
	`glass_id` text,
	`ice_id` text,
	`garnish` text,
	`steps` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`photo_path` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`dilution_override_pct` real,
	`parent_recipe_id` text,
	`yield_ml` integer,
	`shelf_life_days` integer,
	`storage_notes` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`seed_key` text,
	`drink_length` text,
	`serving_moment` text,
	`profile` text,
	`garnish_cost_ht_cents` integer,
	FOREIGN KEY (`glass_id`) REFERENCES `glasses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ice_id`) REFERENCES `ice_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recipes_drink_length_ck" CHECK("recipes"."drink_length" IS NULL OR "recipes"."drink_length" IN ('short', 'long')),
	CONSTRAINT "recipes_serving_moment_ck" CHECK("recipes"."serving_moment" IS NULL OR "recipes"."serving_moment" IN ('before_dinner', 'all_day', 'after_dinner')),
	CONSTRAINT "recipes_garnish_cost_ck" CHECK("recipes"."garnish_cost_ht_cents" IS NULL OR "recipes"."garnish_cost_ht_cents" >= 0),
	CONSTRAINT "recipes_kind_ck" CHECK("recipes"."kind" IN ('cocktail', 'prep')),
	CONSTRAINT "recipes_status_ck" CHECK("recipes"."status" IN ('idea', 'draft', 'testing', 'final', 'archived')),
	CONSTRAINT "recipes_origin_ck" CHECK("recipes"."origin" IN ('mine', 'classic', 'other')),
	CONSTRAINT "recipes_family_ck" CHECK("recipes"."family" IS NULL OR "recipes"."family" IN ('sour', 'spirit_forward', 'highball', 'fizz', 'flip', 'tiki', 'punch', 'shot', 'non_alcoholic', 'other')),
	CONSTRAINT "recipes_method_ck" CHECK("recipes"."method" IS NULL OR "recipes"."method" IN ('shake', 'dry_shake', 'stir', 'build', 'throw', 'blend', 'swizzle', 'other')),
	CONSTRAINT "recipes_source_ck" CHECK("recipes"."source" IN ('seed_iba', 'seed', 'user')),
	CONSTRAINT "recipes_version_ck" CHECK("recipes"."version" >= 1),
	CONSTRAINT "recipes_yield_ck" CHECK("recipes"."yield_ml" IS NULL OR "recipes"."yield_ml" > 0),
	CONSTRAINT "recipes_shelf_life_ck" CHECK("recipes"."shelf_life_days" IS NULL OR "recipes"."shelf_life_days" >= 0),
	CONSTRAINT "recipes_not_own_parent_ck" CHECK("recipes"."parent_recipe_id" IS NULL OR "recipes"."parent_recipe_id" <> "recipes"."id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_seed_key_unique` ON `recipes` (`seed_key`);--> statement-breakpoint
CREATE INDEX `recipes_status_updated_idx` ON `recipes` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `recipes_name_normalized_idx` ON `recipes` (`name_normalized`);--> statement-breakpoint
CREATE INDEX `recipes_glass_idx` ON `recipes` (`glass_id`);--> statement-breakpoint
CREATE INDEX `recipes_ice_idx` ON `recipes` (`ice_id`);--> statement-breakpoint
CREATE INDEX `recipes_parent_idx` ON `recipes` (`parent_recipe_id`);--> statement-breakpoint
CREATE TABLE `reference_spec_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`spec_id` text NOT NULL,
	`label` text NOT NULL,
	`short_label` text,
	`dose_text` text,
	`quantity` real,
	`unit` text NOT NULL,
	`ingredient_id` text,
	`product_id` text,
	`reference_label` text,
	`abv_pct` real,
	`counted_in_abv` integer DEFAULT false NOT NULL,
	`cost_ht_cents` integer,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`spec_id`) REFERENCES `reference_specs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reference_spec_lines_unit_ck" CHECK("reference_spec_lines"."unit" IN ('ml', 'cl', 'oz', 'dash', 'drop', 'barspoon', 'tsp', 'g', 'piece', 'leaf', 'slice', 'wedge', 'top', 'to_taste')),
	CONSTRAINT "reference_spec_lines_quantity_ck" CHECK("reference_spec_lines"."quantity" IS NULL OR "reference_spec_lines"."quantity" >= 0),
	CONSTRAINT "reference_spec_lines_abv_ck" CHECK("reference_spec_lines"."abv_pct" IS NULL OR ("reference_spec_lines"."abv_pct" >= 0 AND "reference_spec_lines"."abv_pct" <= 100)),
	CONSTRAINT "reference_spec_lines_cost_ck" CHECK("reference_spec_lines"."cost_ht_cents" IS NULL OR "reference_spec_lines"."cost_ht_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `reference_spec_lines_spec_idx` ON `reference_spec_lines` (`spec_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `reference_spec_lines_ingredient_idx` ON `reference_spec_lines` (`ingredient_id`);--> statement-breakpoint
CREATE INDEX `reference_spec_lines_product_idx` ON `reference_spec_lines` (`product_id`);--> statement-breakpoint
CREATE TABLE `reference_specs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`recipe_id` text NOT NULL,
	`guide_id` text,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`spec_text` text,
	`note` text,
	`linked_recipe_id` text,
	`family_label` text,
	`family_short_label` text,
	`method_label` text,
	`glass_label` text,
	`garnish` text,
	`steps` text,
	`stated_abv_pct` real,
	`abv_gap_explanation` text,
	`abv_gap_summary` text,
	`garnish_cost_ht_cents` integer,
	`material_cost_ht_cents` integer,
	`sale_price_ttc_cents` integer,
	`cost_ratio_pct` real,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guide_id`) REFERENCES `study_guides`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "reference_specs_kind_ck" CHECK("reference_specs"."kind" IN ('socle', 'iba', 'other')),
	CONSTRAINT "reference_specs_abv_ck" CHECK("reference_specs"."stated_abv_pct" IS NULL OR ("reference_specs"."stated_abv_pct" >= 0 AND "reference_specs"."stated_abv_pct" <= 100)),
	CONSTRAINT "reference_specs_costs_ck" CHECK(("reference_specs"."garnish_cost_ht_cents" IS NULL OR "reference_specs"."garnish_cost_ht_cents" >= 0) AND ("reference_specs"."material_cost_ht_cents" IS NULL OR "reference_specs"."material_cost_ht_cents" >= 0) AND ("reference_specs"."sale_price_ttc_cents" IS NULL OR "reference_specs"."sale_price_ttc_cents" >= 0))
);
--> statement-breakpoint
CREATE INDEX `reference_specs_recipe_kind_idx` ON `reference_specs` (`recipe_id`,`kind`);--> statement-breakpoint
CREATE INDEX `reference_specs_guide_idx` ON `reference_specs` (`guide_id`);--> statement-breakpoint
CREATE INDEX `reference_specs_linked_recipe_idx` ON `reference_specs` (`linked_recipe_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reference_specs_recipe_guide_kind_uq` ON `reference_specs` (`recipe_id`,`guide_id`,`kind`) WHERE "reference_specs"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_citations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`source_id` text NOT NULL,
	`sheet_id` text,
	`table_row_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `guide_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sheet_id`) REFERENCES `knowledge_sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`table_row_id`) REFERENCES `study_table_rows`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "source_citations_one_target_ck" CHECK(("source_citations"."sheet_id" IS NULL) <> ("source_citations"."table_row_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `source_citations_source_idx` ON `source_citations` (`source_id`);--> statement-breakpoint
CREATE INDEX `source_citations_sheet_idx` ON `source_citations` (`sheet_id`);--> statement-breakpoint
CREATE INDEX `source_citations_table_row_idx` ON `source_citations` (`table_row_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `source_citations_sheet_uq` ON `source_citations` (`source_id`,`sheet_id`) WHERE "source_citations"."deleted_at" IS NULL AND "source_citations"."sheet_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `source_citations_table_row_uq` ON `source_citations` (`source_id`,`table_row_id`) WHERE "source_citations"."deleted_at" IS NULL AND "source_citations"."table_row_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `study_guides` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`edition_label` text,
	`edition_year` integer,
	`sources_intro` text,
	`sources_limits` text,
	`price_multiplier` real,
	`vat_rate_bp` integer,
	`menu_rounding_step_cents` integer,
	`menu_rounding` text,
	`dash_ml` real,
	`abv_method` text,
	`import_key` text,
	CONSTRAINT "study_guides_kind_ck" CHECK("study_guides"."kind" IN ('cocktails', 'products', 'other')),
	CONSTRAINT "study_guides_menu_rounding_ck" CHECK("study_guides"."menu_rounding" IS NULL OR "study_guides"."menu_rounding" IN ('up', 'nearest')),
	CONSTRAINT "study_guides_abv_method_ck" CHECK("study_guides"."abv_method" IS NULL OR "study_guides"."abv_method" IN ('served', 'socle')),
	CONSTRAINT "study_guides_multiplier_ck" CHECK("study_guides"."price_multiplier" IS NULL OR "study_guides"."price_multiplier" > 0),
	CONSTRAINT "study_guides_vat_ck" CHECK("study_guides"."vat_rate_bp" IS NULL OR ("study_guides"."vat_rate_bp" BETWEEN 0 AND 10000)),
	CONSTRAINT "study_guides_rounding_step_ck" CHECK("study_guides"."menu_rounding_step_cents" IS NULL OR "study_guides"."menu_rounding_step_cents" > 0),
	CONSTRAINT "study_guides_dash_ck" CHECK("study_guides"."dash_ml" IS NULL OR "study_guides"."dash_ml" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_guides_import_key_uq` ON `study_guides` (`import_key`) WHERE "study_guides"."deleted_at" IS NULL AND "study_guides"."import_key" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `study_table_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`table_id` text NOT NULL,
	`cells` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `study_tables`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_table_rows_table_idx` ON `study_table_rows` (`table_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `study_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`guide_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`columns` text NOT NULL,
	`quiz_columns` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`guide_id`) REFERENCES `study_guides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_tables_guide_idx` ON `study_tables` (`guide_id`);--> statement-breakpoint
CREATE TABLE `tasting_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`recipe_id` text NOT NULL,
	`recipe_version` integer NOT NULL,
	`tasted_at` integer NOT NULL,
	`overall` integer,
	`scores` text DEFAULT '{}' NOT NULL,
	`comment` text,
	`next_step` text,
	`next_step_done` integer DEFAULT false NOT NULL,
	`context` text,
	`photo_path` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tasting_notes_overall_ck" CHECK("tasting_notes"."overall" IS NULL OR ("tasting_notes"."overall" BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE INDEX `tasting_notes_recipe_tasted_idx` ON `tasting_notes` (`recipe_id`,`tasted_at`);