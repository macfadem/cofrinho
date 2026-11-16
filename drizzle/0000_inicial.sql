CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`preco` integer NOT NULL,
	`posicao` integer NOT NULL,
	`alvo` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'desejo' NOT NULL,
	`link` text,
	`imagem` text,
	`emoji` text,
	`nota` text,
	`data_desejada` text,
	`preco_alvo` integer,
	`pago_valor` integer,
	`pago_em` text,
	`criado_em` text NOT NULL,
	`atualizado_em` text NOT NULL,
	`excluido_em` text
);
--> statement-breakpoint
CREATE INDEX `items_status_posicao` ON `items` (`status`,`posicao`);--> statement-breakpoint
CREATE TABLE `movimentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`valor` integer NOT NULL,
	`data` text NOT NULL,
	`item_id` integer,
	`nota` text,
	`criado_em` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `movimentos_data` ON `movimentos` (`data`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`aporte_semanal` integer DEFAULT 0 NOT NULL,
	`dia_aporte` integer DEFAULT 3 NOT NULL,
	`tema` text DEFAULT 'auto' NOT NULL,
	`configurado_em` text
);
