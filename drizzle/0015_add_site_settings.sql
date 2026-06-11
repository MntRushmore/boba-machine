CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
INSERT INTO "site_settings" ("key", "value") VALUES ('launched', 'false');
