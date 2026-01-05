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
  
  try {
    // 1. Ir directamente a la página de la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Verificar que estamos en la página correcta
    const pageContent = await page.evaluate(() => document.body.innerText);
    if (!pageContent.includes(codigoLicitacion.split('-')[0])) {
      throw new Error('No se pudo acceder a la página de la licitación');
    }
    
    console.log('[SCRAPER] Página de licitación cargada correctamente');
    
    // 2. Buscar y hacer clic en la sección de Órdenes de Compra
    console.log('[SCRAPER] Buscando sección de Órdenes de Compra...');
    
    // Buscar el tab/enlace de Órdenes de Compra
    const ocSelectors = [
      'text=Orden de Compra',
      'text=Órdenes de Compra',
      'a:has-text("Orden")',
      '[data-toggle="tab"]:has-text("Orden")',
      'button:has-text("Orden")',
      '.nav-item:has-text("Orden")'
    ];
    
    let ocTabFound = false;
    for (const selector of ocSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`[SCRAPER] Tab OC encontrado con selector: ${selector}`);
          await element.click();
          await page.waitForTimeout(3000);
          ocTabFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!ocTabFound) {
      console.log('[SCRAPER] No se encontró tab de OC, buscando en contenido de página...');
    }
    
    // 3. Extraer códigos de OC de todas las páginas
    let paginaActual = 1;
    const codigosOC = new Set();
    
    while (paginaActual <= 15) {
      console.log(`[SCRAPER] Procesando página ${paginaActual}...`);
      
      // Extraer códigos de OC del contenido actual
      const codigos = await page.evaluate(() => {
        const texto = document.body.innerText;
        const encontrados = [];
        
        // Patrón: XXXX-XXXXX-XX25 (ej: 4309-19024-SE25)
        const patron = /\d{3,5}-\d+-[A-Z]{2}\d{2}/g;
        const matches = texto.match(patron);
        
        if (matches) {
          matches.forEach(m => {
            if (!encontrados.includes(m)) {
              encontrados.push(m);
            }
          });
        }
        
        return encontrados;
      });
      
      codigos.forEach(c => codigosOC.add(c));
      console.log(`[SCRAPER] Página ${paginaActual}: ${codigos.length} códigos (Total acumulado: ${codigosOC.size})`);
      
      // Buscar siguiente página
      let hayMasPaginas = false;
      const nextSelectors = [
        `a:has-text("${paginaActual + 1}")`,
        'a:has-text("Siguiente")',
        'a:has-text("›")',
        '.pagination .next a',
        'a[rel="next"]'
      ];
      
      for (const selector of nextSelectors) {
        try {
          const nextBtn = page.locator(selector).first();
          if (await nextBtn.isVisible({ timeout: 2000 })) {
            await nextBtn.click();
            await page.waitForTimeout(2000);
            hayMasPaginas = true;
            paginaActual++;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!hayMasPaginas) {
        console.log('[SCRAPER] No hay más páginas');
        break;
      }
    }
    
    console.log(`[SCRAPER] Total códigos OC únicos encontrados: ${codigosOC.size}`);
    
    // 4. Filtrar solo las OC que corresponden a esta licitación (mismo prefijo)
    const prefijoLicitacion = codigoLicitacion.split('-')[0];
    const codigosFiltrados = [...codigosOC].filter(c => c.startsWith(prefijoLicitacion + '-'));
    
    console.log(`[SCRAPER] OC que corresponden a licitación ${prefijoLicitacion}: ${codigosFiltrados.length}`);
    
    // 5. Obtener detalles de cada OC
    for (const codigoOC of codigosFiltrados) {
      try {
        console.log(`[SCRAPER] Obteniendo detalles de ${codigoOC}...`);
        
        // Ir a la página de la OC
        const ocUrl = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoOC}`;
        await page.goto(ocUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Extraer datos
        const datos = await page.evaluate(() => {
          const body = document.body.innerText;
          
          let monto = 0;
          const montoMatch = body.match(/Total[:\s]*\$?\s*([\d.,]+)/i) || 
                            body.match(/Monto[:\s]*\$?\s*([\d.,]+)/i);
          if (montoMatch) {
            monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
          }
          
          let estado = 'Desconocido';
          const estadoMatch = body.match(/Estado[:\s]*([^\n]+)/i);
          if (estadoMatch) {
            estado = estadoMatch[1].trim().split(/\s{2,}/)[0];
          }
          
          let proveedor = '';
          const provMatch = body.match(/Proveedor[:\s]*([^\n]+)/i);
          if (provMatch) {
            proveedor = provMatch[1].trim().split(/\s{2,}/)[0];
          }
          
          let rut = '';
          const rutMatch = body.match(/RUT[:\s]*([\d.-]+[kK\d])/i);
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
        
        console.log(`[SCRAPER] OC ${codigoOC}: $${datos.monto.toLocaleString('es-CL')}`);
        
      } catch (err) {
        console.log(`[SCRAPER] Error en OC ${codigoOC}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
    await page.screenshot({ path: 'scraper_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log(`[SCRAPER] Proceso completado. ${ordenes.length} OC procesadas.`);
  return ordenes;
}

// Ejecutar si es llamado directamente
if (process.argv[1].includes('scraperFinal')) {
  scrapeOrdenesDeCompra('4309-76-LR25', true).then(ordenes => {
    console.log('\n=== RESULTADOS ===');
    console.log(`Total OC: ${ordenes.length}`);
    let totalMonto = 0;
    ordenes.forEach(oc => {
      console.log(`${oc.codigo}: $${oc.monto.toLocaleString('es-CL')} - ${oc.proveedor}`);
      totalMonto += oc.monto;
    });
    console.log(`\nMonto total: $${totalMonto.toLocaleString('es-CL')}`);
  });
}
