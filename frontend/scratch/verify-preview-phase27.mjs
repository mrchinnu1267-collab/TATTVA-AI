// frontend/scratch/verify-preview-phase27.mjs
// Verification suite for Phase 27: Advanced Data Science & Analytics Platform

const BASE_URL = process.argv[2] || 'http://localhost:3000';

async function runTests() {
  console.log(`\n=======================================================`);
  console.log(`Starting Phase 27 Verification against: ${BASE_URL}`);
  console.log(`=======================================================\n`);

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      process.stdout.write(`• Checking ${name}... `);
      await fn();
      console.log(`\x1b[32mPASSED\x1b[0m`);
      passed++;
    } catch (err) {
      console.log(`\x1b[31mFAILED\x1b[0m`);
      console.error(`  Error:`, err.message);
      failed++;
    }
  }

  // 1. Health check
  await check('GET /api/health', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.status && !data.healthy) throw new Error('Unhealthy status');
  });

  // 2. Fetch default datasets
  let datasetId = 'ecommerce_sample';
  await check('GET /api/data-science/datasets', async () => {
    const res = await fetch(`${BASE_URL}/api/data-science/datasets?tenantId=t-verify&workspaceId=w-verify`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.datasets) || data.datasets.length === 0) {
      throw new Error('Expected at least one default dataset');
    }
    datasetId = data.datasets[0].id;
  });

  // 3. Register custom CSV dataset
  const customCsv = `item_id,price,units_sold,category\n101,15.50,120,apparel\n102,45.00,80,electronics\n103,12.00,200,apparel\n104,89.99,35,electronics\n105,5.50,450,stationery`;
  let customDatasetId = '';
  await check('POST /api/data-science/datasets (Upload CSV)', async () => {
    const res = await fetch(`${BASE_URL}/api/data-science/datasets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 't-verify',
        workspaceId: 'w-verify',
        name: 'Custom Inventory',
        csvContent: customCsv
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.dataset?.id) throw new Error('Failed to register custom dataset');
    customDatasetId = data.dataset.id;
  });

  // 4. Run EDA on dataset
  await check('POST /api/data-science/eda', async () => {
    const res = await fetch(`${BASE_URL}/api/data-science/eda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetId: customDatasetId,
        csvContent: customCsv,
        includeCorrelations: true,
        includeOutliers: true
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.eda?.columns?.price) throw new Error('EDA stats missing price column');
    if (data.eda.rowCount !== 5) throw new Error(`Expected 5 rows, got ${data.eda.rowCount}`);
  });

  // 5. Natural Language Query
  await check('POST /api/data-science/query', async () => {
    const res = await fetch(`${BASE_URL}/api/data-science/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetId: customDatasetId,
        csvContent: customCsv,
        query: 'What is the highest units_sold by category?'
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.answer) throw new Error('NL Query returned no answer');
  });

  // 6. AutoML Recommendation
  await check('POST /api/data-science/ml-recommend', async () => {
    const res = await fetch(`${BASE_URL}/api/data-science/ml-recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetId: customDatasetId,
        csvContent: customCsv,
        targetColumn: 'units_sold'
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.recommendation?.recommendedModel) {
      throw new Error('AutoML recommendation missing model');
    }
  });

  // 7. Hypothesis Testing (Two-sample Welch t-test)
  await check('POST /api/data-science/stats-test (Welch t-test)', async () => {
    const res = await fetch(`${BASE_URL}/api/data-science/stats-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testType: 'welch_t_test',
        groupA: [10, 12, 14, 15, 13, 16],
        groupB: [22, 25, 27, 24, 26, 28],
        significanceLevel: 0.05
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.result || typeof data.result.pValue !== 'number') {
      throw new Error('Hypothesis test failed or invalid pValue');
    }
    if (!data.result.significant) throw new Error('Expected significant difference between groups');
  });

  // 8. Generate Comprehensive Report
  await check('POST /api/data-science/report', async () => {
    const res = await fetch(`${BASE_URL}/api/data-science/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetId: customDatasetId,
        csvContent: customCsv,
        tenantId: 't-verify',
        workspaceId: 'w-verify'
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.report || !data.report.includes('# Comprehensive Data Science & Analytics Report')) {
      throw new Error('Comprehensive report generation failed');
    }
  });

  // 9. Data Science Studio UI Route
  await check('GET /data-science (HTML Route)', async () => {
    const res = await fetch(`${BASE_URL}/data-science`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    if (!html.includes('Data Science') && !html.includes('Analytics Studio')) {
      throw new Error('Page HTML missing expected titles');
    }
  });

  console.log(`\n=======================================================`);
  console.log(`Phase 27 Verification Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});
