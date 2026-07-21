// web/lib/apresentacoes/pdf.ts
import type { Browser } from 'puppeteer-core'

/**
 * Renderização da apresentação em PDF via Chromium.
 *
 * O PDF é a MESMA página que o cliente vê no navegador, renderizada com os
 * estilos de impressão. Não existe um segundo layout para manter em sincronia —
 * que é a causa clássica de "o PDF saiu diferente do site".
 *
 * Em produção usamos @sparticuz/chromium (binário empacotado para serverless).
 * Em desenvolvimento, o Chrome instalado na máquina, porque o binário serverless
 * é compilado para Linux e não roda no Windows/macOS do desenvolvedor.
 */

const CAMINHOS_CHROME_LOCAL = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
]

async function chromeLocal(): Promise<string | null> {
  const { existsSync } = await import('node:fs')
  for (const caminho of CAMINHOS_CHROME_LOCAL) {
    try {
      if (existsSync(caminho)) return caminho
    } catch {
      // caminho inacessível — tenta o próximo
    }
  }
  return null
}

async function abrirNavegador(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core')

  if (process.env.NODE_ENV === 'development') {
    const executablePath = await chromeLocal()
    if (!executablePath) {
      throw new Error(
        'Chrome não encontrado para gerar PDF em desenvolvimento. ' +
          'Instale o Google Chrome ou teste esta rota em produção.'
      )
    }
    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }) as unknown as Promise<Browser>
  }

  const chromium = (await import('@sparticuz/chromium')).default
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 1696 },
    executablePath: await chromium.executablePath(),
    headless: true,
  }) as unknown as Promise<Browser>
}

/**
 * Gera o PDF A4 de uma URL de apresentação.
 * `printBackground` é obrigatório: sem ele, a capa e os cards saem sem cor.
 */
export async function gerarPdfDaApresentacao(url: string): Promise<Buffer> {
  const navegador = await abrirNavegador()
  try {
    const pagina = await navegador.newPage()

    // A apresentação busca os dados por fetch no cliente; sem esperar a rede
    // ociosa, o PDF sairia com o "Carregando sua proposta...".
    await pagina.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })
    await pagina.waitForSelector('.apr__card', { timeout: 10_000 })

    const pdf = await pagina.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })

    return Buffer.from(pdf)
  } finally {
    await navegador.close()
  }
}
