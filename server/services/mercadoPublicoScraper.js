import { chromium } from 'playwright';

const BASE_URL = 'https://www.mercadopublico.cl';

export async function scrapeOrdenesDeCompra(codigoLicitacion, mostrarNavegador = false) {
  console.log(`[SCRAPER] Buscando OC para licitación: ${codigoLicitacion}`);
  
  const browser = await chromium.launch({ 
    headless: !mostrarNavegador,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  
  const ordenes = [];
  
  try {
    // 1. Ir a la página de búsqueda
    console.log('[SCRAPER] Navegando a página de búsqueda...');
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // 2. Buscar campo de búsqueda y escribir código
    console.log('[SCRAPER] Buscando campo de búsqueda...');
    
    // Intentar varios selectores posibles
    const searchSelectors = [
      'input[placeholder*="Buscar"]',
      'input[type="search"]',
      'input.form-control',
      '#search',
      'input[name*="search"]',
      'input[id*="busca"]',
      'input[id*="Search"]'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 })) {
          searchInput = input;
          console.log(`[SCRAPER] Campo encontrado: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (searchInput) {
      await searchInput.fill(codigoLicitacion);
      await page.waitForTimeout(500);
      
      // Presionar Enter o buscar botón
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    } else {
      // Ir directo a URL de búsqueda
      console.log('[SCRAPER] Usando URL directa de búsqueda...');
      await page.goto(`${BASE_URL}/Procurement/Modules/RFB/StepsProcessAward/PreviewAwardAct.aspx?idLicitacion=${codigoLicitacion}`, 
        { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }
    
    // 3. Buscar enlace a la licitación en resultados
    console.log('[SCRAPER] Buscando licitación en resultados...');
    
    const licitacionLink = page.locator(`a:has-text("${codigoLicitacion}")`).first();
    if (await licitacionLink.isVisible({ timeout: 5000 })) {
      await licitacionLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }
    
    console.log(`[SCRAPER] URL actual: ${page.url()}`);
    
    // 4. Buscar sección de Órdenes de Compra
    console.log('[SCRAPER] Buscando sección de Órdenes de Compra...');
    
    const ocSelectors = [
      'a:has-text("Orden de Compra")',
      'a:has-text("Órdenes de Compra")',
      'a:has-text("OC")',
      '[data-toggle="tab"]:has-text("Orden")',
      '.nav-link:has-text("Orden")',
      'a[href*="ordencompra"]',
      'a[href*="OC"]'
    ];
    
    for (const selector of ocSelectors) {
      try {
        const ocTab = page.locator(selector).first();
        if (await ocTab.isVisible({ timeout: 3000 })) {
          console.log(`[SCRAPER] Tab OC encontrado: ${selector}`);
          await ocTab.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(3000);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 5. Extraer códigos de OC
    console.log('[SCRAPER] Extrayendo códigos de OC...');
    
    let paginaActual = 1;
    const codigosEncontrados = new Set();
    
    while (paginaActual <= 10) {
      // Extraer códigos de la página actual
      const codigos = await page.evaluate(() => {
        const encontrados = [];
        const texto = document.body.innerText;
        
        // Buscar patrones de código de OC: XXXX-XXXXX-XX25
        const matches = texto.match(/\d{3,5}-\d+-[A-Z]{2}\d{2}/g);
        if (matches) {
          matches.forEach(m => {
            if (!encontrados.includes(m)) {
              encontrados.push(m);
            }
          });
        }
        
        return encontrados;
      });
      
      console.log(`[SCRAPER] Página ${paginaActual}: ${codigos.length} códigos encontrados`);
      
      for (const codigo of codigos) {
        codigosEncontrados.add(codigo);
      }
      
      // Buscar siguiente página
      const nextPageSelectors = [
        'a:has-text("Siguiente")',
        'a:has-text(">")',
        '.pagination .next a',
        'a[rel="next"]',
        `.pagination a:has-text("${paginaActual + 1}")`
      ];
      
      let hayMasPaginas = false;
      for (const selector of nextPageSelectors) {
        try {
          const nextBtn = page.locator(selector).first();
          if (await nextBtn.isVisible({ timeout: 2000 })) {
            await nextBtn.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            hayMasPaginas = true;
            paginaActual++;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!hayMasPaginas) break;
    }
    
    console.log(`[SCRAPER] Total códigos únicos: ${codigosEncontrados.size}`);
    
    // 6. Obtener detalles de cada OC
    for (const codigoOC of codigosEncontrados) {
      try {
        console.log(`[SCRAPER] Obteniendo detalles de ${codigoOC}...`);
        const detalles = await obtenerDetallesOC(context, codigoOC);
        if (detalles) {
          ordenes.push({
            ...detalles,
            licitacion_codigo: codigoLicitacion
          });
        }
        await new Promise(r => setTimeout(r, 1000)); // Pausa entre requests
      } catch (err) {
        console.log(`[SCRAPER] Error en OC ${codigoOC}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('[SCRAPER] Error general:', error.message);
    await page.screenshot({ path: 'scraper_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log(`[SCRAPER] Proceso completado. ${ordenes.length} OC encontradas.`);
  return ordenes;
}

async function obtenerDetallesOC(context, codigoOC) {
  const page = await context.newPage();
  
  try {
    // URL directa de OC en Mercado Público
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${codigoOC}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const datos = await page.evaluate(() => {
      const body = document.body.innerText;
      
      // Extraer monto
      let monto = 0;
      const montoMatch = body.match(/(?:Total|Monto)[:\s]*\$?\s*([\d.,]+)/i);
      if (montoMatch) {
        monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
      }
      
      // Extraer estado
      let estado = 'Desconocido';
      const estadoMatch = body.match(/Estado[:\s]*([^\n\r]+)/i);
      if (estadoMatch) {
        estado = estadoMatch[1].trim().split(/\s{2,}/)[0];
      }
      
      // Extraer proveedor
      let proveedor = '';
      const provMatch = body.match(/Proveedor[:\s]*([^\n\r]+)/i);
      if (provMatch) {
        proveedor = provMatch[1].trim().split(/\s{2,}/)[0];
      }
      
      // Extraer RUT
      let rut = '';
      const rutMatch = body.match(/RUT[:\s]*([\d.-]+[kK\d])/i);
      if (rutMatch) {
        rut = rutMatch[1];
      }
      
      return { monto, estado, proveedor, rut };
    });
    
    await page.close();
    
    return {
      codigo: codigoOC,
      nombre: `OC ${codigoOC}`,
      estado: datos.estado,
      monto: datos.monto,
      proveedor: datos.proveedor,
      proveedor_rut: datos.rut,
      moneda: 'CLP'
    };
    
  } catch (error) {
    await page.close();
    return null;
  }
}

// Test directo
if (process.argv[1].includes('mercadoPublicoScraper')) {
  scrapeOrdenesDeCompra('4309-76-LR25', true).then(ordenes => {
    console.log('\n=== RESULTADOS ===');
    console.log(JSON.stringify(ordenes, null, 2));
  });
}
