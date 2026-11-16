-- Dados de exemplo da lista de desejos, em ordem de prioridade.
-- Valores em centavos. Nenhum item vem como alvo: eles são escolhidos no app.
-- Só entram se a lista ainda estiver vazia.
INSERT INTO `items` (`nome`, `preco`, `posicao`, `nota`, `data_desejada`, `preco_alvo`, `criado_em`, `atualizado_em`)
SELECT column1, column2, column3, column4, column5, column6,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (VALUES
  ('Fone de ouvido sem fio', 59900, 1, 'esperar promoção', NULL, 52000),
  ('Tênis de corrida', 45000, 2, NULL, NULL, NULL),
  ('Viagem de fim de semana', 120000, 3, NULL, '2027-03-01', NULL),
  ('Monitor 27"', 110000, 4, NULL, NULL, 95000),
  ('Mochila', 25000, 5, NULL, NULL, NULL),
  ('Livros (3 un.)', 18000, 6, NULL, NULL, NULL),
  ('Teclado mecânico', 35000, 7, NULL, NULL, NULL),
  ('Cadeira de escritório', 89000, 8, NULL, NULL, NULL),
  ('Jogo de tabuleiro', 20000, 9, NULL, NULL, NULL),
  ('Violão', 150000, 10, NULL, NULL, NULL)
)
WHERE NOT EXISTS (SELECT 1 FROM `items`);
