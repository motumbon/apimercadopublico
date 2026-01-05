import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

async function diagnostico() {
  console.log('[DIAG] Iniciando diagnóstico...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Ir a la licitación
    await page.goto('https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=4309-76-LR25', 
      { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Hacer clic en tab de Orden de Compra
    console.log('[DIAG] Buscando y haciendo clic en tab OC...');
    await page.click('text=Orden de Compra');
    await page.waitForTimeout(5000);
    
    // Guardar HTML completo
    const html = await page.content();
    writeFileSync('pagina_oc.html', html);
    console.log('[DIAG] HTML guardado en pagina_oc.html');
    
    // Guardar texto
    const texto = await page.evaluate(() => document.body.innerText);
    writeFileSync('pagina_oc.txt', texto);
    console.log('[DIAG] Texto guardado en pagina_oc.txt');
    
    // Buscar todos los patrones de código
    console.log('[DIAG] Buscando códigos en HTML...');
    const patronesEnHtml = html.match(/4309-\d+-[A-Z]{2}\d{2}/g) || [];
    console.log(`[DIAG] Códigos en HTML: ${[...new Set(patronesEnHtml)].length}`);
    [...new Set(patronesEnHtml)].forEach(c => console.log(`  - ${c}`));
    
    console.log('[DIAG] Buscando códigos en texto...');
    const patronesEnTexto = texto.match(/4309-\d+-[A-Z]{2}\d{2}/g) || [];
    console.log(`[DIAG] Códigos en texto: ${[...new Set(patronesEnTexto)].length}`);
    [...new Set(patronesEnTexto)].forEach(c => console.log(`  - ${c}`));
    
    // Verificar si hay iframes
    const iframes = await page.locator('iframe').count();
    console.log(`[DIAG] Iframes en la página: ${iframes}`);
    
    // Listar todas las tablas
    const tablas = await page.locator('table').count();
    console.log(`[DIAG] Tablas en la página: ${tablas}`);
    
    // Mantener abierto
    console.log('[DIAG] Navegador abierto. Inspecciona manualmente.');
    await page.waitForTimeout(120000);
    
  } catch (error) {
    console.error('[DIAG] Error:', error.message);
  } finally {
    await browser.close();
  }
}

diagnostico();
