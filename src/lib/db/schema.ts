import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Momento atual em ISO (UTC), usado nos campos criadoEm/atualizadoEm. */
const agoraISO = () => new Date().toISOString();

export const TEMAS = ["claro", "escuro", "auto"] as const;
export type Tema = (typeof TEMAS)[number];

export const STATUS_ITEM = ["desejo", "comprado"] as const;
export type StatusItem = (typeof STATUS_ITEM)[number];

export const TIPOS_MOVIMENTO = ["aporte", "compra", "ajuste"] as const;
export type TipoMovimento = (typeof TIPOS_MOVIMENTO)[number];

/**
 * Ajustes do app (uma única linha, id = 1).
 * Valores em dinheiro sempre em centavos (inteiros).
 */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  /** Aporte fixo por semana, em centavos. */
  aporteSemanal: integer("aporte_semanal").notNull().default(0),
  /** Dia da semana do aporte: 0 = domingo … 6 = sábado (padrão: quarta). */
  diaAporte: integer("dia_aporte").notNull().default(3),
  tema: text("tema", { enum: TEMAS }).notNull().default("auto"),
  /** Quando o primeiro uso foi concluído (nulo = ainda não configurado). */
  configuradoEm: text("configurado_em"),
  /**
   * 'AAAA-MM-DD': ciclos de aporte antes desta data não contam como pendentes.
   * Definida no primeiro uso (o aporte da semana já pode estar no saldo inicial).
   */
  aportesDesde: text("aportes_desde"),
});

export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    /** Preço em centavos. */
    preco: integer("preco").notNull(),
    /** Ordem de prioridade na lista (menor = mais prioritário). */
    posicao: integer("posicao").notNull(),
    alvo: integer("alvo", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: STATUS_ITEM }).notNull().default("desejo"),
    link: text("link"),
    /** Nome do arquivo em data/images. */
    imagem: text("imagem"),
    emoji: text("emoji"),
    nota: text("nota"),
    /** Data desejada 'AAAA-MM-DD'. */
    dataDesejada: text("data_desejada"),
    /** Preço-alvo em centavos. */
    precoAlvo: integer("preco_alvo"),
    /** Valor pago em centavos (quando comprado). */
    pagoValor: integer("pago_valor"),
    /** Data da compra 'AAAA-MM-DD'. */
    pagoEm: text("pago_em"),
    criadoEm: text("criado_em").notNull().$defaultFn(agoraISO),
    atualizadoEm: text("atualizado_em")
      .notNull()
      .$defaultFn(agoraISO)
      .$onUpdateFn(agoraISO),
    /** Preenchido ao excluir (permite desfazer). */
    excluidoEm: text("excluido_em"),
  },
  (t) => [index("items_status_posicao").on(t.status, t.posicao)],
);

export const movimentos = sqliteTable(
  "movimentos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tipo: text("tipo", { enum: TIPOS_MOVIMENTO }).notNull(),
    /** Valor em centavos, com sinal (aporte +, compra −, ajuste ±). */
    valor: integer("valor").notNull(),
    /** Data 'AAAA-MM-DD'. */
    data: text("data").notNull(),
    itemId: integer("item_id").references(() => items.id, {
      onDelete: "set null",
    }),
    nota: text("nota"),
    criadoEm: text("criado_em").notNull().$defaultFn(agoraISO),
  },
  (t) => [index("movimentos_data").on(t.data)],
);

export type Ajustes = typeof settings.$inferSelect;
export type Item = typeof items.$inferSelect;
export type NovoItem = typeof items.$inferInsert;
export type Movimento = typeof movimentos.$inferSelect;
export type NovoMovimento = typeof movimentos.$inferInsert;
