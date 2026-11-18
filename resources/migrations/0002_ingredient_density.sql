ALTER TABLE `ingredients` ADD `density_g_per_ml` real CONSTRAINT "ingredients_density_ck" CHECK("density_g_per_ml" IS NULL OR ("density_g_per_ml" > 0 AND "density_g_per_ml" <= 5));
