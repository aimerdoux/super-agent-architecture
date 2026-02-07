/**
 * Product Arbitrage Research - Simplified Version
 * Uses Google Shopping for price comparison (more accessible)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TASK_ID = `arbitrage-${Date.now()}`;
const OUTPUT_DIR = path.join(__dirname, '..', 'state', 'research-outputs', TASK_ID);

const CONFIG = {
  taskId: TASK_ID,
  outputDir: OUTPUT_DIR,
  searchTerms: ['wireless earbuds', 'phone charger', 'kitchen gadget', 'fitness tracker', 'smart watch'],
  headless: false,
};

// Logger
class Logger {
  constructor() { this.logs = []; this.step = 0; this.start = Date.now(); }
  log(action, details = {}) {
    this.step++;
    const elapsed = ((Date.now() - this.start) / 1000).toFixed(1);
    const entry = { step: this.step, elapsed, action, details, time: new Date().toISOString() };
    this.logs.push(entry);
    console.log(`\n[${this.step.toString().padStart(3,'0')}] ${elapsed}s | ${action}`);
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([k,v]) => console.log(`   - ${k}: ${String(v).substring(0,50)}`));
    }
    return entry;
  }
}

async function runResearch() {
  console.log('\n========================================');
  console.log('   PRODUCT ARBITRAGE RESEARCH');
  console.log('   Google Shopping + Direct Comparison');
  console.log('========================================\n');

  const logger = new Logger();
  const products = [];

  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  logger.log('START', { taskId: CONFIG.taskId, terms: CONFIG.searchTerms.length });

  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Phase 1: Google Shopping search for each term
    logger.log('PHASE', 'Phase 1: Google Shopping Search');

    for (const term of CONFIG.searchTerms) {
      logger.log('SEARCH', `Google Shopping: "${term}"`);

      await page.goto(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(term)}&hl=en`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await new Promise(r => setTimeout(r, 4000));

      // Extract shopping results
      const results = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.sh-dgr')).slice(0, 8).map(item => {
          const titleEl = item.querySelector('.IK2Tqb span, .sh-np__product-title');
          const priceEl = item.querySelector('.a8Pemb, .Nr22bf');
          const vendorEl = item.querySelector('.v4E8P, .I1K3ge span');
          const linkEl = item.querySelector('a');

          return {
            name: titleEl?.textContent?.trim() || 'N/A',
            price: priceEl?.textContent?.trim() || 'N/A',
            vendor: vendorEl?.textContent?.trim() || 'N/A',
            url: linkEl?.href || 'N/A'
          };
        });
      });

      logger.log('FOUND', `${results.length} products`);
      products.push(...results.map(p => ({ ...p, searchTerm: term })));

      await new Promise(r => setTimeout(r, 2000));
    }

    // Phase 2: Try AliExpress for lower prices
    logger.log('PHASE', 'Phase 2: AliExpress Price Check');

    const lowPriceProducts = products.filter(p => {
      const price = parseFloat(p.price.replace(/[^0-9.]/g, '')) || 0;
      return price >= 10 && price <= 50;
    }).slice(0, 10);

    const aliResults = [];
    for (const product of lowPriceProducts) {
      logger.log('CHECK', `AliExpress: ${product.name.substring(0,30)}...`);

      await page.goto(`https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(product.name.substring(0,30))}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await new Promise(r => setTimeout(r, 3000));

      const aliItem = await page.evaluate(() => {
        const item = document.querySelector('.multi-card, .product-item');
        if (!item) return null;
        const name = item.querySelector('.product-title, .title, h3')?.textContent?.trim();
        const price = item.querySelector('.price, .price-current')?.textContent?.trim();
        const orders = item.querySelector('.orders, .sale-count')?.textContent?.trim();
        return { name, price, orders };
      });

      if (aliItem && aliItem.price) {
        const productWithAli = { ...product, aliName: aliItem.name, aliPrice: aliItem.price, aliOrders: aliItem.orders };
        productWithAli.margin = calculateMargin(product.price, aliItem.price);
        aliResults.push(productWithAli);
        logger.log('MATCH', `AliExpress: ${aliItem.price} vs Amazon: ${product.price}`);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    // Phase 3: Generate Report
    logger.log('PHASE', 'Phase 3: Generate Report');

    // Sort by margin (highest first)
    const sortedResults = aliResults
      .filter(p => p.margin > 0)
      .sort((a, b) => b.margin - a.margin);

    const report = {
      taskId: CONFIG.taskId,
      generatedAt: new Date().toISOString(),
      duration: ((Date.now() - logger.start) / 1000).toFixed(1) + 's',
      summary: {
        totalSearched: products.length,
        comparedOnAliExpress: aliResults.length,
        profitableFound: sortedResults.length,
        avgMargin: sortedResults.length > 0 ? (sortedResults.reduce((sum, p) => sum + p.margin, 0) / sortedResults.length).toFixed(1) + '%' : 'N/A'
      },
      topOpportunities: sortedResults.slice(0, 10).map((p, i) => ({
        rank: i + 1,
        name: p.name.substring(0, 60),
        googlePrice: p.price,
        aliPrice: p.aliPrice,
        margin: p.margin.toFixed(1) + '%',
        searchTerm: p.searchTerm
      })),
      allCompared: aliResults,
      logs: logger.logs
    };

    // Save reports
    fs.writeFileSync(path.join(CONFIG.outputDir, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(CONFIG.outputDir, 'logs.json'), JSON.stringify(logger.logs, null, 2));

    const md = `# Product Arbitrage Research Report

**Task:** ${report.taskId}
**Generated:** ${report.generatedAt}
**Duration:** ${report.duration}

## Summary

| Metric | Value |
|--------|-------|
| Products Searched | ${report.summary.totalSearched} |
| Compared on AliExpress | ${report.summary.comparedOnAliExpress} |
| Profitable Opportunities | ${report.summary.profitableFound} |
| Average Margin | ${report.summary.avgMargin} |

## Top Opportunities

${sortedResults.length > 0 ? sortedResults.slice(0, 10).map((p, i) => `
### ${i + 1}. ${p.name.substring(0, 70)}

| Source | Price |
|--------|-------|
| Google Shopping | ${p.price} |
| AliExpress | ${p.aliPrice} |
| **Margin** | **${p.margin.toFixed(1)}%** |

`).join('\n---\n') : 'No profitable products found.'}

## All Compared Products

| Product | Google | AliExpress | Margin |
|---------|--------|------------|--------|
${aliResults.map(p => `| ${p.name.substring(0,30)}... | ${p.price} | ${p.aliPrice || 'N/A'} | ${p.margin ? p.margin.toFixed(1) + '%' : 'N/A'} |`).join('\n')}

---
*Generated by Jarvis Research Task*
`;

    fs.writeFileSync(path.join(CONFIG.outputDir, 'report.md'), md);

    logger.log('COMPLETE', 'Research finished', {
      profitable: sortedResults.length
    });

    // Final output
    console.log('\n========================================');
    console.log('              RESULTS');
    console.log('========================================');
    console.log(`Products Searched:       ${report.summary.totalSearched}`);
    console.log(`Compared on AliExpress:  ${report.summary.comparedOnAliExpress}`);
    console.log(`Profitable Found:        ${report.summary.profitableFound}`);
    console.log(`Average Margin:          ${report.summary.avgMargin}`);
    console.log('========================================');
    console.log(`Report: ${CONFIG.taskId}/report.md`);
    console.log('========================================\n');

    return report;

  } finally {
    await browser.close();
  }
}

function calculateMargin(googlePrice, aliPrice) {
  const g = parseFloat(String(googlePrice).replace(/[^0-9.]/g, '')) || 0;
  const a = parseFloat(String(aliPrice).replace(/[^0-9.]/g, '')) || 0;
  if (g === 0 || a === 0) return 0;
  // Assume 10% shipping/cost for AliExpress
  const totalCost = a * 1.10;
  return ((g - totalCost) / g) * 100;
}

runResearch()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\nFailed:', err.message);
    process.exit(1);
  });
