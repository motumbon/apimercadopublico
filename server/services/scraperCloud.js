import { chromium } from 'playwright';

const BASE_URL = 'https://www.mercadopublico.cl';

/**
 * Scraper que funciona en la nube usando Browserless.io
 * Requiere variable de entorno BROWSERLESS_API_KEY
 */
export async function scrapeOrdenesCloud(codigoLicitacion) {
  const browserlessKey = process.env.BROWSERLESS_API_KEY;
  
  if (!browserlessKey) {
    throw new Error('BROWSERLESS_API_KEY no configurada. Configura tu API key de browserless.io');
  }
  
  console.log(`[SCRAPER-CLOUD] Iniciando scraping para: ${codigoLicitacion}`);
  
  // Conectar a Browserless.io
  const browser = await chromium.connectOverCDP(
    `wss://chrome.browserless.io?token=${browserlessKey}`
  );
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const codigosOC = new Set();
  const prefijoLicitacion = codigoLicitacion.split('-')[0];
  const patronOC = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
  
  // Interceptar respuestas de red
  page.on('response', async (response) => {
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('html') || contentType.includes('json') || contentType.includes('text')) {
        const body = await response.text().catch(() => '');
        const matches = body.match(patronOC) || [];
        const ocValidas = matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'));
        ocValidas.forEach(c => codigosOC.add(c));
      }
    } catch (e) {}
  });
  
  try {
    // Navegar a la página de la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER-CLOUD] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Esperar a que cargue el contenido
    await page.waitForTimeout(3000);
    
    // Buscar y hacer clic en la pestaña de "Orden de Compra" si existe
    const tabs = await page.$$('a[href*="OrdenCompra"], a:has-text("Orden de Compra"), a:has-text("OC")');
    
    for (const tab of tabs) {
      try {
        await tab.click();
        await page.waitForTimeout(3000);
        
        // Escanear el contenido
        const html = await page.content();
        const matches = html.match(patronOC) || [];
        matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'))
          .forEach(c => codigosOC.add(c));
        
        // Buscar paginación y recorrer páginas
        let paginaActual = 1;
        const maxPaginas = 10;
        
        while (paginaActual < maxPaginas) {
          const nextButton = await page.$('a:has-text("Siguiente"), a:has-text(">"), .pagination a:last-child');
          if (!nextButton) break;
          
          try {
            await nextButton.click();
            await page.waitForTimeout(2000);
            
            const htmlPagina = await page.content();
            const matchesPagina = htmlPagina.match(patronOC) || [];
            const nuevas = matchesPagina.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'));
            nuevas.forEach(c => codigosOC.add(c));
            
            paginaActual++;
          } catch (e) {
            break;
          }
        }
      } catch (e) {
        console.log(`[SCRAPER-CLOUD] Error al hacer clic en pestaña:`, e.message);
      }
    }
    
    // Escaneo final del DOM
    const htmlFinal = await page.content();
    const matchesFinal = htmlFinal.match(patronOC) || [];
    matchesFinal.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'))
      .forEach(c => codigosOC.add(c));
    
  } catch (error) {
    console.error('[SCRAPER-CLOUD] Error:', error.message);
  } finally {
    await browser.close();
  }
  
  const listaFinal = [...codigosOC];
  console.log(`[SCRAPER-CLOUD] Total OC detectadas: ${listaFinal.length}`);
  
  return listaFinal;
}
