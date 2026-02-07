/**
 * 🏪 Alibaba → Amazon Arbitrage Research Task
 * 
 * OBJECTIVE: Find profitable products with good margins
 * SOURCE: Alibaba (wholesale) → Amazon (retail)
 * METHOD: Long-running browser automation with full transparency
 * 
 * QUALITY METRICS:
 * - Data completeness: >80% fields filled
 * - Verification rate: >50% products found on Amazon
 * - Confidence score: Weighted average of data quality
 * 
 * TRANSPARENCY: Every step is logged, no black box decisions
 */

const fs = require('fs');
const path = require('path');
const { BrowserSession } = require('./long-running-browser');

// Configuration
const CONFIG = {
  taskId: `arbitrage-research-${Date.now()}`,
  outputDir: path.join(__dirname, '..', 'state', 'research-outputs', CONFIG.taskId),
  alibabaSearchTerms: [
    'electronics gadgets',
    'home kitchen accessories', 
    'beauty tools',
    'fitness accessories',
    'phone accessories'
  ],
  minOrderQuantity: [50, 100, 200],
  targetAmazonPriceRange: { min: 15, max: 50 },
  minMarginPercent: 30,
  productsPerSearch: 20,
  snapshotInterval: 5000, // Take status snapshot every 5 seconds
};

/**
 * 📊 Quality Assessment Module
 */
class QualityMonitor {
  constructor() {
    this.metrics = {
      dataCompleteness: 0,
      verificationRate: 0,
      sourceReliability: {},
      confidenceScore: 0,
      errors: [],
      warnings: []
    };
    this.productData = [];
  }

  assessProduct(product) {
    const requiredFields = ['alibabaUrl', 'productName', 'alibabaPrice', 'amazonPrice', 'orders'];
    const filledFields = requiredFields.filter(f => product[f] && product[f] !== 'N/A');
    const completeness = (filledFields.length / requiredFields.length) * 100;
    
    return {
      ...product,
      quality: {
        completeness,
        verified: !!product.amazonUrl,
        margin: product.margin || 0
      }
    };
  }

  calculateOverallQuality() {
    if (this.productData.length === 0) return 0;

    const completions = this.productData.map(p => p.quality.completeness);
    const verified = this.productData.filter(p => p.quality.verified).length;
    
    this.metrics.dataCompleteness = completions.reduce((a, b) => a + b, 0) / completions.length;
    this.metrics.verificationRate = (verified / this.productData.length) * 100;
    this.metrics.confidenceScore = (
      this.metrics.dataCompleteness * 0.4 +
      this.metrics.verificationRate * 0.4 +
      (this.metrics.errors.length === 0 ? 20 : 0)
    );

    return this.metrics.confidenceScore;
  }

  logMetric(label, value) {
    console.log(`📊 [QUALITY] ${label}: ${value.toFixed(2)}%`);
    return value;
  }

  report() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      productCount: this.productData.length,
      confidenceScore: this.calculateOverallQuality(),
      isAcceptable: this.metrics.confidenceScore >= 60
    };
  }
}

/**
 * 📝 Research Logger - Full Transparency
 */
class ResearchLogger {
  constructor(taskId) {
    this.taskId = taskId;
    this.logs = [];
    this.stepCount = 0;
    this.startTime = new Date();
  }

  log(step, action, details = {}) {
    this.stepCount++;
    const entry = {
      step: this.stepCount,
      timestamp: new Date().toISOString(),
      elapsed: (Date.now() - this.startTime.getTime()) / 1000,
      action,
      details
    };
    this.logs.push(entry);
    console.log(`\n[${entry.step.toString().padStart(3, '0')}] ⏱️ ${entry.elapsed.toFixed(1)}s | ${action}`);
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([k, v]) => {
        console.log(`   └─ ${k}: ${JSON.stringify(v).substring(0, 100)}`);
      });
    }
    return entry;
  }

  save() {
    const report = {
      taskId: this.taskId,
      startTime: this.startTime.toISOString(),
      endTime: new Date().toISOString(),
      totalSteps: this.stepCount,
      totalDuration: (Date.now() - this.startTime.getTime()) / 1000,
      logs: this.logs
    };
    
    const logPath = path.join(CONFIG.outputDir, 'research-logs.json');
    fs.writeFileSync(logPath, JSON.stringify(report, null, 2));
    return logPath;
  }
}

/**
 * 🏪 Alibaba Product Scraper
 */
class AlibabaScraper {
  constructor(session, logger) {
    this.session = session;
    this.logger = logger;
    this.products = [];
  }

  async searchProducts(searchTerm) {
    this.logger.log('SCRAPE', 'Searching Alibaba', { term: searchTerm });
    
    await this.session.navigate(`https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${encodeURIComponent(searchTerm)}`);
    await this.session.waitForSelector('.search-product-card', 10000);
    
    // Scroll to load more products
    for (let i = 0; i < 3; i++) {
      await this.session.scroll('down');
      await new Promise(r => setTimeout(r, 1000));
    }

    // Extract product data
    this.logger.log('EXTRACT', 'Extracting product cards');
    
    const cards = await this.session.evaluate(() => {
      return Array.from(document.querySelectorAll('.search-product-card')).slice(0, 20).map(card => {
        const urlEl = card.querySelector('a');
        const titleEl = card.querySelector('.product-title');
        const priceEl = card.querySelector('.price');
        const moqEl = card.querySelector('.moq');
        const ordersEl = card.querySelector('.orders');
        
        return {
          alibabaUrl: urlEl?.href || 'N/A',
          productName: titleEl?.textContent?.trim() || 'N/A',
          alibabaPrice: priceEl?.textContent?.trim() || 'N/A',
          moq: moqEl?.textContent?.trim() || 'N/A',
          orders: ordersEl?.textContent?.trim() || 'N/A',
          scrapedAt: new Date().toISOString()
        };
      });
    });

    this.logger.log('RESULT', `Found ${cards.length} products`, { term: searchTerm });
    return cards;
  }

  async scrapeAllTerms() {
    const allProducts = [];
    
    for (const term of CONFIG.alibabaSearchTerms) {
      this.logger.log('PHASE', `Searching: "${term}"`);
      const products = await this.searchProducts(term);
      allProducts.push(...products);
      
      // Brief pause between searches
      await new Promise(r => setTimeout(r, 2000));
    }

    this.products = allProducts;
    return allProducts;
  }
}

/**
 * 🔍 Amazon Price Finder
 */
class AmazonFinder {
  constructor(session, logger) {
    this.session = session;
    this.logger = logger;
    this.found = [];
    this.notFound = [];
  }

  async findProduct(product) {
    this.logger.log('SEARCH', `Amazon lookup: "${product.productName.substring(0, 50)}..."`);

    // Search Amazon
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(product.productName)}`;
    await this.session.navigate(searchUrl);
    await this.session.waitForSelector('.s-main-slot', 15000);

    // Extract first result price
    const result = await this.session.evaluate(() => {
      const firstItem = document.querySelector('.s-main-slot .s-result-item');
      if (!firstItem) return null;
      
      const titleEl = firstItem.querySelector('h2 span');
      const priceEl = firstItem.querySelector('.a-price .a-offscreen');
      const urlEl = firstItem.querySelector('a');
      
      return {
        title: titleEl?.textContent?.trim() || 'N/A',
        price: priceEl?.textContent?.trim() || 'N/A',
        url: urlEl?.href || 'N/A'
      };
    });

    if (result && result.price !== 'N/A') {
      // Calculate margin
      const alibabaPrice = parseFloat(product.alibabaPrice.replace(/[^0-9.]/g, ''));
      const amazonPrice = parseFloat(result.price.replace(/[^0-9.]/g, ''));
      
      // Estimate shipping: Alibaba price * 15% for shipping to US
      const estimatedShipping = alibabaPrice * 0.15;
      const totalCost = alibabaPrice + estimatedShipping;
      const margin = ((amazonPrice - totalCost) / amazonPrice) * 100;

      return {
        ...product,
        amazonUrl: result.url,
        amazonTitle: result.title,
        amazonPrice: result.price,
        estimatedMargin: margin.toFixed(1),
        found: true
      };
    }

    return {
      ...product,
      amazonUrl: 'N/A',
      amazonTitle: 'N/A',
      amazonPrice: 'N/A',
      estimatedMargin: 0,
      found: false
    };
  }

  async findAll(products) {
    this.logger.log('PHASE', `Verifying ${products.length} products on Amazon`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      this.logger.log('PROGRESS', `${i + 1}/${products.length} products verified`);
      
      const result = await this.findProduct(product);
      
      if (result.found) {
        this.found.push(result);
      } else {
        this.notFound.push(product);
      }

      // Rate limiting: Amazon rate limits
      await new Promise(r => setTimeout(r, 1500));
    }

    this.logger.log('RESULT', `Found ${this.found.length}/${products.length} products on Amazon`);
    return { found: this.found, notFound: this.notFound };
  }
}

/**
 * 📈 Report Generator
 */
class ReportGenerator {
  constructor(logger, qualityMonitor) {
    this.logger = logger;
    this.quality = qualityMonitor;
  }

  generateReport(allProducts, verifiedProducts) {
    this.logger.log('GENERATE', 'Creating comprehensive report');

    // Calculate statistics
    const stats = {
      totalScraped: allProducts.length,
      verifiedOnAmazon: verifiedProducts.length,
      verificationRate: ((verifiedProducts.length / allProducts.length) * 100).toFixed(1),
      avgMargin: 0,
      topMarginProducts: [],
      categories: {},
      priceGaps: []
    };

    // Top margin products
    const withMargins = verifiedProducts.filter(p => parseFloat(p.estimatedMargin) > 0);
    stats.topMarginProducts = withMargins
      .sort((a, b) => parseFloat(b.estimatedMargin) - parseFloat(a.estimatedMargin))
      .slice(0, 10)
      .map(p => ({
        name: p.productName.substring(0, 60),
        alibabaPrice: p.alibabaPrice,
        amazonPrice: p.amazonPrice,
        margin: p.estimatedMargin + '%',
        orders: p.orders
      }));

    // Average margin
    if (withMargins.length > 0) {
      const totalMargin = withMargins.reduce((sum, p) => sum + parseFloat(p.estimatedMargin), 0);
      stats.avgMargin = (totalMargin / withMargins.length).toFixed(1);
    }

    // Price gap analysis
    stats.priceGaps = withMargins.map(p => ({
      product: p.productName.substring(0, 50),
      alibaba: p.alibabaPrice,
      amazon: p.amazonPrice,
      gap: `$${(parseFloat(p.amazonPrice) - parseFloat(p.alibabaPrice.replace(/[^0-9.]/g, ''))).toFixed(2)}`,
      margin: p.estimatedMargin + '%'
    })).sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin));

    // Quality report
    const qualityReport = this.quality.report();

    const report = {
      metadata: {
        taskId: CONFIG.taskId,
        generatedAt: new Date().toISOString(),
        duration: this.logger.logs[this.logger.logs.length - 1]?.elapsed || 0,
        sources: ['Alibaba.com', 'Amazon.com']
      },
      summary: {
        productsScraped: stats.totalScraped,
        productsVerified: stats.verifiedOnAmazon,
        verificationRate: stats.verificationRate + '%',
        averageMargin: stats.avgMargin + '%',
        qualityScore: qualityReport.confidenceScore.toFixed(1) + '%',
        status: qualityReport.isAcceptable ? '✅ ACCEPTABLE' : '⚠️ NEEDS REVIEW'
      },
      topOpportunities: stats.topMarginProducts,
      priceGapAnalysis: stats.priceGaps.slice(0, 20),
      detailedProducts: verifiedProducts.map(p => ({
        name: p.productName,
        alibaba: {
          url: p.alibabaUrl,
          price: p.alibabaPrice,
          moq: p.moq,
          orders: p.orders
        },
        amazon: {
          url: p.amazonUrl,
          title: p.amazonTitle?.substring(0, 100),
          price: p.amazonPrice
        },
        analysis: {
          margin: p.estimatedMargin + '%',
          estimatedProfit: `$${((parseFloat(p.amazonPrice) || 0) - (parseFloat(p.alibabaPrice.replace(/[^0-9.]/g, '')) * 1.15)).toFixed(2)}`,
          recommendation: parseFloat(p.estimatedMargin) >= 30 ? '✅ HIGH MARGIN' : parseFloat(p.estimatedMargin) >= 15 ? '⚠️ MEDIUM' : '❌ LOW'
        }
      })),
      qualityMetrics: qualityReport.metrics,
      rawLogs: this.logger.logs
    };

    // Save report
    const reportPath = path.join(CONFIG.outputDir, 'arbitrage-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Save summary markdown
    const markdown = this.generateMarkdown(report);
    const mdPath = path.join(CONFIG.outputDir, 'arbitrage-report.md');
    fs.writeFileSync(mdPath, markdown);

    this.logger.log('SAVED', 'Report saved', { json: reportPath, markdown: mdPath });

    return report;
  }

  generateMarkdown(report) {
    return `# 🏪 Alibaba → Amazon Arbitrage Research Report

**Task ID:** ${report.metadata.taskId}
**Generated:** ${report.metadata.generatedAt}
**Duration:** ${report.metadata.duration.toFixed(1)} seconds

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| Products Scraped | ${report.summary.productsScraped} |
| Verified on Amazon | ${report.summary.productsVerified} |
| Verification Rate | ${report.summary.verificationRate} |
| Average Margin | ${report.summary.averageMargin}% |
| Quality Score | ${report.summary.qualityScore} |
| **Status** | ${report.summary.status} |

## 🏆 Top Opportunities

${report.topOpportunities.map((p, i) => `${i + 1}. **${p.name}**
   - Alibaba: ${p.alibabaPrice} | Amazon: ${p.amazonPrice} | **Margin: ${p.margin}** | Orders: ${p.orders}`).join('\n')}

## 📈 Price Gap Analysis

${report.priceGaps.slice(0, 10).map(p => `- ${p.product}: ${p.alibabaPrice} → ${p.amazonPrice} (Gap: ${p.gap}, Margin: ${p.margin})`).join('\n')}

## 🔍 Quality Metrics

- **Data Completeness:** ${report.qualityMetrics.dataCompleteness.toFixed(1)}%
- **Verification Rate:** ${report.qualityMetrics.verificationRate.toFixed(1)}%
- **Confidence Score:** ${report.qualityMetrics.confidenceScore.toFixed(1)}%
- **Errors:** ${report.qualityMetrics.errors.length}
- **Warnings:** ${report.qualityMetrics.warnings.length}

## 📋 Methodology

1. **Search:** Queried ${CONFIG.alibabaSearchTerms.length} product categories on Alibaba
2. **Scrape:** Extracted ${report.summary.productsScraped} product listings
3. **Verify:** Cross-referenced ${report.summary.productsVerified} products on Amazon
4. **Calculate:** Computed margins with estimated shipping (15% of Alibaba price)
5. **Quality:** Assessed data completeness and verification rates

## ⚠️ Limitations

- Prices fluctuate daily
- Shipping costs vary by supplier and volume
- Amazon fees (~15%) not included in margin calculation
- Quality of Alibaba suppliers not verified

---
*Generated by Jarvis Long-Running Browser Task*
`;
  }
}

/**
 * 🚀 MAIN TASK EXECUTION
 */
async function runArbitrageResearch() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     🏪 ALIBABA → AMAZON ARBITRAGE RESEARCH TASK                ║
║     Long-Running Browser Automation with Full Transparency      ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Initialize components
  const logger = new ResearchLogger(CONFIG.taskId);
  const qualityMonitor = new QualityMonitor();
  
  // Create output directory
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  
  logger.log('INIT', 'Starting research task', { 
    taskId: CONFIG.taskId,
    searchTerms: CONFIG.alibabaSearchTerms 
  });

  // Initialize browser session
  logger.log('LAUNCH', 'Starting long-running browser session');
  const session = new BrowserSession({
    headless: false, // Show the browser for transparency
    keepAlive: true,
    id: CONFIG.taskId
  });

  try {
    await session.start();
    
    // Phase 1: Alibaba Scraping
    logger.log('PHASE', 'PHASE 1: Alibaba Product Discovery');
    const scraper = new AlibabaScraper(session, logger);
    const alibabaProducts = await scraper.scrapeAllTerms();
    
    logger.log('RESULT', `Scraping complete`, { 
      total: alibabaProducts.length,
      sample: alibabaProducts[0]?.productName?.substring(0, 30) 
    });

    // Phase 2: Amazon Verification
    logger.log('PHASE', 'PHASE 2: Amazon Price Verification');
    const finder = new AmazonFinder(session, logger);
    const { found, notFound } = await finder.findAll(alibabaProducts);
    
    // Phase 3: Quality Assessment
    logger.log('PHASE', 'PHASE 3: Quality Assessment');
    const assessedProducts = found.map(p => qualityMonitor.assessProduct(p));
    qualityMonitor.productData = assessedProducts;
    
    const qualityReport = qualityMonitor.report();
    logger.log('QUALITY', `Overall confidence: ${qualityReport.confidenceScore.toFixed(1)}%`);

    // Phase 4: Report Generation
    logger.log('PHASE', 'PHASE 4: Report Generation');
    const generator = new ReportGenerator(logger, qualityMonitor);
    const report = generator.generateReport(alibabaProducts, found);

    // Final Summary
    logger.log('COMPLETE', 'Research task finished');
    
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    📊 FINAL RESULTS                             ║
╠══════════════════════════════════════════════════════════════════╣
║  Products Scraped:    ${report.summary.productsScraped.toString().padEnd(10)}                               ║
║  Verified on Amazon:  ${report.summary.productsVerified.toString().padEnd(10)}                               ║
║  Verification Rate:   ${report.summary.verificationRate.padEnd(10)}                               ║
║  Average Margin:      ${report.summary.averageMargin}%`.padEnd(12) + `                             ║
║  Quality Score:       ${report.summary.qualityScore.padEnd(10)}                               ║
╠══════════════════════════════════════════════════════════════════╣
║  📁 Full Report: ${report.metadata.taskId}/arbitrage-report.md            ║
║  📜 Logs:        ${report.metadata.taskId}/research-logs.json              ║
╚══════════════════════════════════════════════════════════════════╝
    `);

    // Save logs for transparency
    logger.save();

    return report;

  } catch (error) {
    logger.log('ERROR', 'Task failed', { error: error.message });
    throw error;
  } finally {
    await session.close();
  }
}

// Execute
if (require.main === module) {
  runArbitrageResearch()
    .then(report => {
      console.log('\n✅ Task completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Task failed:', err);
      process.exit(1);
    });
}

module.exports = {
  runArbitrageResearch,
  CONFIG,
  QualityMonitor,
  ResearchLogger,
  AlibabaScraper,
  AmazonFinder,
  ReportGenerator
};
