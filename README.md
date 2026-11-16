# Cofrinho 🐷

Lista de desejos com um caixa só para essas compras e um plano de quando dá para comprar cada coisa.
Roda só no seu computador: sem login e sem nuvem.

## O que precisa estar instalado

- **Node.js 22 ou mais novo** (versão LTS). Para conferir: `node -v`
- **Git**. Para conferir: `git --version`

No Windows, se faltar algum, rode no PowerShell e depois feche e abra o PowerShell de novo:

```
winget install OpenJS.NodeJS.LTS
winget install --id Git.Git -e
```

## Primeira vez

Abra o PowerShell (ele começa na sua pasta de usuário) e rode:

```
cd Documents
git clone https://github.com/macfadem/cofrinho.git
cd cofrinho
npm run app
```

Na primeira vez ele instala o que precisa e prepara o app, o que leva alguns minutos.
Depois o navegador abre sozinho em **http://127.0.0.1:3210**.

## Dia a dia

- **Abrir:** clique duas vezes no ícone **Cofrinho** da Área de Trabalho (veja abaixo como criar), ou rode `npm run app` na pasta `cofrinho`.
- **Fechar:** feche a janela do terminal do Cofrinho (no atalho, ela fica minimizada na barra de tarefas) ou aperte `Ctrl+C` nela.
- Se o app já estiver aberto, o atalho e o `npm run app` só abrem a janela do app de novo.

### Atalho de 1 clique (Windows)

Na pasta `cofrinho`, rode uma vez:

```
npm run atalho
```

Ele cria o ícone **Cofrinho** na Área de Trabalho e no Menu Iniciar. Clicar nele liga o Cofrinho (se ainda não estiver ligado) e abre o app numa janela própria, sem abas, usando o Chrome ou o Edge.
Para fixar na barra de tarefas: no Menu Iniciar, clique com o botão direito em **Cofrinho** e escolha **Fixar na barra de tarefas**.
Se a pasta `cofrinho` mudar de lugar, rode `npm run atalho` de novo.

### Instalar como app pelo Chrome ou Edge (opcional)

Com o Cofrinho aberto no navegador, use o ícone de instalar na barra de endereço (ou procure **Instalar** no menu do navegador).
O app instalado ganha ícone e janela próprios, mas só funciona com o Cofrinho ligado. Por isso, o mais simples é usar o atalho acima, que liga e abre de uma vez.

### Atalhos de teclado

| Tecla | O que faz |
| --- | --- |
| `N` | Novo desejo (vai para Desejos e coloca o cursor no campo de nome) |
| `S` | Abre o simulador |

## Atualizar para uma versão nova

Na pasta `cofrinho`:

```
git pull
npm run app
```

O `npm run app` percebe o que mudou e reinstala ou prepara o app sozinho. O atalho da Área de Trabalho continua funcionando, sem precisar criar de novo.

## Onde ficam os seus dados

Tudo fica na pasta `data/`, dentro da pasta do projeto. Ela nunca vai para o GitHub.

| Caminho | O que é |
| --- | --- |
| `data/app.db` | O banco: caixa, desejos, histórico e ajustes |
| `data/images/` | Imagens dos desejos |
| `data/backups/` | Cópias automáticas do banco (e a cópia guardada antes de importar um backup) |

## Backups

Toda vez que você roda `npm run app`, ele copia o banco para `data/backups/` antes de abrir o app.
Só guarda uma cópia nova se algo mudou desde a última, e mantém as **15 mais recentes**.
Os arquivos têm a data e a hora no nome, por exemplo `app-2026-10-24_09-30-00.db`.
As imagens dos desejos não vão no backup do banco: elas ficam em `data/images/`. Para guardar tudo num arquivo só, use o backup em JSON (abaixo).

### Backup em JSON (exportar e importar)

Em **Ajustes > Backup**:

- **Exportar backup** baixa um arquivo `cofrinho-backup-AAAA-MM-DD.json` com tudo: desejos (com as imagens), conquistas, histórico e ajustes.
- **Importar backup** troca todos os dados do app pelos do arquivo. Antes de trocar, o app guarda uma cópia dos dados atuais em `data/backups/antes-de-importar-...json`, que também pode ser importada se você se arrepender.

### Guardar os backups numa pasta sincronizada com a nuvem

Você pode mandar os backups para uma pasta do Google Drive para computador, OneDrive ou Dropbox:

1. Na pasta `cofrinho`, crie um arquivo chamado `.env.local`.
   No Bloco de Notas: **Salvar como**, escolha o tipo **Todos os arquivos** e digite o nome `.env.local`.
2. Escreva uma linha com o caminho da pasta, **sem aspas**. Exemplo com o Google Drive:
   ```
   PASTA_BACKUP=G:\Meu Drive\Cofrinho\backups
   ```
3. Rode `npm run app`. Se a pasta não existir, ela é criada.

Se a pasta não estiver disponível na hora (por exemplo, com o Google Drive fechado), o backup vai para `data/backups/`.

Deixe a pasta do projeto **fora** das pastas sincronizadas: sincronizar o banco enquanto ele está aberto pode corrompê-lo. Sincronize só os backups.

### Restaurar um backup

1. Feche o app.
2. Na pasta `data/`, apague `app.db-wal` e `app.db-shm`, se existirem.
3. Copie o backup que você quer para `data/app.db`, substituindo o arquivo atual.
4. Rode `npm run app`.

## Imagens dos desejos

- **Pelo link:** cole o link do produto no campo de nome (ou em "Mais opções") e o app sugere nome, preço e imagem da página. Nada é salvo antes de você clicar em **Usar** e depois em **Adicionar**.
- **Colando ou arrastando:** copie uma imagem (por exemplo, numa busca de imagens) e cole com `Ctrl+V` na barra de adicionar ou na janela de imagem do card. Também dá para arrastar um arquivo ou uma imagem de outra aba.
- **Buscar imagem:** abre uma busca de imagens com o nome do desejo numa nova aba.
- Sem imagem, o card mostra um emoji escolhido pelo nome sobre um gradiente.

Algumas lojas bloqueiam leituras automáticas; nesse caso, é só preencher à mão ou colar a imagem.

## Simulador

No Início, o botão **Simular** (ou a tecla `S`) abre um painel para testar mudanças sem salvar nada: outro aporte semanal, um aporte extra agora, outro preço para cada alvo e ligar ou desligar alvos.
O painel mostra "antes → depois" e a diferença em semanas. Em **O que salvar**, deixe marcado só o que você quer guardar e clique em **Aplicar**.
O aporte extra entra no histórico como um ajuste com a nota "Aporte extra", para não contar como o aporte da semana.

## Como o plano calcula as datas

- Os **alvos** vêm primeiro, na ordem da lista; os outros desejos vêm depois, também na ordem da lista.
- O saldo do caixa vai "enchendo" os itens nessa ordem. Cada aporte semanal soma ao saldo, e a data prevista de um item é o dia do aporte em que o saldo alcança a soma dos preços até ele.
- Se o aporte desta semana ainda não foi confirmado, ele conta como o primeiro aporte (hoje).
- O selo de **impacto** mostra quantas semanas comprar aquele item agora atrasaria a compra de todos os alvos.
- Sem aporte semanal definido, o app não faz previsões.

## Problemas comuns

- **"A porta 3210 está sendo usada por outro programa"**: feche o programa que está usando essa porta (ou reinicie o computador) e rode `npm run app` de novo.
- **Erro ao instalar**: confira a internet e rode `npm run app` de novo.
- **O atalho mostrou um erro**: abra o PowerShell na pasta `cofrinho` e rode `npm run app` para ver os detalhes.

## Para quem for mexer no código

Feito com Next.js 16 (App Router) e TypeScript, Tailwind CSS e shadcn/ui, SQLite com Drizzle ORM e better-sqlite3.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Modo desenvolvimento em http://127.0.0.1:3211 |
| `npm test` | Roda os testes (Vitest) |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run db:gerar` | Gera uma migração depois de mudar `src/lib/db/schema.ts` (o app aplica sozinho ao iniciar) |

- O `.npmrc` desliga os scripts de instalação dos pacotes: o better-sqlite3 já vem compilado para Windows, macOS e Linux, então nada precisa ser compilado na sua máquina.
- As fontes Bricolage Grotesque e Figtree ficam em `src/app/fonts/` (licença SIL OFL 1.1), para o app funcionar sem internet.
