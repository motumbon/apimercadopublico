import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://www.mercadopublico.cl';

export async function scrapeOrdenesDeCompraIntercept(codigoLicitacion, mostrarNavegador = false) {
  console.log(`[SCRAPER] Iniciando scraping con intercepción para: ${codigoLicitacion}`);
  
  // Siempre usar modo visible para asegurar que funcione la intercepción
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  
  const codigosOC = new Set();
  const prefijoLicitacion = codigoLicitacion.split('-')[0];
  const patronOC = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
  
  // Interceptar TODAS las respuestas de red
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      if (contentType.includes('html') || contentType.includes('json') || contentType.includes('text')) {
        const body = await response.text().catch(() => '');
        const matches = body.match(patronOC) || [];
        const ocValidas = matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'));
        
        if (ocValidas.length > 0) {
          console.log(`[INTERCEPT] ${ocValidas.length} OC en: ${url.substring(0, 80)}...`);
          ocValidas.forEach(c => codigosOC.add(c));
        }
      }
    } catch (e) {
      // Ignorar errores de intercepción
    }
  });
  
  try {
    // 1. Navegar a la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    console.log(`[SCRAPER] OC capturadas hasta ahora: ${codigosOC.size}`);
    
    // 2. Buscar y hacer clic en "Orden de Compra"
    console.log('[SCRAPER] Buscando tab "Orden de Compra"...');
    
    // Buscar el elemento con múltiples estrategias
    const tabOC = page.getByText('Orden de Compra', { exact: false }).first();
    
    try {
      await tabOC.waitFor({ state: 'visible', timeout: 10000 });
      await tabOC.click();
      console.log('[SCRAPER] Clic en tab OC realizado');
    } catch (e) {
      console.log('[SCRAPER] No se pudo hacer clic en tab OC:', e.message);
    }
    
    // Esperar a que se carguen las respuestas
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);  // Más tiempo para capturar respuestas
    
    console.log(`[SCRAPER] OC después de clic: ${codigosOC.size}`);
    
    // 3. Buscar también en el DOM actual
    const htmlActual = await page.content();
    const matchesDOM = htmlActual.match(patronOC) || [];
    matchesDOM.filter(c => !c.includes('-LR') && !c.includes('-LE')).forEach(c => codigosOC.add(c));
    
    // 4. Paginación - buscar y hacer clic en números de página
    for (let pagina = 2; pagina <= 25; pagina++) {
      try {
        const btnPagina = page.locator(`a:has-text("${pagina}")`).first();
        const visible = await btnPagina.isVisible({ timeout: 2000 });
        
        if (visible) {
          console.log(`[SCRAPER] Navegando a página ${pagina}...`);
          await btnPagina.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          
          // Buscar en DOM de nueva página
          const nuevoHtml = await page.content();
          const nuevosMatches = nuevoHtml.match(patronOC) || [];
          nuevosMatches.filter(c => !c.includes('-LR') && !c.includes('-LE')).forEach(c => codigosOC.add(c));
          
          console.log(`[SCRAPER] Total OC: ${codigosOC.size}`);
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
    
    // Guardar HTML para debug
    const htmlFinal = await page.content();
    writeFileSync('debug_intercept.html', htmlFinal);
    await page.screenshot({ path: 'debug_intercept.png', fullPage: true });
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
  } finally {
    await browser.close();
  }
  
  const listaFinal = [...codigosOC];
  console.log(`\n[SCRAPER] === RESULTADO FINAL ===`);
  console.log(`[SCRAPER] Total OC encontradas: ${listaFinal.length}`);
  
  if (listaFinal.length > 0) {
    listaFinal.forEach(c => console.log(`  - ${c}`));
  } else {
    console.log('[SCRAPER] No se encontraron OC. Revisa los screenshots de debug.');
  }
  
  return listaFinal;
}

// Test
if (process.argv[1].includes('scraperIntercept')) {
  const codigo = process.argv[2] || '4309-76-LR25';
  scrapeOrdenesDeCompraIntercept(codigo, true).then(codigos => {
    console.log(`\nTotal: ${codigos.length} OC`);
  });
}
