import { chromium } from 'playwright';

const BASE_URL = 'https://www.mercadopublico.cl';

export async function buscarOrdenesPorLicitacion(codigoLicitacion) {
  console.log(`[SCRAPER] Iniciando búsqueda de OC para licitación: ${codigoLicitacion}`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  
  const ordenes = [];
  
  try {
    // 1. Ir a la página principal
    console.log('[SCRAPER] Navegando a Mercado Público...');
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'networkidle' });
    
    // 2. Buscar la licitación
    console.log(`[SCRAPER] Buscando licitación ${codigoLicitacion}...`);
    
    // Buscar el campo de búsqueda y escribir el código
    const searchInput = await page.locator('input[type="text"]#search-input, input[name="textoBusqueda"], input.search-input, #txtBusqueda').first();
    await searchInput.fill(codigoLicitacion);
    
    // Hacer clic en el botón de búsqueda
    const searchButton = await page.locator('button[type="submit"], input[type="submit"], .btn-search, #btnBuscar').first();
    await searchButton.click();
    
    // Esperar a que carguen los resultados
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 3. Hacer clic en el resultado de la licitación
    console.log('[SCRAPER] Accediendo a la licitación...');
    
    // Buscar el enlace que contiene el código de la licitación
    const licitacionLink = await page.locator(`a:has-text("${codigoLicitacion}"), a[href*="${codigoLicitacion}"]`).first();
    await licitacionLink.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 4. Navegar a la sección de Órdenes de Compra
    console.log('[SCRAPER] Buscando sección de Órdenes de Compra...');
    
    // Buscar el tab o enlace de Órdenes de Compra
    const ocTab = await page.locator('a:has-text("Orden de Compra"), a:has-text("Órdenes de Compra"), [data-tab="oc"], .tab-oc').first();
    await ocTab.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 5. Extraer las órdenes de compra de todas las páginas
    let paginaActual = 1;
    let hayMasPaginas = true;
    
    while (hayMasPaginas) {
      console.log(`[SCRAPER] Procesando página ${paginaActual}...`);
      
      // Extraer códigos de OC de la página actual
      const codigosOC = await page.evaluate(() => {
        const codigos = [];
        // Buscar todos los enlaces o textos que parezcan códigos de OC
        const elementos = document.querySelectorAll('a[href*="ordenesdecompra"], td, .codigo-oc, [data-codigo]');
        
        for (const el of elementos) {
          const texto = el.textContent || el.getAttribute('data-codigo') || '';
          // Patrón de código de OC: XXXX-XXXXX-XXXX
          const match = texto.match(/\d{3,4}-\d+-[A-Z]{2}\d{2}/g);
          if (match) {
            match.forEach(codigo => {
              if (!codigos.includes(codigo)) {
                codigos.push(codigo);
              }
            });
          }
        }
        return codigos;
      });
      
      console.log(`[SCRAPER] Encontrados ${codigosOC.length} códigos de OC en página ${paginaActual}`);
      
      // Obtener detalles de cada OC
      for (const codigoOC of codigosOC) {
        try {
          const detalleOC = await obtenerDetalleOC(context, codigoOC);
          if (detalleOC) {
            ordenes.push({
              ...detalleOC,
              licitacion_codigo: codigoLicitacion
            });
          }
        } catch (err) {
          console.log(`[SCRAPER] Error obteniendo detalles de OC ${codigoOC}: ${err.message}`);
        }
      }
      
      // Intentar ir a la siguiente página
      const siguientePagina = await page.locator('a:has-text("Siguiente"), .pagination .next, a[rel="next"]').first();
      
      if (await siguientePagina.isVisible()) {
        await siguientePagina.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        paginaActual++;
      } else {
        hayMasPaginas = false;
      }
      
      // Límite de seguridad
      if (paginaActual > 20) {
        console.log('[SCRAPER] Límite de páginas alcanzado');
        break;
      }
    }
    
    console.log(`[SCRAPER] Total de órdenes encontradas: ${ordenes.length}`);
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
  } finally {
    await browser.close();
  }
  
  return ordenes;
}

async function obtenerDetalleOC(context, codigoOC) {
  const page = await context.newPage();
  
  try {
    // Ir directamente a la página de la OC
    const urlOC = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=oc=${codigoOC}`;
    await page.goto(urlOC, { waitUntil: 'networkidle', timeout: 15000 });
    
    // Extraer datos de la OC
    const datos = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
      };
      
      // Buscar el monto total
      let monto = 0;
      const montoTexto = document.body.innerText.match(/Total[:\s]*\$?\s*([\d.,]+)/i);
      if (montoTexto) {
        monto = parseFloat(montoTexto[1].replace(/\./g, '').replace(',', '.')) || 0;
      }
      
      // Buscar estado
      let estado = 'Desconocido';
      const estadoEl = document.querySelector('.estado, [data-estado], .status');
      if (estadoEl) {
        estado = estadoEl.textContent.trim();
      }
      
      // Buscar proveedor
      let proveedor = '';
      const proveedorMatch = document.body.innerText.match(/Proveedor[:\s]*([^\n]+)/i);
      if (proveedorMatch) {
        proveedor = proveedorMatch[1].trim();
      }
      
      return { monto, estado, proveedor };
    });
    
    await page.close();
    
    return {
      codigo: codigoOC,
      nombre: `OC ${codigoOC}`,
      estado: datos.estado,
      monto: datos.monto,
      proveedor: datos.proveedor,
      moneda: 'CLP'
    };
    
  } catch (error) {
    await page.close();
    throw error;
  }
}

// Función alternativa: scraping directo de la página de búsqueda
export async function buscarOrdenesPorLicitacionV2(codigoLicitacion) {
  console.log(`[SCRAPER v2] Iniciando búsqueda para licitación: ${codigoLicitacion}`);
  
  const browser = await chromium.launch({ 
    headless: false, // Mostrar navegador para depuración
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  const ordenes = [];
  
  try {
    // URL directa de búsqueda
    const searchUrl = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(codigoLicitacion)}`;
    console.log(`[SCRAPER v2] Navegando a: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Tomar screenshot para debug
    await page.screenshot({ path: 'debug_screenshot.png' });
    console.log('[SCRAPER v2] Screenshot guardado en debug_screenshot.png');
    
    // Mostrar URL actual
    console.log(`[SCRAPER v2] URL actual: ${page.url()}`);
    
    // Mostrar contenido de la página
    const content = await page.content();
    console.log(`[SCRAPER v2] Longitud del contenido: ${content.length} caracteres`);
    
  } catch (error) {
    console.error('[SCRAPER v2] Error:', error.message);
  } finally {
    // Mantener el navegador abierto para inspección
    // await browser.close();
  }
  
  return ordenes;
}
