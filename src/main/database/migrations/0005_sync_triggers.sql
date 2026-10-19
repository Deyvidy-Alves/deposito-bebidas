-- Sincronização (offline-first): backfill de uuid nas linhas existentes e
-- triggers que geram o uuid e alimentam a sync_outbox. Escrito à mão pois o
-- drizzle-kit não modela triggers. Gerador de uuid v4 em SQL puro.
-- (Validado em node:sqlite antes de versionar.)

-- ─────────────────────────── Backfill de uuid ───────────────────────────
UPDATE `clients` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint
UPDATE `tables` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint
UPDATE `products` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint
UPDATE `table_items` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint
UPDATE `expenses` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint
UPDATE `copa_recipes` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint
UPDATE `payments` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint
UPDATE `credit_transactions` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint
UPDATE `stock_movements` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `uuid` IS NULL;--> statement-breakpoint

-- ───────────────────────────── clients ─────────────────────────────
CREATE TRIGGER `sync_clients_ai` AFTER INSERT ON `clients` BEGIN
  UPDATE `clients` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'clients', `uuid`, 'upsert' FROM `clients` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `sync_clients_au` AFTER UPDATE ON `clients` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('clients', NEW.`uuid`, 'upsert');
END;--> statement-breakpoint
CREATE TRIGGER `sync_clients_ad` AFTER DELETE ON `clients` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('clients', OLD.`uuid`, 'delete');
END;--> statement-breakpoint

-- ───────────────────────────── tables ──────────────────────────────
CREATE TRIGGER `sync_tables_ai` AFTER INSERT ON `tables` BEGIN
  UPDATE `tables` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'tables', `uuid`, 'upsert' FROM `tables` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `sync_tables_au` AFTER UPDATE ON `tables` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('tables', NEW.`uuid`, 'upsert');
END;--> statement-breakpoint
CREATE TRIGGER `sync_tables_ad` AFTER DELETE ON `tables` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('tables', OLD.`uuid`, 'delete');
END;--> statement-breakpoint

-- ──────────────────────────── products ─────────────────────────────
CREATE TRIGGER `sync_products_ai` AFTER INSERT ON `products` BEGIN
  UPDATE `products` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'products', `uuid`, 'upsert' FROM `products` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `sync_products_au` AFTER UPDATE ON `products` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('products', NEW.`uuid`, 'upsert');
END;--> statement-breakpoint
CREATE TRIGGER `sync_products_ad` AFTER DELETE ON `products` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('products', OLD.`uuid`, 'delete');
END;--> statement-breakpoint

-- ─────────────────────────── table_items ───────────────────────────
CREATE TRIGGER `sync_table_items_ai` AFTER INSERT ON `table_items` BEGIN
  UPDATE `table_items` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'table_items', `uuid`, 'upsert' FROM `table_items` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `sync_table_items_au` AFTER UPDATE ON `table_items` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('table_items', NEW.`uuid`, 'upsert');
END;--> statement-breakpoint
CREATE TRIGGER `sync_table_items_ad` AFTER DELETE ON `table_items` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('table_items', OLD.`uuid`, 'delete');
END;--> statement-breakpoint

-- ───────────────────────────── expenses ────────────────────────────
CREATE TRIGGER `sync_expenses_ai` AFTER INSERT ON `expenses` BEGIN
  UPDATE `expenses` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'expenses', `uuid`, 'upsert' FROM `expenses` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `sync_expenses_au` AFTER UPDATE ON `expenses` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('expenses', NEW.`uuid`, 'upsert');
END;--> statement-breakpoint
CREATE TRIGGER `sync_expenses_ad` AFTER DELETE ON `expenses` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('expenses', OLD.`uuid`, 'delete');
END;--> statement-breakpoint

-- ─────────────────────────── copa_recipes ──────────────────────────
CREATE TRIGGER `sync_copa_recipes_ai` AFTER INSERT ON `copa_recipes` BEGIN
  UPDATE `copa_recipes` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'copa_recipes', `uuid`, 'upsert' FROM `copa_recipes` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `sync_copa_recipes_au` AFTER UPDATE ON `copa_recipes` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('copa_recipes', NEW.`uuid`, 'upsert');
END;--> statement-breakpoint
CREATE TRIGGER `sync_copa_recipes_ad` AFTER DELETE ON `copa_recipes` WHEN OLD.`uuid` IS NOT NULL BEGIN
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) VALUES ('copa_recipes', OLD.`uuid`, 'delete');
END;--> statement-breakpoint

-- ───────────── Ledgers append-only: só trigger de insert ────────────
CREATE TRIGGER `sync_payments_ai` AFTER INSERT ON `payments` BEGIN
  UPDATE `payments` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'payments', `uuid`, 'upsert' FROM `payments` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `sync_credit_transactions_ai` AFTER INSERT ON `credit_transactions` BEGIN
  UPDATE `credit_transactions` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'credit_transactions', `uuid`, 'upsert' FROM `credit_transactions` WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `sync_stock_movements_ai` AFTER INSERT ON `stock_movements` BEGIN
  UPDATE `stock_movements` SET `uuid` = (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))) WHERE `id` = NEW.`id` AND `uuid` IS NULL;
  INSERT INTO `sync_outbox` (`entity`,`row_uuid`,`op`) SELECT 'stock_movements', `uuid`, 'upsert' FROM `stock_movements` WHERE `id` = NEW.`id`;
END;
