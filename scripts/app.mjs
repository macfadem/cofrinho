// `npm run app`: abre o Cofrinho no seu computador.
//  1. instala as dependências (só se mudaram);
//  2. faz backup do banco (mantém os 15 últimos);
//  3. prepara o app (build), só se o código mudou;
//  4. inicia em 127.0.0.1 e abre o navegador.
// Com --atalho (usado pelo ícone criado por `npm run atalho`): abre numa janela própria
// e mostra os erros numa caixa de mensagem, já que a janela do terminal fica minimizada.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fazerBackup } from "./backup.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "127.0.0.1";
const PORTA = 3210;
const ENDERECO = `http://${HOST}:${PORTA}`;
const ABRIR_NAVEGADOR = !process.argv.includes("--sem-navegador");
const MODO_ATALHO = process.argv.includes("--atalho");

const PASTA_DADOS = path.join(RAIZ, "data");
const ARQUIVO_BANCO = path.join(PASTA_DADOS, "app.db");
const PASTA_BACKUPS_PADRAO = path.join(PASTA_DADOS, "backups");
const NEXT = path.join(RAIZ, "node_modules", "next", "dist", "bin", "next");
const MANTER_BACKUPS = 15;
/** Impede que dois cliques seguidos abram (e preparem) o app duas vezes ao mesmo tempo. */
const TRAVA = path.join(PASTA_DADOS, ".abrindo");

function aviso(mensagem) {
  console.log(`🐷 ${mensagem}`);
}

/** No Windows, mostra uma caixa de mensagem (a janela do terminal pode estar minimizada). */
function mostrarNaTela(mensagem) {
  if (process.platform !== "win32") return;
  const texto = mensagem.replace(/'/g, "''");
  const script =
    "Add-Type -AssemblyName PresentationFramework; " +
    `[System.Windows.MessageBox]::Show('${texto}', 'Cofrinho', 'OK', 'Warning') | Out-Null`;
  spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
    { stdio: "ignore", windowsHide: true },
  );
}

function falhar(mensagem) {
  console.error(`\n❌ ${mensagem}\n`);
  if (MODO_ATALHO) {
    const texto = mensagem
      .replace(/rodar npm run app/g, "abrir o Cofrinho")
      .replace(/rode npm run app/g, "abra o Cofrinho")
      .replace(" Veja a mensagem acima.", "");
    mostrarNaTela(`${texto}\n\nPara ver os detalhes, abra o terminal na pasta do Cofrinho e rode: npm run app`);
  }
  process.exit(1);
}

function conferirNode() {
  const [maior] = process.versions.node.split(".").map(Number);
  if (maior < 22) {
    falhar(
      `O Cofrinho precisa do Node.js 22 ou mais novo (este computador tem ${process.version}).\n` +
        "   Instale a versão LTS com: winget install OpenJS.NodeJS.LTS",
    );
  }
}

function carregarEnvLocal() {
  const arquivo = path.join(RAIZ, ".env.local");
  if (fs.existsSync(arquivo)) process.loadEnvFile(arquivo);
}

// --- 1. Dependências -------------------------------------------------------

function garantirDependencias() {
  const lock = fs.readFileSync(path.join(RAIZ, "package-lock.json"));
  const assinatura = createHash("sha256").update(lock).digest("hex");
  const marcador = path.join(RAIZ, "node_modules", ".cofrinho-deps");
  if (fs.existsSync(marcador) && fs.readFileSync(marcador, "utf8") === assinatura) {
    return;
  }

  aviso("Instalando as dependências (na primeira vez leva alguns minutos)...");
  // `npm ci` instala exatamente o que está no package-lock.json, sem alterá-lo.
  const npmCli = process.env.npm_execpath;
  const args = ["ci", "--no-audit", "--no-fund"];
  const resultado =
    npmCli && /\.c?js$/.test(npmCli)
      ? spawnSync(process.execPath, [npmCli, ...args], { stdio: "inherit", cwd: RAIZ })
      : spawnSync("npm", args, { stdio: "inherit", cwd: RAIZ, shell: true });
  if (resultado.status !== 0) {
    falhar("Não consegui instalar as dependências. Confira a internet e rode npm run app de novo.");
  }
  fs.writeFileSync(marcador, assinatura);
}

// --- 2. Backup -------------------------------------------------------------

async function backup() {
  const configurada = process.env.PASTA_BACKUP?.trim();
  let pasta = configurada ? path.resolve(configurada) : PASTA_BACKUPS_PADRAO;
  try {
    fs.mkdirSync(pasta, { recursive: true });
  } catch {
    aviso(`Não consegui usar a pasta de backup "${pasta}". Usando data/backups.`);
    pasta = PASTA_BACKUPS_PADRAO;
  }

  const r = await fazerBackup({ arquivoBanco: ARQUIVO_BANCO, pasta, manter: MANTER_BACKUPS });
  if (r.status === "criado") aviso(`Backup salvo em ${path.join(pasta, r.arquivo)}`);
  if (r.status === "sem-mudancas") aviso("Backup em dia (nada mudou desde o último).");
}

// --- 3. Build ---------------------------------------------------------------

const ENTRADAS_DO_BUILD = [
  "src",
  "public",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
];

/** Assinatura do código: muda quando qualquer arquivo usado no build muda. */
function assinaturaDoCodigo() {
  const arquivos = [];
  for (const entrada of ENTRADAS_DO_BUILD) {
    const caminho = path.join(RAIZ, entrada);
    if (!fs.existsSync(caminho)) continue;
    if (fs.statSync(caminho).isDirectory()) {
      for (const relativo of fs.readdirSync(caminho, { recursive: true })) {
        const completo = path.join(caminho, relativo);
        if (fs.statSync(completo).isFile()) arquivos.push(completo);
      }
    } else {
      arquivos.push(caminho);
    }
  }

  const hash = createHash("sha256");
  for (const arquivo of arquivos.sort()) {
    hash.update(path.relative(RAIZ, arquivo).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(fs.readFileSync(arquivo));
  }
  return hash.digest("hex");
}

function garantirBuild() {
  const marcador = path.join(RAIZ, ".next", "cofrinho-build.txt");
  const assinatura = assinaturaDoCodigo();
  const pronto =
    fs.existsSync(path.join(RAIZ, ".next", "BUILD_ID")) &&
    fs.existsSync(marcador) &&
    fs.readFileSync(marcador, "utf8") === assinatura;
  if (pronto) return;

  aviso("Preparando o app (só na primeira vez e depois de uma atualização)...");
  const resultado = spawnSync(process.execPath, [NEXT, "build"], {
    stdio: "inherit",
    cwd: RAIZ,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (resultado.status !== 0) {
    falhar("Não consegui preparar o app (o build falhou). Veja a mensagem acima.");
  }
  fs.writeFileSync(marcador, assinatura);
}

// --- 4. Iniciar --------------------------------------------------------------

async function cofrinhoRespondendo(limiteMs = 1500) {
  try {
    const resposta = await fetch(ENDERECO, { signal: AbortSignal.timeout(limiteMs) });
    const html = await resposta.text();
    return html.includes('name="application-name" content="Cofrinho"');
  } catch {
    return false;
  }
}

function portaLivre() {
  return new Promise((resolve) => {
    const teste = net.createServer();
    teste.once("error", () => resolve(false));
    teste.once("listening", () => teste.close(() => resolve(true)));
    teste.listen(PORTA, HOST);
  });
}

async function esperarCofrinho(limiteMs) {
  const fim = Date.now() + limiteMs;
  while (Date.now() < fim) {
    if (await cofrinhoRespondendo(3000)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function abrirNoNavegadorPadrao(url) {
  const opcoes = { detached: true, stdio: "ignore" };
  const filho =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/c", "start", '""', url], { ...opcoes, windowsVerbatimArguments: true })
      : spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], opcoes);
  filho.on("error", () => console.log(`   Abra no navegador: ${url}`));
  filho.unref();
}

/** Chrome ou Edge instalados no Windows (para abrir o app numa janela própria). */
function chromeOuEdge() {
  const programas = process.env.ProgramFiles ?? "C:\\Program Files";
  const programas86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
  const local = process.env.LOCALAPPDATA;
  const candidatos = [
    path.join(programas, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programas86, "Google", "Chrome", "Application", "chrome.exe"),
    local && path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programas86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programas, "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  return candidatos.find((c) => c && fs.existsSync(c)) ?? null;
}

function abrirNavegador(url) {
  const navegador = MODO_ATALHO && process.platform === "win32" ? chromeOuEdge() : null;
  if (!navegador) return abrirNoNavegadorPadrao(url);
  // --app abre uma janela só do Cofrinho, sem abas nem barra de endereço.
  const filho = spawn(navegador, [`--app=${url}`], { detached: true, stdio: "ignore" });
  filho.on("error", () => abrirNoNavegadorPadrao(url));
  filho.unref();
}

function processoVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (erro) {
    return erro.code === "EPERM";
  }
}

/** true se este processo ficou com a trava; false se outro já está abrindo o app. */
function pegarTrava() {
  fs.mkdirSync(PASTA_DADOS, { recursive: true });
  try {
    fs.writeFileSync(TRAVA, String(process.pid), { flag: "wx" });
    return true;
  } catch (erro) {
    if (erro.code !== "EEXIST") throw erro;
  }
  let pid = 0;
  let idadeMs = Infinity;
  try {
    pid = Number(fs.readFileSync(TRAVA, "utf8"));
    idadeMs = Date.now() - fs.statSync(TRAVA).mtimeMs;
  } catch {
    // a trava sumiu no meio do caminho: tenta de novo abaixo
  }
  if (pid && processoVivo(pid) && idadeMs < 15 * 60_000) return false;
  fs.rmSync(TRAVA, { force: true }); // trava esquecida por uma abertura que não terminou
  return pegarTrava();
}

function soltarTrava() {
  try {
    if (Number(fs.readFileSync(TRAVA, "utf8")) === process.pid) fs.rmSync(TRAVA, { force: true });
  } catch {
    // sem trava para soltar
  }
}

async function iniciar() {
  aviso("Iniciando...");
  const servidor = spawn(
    process.execPath,
    [NEXT, "start", "-H", HOST, "-p", String(PORTA)],
    { stdio: "inherit", cwd: RAIZ, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
  );
  servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
  for (const sinal of ["SIGINT", "SIGTERM"]) process.on(sinal, () => servidor.kill());

  if (!(await esperarCofrinho(60_000))) {
    servidor.kill();
    falhar("O Cofrinho não respondeu a tempo. Tente rodar npm run app de novo.");
  }
  soltarTrava();

  console.log(
    `\n✅ Cofrinho aberto em ${ENDERECO}\n` +
      "   Para fechar o app, feche esta janela (ou aperte Ctrl+C).\n",
  );
  if (ABRIR_NAVEGADOR) abrirNavegador(ENDERECO);
}

// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🐷 Cofrinho\n");
  if (MODO_ATALHO) process.title = "Cofrinho (feche esta janela para desligar o app)";
  conferirNode();
  process.chdir(RAIZ);
  carregarEnvLocal();

  if (await cofrinhoRespondendo()) {
    aviso("O Cofrinho já está aberto.");
    if (ABRIR_NAVEGADOR) abrirNavegador(ENDERECO);
    return;
  }
  if (!pegarTrava()) {
    aviso("O Cofrinho já está abrindo em outra janela. Esperando ficar pronto...");
    if (!(await esperarCofrinho(10 * 60_000))) falhar("O Cofrinho não abriu a tempo. Tente rodar npm run app de novo.");
    if (ABRIR_NAVEGADOR) abrirNavegador(ENDERECO);
    return;
  }
  process.on("exit", soltarTrava);
  if (!(await portaLivre())) {
    falhar(`A porta ${PORTA} está sendo usada por outro programa. Feche-o e rode npm run app de novo.`);
  }

  garantirDependencias();
  await backup();
  garantirBuild();
  await iniciar();
}

main().catch((erro) => falhar(erro?.stack ?? String(erro)));
