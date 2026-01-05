import { chromium } from 'playwright';

async function scraperDirecto() {
  console.log('[SCRAPER] Iniciando con URL directa...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  const codigoLicitacion = '4309-76-LR25';
  
  try {
    // Ir directamente a la página de la licitación
    // URL formato: https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=CODIGO
    const urls = [
      `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${codigoLicitacion}`,
      `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`,
      `https://www.mercadopublico.cl/Procurement/Modules/RFB/StepsProcessAward/PreviewAwardAct.aspx?qs=${codigoLicitacion}`
    ];
    
    for (const url of urls) {
      console.log(`[SCRAPER] Probando URL: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        const pageUrl = page.url();
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        console.log(`[SCRAPER] URL resultante: ${pageUrl}`);
        console.log(`[SCRAPER] Contenido (primeros 500 chars): ${bodyText.substring(0, 500)}`);
        
        if (bodyText.includes(codigoLicitacion) || bodyText.includes('Orden de Compra') || bodyText.includes('Licitación')) {
          console.log('[SCRAPER] ¡Página de licitación encontrada!');
          await page.screenshot({ path: 'licitacion_encontrada.png', fullPage: true });
          
          // Buscar tab de Órdenes de Compra
          const allText = bodyText.toLowerCase();
          if (allText.includes('orden')) {
            console.log('[SCRAPER] Hay contenido relacionado con órdenes');
          }
          
          break;
        }
      } catch (e) {
        console.log(`[SCRAPER] Error con URL: ${e.message}`);
      }
    }
    
    // Intentar otra estrategia: buscar en ChileCompra con el buscador avanzado
    console.log('[SCRAPER] Probando buscador avanzado...');
    await page.goto('https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Ver qué hay en la página
    const content = await page.evaluate(() => document.body.innerText);
    console.log(`[SCRAPER] Contenido de página base: ${content.substring(0, 800)}`);
    
    await page.screenshot({ path: 'pagina_base.png', fullPage: true });
    
    // Mantener abierto para inspección
    console.log('[SCRAPER] Navegador abierto. Ctrl+C para cerrar.');
    await page.waitForTimeout(120000);
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
  } finally {
    await browser.close();
  }
}

scraperDirecto();
