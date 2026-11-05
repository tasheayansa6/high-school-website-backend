-- AlterTable: add slug, publication timestamp, and featured image for events
ALTER TABLE `events`
  ADD COLUMN `slug` VARCHAR(255) NOT NULL,
  ADD COLUMN `published_at` DATETIME(3) NULL,
  ADD COLUMN `featured_image_id` INTEGER NULL;

CREATE UNIQUE INDEX `events_slug_key` ON `events`(`slug`);
CREATE INDEX `events_published_at_idx` ON `events`(`published_at`);
CREATE INDEX `events_featured_image_id_idx` ON `events`(`featured_image_id`);

ALTER TABLE `events`
  ADD CONSTRAINT `events_featured_image_id_fkey`
  FOREIGN KEY (`featured_image_id`) REFERENCES `media_assets`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
