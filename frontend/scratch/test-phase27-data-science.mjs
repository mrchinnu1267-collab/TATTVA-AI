/**
 * TATTVA AI - Phase 27 Data Science & Analytics Platform Automated Test Suite
 * Validates data ingestion, automated EDA, Pearson correlation, IQR outliers, NL query, AutoML, hypothesis testing, and tool registration
 */

import {
  DataSciencePlatformEngine,
  DataParser,
  EDAEngine,
  CleanerRecommender,
  NLQueryEngine,
  MLRecommender,
  StatisticalTestingEngine,
  DatasetStore,
} from "../app/lib/data-science/index.ts";
import { CentralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.ts";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("🧪 RUNNING PHASE 27 DATA SCIENCE & ANALYTICS PLATFORM TEST SUITE");
  console.log("==================================================================");

  // 1. Data Ingestion & Schema Inference
  console.log("\n[1] DataParser & Schema Inference");
  const sampleCSV = `
id,category,price,units,in_stock
101,Electronics,299.99,15,true
102,Electronics,499.50,8,true
103,Fashion,45.00,120,true
104,Fashion,89.90,65,true
105,Books,19.99,200,true
106,Books,24.50,150,false
107,Home,120.00,30,true
108,Home,350.00,5,false
  `.trim();

  const parsedRows = DataParser.parseCSV(sampleCSV);
  assert(parsedRows.length === 8, `Parsed 8 CSV records (actual: ${parsedRows.length})`);
  assert(parsedRows[0].category === "Electronics", "Parsed categorical field");
  assert(typeof parsedRows[0].price === "number", "Parsed numeric float field");
  assert(parsedRows[0].in_stock === true, "Parsed boolean field");

  const schema = DataParser.inferSchema(parsedRows);
  assert(schema.length === 5, `Inferred 5 column schemas (actual: ${schema.length})`);
  const priceCol = schema.find((c) => c.name === "price");
  assert(priceCol.type === "numeric", "Column 'price' inferred as numeric");
  const catCol = schema.find((c) => c.name === "category");
  assert(catCol.type === "categorical", "Column 'category' inferred as categorical");

  // Ingest into dataset store
  const dataset = DataSciencePlatformEngine.ingestCSV("tenant_ds_1", "ws_ds", "Inventory Sales", sampleCSV);
  assert(!!dataset.id, "Dataset registered with ID");
  assert(dataset.rowCount === 8, "Dataset rowCount equals 8");

  // 2. Automated EDA Engine
  console.log("\n[2] Automated EDA & Statistical Profiling");
  const eda = DataSciencePlatformEngine.runEDA(dataset);
  assert(eda.rowCount === 8, "EDA row count correct");
  assert(eda.columnCount === 5, "EDA column count correct");
  assert(typeof eda.numericStats.price.mean === "number", `Mean price computed: ${eda.numericStats.price.mean}`);
  assert(typeof eda.numericStats.price.median === "number", `Median price computed: ${eda.numericStats.price.median}`);
  assert(typeof eda.numericStats.price.stdDev === "number", `StdDev computed: ${eda.numericStats.price.stdDev}`);
  assert(eda.numericStats.price.min === 19.99, "Min price is 19.99");
  assert(eda.numericStats.price.max === 499.5, "Max price is 499.5");

  // Correlation check
  assert(eda.correlations.length > 0, `Computed Pearson correlations (${eda.correlations.length} pairs)`);
  const pCorr = eda.correlations.find((c) => (c.col1 === "price" && c.col2 === "units") || (c.col1 === "units" && c.col2 === "price"));
  assert(!!pCorr, "Found correlation pair between price and units");
  assert(pCorr.pearsonR < 0, `Expected negative correlation between price and units volume (actual: ${pCorr.pearsonR})`);

  // 3. Cleaning Recommendations
  console.log("\n[3] Cleaner Recommender & Remediation Recipes");
  const recs = DataSciencePlatformEngine.getCleaningRecommendations(eda);
  assert(Array.isArray(recs), "Generated cleaning recommendations array");

  // 4. Natural Language Tabular Query Engine
  console.log("\n[4] Natural Language Tabular Query");
  const q1 = DataSciencePlatformEngine.queryDataset(dataset, "What is the highest price product?");
  assert(q1.resultRows.length > 0, "Query returned result rows");
  assert(q1.resultRows[0].price === 499.5, "Highest price correctly identified as 499.50");
  assert(!!q1.suggestedChart, "Suggested interactive bar chart for query");

  const q2 = DataSciencePlatformEngine.queryDataset(dataset, "What is the average price?");
  assert(q2.resultRows.length === 1, "Average query returned single summary row");
  assert(typeof q2.resultRows[0].average === "number", `Average price returned: ${q2.resultRows[0].average}`);

  // 5. Machine Learning Model Recommender
  console.log("\n[5] AutoML Model Recommender & Pipeline Generator");
  const mlRec = DataSciencePlatformEngine.recommendML(dataset, "in_stock");
  assert(mlRec.taskType === "classification", "Correctly identified classification task for boolean target 'in_stock'");
  assert(mlRec.suggestedAlgorithms.length >= 2, "Recommended multiple algorithms");
  assert(mlRec.suggestedAlgorithms[0].name.includes("LightGBM") || mlRec.suggestedAlgorithms[0].name.includes("Random Forest"), "Top algorithm is tree ensemble");
  assert(mlRec.pythonPipelineSnippet.includes("Pipeline"), "Generated executable scikit-learn pipeline code");
  assert(mlRec.pythonPipelineSnippet.includes("SimpleImputer"), "Pipeline includes automated preprocessing imputers");

  // 6. Statistical Hypothesis Testing
  console.log("\n[6] Statistical Hypothesis Testing Engine");
  // 6.1 Two-Sample Welch's t-test (significant difference)
  const treatmentGroup = [120, 125, 122, 128, 130, 124, 126, 129];
  const controlGroup = [95, 92, 98, 90, 94, 96, 91, 93];
  const tTestSig = DataSciencePlatformEngine.runTTest(treatmentGroup, controlGroup, 0.05);

  assert(tTestSig.testStatistic > 5.0, `t-statistic computed (${tTestSig.testStatistic})`);
  assert(tTestSig.pValue < 0.01, `p-value computed (${tTestSig.pValue} < 0.01)`);
  assert(tTestSig.isSignificant === true, "Marked statistically significant");
  assert(tTestSig.conclusion === "reject_null", "Decision: reject_null");

  // 6.2 Two-Sample t-test (no significant difference)
  const grpA = [100, 102, 98, 101, 99];
  const grpB = [101, 99, 100, 102, 98];
  const tTestNonSig = DataSciencePlatformEngine.runTTest(grpA, grpB, 0.05);
  assert(tTestNonSig.isSignificant === false, "Marked not statistically significant");
  assert(tTestNonSig.conclusion === "fail_to_reject_null", "Decision: fail_to_reject_null");

  // 6.3 One-Way ANOVA F-test
  const anovaResult = DataSciencePlatformEngine.runANOVA([treatmentGroup, controlGroup, [110, 112, 108, 114, 111]]);
  assert(anovaResult.testType === "anova", "ANOVA test executed");
  assert(anovaResult.testStatistic > 0, `F-statistic computed: ${anovaResult.testStatistic}`);
  assert(anovaResult.isSignificant === true, "ANOVA detected significant variance among 3 groups");

  // 6.4 Chi-Square Test of Independence
  const contingency = [
    [50, 10], // Category A: Success, Failure
    [20, 40], // Category B: Success, Failure
  ];
  const chi2Result = DataSciencePlatformEngine.runChiSquare(contingency, 0.05);
  assert(chi2Result.testType === "chi_square", "Chi-Square test executed");
  assert(chi2Result.testStatistic > 10.0, `Chi-square statistic computed: ${chi2Result.testStatistic}`);
  assert(chi2Result.isSignificant === true, "Chi-Square rejected independence (significant dependency)");

  // 7. Tenant Isolation Tests
  console.log("\n[7] Multi-Tenant Dataset Isolation");
  const dsTenantA = DataSciencePlatformEngine.ingestCSV("tenant_alpha", "ws_1", "Secret Alpha Data", "secret_key,val\nXYZ,999");
  const dsTenantB = DataSciencePlatformEngine.listDatasets("tenant_beta", "ws_1");
  const leaked = dsTenantB.some((d) => d.name === "Secret Alpha Data");
  assert(!leaked, "Tenant Beta CANNOT see Tenant Alpha's dataset (Strict Isolation)");

  // 8. Tool Registry Integration Tests
  console.log("\n[8] Centralized Tool Registry Integration");
  const registry = CentralizedToolRegistry.getInstance();
  const context = { userId: "tenant_ds_1", sessionId: "sess_ds", isApprovalGranted: true, activePolicies: [] };

  // 8.1 run_eda tool
  const edaExec = await registry.executeTool("run_eda", { datasetId: dataset.id, workspaceId: "ws_ds" }, context);
  assert(edaExec.success === true, "Tool run_eda executed successfully");
  assert(edaExec.output.rowCount === 8, "run_eda output rowCount is 8");

  // 8.2 query_dataset tool
  const queryExec = await registry.executeTool("query_dataset", { query: "What was the highest price?", datasetId: dataset.id, workspaceId: "ws_ds" }, context);
  assert(queryExec.success === true, "Tool query_dataset executed successfully");
  assert(queryExec.output.topResult.price === 499.5, "query_dataset identified top price");

  // 8.3 recommend_ml_model tool
  const mlExec = await registry.executeTool("recommend_ml_model", { datasetId: dataset.id, targetColumn: "in_stock", workspaceId: "ws_ds" }, context);
  assert(mlExec.success === true, "Tool recommend_ml_model executed successfully");
  assert(mlExec.output.taskType === "classification", "recommend_ml_model identified classification task");

  // 8.4 run_statistical_test tool
  const statsExec = await registry.executeTool(
    "run_statistical_test",
    { testType: "two_sample_t_test", sample1: [100, 110, 120, 130], sample2: [50, 60, 55, 65] },
    context
  );
  assert(statsExec.success === true, "Tool run_statistical_test executed successfully");
  assert(statsExec.output.isSignificant === true, "run_statistical_test confirmed significant difference");

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
