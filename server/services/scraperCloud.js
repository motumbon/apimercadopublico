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
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  const codigosOC = new Set();
  const prefijoLicitacion = codigoLicitacion.split('-')[0];
  // Patrón más amplio para capturar OC
  const patronOC = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
  
  // Interceptar TODAS las respuestas de red
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      if (contentType.includes('html') || contentType.includes('json') || contentType.includes('text') || url.includes('aspx')) {
        const body = await response.text().catch(() => '');
        const matches = body.match(patronOC) || [];
        const ocValidas = matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP') && !c.includes('-LQ'));
        if (ocValidas.length > 0) {
          console.log(`[SCRAPER-CLOUD] Detectadas ${ocValidas.length} OC en respuesta de red`);
          ocValidas.forEach(c => codigosOC.add(c));
        }
      }
    } catch (e) {}
  });
  
  try {
    // Navegar a la página de la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER-CLOUD] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Escanear HTML inicial
    let html = await page.content();
    let matches = html.match(patronOC) || [];
    matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP') && !c.includes('-LQ'))
      .forEach(c => codigosOC.add(c));
    
    console.log(`[SCRAPER-CLOUD] OC en página inicial: ${codigosOC.size}`);
    
    // Intentar encontrar y hacer clic en pestañas de OC usando JavaScript
    const clickedOC = await page.evaluate(() => {
      // Buscar enlaces que contengan "Orden" o "OC" en el texto
      const links = Array.from(document.querySelectorAll('a, span, div, li'));
      for (const el of links) {
        const text = el.textContent || '';
        if (text.includes('Orden de Compra') || text.includes('Órdenes de Compra') || 
            (text.includes('OC') && text.length < 50)) {
          if (el.click) {
            el.click();
            return true;
          }
        }
      }
      
      // Buscar por ID o clase común
      const ocTab = document.querySelector('[id*="ordencompra" i], [id*="oc" i], [class*="ordencompra" i]');
      if (ocTab && ocTab.click) {
        ocTab.click();
        return true;
      }
      
      return false;
    });
    
    if (clickedOC) {
      console.log(`[SCRAPER-CLOUD] Se hizo clic en pestaña de OC`);
      await page.waitForTimeout(5000);
      
      // Escanear después del clic
      html = await page.content();
      matches = html.match(patronOC) || [];
      matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP') && !c.includes('-LQ'))
        .forEach(c => codigosOC.add(c));
      
      console.log(`[SCRAPER-CLOUD] OC después de clic: ${codigosOC.size}`);
    }
    
    // Intentar expandir/cargar más contenido
    await page.evaluate(() => {
      // Hacer clic en cualquier botón de expandir o ver más
      const expandButtons = document.querySelectorAll('[class*="expand"], [class*="more"], [class*="ver"], button');
      expandButtons.forEach(btn => {
        try { btn.click(); } catch(e) {}
      });
    });
    
    await page.waitForTimeout(3000);
    
    // Escaneo final
    html = await page.content();
    matches = html.match(patronOC) || [];
    matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP') && !c.includes('-LQ'))
      .forEach(c => codigosOC.add(c));
    
  } catch (error) {
    console.error('[SCRAPER-CLOUD] Error:', error.message);
  } finally {
    try {
      await browser.close();
    } catch (e) {}
  }
  
  const listaFinal = [...codigosOC];
  console.log(`[SCRAPER-CLOUD] Total OC detectadas: ${listaFinal.length}`);
  if (listaFinal.length > 0) {
    listaFinal.forEach(c => console.log(`[SCRAPER-CLOUD]   - ${c}`));
  }
  
  return listaFinal;
}
