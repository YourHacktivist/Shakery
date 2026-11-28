PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ingredients` (
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
	`density_g_per_ml` real,
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
	CONSTRAINT "ingredients_abv_ck" CHECK("__new_ingredients"."default_abv" IS NULL OR ("__new_ingredients"."default_abv" >= 0 AND "__new_ingredients"."default_abv" <= 100)),
	CONSTRAINT "ingredients_sugar_ck" CHECK("__new_ingredients"."sugar_g_per_l" IS NULL OR "__new_ingredients"."sugar_g_per_l" >= 0),
	CONSTRAINT "ingredients_acid_ck" CHECK("__new_ingredients"."acid_g_per_l" IS NULL OR "__new_ingredients"."acid_g_per_l" >= 0),
	CONSTRAINT "ingredients_density_ck" CHECK("__new_ingredients"."density_g_per_ml" IS NULL OR ("__new_ingredients"."density_g_per_ml" > 0 AND "__new_ingredients"."density_g_per_ml" <= 5)),
	CONSTRAINT "ingredients_composition_source_ck" CHECK("__new_ingredients"."composition_source" IS NULL OR "__new_ingredients"."composition_source" IN ('ciqual', 'computed', 'label', 'reference', 'user')),
	CONSTRAINT "ingredients_composition_confidence_ck" CHECK("__new_ingredients"."composition_confidence" IS NULL OR "__new_ingredients"."composition_confidence" IN ('sourced', 'estimated')),
	CONSTRAINT "ingredients_source_ck" CHECK("__new_ingredients"."source" IN ('seed', 'wikidata', 'user'))
);
--> statement-breakpoint
INSERT INTO `__new_ingredients`("id", "created_at", "updated_at", "deleted_at", "name", "name_normalized", "category_id", "default_abv", "sugar_g_per_l", "acid_g_per_l", "composition_source", "composition_confidence", "density_g_per_ml", "flavor_tags", "description", "allergens", "prep_recipe_id", "is_staple", "is_favorite", "source", "external_ref", "seed_key") SELECT "id", "created_at", "updated_at", "deleted_at", "name", "name_normalized", "category_id", "default_abv", "sugar_g_per_l", "acid_g_per_l", "composition_source", "composition_confidence", "density_g_per_ml", "flavor_tags", "description", "allergens", "prep_recipe_id", "is_staple", "is_favorite", "source", "external_ref", "seed_key" FROM `ingredients`;--> statement-breakpoint
DROP TABLE `ingredients`;--> statement-breakpoint
ALTER TABLE `__new_ingredients` RENAME TO `ingredients`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_seed_key_unique` ON `ingredients` (`seed_key`);--> statement-breakpoint
CREATE INDEX `ingredients_category_idx` ON `ingredients` (`category_id`);--> statement-breakpoint
CREATE INDEX `ingredients_prep_recipe_idx` ON `ingredients` (`prep_recipe_id`);--> statement-breakpoint
CREATE INDEX `ingredients_name_normalized_idx` ON `ingredients` (`name_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_name_category_live_uq` ON `ingredients` (`name_normalized`,`category_id`) WHERE "ingredients"."deleted_at" IS NULL;