import { chromium } from 'playwright';

async function debugScraper() {
  console.log('[DEBUG] Iniciando scraper de debug...');
  
  const browser = await chromium.launch({ 
    headless: false, // Mostrar navegador
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  const codigoLicitacion = '4309-76-LR25';
  
  try {
    // PASO 1: Ir a la página principal
    console.log('[DEBUG] PASO 1: Navegando a mercadopublico.cl...');
    await page.goto('https://www.mercadopublico.cl/Home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'debug_01_home.png' });
    console.log('[DEBUG] Screenshot: debug_01_home.png');
    
    // PASO 2: Buscar el campo de búsqueda
    console.log('[DEBUG] PASO 2: Buscando campo de texto...');
    
    // Listar todos los inputs visibles
    const inputs = await page.locator('input:visible').all();
    console.log(`[DEBUG] Inputs visibles: ${inputs.length}`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const id = await input.getAttribute('id') || '';
      const name = await input.getAttribute('name') || '';
      const placeholder = await input.getAttribute('placeholder') || '';
      const type = await input.getAttribute('type') || '';
      console.log(`[DEBUG] Input ${i}: id="${id}" name="${name}" placeholder="${placeholder}" type="${type}"`);
    }
    
    // Intentar encontrar campo de búsqueda
    const searchInput = page.locator('input.form-control').first();
    if (await searchInput.isVisible()) {
      console.log('[DEBUG] Campo de búsqueda encontrado, escribiendo código...');
      await searchInput.fill(codigoLicitacion);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'debug_02_search_filled.png' });
      
      // Presionar Enter
      console.log('[DEBUG] Presionando Enter...');
      await searchInput.press('Enter');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'debug_03_results.png' });
      console.log('[DEBUG] Screenshot: debug_03_results.png');
      console.log(`[DEBUG] URL actual: ${page.url()}`);
    }
    
    // PASO 3: Buscar enlace a la licitación
    console.log('[DEBUG] PASO 3: Buscando enlace a la licitación...');
    
    // Listar todos los enlaces que contengan el código
    const links = await page.locator('a').all();
    console.log(`[DEBUG] Total enlaces: ${links.length}`);
    
    let licitacionLink = null;
    for (const link of links) {
      const text = await link.textContent() || '';
      const href = await link.getAttribute('href') || '';
      
      if (text.includes(codigoLicitacion) || href.includes(codigoLicitacion)) {
        console.log(`[DEBUG] Enlace encontrado: "${text.substring(0, 50)}" -> ${href.substring(0, 80)}`);
        licitacionLink = link;
      }
    }
    
    if (licitacionLink) {
      console.log('[DEBUG] Haciendo clic en enlace de licitación...');
      await licitacionLink.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'debug_04_licitacion.png' });
      console.log('[DEBUG] Screenshot: debug_04_licitacion.png');
      console.log(`[DEBUG] URL actual: ${page.url()}`);
    }
    
    // PASO 4: Buscar sección de Órdenes de Compra
    console.log('[DEBUG] PASO 4: Buscando sección de Órdenes de Compra...');
    
    // Buscar todos los tabs/enlaces
    const tabs = await page.locator('a, button, .nav-link, [role="tab"]').all();
    for (const tab of tabs) {
      const text = (await tab.textContent() || '').trim();
      if (text.toLowerCase().includes('orden') || text.toLowerCase().includes('oc')) {
        console.log(`[DEBUG] Tab/enlace OC encontrado: "${text}"`);
        try {
          await tab.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'debug_05_oc_section.png' });
          console.log('[DEBUG] Screenshot: debug_05_oc_section.png');
          break;
        } catch (e) {
          console.log(`[DEBUG] Error al hacer clic: ${e.message}`);
        }
      }
    }
    
    // PASO 5: Extraer códigos de OC
    console.log('[DEBUG] PASO 5: Extrayendo códigos de OC...');
    
    const pageContent = await page.content();
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    // Buscar patrones de código de OC
    const ocPattern = /\d{3,5}-\d+-[A-Z]{2}\d{2}/g;
    const matches = bodyText.match(ocPattern);
    
    if (matches) {
      const uniqueCodes = [...new Set(matches)];
      console.log(`[DEBUG] Códigos de OC encontrados: ${uniqueCodes.length}`);
      uniqueCodes.forEach(code => console.log(`[DEBUG] - ${code}`));
    } else {
      console.log('[DEBUG] No se encontraron códigos de OC');
    }
    
    // Guardar contenido para análisis
    const fs = await import('fs');
    fs.writeFileSync('debug_page_content.txt', bodyText);
    console.log('[DEBUG] Contenido guardado en debug_page_content.txt');
    
    // Mantener navegador abierto
    console.log('[DEBUG] Navegador abierto para inspección manual. Presiona Ctrl+C para cerrar.');
    await page.waitForTimeout(180000); // 3 minutos
    
  } catch (error) {
    console.error('[DEBUG] Error:', error.message);
    await page.screenshot({ path: 'debug_error.png' });
  } finally {
    await browser.close();
  }
}

debugScraper();
