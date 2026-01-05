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
  const codigosOC = new Set();
  
  try {
    // 1. Ir a la página de la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 2. Hacer clic en el tab de Órdenes de Compra
    console.log('[SCRAPER] Haciendo clic en tab Orden de Compra...');
    await page.click('text=Orden de Compra');
    await page.waitForTimeout(5000);
    
    // 3. Buscar en todos los iframes
    console.log('[SCRAPER] Buscando en iframes...');
    
    const frames = page.frames();
    console.log(`[SCRAPER] Total frames: ${frames.length}`);
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      try {
        const frameContent = await frame.content();
        const frameText = await frame.evaluate(() => document.body?.innerText || '');
        
        // Buscar códigos de OC en el contenido del frame
        const patron = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
        
        const matchesHtml = frameContent.match(patron) || [];
        const matchesText = frameText.match(patron) || [];
        
        const todos = [...new Set([...matchesHtml, ...matchesText])];
        const filtrados = todos.filter(c => !c.includes('-LR'));
        
        if (filtrados.length > 0) {
          console.log(`[SCRAPER] Frame ${i}: ${filtrados.length} OC encontradas`);
          filtrados.forEach(c => codigosOC.add(c));
        }
      } catch (e) {
        // Frame no accesible
      }
    }
    
    // 4. Manejar paginación dentro de iframes
    let paginaActual = 1;
    while (paginaActual < 25) {
      // Buscar botón de siguiente página en todos los frames
      let encontroPagina = false;
      
      for (const frame of page.frames()) {
        try {
          const nextBtn = frame.locator(`a:has-text("${paginaActual + 1}"), a:has-text("›"), a:has-text("Siguiente")`).first();
          if (await nextBtn.isVisible({ timeout: 2000 })) {
            console.log(`[SCRAPER] Navegando a página ${paginaActual + 1}...`);
            await nextBtn.click();
            await page.waitForTimeout(3000);
            
            // Extraer OC de la nueva página
            for (const f of page.frames()) {
              try {
                const content = await f.content();
                const patron = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
                const matches = content.match(patron) || [];
                matches.filter(c => !c.includes('-LR')).forEach(c => codigosOC.add(c));
              } catch (e) {}
            }
            
            encontroPagina = true;
            paginaActual++;
            break;
          }
        } catch (e) {}
      }
      
      if (!encontroPagina) break;
    }
    
    const listaOC = [...codigosOC];
    console.log(`[SCRAPER] Total OC únicas encontradas: ${listaOC.length}`);
    
    // 5. Obtener detalles de cada OC
    for (const codigoOC of listaOC) {
      try {
        console.log(`[SCRAPER] Procesando ${codigoOC}...`);
        
        const ocUrl = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoOC}`;
        await page.goto(ocUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Buscar datos en página principal y frames
        let monto = 0, estado = '', proveedor = '', rut = '';
        
        const allFrames = [page, ...page.frames()];
        for (const frame of allFrames) {
          try {
            const texto = await frame.evaluate(() => document.body?.innerText || '');
            
            // Monto
            const montoMatch = texto.match(/Total\s*(?:Neto)?\s*:?\s*\$?\s*([\d.,]+)/i);
            if (montoMatch && !monto) {
              monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
            }
            
            // Estado
            const estadoMatch = texto.match(/Estado[:\s]+([A-Za-zÁÉÍÓÚáéíóú\s]+)/i);
            if (estadoMatch && !estado) {
              estado = estadoMatch[1].trim().split(/\s{2,}/)[0];
            }
            
            // Proveedor
            const provMatch = texto.match(/Proveedor[:\s]+([^\n]+)/i);
            if (provMatch && !proveedor) {
              proveedor = provMatch[1].trim().split(/\s{2,}/)[0];
            }
            
            // RUT
            const rutMatch = texto.match(/([\d]{1,2}\.[\d]{3}\.[\d]{3}-[\dkK])/);
            if (rutMatch && !rut) {
              rut = rutMatch[1];
            }
          } catch (e) {}
        }
        
        ordenes.push({
          codigo: codigoOC,
          nombre: `OC ${codigoOC}`,
          estado: estado || 'Sin estado',
          estado_codigo: 0,
          monto,
          moneda: 'CLP',
          proveedor,
          proveedor_rut: rut,
          licitacion_codigo: codigoLicitacion
        });
        
        console.log(`[SCRAPER] ✓ ${codigoOC}: $${monto.toLocaleString('es-CL')}`);
        await page.waitForTimeout(500);
        
      } catch (err) {
        console.log(`[SCRAPER] ✗ Error: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log(`\n[SCRAPER] === RESUMEN ===`);
  console.log(`[SCRAPER] Total OC: ${ordenes.length}`);
  const total = ordenes.reduce((s, o) => s + o.monto, 0);
  console.log(`[SCRAPER] Monto total: $${total.toLocaleString('es-CL')}`);
  
  return ordenes;
}

// Test
if (process.argv[1].includes('scraperIframe')) {
  scrapeOrdenesDeCompra('4309-76-LR25', true).then(ordenes => {
    console.log('\n=== OC ENCONTRADAS ===');
    ordenes.forEach(oc => console.log(`${oc.codigo}: $${oc.monto.toLocaleString('es-CL')}`));
  });
}
