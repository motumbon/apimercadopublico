import { chromium } from 'playwright';

const BASE_URL = 'https://www.mercadopublico.cl';

async function testScraper() {
  console.log('[TEST] Iniciando prueba de scraper...');
  
  const browser = await chromium.launch({ 
    headless: false, // Mostrar navegador para ver qué pasa
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  try {
    // 1. Ir a la página principal de búsqueda
    console.log('[TEST] Navegando a Mercado Público...');
    await page.goto(`${BASE_URL}/Procurement/Modules/RFB/Search.aspx`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 2. Buscar la licitación
    const codigoLicitacion = '4309-76-LR25';
    console.log(`[TEST] Buscando licitación ${codigoLicitacion}...`);
    
    // Buscar el campo de búsqueda
    await page.fill('#txtParametroBusqueda', codigoLicitacion);
    await page.waitForTimeout(500);
    
    // Hacer clic en buscar
    await page.click('#imgBtnBuscar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 3. Hacer clic en el resultado
    console.log('[TEST] Buscando resultado...');
    
    // Buscar el enlace a la licitación
    const resultLink = page.locator(`a:has-text("${codigoLicitacion}")`).first();
    if (await resultLink.isVisible()) {
      console.log('[TEST] Resultado encontrado, haciendo clic...');
      await resultLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }
    
    // 4. Buscar el tab de Órdenes de Compra
    console.log('[TEST] Buscando sección de Órdenes de Compra...');
    console.log('[TEST] URL actual:', page.url());
    
    // Tomar screenshot
    await page.screenshot({ path: 'test_licitacion.png', fullPage: true });
    console.log('[TEST] Screenshot guardado: test_licitacion.png');
    
    // Buscar tabs disponibles
    const tabs = await page.locator('.nav-tabs a, .tabs a, [role="tab"]').all();
    console.log(`[TEST] Tabs encontrados: ${tabs.length}`);
    
    for (const tab of tabs) {
      const texto = await tab.textContent();
      console.log(`[TEST] - Tab: ${texto}`);
    }
    
    // Buscar enlace de OC
    const ocLink = page.locator('a:has-text("Orden"), a:has-text("OC"), a[href*="orden"]').first();
    if (await ocLink.isVisible()) {
      const textoOC = await ocLink.textContent();
      console.log(`[TEST] Enlace OC encontrado: ${textoOC}`);
      await ocLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'test_ordenes.png', fullPage: true });
      console.log('[TEST] Screenshot de órdenes guardado: test_ordenes.png');
    }
    
    // Mantener navegador abierto para inspección manual
    console.log('[TEST] Navegador abierto para inspección. Presiona Ctrl+C para cerrar.');
    await page.waitForTimeout(300000); // 5 minutos
    
  } catch (error) {
    console.error('[TEST] Error:', error.message);
    await page.screenshot({ path: 'test_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testScraper();
