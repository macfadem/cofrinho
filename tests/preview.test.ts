import { describe, expect, it } from "vitest";
import { extrairDados, limparTitulo, precoParaCentavos } from "@/lib/preview";
import { ehEnderecoPrivado } from "@/lib/rede";

const URL_PAGINA = "https://www.loja.com.br/produtos/fone";

function pagina(cabeca: string, corpo = "") {
  return `<!doctype html><html><head>${cabeca}</head><body>${corpo}</body></html>`;
}

describe("prévia de link: imagem e nome", () => {
  it("usa og:image e og:title", () => {
    const html = pagina(`
      <meta property="og:title" content="AirPods Pro 3 - Loja">
      <meta property="og:site_name" content="Loja">
      <meta property="og:image" content="https://cdn.loja.com.br/airpods.jpg">`);
    expect(extrairDados(html, URL_PAGINA)).toEqual({
      nome: "AirPods Pro 3",
      preco: null,
      imagemUrl: "https://cdn.loja.com.br/airpods.jpg",
    });
  });

  it("cai para twitter:image e resolve endereços relativos", () => {
    const html = pagina(`<title>Fone &amp; Cia</title><meta name="twitter:image" content="/img/fone.png">`);
    const dados = extrairDados(html, URL_PAGINA);
    expect(dados.imagemUrl).toBe("https://www.loja.com.br/img/fone.png");
    expect(dados.nome).toBe("Fone & Cia");
  });

  it("não sugere imagem que não seja http/https", () => {
    const html = pagina(`<meta property="og:image" content="javascript:alert(1)">`);
    expect(extrairDados(html, URL_PAGINA).imagemUrl).toBeNull();
  });
});

describe("prévia de link: preço", () => {
  it("lê o JSON-LD de Product (preço em número)", () => {
    const html = pagina(`<script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Product","name":"Apple Watch SE 3",
       "image":["https://cdn.loja.com.br/watch.webp"],
       "offers":{"@type":"Offer","price":1999.9,"priceCurrency":"BRL"}}
    </script>`);
    expect(extrairDados(html, URL_PAGINA)).toEqual({
      nome: "Apple Watch SE 3",
      preco: 199990,
      imagemUrl: "https://cdn.loja.com.br/watch.webp",
    });
  });

  it("acha o produto dentro de @graph e aceita AggregateOffer", () => {
    const html = pagina(`<script type="application/ld+json">
      {"@graph":[{"@type":"WebPage"},{"@type":["Product"],"name":"iPhone 17",
       "offers":{"@type":"AggregateOffer","lowPrice":"5699.00","priceCurrency":"BRL"}}]}
    </script>`);
    expect(extrairDados(html, URL_PAGINA).preco).toBe(569900);
  });

  it("ignora preço em outra moeda", () => {
    const html = pagina(`<script type="application/ld+json">
      {"@type":"Product","name":"MacBook","offers":[{"price":"999","priceCurrency":"USD"}]}
    </script>`);
    expect(extrairDados(html, URL_PAGINA).preco).toBeNull();
  });

  it("usa a meta product:price quando não há JSON-LD", () => {
    const html = pagina(`
      <meta property="product:price:amount" content="1.999,00">
      <meta property="product:price:currency" content="BRL">`);
    expect(extrairDados(html, URL_PAGINA).preco).toBe(199900);
  });

  it("aguenta JSON-LD quebrado", () => {
    const html = pagina(`<script type="application/ld+json">{ isso não é json</script>
      <meta property="og:title" content="Bermuda">`);
    expect(extrairDados(html, URL_PAGINA)).toEqual({ nome: "Bermuda", preco: null, imagemUrl: null });
  });

  it.each([
    [1999.9, 199990],
    ["1999.90", 199990],
    ["70", 7000],
    ["1.999,90", 199990],
    ["R$ 2.699,00", 269900],
    [0, null],
    ["grátis", null],
    [null, null],
  ])("precoParaCentavos(%j) = %j", (valor, esperado) => {
    expect(precoParaCentavos(valor)).toBe(esperado);
  });
});

describe("título sem o nome da loja", () => {
  it.each([
    ["AirPods Pro 3 - Magazine Luiza", "Magazine Luiza", "www.magazineluiza.com.br", "AirPods Pro 3"],
    ["Amazon.com.br: Apple AirPods Pro 3", null, "www.amazon.com.br", "Apple AirPods Pro 3"],
    ["Fone Bluetooth - Preto | Mercado Livre", "Mercado Livre", "produto.mercadolivre.com.br", "Fone Bluetooth - Preto"],
    ["Cabo USB-C - Lightning 2 m", null, "loja.com.br", "Cabo USB-C - Lightning 2 m"],
  ])("%s", (titulo, site, host, esperado) => {
    expect(limparTitulo(titulo, site, host)).toBe(esperado);
  });
});

describe("rede local bloqueada", () => {
  it.each([
    ["127.0.0.1", true],
    ["10.0.0.5", true],
    ["192.168.0.1", true],
    ["172.20.1.1", true],
    ["169.254.1.1", true],
    ["100.64.0.1", true],
    ["::1", true],
    ["fd12::1", true],
    ["::ffff:192.168.1.1", true],
    ["8.8.8.8", false],
    ["172.32.0.1", false],
    ["2800:3f0:4001::1", false],
  ])("%s → %s", (ip, privado) => {
    expect(ehEnderecoPrivado(ip)).toBe(privado);
  });
});
