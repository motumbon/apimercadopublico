import { chromium } from 'playwright';

const BASE_URL = 'https://www.mercadopublico.cl';

export async function scrapeOrdenesDeCompra(codigoLicitacion, mostrarNavegador = false) {
  console.log(`[SCRAPER] Buscando OC para licitación: ${codigoLicitacion}`);
  
  const browser = await chromium.launch({ 
    headless: !mostrarNavegador,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  const ordenes = [];
  const prefijoLicitacion = codigoLicitacion.split('-')[0];
  
  try {
    // 1. Ir a la página de la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('[SCRAPER] Página de licitación cargada');
    
    // 2. Hacer clic en el tab de Órdenes de Compra
    console.log('[SCRAPER] Buscando tab de Órdenes de Compra...');
    
    // Hacer clic en el tab
    const ocTab = page.locator('text=Orden de Compra').first();
    if (await ocTab.isVisible({ timeout: 5000 })) {
      console.log('[SCRAPER] Tab encontrado, haciendo clic...');
      await ocTab.click();
      await page.waitForTimeout(5000); // Esperar a que cargue el contenido
      
      // Tomar screenshot después del clic
      await page.screenshot({ path: 'after_oc_click.png', fullPage: true });
      console.log('[SCRAPER] Screenshot guardado: after_oc_click.png');
    }
    
    // 3. Extraer códigos de OC de todas las páginas
    let paginaActual = 1;
    const codigosOC = new Set();
    
    while (paginaActual <= 20) {
      console.log(`[SCRAPER] Procesando página ${paginaActual}...`);
      
      // Obtener todo el HTML de la página para buscar códigos
      const htmlContent = await page.content();
      const textContent = await page.evaluate(() => document.body.innerText);
      
      // Buscar códigos de OC en el contenido
      // Patrón: XXXX-XXXXX-SE25, XXXX-XXXXX-AG25, etc.
      const patronOC = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
      
      const matchesHtml = htmlContent.match(patronOC) || [];
      const matchesText = textContent.match(patronOC) || [];
      
      const todosMatches = [...new Set([...matchesHtml, ...matchesText])];
      
      // Filtrar el código de la licitación (que termina en LR)
      const codigosFiltrados = todosMatches.filter(c => !c.includes('-LR'));
      
      codigosFiltrados.forEach(c => codigosOC.add(c));
      
      console.log(`[SCRAPER] Página ${paginaActual}: ${codigosFiltrados.length} OC encontradas (Total: ${codigosOC.size})`);
      
      // Buscar enlaces a OC directamente
      const linksOC = await page.locator(`a[href*="${prefijoLicitacion}-"]`).all();
      console.log(`[SCRAPER] Enlaces a OC encontrados: ${linksOC.length}`);
      
      for (const link of linksOC) {
        const href = await link.getAttribute('href') || '';
        const match = href.match(new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`));
        if (match && !match[0].includes('-LR')) {
          codigosOC.add(match[0]);
        }
      }
      
      // Buscar siguiente página
      let hayMasPaginas = false;
      
      // Buscar paginación
      const paginacion = page.locator('.pagination, .pager, [class*="pag"]');
      if (await paginacion.isVisible({ timeout: 2000 })) {
        const nextBtn = page.locator(`a:has-text("${paginaActual + 1}"), a:has-text("Siguiente"), a:has-text("›")`).first();
        if (await nextBtn.isVisible({ timeout: 2000 })) {
          await nextBtn.click();
          await page.waitForTimeout(3000);
          hayMasPaginas = true;
          paginaActual++;
        }
      }
      
      if (!hayMasPaginas) {
        console.log('[SCRAPER] No hay más páginas de OC');
        break;
      }
    }
    
    console.log(`[SCRAPER] Total códigos OC únicos: ${codigosOC.size}`);
    console.log(`[SCRAPER] Códigos: ${[...codigosOC].join(', ')}`);
    
    // 4. Obtener detalles de cada OC
    for (const codigoOC of codigosOC) {
      try {
        console.log(`[SCRAPER] Obteniendo detalles de ${codigoOC}...`);
        
        const ocUrl = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoOC}`;
        await page.goto(ocUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        const datos = await page.evaluate(() => {
          const body = document.body.innerText;
          
          // Monto total
          let monto = 0;
          const montoPatterns = [
            /Total\s*(?:Neto)?\s*:?\s*\$?\s*([\d.,]+)/i,
            /Monto\s*(?:Total)?\s*:?\s*\$?\s*([\d.,]+)/i,
            /\$\s*([\d.,]+)\s*(?:CLP)?/
          ];
          
          for (const pattern of montoPatterns) {
            const match = body.match(pattern);
            if (match) {
              monto = parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
              if (monto > 0) break;
            }
          }
          
          // Estado
          let estado = '';
          const estadoMatch = body.match(/Estado[:\s]+([^\n\r]+)/i);
          if (estadoMatch) {
            estado = estadoMatch[1].trim().split(/\s{2,}/)[0];
          }
          
          // Proveedor
          let proveedor = '';
          const provMatch = body.match(/Proveedor[:\s]+([^\n\r]+)/i);
          if (provMatch) {
            proveedor = provMatch[1].trim().split(/\s{2,}/)[0];
          }
          
          // RUT
          let rut = '';
          const rutMatch = body.match(/([\d]{1,2}\.[\d]{3}\.[\d]{3}-[\dkK])/);
          if (rutMatch) {
            rut = rutMatch[1];
          }
          
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
        
        console.log(`[SCRAPER] ✓ ${codigoOC}: $${datos.monto.toLocaleString('es-CL')} - ${datos.proveedor || 'Sin proveedor'}`);
        
        await page.waitForTimeout(1000); // Pausa entre requests
        
      } catch (err) {
        console.log(`[SCRAPER] ✗ Error en ${codigoOC}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('[SCRAPER] Error general:', error.message);
    await page.screenshot({ path: 'scraper_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log(`\n[SCRAPER] === RESUMEN ===`);
  console.log(`[SCRAPER] OC procesadas: ${ordenes.length}`);
  
  return ordenes;
}

// Test
if (process.argv[1].includes('scraperV2')) {
  scrapeOrdenesDeCompra('4309-76-LR25', true).then(ordenes => {
    console.log('\n=== RESULTADOS FINALES ===');
    let total = 0;
    ordenes.forEach(oc => {
      console.log(`${oc.codigo}: $${oc.monto.toLocaleString('es-CL')}`);
      total += oc.monto;
    });
    console.log(`\nTotal OC: ${ordenes.length}`);
    console.log(`Monto total: $${total.toLocaleString('es-CL')}`);
  });
}
