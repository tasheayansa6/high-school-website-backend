-- AlterTable: secure newsletter tokens and soft-delete support
ALTER TABLE `newsletter_subscribers`
  DROP INDEX `newsletter_subscribers_confirmation_token_key`;

ALTER TABLE `newsletter_subscribers`
  CHANGE COLUMN `confirmation_token` `confirmation_token_hash` VARCHAR(64) NULL,
  ADD COLUMN `confirmation_token_expires_at` DATETIME(3) NULL,
  ADD COLUMN `unsubscribe_token_hash` VARCHAR(64) NULL,
  ADD COLUMN `deleted_at` DATETIME(3) NULL;

CREATE UNIQUE INDEX `newsletter_subscribers_confirmation_token_hash_key` ON `newsletter_subscribers`(`confirmation_token_hash`);
CREATE UNIQUE INDEX `newsletter_subscribers_unsubscribe_token_hash_key` ON `newsletter_subscribers`(`unsubscribe_token_hash`);
CREATE INDEX `newsletter_subscribers_deleted_at_idx` ON `newsletter_subscribers`(`deleted_at`);
