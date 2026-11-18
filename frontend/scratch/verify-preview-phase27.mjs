/**
 * TATTVA AI - Phase 27 Preview & Production Verification Script
 * Validates the complete Data Science & Analytics Platform on live Vercel deployments
 */

import { execSync } from "child_process";
import fs from "fs";

const targetUrl = process.argv[2] || "https://tattva-ai-phi.vercel.app";
console.log("Target Base URL:", targetUrl);

async function main() {
  const token = Buffer.from(
    JSON.stringify({
      userId: "guest_user",
      email: "guest@tattva.ai",
      tier: "free",
      expiresAt: Date.now() + 3600000,
    })
  ).toString("base64");

  console.log("\n1. Testing /api/health on deployment...");
  const healthCmd = `npx vercel curl "${targetUrl}/api/health"`;
  const healthOutput = execSync(healthCmd, { encoding: "utf-8" });
  console.log("Health Output Sample:\n", healthOutput.slice(-300));
  if (!healthOutput.includes('"environment":') && !healthOutput.includes('"status":')) {
    throw new Error("Health check failed: " + healthOutput);
  }

  console.log("\n2. Testing /api/data-science/datasets GET...");
  const getDatasetsCmd = `npx vercel curl "${targetUrl}/api/data-science/datasets?tenantId=t-verify&workspaceId=w-verify" -H "x-tattva-session: ${token}"`;
  const getDatasetsOutput = execSync(getDatasetsCmd, { encoding: "utf-8" });
  console.log("Datasets Output Sample:\n", getDatasetsOutput.slice(-350));
  if (!getDatasetsOutput.includes('"success":true') || !getDatasetsOutput.includes('"data":')) {
    throw new Error("Get datasets failed: " + getDatasetsOutput);
  }

  console.log("\n3. Testing /api/data-science/datasets POST (Upload CSV)...");
  const customCsv = `item_id,price,units_sold,category\n101,15.50,120,apparel\n102,45.00,80,electronics\n103,12.00,200,apparel\n104,89.99,35,electronics\n105,5.50,450,stationery`;
  const uploadPayload = {
    tenantId: "t-verify",
    workspaceId: "w-verify",
    name: "Custom Inventory",
    csvContent: customCsv,
  };
  fs.writeFileSync("scratch/test-ds-upload.json", JSON.stringify(uploadPayload));
  const uploadCmd = `npx vercel curl ${targetUrl}/api/data-science/datasets -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-ds-upload.json"`;
  const uploadOutput = execSync(uploadCmd, { encoding: "utf-8" });
  console.log("Upload Output Sample:\n", uploadOutput.slice(-350));
  if (!uploadOutput.includes('"success":true') || !uploadOutput.includes('"data":')) {
    throw new Error("Upload dataset failed: " + uploadOutput);
  }

  console.log("\n4. Testing /api/data-science/eda POST...");
  const edaPayload = {
    csvContent: customCsv,
    includeCorrelations: true,
    includeOutliers: true,
  };
  fs.writeFileSync("scratch/test-ds-eda.json", JSON.stringify(edaPayload));
  const edaCmd = `npx vercel curl ${targetUrl}/api/data-science/eda -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-ds-eda.json"`;
  const edaOutput = execSync(edaCmd, { encoding: "utf-8" });
  console.log("EDA Output Sample:\n", edaOutput.slice(-350));
  if (!edaOutput.includes('"success":true') || !edaOutput.includes('"price":')) {
    throw new Error("EDA execution failed: " + edaOutput);
  }

  console.log("\n5. Testing /api/data-science/query POST...");
  const queryPayload = {
    csvContent: customCsv,
    query: "What is the highest units_sold by category?",
  };
  fs.writeFileSync("scratch/test-ds-query.json", JSON.stringify(queryPayload));
  const queryCmd = `npx vercel curl ${targetUrl}/api/data-science/query -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-ds-query.json"`;
  const queryOutput = execSync(queryCmd, { encoding: "utf-8" });
  console.log("Query Output Sample:\n", queryOutput.slice(-350));
  if (!queryOutput.includes('"success":true') || (!queryOutput.includes('"aggregationSummary":') && !queryOutput.includes('"interpretation":'))) {
    throw new Error("Query execution failed: " + queryOutput);
  }

  console.log("\n6. Testing /api/data-science/ml-recommend POST...");
  const mlPayload = {
    csvContent: customCsv,
    targetColumn: "units_sold",
  };
  fs.writeFileSync("scratch/test-ds-ml.json", JSON.stringify(mlPayload));
  const mlCmd = `npx vercel curl ${targetUrl}/api/data-science/ml-recommend -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-ds-ml.json"`;
  const mlOutput = execSync(mlCmd, { encoding: "utf-8" });
  console.log("ML Recommend Output Sample:\n", mlOutput.slice(-350));
  if (!mlOutput.includes('"success":true') || !mlOutput.includes('"suggestedAlgorithms":')) {
    throw new Error("ML recommendation failed: " + mlOutput);
  }

  console.log("\n7. Testing /api/data-science/stats-test POST...");
  const statsPayload = {
    testType: "two_sample_t_test",
    sample1: [10, 12, 14, 15, 13, 16],
    sample2: [22, 25, 27, 24, 26, 28],
    alpha: 0.05,
  };
  fs.writeFileSync("scratch/test-ds-stats.json", JSON.stringify(statsPayload));
  const statsCmd = `npx vercel curl ${targetUrl}/api/data-science/stats-test -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-ds-stats.json"`;
  const statsOutput = execSync(statsCmd, { encoding: "utf-8" });
  console.log("Stats Test Output Sample:\n", statsOutput.slice(-350));
  if (!statsOutput.includes('"success":true') || !statsOutput.includes('"significant":true')) {
    throw new Error("Statistical testing failed: " + statsOutput);
  }

  console.log("\n8. Testing /api/data-science/report POST...");
  const reportPayload = {
    csvContent: customCsv,
    tenantId: "t-verify",
    workspaceId: "w-verify",
  };
  fs.writeFileSync("scratch/test-ds-report.json", JSON.stringify(reportPayload));
  const reportCmd = `npx vercel curl ${targetUrl}/api/data-science/report -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-ds-report.json"`;
  const reportOutput = execSync(reportCmd, { encoding: "utf-8" });
  console.log("Report Output Sample:\n", reportOutput.slice(-350));
  if (!reportOutput.includes('"success":true') || !reportOutput.includes('Comprehensive Data Science')) {
    throw new Error("Report generation failed: " + reportOutput);
  }

  console.log("\n9. Testing /data-science UI Route...");
  const uiCmd = `npx vercel curl "${targetUrl}/data-science" -H "x-tattva-session: ${token}"`;
  const uiOutput = execSync(uiCmd, { encoding: "utf-8" });
  console.log("UI Page Byte Length:", uiOutput.length);
  if (!uiOutput.includes("Data Science") && !uiOutput.includes("Analytics Studio") && !uiOutput.includes("Studio")) {
    throw new Error("Data Science studio UI failed to load: " + uiOutput.slice(0, 300));
  }

  console.log("\n=======================================================");
  console.log("✅ ALL 9 / 9 PHASE 27 VERIFICATION CHECKS PASSED!");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
