// `npm run atalho`: cria o ícone do Cofrinho na Área de Trabalho e no Menu Iniciar (Windows).
// O ícone abre o app com um clique: liga o Cofrinho (se ainda não estiver ligado) e abre a janela.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.platform !== "win32") {
  console.log("\n🐷 O atalho de 1 clique é para Windows. Neste sistema, abra o Cofrinho com: npm run app\n");
  process.exit(0);
}

/** Texto entre aspas simples do PowerShell. */
const aspas = (texto) => `'${texto.replace(/'/g, "''")}'`;

const script = path.join(RAIZ, "scripts", "app.mjs");
const icone = path.join(RAIZ, "scripts", "cofrinho.ico");

// WindowStyle 7 = minimizada: a janela do terminal (que mantém o app ligado) fica na barra de tarefas.
const comandos = `
$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject WScript.Shell
foreach ($pasta in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $atalho = $shell.CreateShortcut((Join-Path $pasta 'Cofrinho.lnk'))
  $atalho.TargetPath = ${aspas(process.execPath)}
  $atalho.Arguments = ${aspas(`"${script}" --atalho`)}
  $atalho.WorkingDirectory = ${aspas(RAIZ)}
  $atalho.IconLocation = ${aspas(`${icone},0`)}
  $atalho.Description = 'Abrir o Cofrinho'
  $atalho.WindowStyle = 7
  $atalho.Save()
}
`;

const r = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(comandos, "utf16le").toString("base64")],
  { encoding: "utf8" },
);

if (r.status !== 0) {
  console.error(`\n❌ Não consegui criar o atalho.\n${(r.stderr || r.stdout || r.error?.message || "").trim()}\n`);
  process.exit(1);
}

console.log(
  "\n✅ Atalho \"Cofrinho\" criado na Área de Trabalho e no Menu Iniciar.\n" +
    "   Clique duas vezes nele para abrir o app. Se quiser, fixe na barra de tarefas:\n" +
    "   clique com o botão direito no atalho do Menu Iniciar > Fixar na barra de tarefas.\n",
);
