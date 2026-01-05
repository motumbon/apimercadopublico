const https = require('https');

const url = 'https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=4309-76-LR25';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('=== Buscando enlaces de OC ===\n');
    
    // Buscar enlaces con "orden" o "oc"
    const hrefMatches = data.match(/href="[^"]*"/gi) || [];
    const ocLinks = hrefMatches.filter(h => 
      h.toLowerCase().includes('orden') || 
      h.toLowerCase().includes('/oc') ||
      h.toLowerCase().includes('purchaseorder')
    );
    console.log('Enlaces con "orden" o "oc":');
    ocLinks.forEach(l => console.log('  ' + l));
    
    // Buscar __doPostBack (navegación ASP.NET)
    const postbacks = data.match(/__doPostBack\('[^']+','[^']*'\)/g) || [];
    console.log('\n=== PostBacks ASP.NET ===');
    postbacks.slice(0, 20).forEach(p => console.log('  ' + p));
    
    // Buscar TabContainer o pestañas
    const tabMatches = data.match(/TabContainer[^>]*>|TabPanel[^>]*>|ui-tabs[^>]*>/gi) || [];
    console.log('\n=== Tabs encontrados ===');
    tabMatches.slice(0, 10).forEach(t => console.log('  ' + t));
    
    // Buscar iframes
    const iframes = data.match(/<iframe[^>]*>/gi) || [];
    console.log('\n=== Iframes ===');
    iframes.forEach(i => console.log('  ' + i));
    
    // Buscar URLs en el HTML que contengan "orden"
    const urlsOrden = data.match(/https?:\/\/[^\s"'<>]*orden[^\s"'<>]*/gi) || [];
    console.log('\n=== URLs con "orden" ===');
    urlsOrden.slice(0, 10).forEach(u => console.log('  ' + u));
    
    // Guardar el HTML para análisis
    require('fs').writeFileSync('pagina_licitacion.html', data);
    console.log('\n=== HTML guardado en pagina_licitacion.html ===');
  });
}).on('error', e => console.error('Error:', e.message));
