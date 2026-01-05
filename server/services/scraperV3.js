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
    
    // 2. Hacer clic en el tab de Órdenes de Compra
    console.log('[SCRAPER] Buscando tab de Órdenes de Compra...');
    
    const ocTab = page.locator('text=Orden de Compra').first();
    if (await ocTab.isVisible({ timeout: 5000 })) {
      await ocTab.click();
      await page.waitForTimeout(5000);
    }
    
    // 3. Extraer códigos de OC de todas las páginas
    let paginaActual = 1;
    const codigosOC = new Set();
    
    while (paginaActual <= 25) {
      console.log(`[SCRAPER] Procesando página ${paginaActual}...`);
      
      // Buscar todos los enlaces en la página
      const todosEnlaces = await page.evaluate(() => {
        const enlaces = [];
        document.querySelectorAll('a').forEach(a => {
          const href = a.href || '';
          const text = a.textContent || '';
          enlaces.push({ href, text });
        });
        return enlaces;
      });
      
      // Filtrar enlaces que contengan códigos de OC
      const patronOC = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`);
      
      for (const enlace of todosEnlaces) {
        // Buscar en el href
        const matchHref = enlace.href.match(patronOC);
        if (matchHref && !matchHref[0].includes('-LR')) {
          codigosOC.add(matchHref[0]);
        }
        
        // Buscar en el texto del enlace
        const matchText = enlace.text.match(patronOC);
        if (matchText && !matchText[0].includes('-LR')) {
          codigosOC.add(matchText[0]);
        }
      }
      
      // También buscar en celdas de tabla
      const celdasTabla = await page.evaluate((prefijo) => {
        const codigos = [];
        document.querySelectorAll('td, th, span, div').forEach(el => {
          const texto = el.textContent || '';
          const patron = new RegExp(`${prefijo}-\\d+-[A-Z]{2}\\d{2}`, 'g');
          const matches = texto.match(patron);
          if (matches) {
            matches.forEach(m => {
              if (!m.includes('-LR') && !codigos.includes(m)) {
                codigos.push(m);
              }
            });
          }
        });
        return codigos;
      }, prefijoLicitacion);
      
      celdasTabla.forEach(c => codigosOC.add(c));
      
      console.log(`[SCRAPER] Página ${paginaActual}: Total acumulado: ${codigosOC.size} OC`);
      
      // Buscar siguiente página
      let hayMasPaginas = false;
      
      try {
        // Buscar botón de página siguiente o número de página
        const nextSelectors = [
          `a:has-text("${paginaActual + 1}")`,
          'a:has-text("›")',
          'a:has-text(">")',
          'a:has-text("Siguiente")',
          '.pagination-next',
          '[aria-label="Next"]'
        ];
        
        for (const sel of nextSelectors) {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 2000 })) {
            await btn.click();
            await page.waitForTimeout(3000);
            hayMasPaginas = true;
            paginaActual++;
            break;
          }
        }
      } catch (e) {
        // No hay más páginas
      }
      
      if (!hayMasPaginas) {
        console.log('[SCRAPER] No hay más páginas');
        break;
      }
    }
    
    const listaOC = [...codigosOC];
    console.log(`[SCRAPER] Total OC encontradas: ${listaOC.length}`);
    
    if (listaOC.length > 0) {
      console.log(`[SCRAPER] Primeras OC: ${listaOC.slice(0, 5).join(', ')}...`);
    }
    
    // 4. Obtener detalles de cada OC
    for (const codigoOC of listaOC) {
      try {
        console.log(`[SCRAPER] Obteniendo detalles de ${codigoOC}...`);
        
        const ocUrl = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoOC}`;
        await page.goto(ocUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        const datos = await page.evaluate(() => {
          const body = document.body.innerText;
          
          // Monto - buscar varios patrones
          let monto = 0;
          const montoPatterns = [
            /Total\s*Neto[:\s]*\$?\s*([\d.,]+)/i,
            /Total[:\s]*\$?\s*([\d.,]+)/i,
            /Monto\s*Total[:\s]*\$?\s*([\d.,]+)/i,
            /\$\s*([\d]{1,3}(?:\.[\d]{3})*(?:,\d+)?)/
          ];
          
          for (const pattern of montoPatterns) {
            const match = body.match(pattern);
            if (match) {
              const valor = match[1].replace(/\./g, '').replace(',', '.');
              const num = parseFloat(valor);
              if (num > monto) monto = num;
            }
          }
          
          // Estado
          let estado = 'Sin estado';
          const estadoPatterns = [
            /Estado[:\s]+([A-Za-zÁÉÍÓÚáéíóú\s]+?)(?:\n|$)/i,
            /Estado de la OC[:\s]+([^\n]+)/i
          ];
          for (const pattern of estadoPatterns) {
            const match = body.match(pattern);
            if (match) {
              estado = match[1].trim();
              break;
            }
          }
          
          // Proveedor
          let proveedor = '';
          const provMatch = body.match(/Proveedor[:\s]+([^\n]+)/i);
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
          estado: datos.estado,
          estado_codigo: 0,
          monto: datos.monto,
          moneda: 'CLP',
          proveedor: datos.proveedor,
          proveedor_rut: datos.rut,
          licitacion_codigo: codigoLicitacion
        });
        
        console.log(`[SCRAPER] ✓ ${codigoOC}: $${datos.monto.toLocaleString('es-CL')}`);
        
        await page.waitForTimeout(800);
        
      } catch (err) {
        console.log(`[SCRAPER] ✗ Error en ${codigoOC}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
    await page.screenshot({ path: 'scraper_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  // Resumen
  console.log(`\n[SCRAPER] === RESUMEN ===`);
  console.log(`[SCRAPER] OC procesadas: ${ordenes.length}`);
  
  const totalMonto = ordenes.reduce((sum, oc) => sum + oc.monto, 0);
  console.log(`[SCRAPER] Monto total: $${totalMonto.toLocaleString('es-CL')}`);
  
  return ordenes;
}

// Test
if (process.argv[1].includes('scraperV3')) {
  scrapeOrdenesDeCompra('4309-76-LR25', true).then(ordenes => {
    console.log('\n=== LISTADO DE OC ===');
    ordenes.forEach(oc => {
      console.log(`${oc.codigo}: $${oc.monto.toLocaleString('es-CL')} - ${oc.proveedor}`);
    });
  });
}
