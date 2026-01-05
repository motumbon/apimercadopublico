import { chromium } from 'playwright';

const BASE_URL = 'https://www.mercadopublico.cl';

export async function scrapeOrdenesDeCompra(codigoLicitacion, mostrarNavegador = false) {
  console.log(`[SCRAPER] Iniciando scraping para: ${codigoLicitacion}`);
  
  const browser = await chromium.launch({ 
    headless: !mostrarNavegador,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  
  const ordenes = [];
  const codigosOC = new Set();
  const prefijoLicitacion = codigoLicitacion.split('-')[0];
  
  // Interceptar respuestas de red para capturar datos de OC
  const respuestasCapturadas = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('ordencompra') || url.includes('OC') || url.includes('Acquisition')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json') || contentType.includes('html')) {
          const body = await response.text();
          respuestasCapturadas.push({ url, body });
          
          // Buscar códigos de OC en la respuesta
          const patron = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
          const matches = body.match(patron) || [];
          matches.filter(c => !c.includes('-LR')).forEach(c => codigosOC.add(c));
        }
      } catch (e) {}
    }
  });
  
  try {
    // 1. Navegar a la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 2. Hacer clic en tab de OC y esperar carga
    console.log('[SCRAPER] Haciendo clic en Orden de Compra...');
    
    // Esperar a que el tab esté disponible
    await page.waitForSelector('text=Orden de Compra', { timeout: 10000 });
    await page.click('text=Orden de Compra');
    
    // Esperar a que se cargue el contenido (esperar llamadas de red)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    console.log(`[SCRAPER] Respuestas capturadas: ${respuestasCapturadas.length}`);
    console.log(`[SCRAPER] OC en respuestas de red: ${codigosOC.size}`);
    
    // 3. Buscar en el DOM actual con esperas
    console.log('[SCRAPER] Buscando en DOM...');
    
    // Esperar a que aparezcan elementos de tabla o lista
    try {
      await page.waitForSelector('table, .list, .grid, [class*="orden"]', { timeout: 10000 });
    } catch (e) {
      console.log('[SCRAPER] No se encontró tabla/lista específica');
    }
    
    // Extraer todo el texto visible
    const textoCompleto = await page.evaluate(() => {
      // Obtener todo el texto del documento
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let texto = '';
      let node;
      while (node = walker.nextNode()) {
        texto += node.textContent + ' ';
      }
      return texto;
    });
    
    // Buscar códigos de OC
    const patronOC = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
    const matchesDOM = textoCompleto.match(patronOC) || [];
    matchesDOM.filter(c => !c.includes('-LR')).forEach(c => codigosOC.add(c));
    
    console.log(`[SCRAPER] OC encontradas en DOM: ${matchesDOM.filter(c => !c.includes('-LR')).length}`);
    
    // 4. Manejar paginación
    let pagina = 1;
    while (pagina < 20) {
      try {
        // Buscar botón de siguiente página
        const nextBtn = page.locator(`text="${pagina + 1}"`, `text="›"`, `text="Siguiente"`).first();
        
        if (await nextBtn.isVisible({ timeout: 2000 })) {
          console.log(`[SCRAPER] Navegando a página ${pagina + 1}...`);
          await nextBtn.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          
          // Extraer OC de nueva página
          const nuevoTexto = await page.evaluate(() => document.body.innerText);
          const nuevosMatches = nuevoTexto.match(new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g')) || [];
          nuevosMatches.filter(c => !c.includes('-LR')).forEach(c => codigosOC.add(c));
          
          pagina++;
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
    
    const listaOC = [...codigosOC];
    console.log(`\n[SCRAPER] === OC ENCONTRADAS: ${listaOC.length} ===`);
    listaOC.slice(0, 10).forEach(c => console.log(`  - ${c}`));
    if (listaOC.length > 10) console.log(`  ... y ${listaOC.length - 10} más`);
    
    // 5. Obtener detalles de cada OC
    if (listaOC.length > 0) {
      console.log('\n[SCRAPER] Obteniendo detalles de cada OC...');
      
      for (const codigoOC of listaOC) {
        try {
          const ocUrl = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoOC}`;
          await page.goto(ocUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1500);
          
          const datos = await page.evaluate(() => {
            const texto = document.body.innerText;
            
            let monto = 0;
            const montoMatch = texto.match(/Total[:\s]*\$?\s*([\d.,]+)/i);
            if (montoMatch) {
              monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
            }
            
            let estado = '';
            const estadoMatch = texto.match(/Estado[:\s]+([^\n]+)/i);
            if (estadoMatch) estado = estadoMatch[1].trim().split(/\s{2}/)[0];
            
            let proveedor = '';
            const provMatch = texto.match(/Proveedor[:\s]+([^\n]+)/i);
            if (provMatch) proveedor = provMatch[1].trim().split(/\s{2}/)[0];
            
            let rut = '';
            const rutMatch = texto.match(/([\d]{1,2}\.[\d]{3}\.[\d]{3}-[\dkK])/);
            if (rutMatch) rut = rutMatch[1];
            
            return { monto, estado, proveedor, rut };
          });
          
          ordenes.push({
            codigo: codigoOC,
            nombre: `OC ${codigoOC}`,
            estado: datos.estado || 'Sin estado',
            estado_codigo: 0,
            monto: datos.monto,
            moneda: 'CLP',
            proveedor: datos.proveedor,
            proveedor_rut: datos.rut,
            licitacion_codigo: codigoLicitacion
          });
          
          console.log(`[SCRAPER] ✓ ${codigoOC}: $${datos.monto.toLocaleString('es-CL')}`);
          
        } catch (err) {
          console.log(`[SCRAPER] ✗ ${codigoOC}: ${err.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
    await page.screenshot({ path: 'error_scraper.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log(`\n[SCRAPER] === RESUMEN FINAL ===`);
  console.log(`[SCRAPER] Total OC procesadas: ${ordenes.length}`);
  const totalMonto = ordenes.reduce((s, o) => s + o.monto, 0);
  console.log(`[SCRAPER] Monto total: $${totalMonto.toLocaleString('es-CL')}`);
  
  return ordenes;
}

// Test
if (process.argv[1].includes('scraperNetwork')) {
  scrapeOrdenesDeCompra('4309-76-LR25', true).then(ordenes => {
    console.log('\n=== LISTADO FINAL ===');
    ordenes.forEach(o => console.log(`${o.codigo}: $${o.monto.toLocaleString('es-CL')} - ${o.proveedor}`));
  });
}
