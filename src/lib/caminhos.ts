import path from "node:path";

/** Pasta local com o banco, as imagens e os backups (fora do git). */
export const PASTA_DADOS = path.join(process.cwd(), "data");
export const CAMINHO_BANCO = path.join(PASTA_DADOS, "app.db");
export const PASTA_IMAGENS = path.join(PASTA_DADOS, "images");
