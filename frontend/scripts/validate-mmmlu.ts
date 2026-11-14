#!/usr/bin/env node
/**
 * TATTVA AI - MMMLU Dataset Validator CLI
 * Executes validation on OpenAI MMMLU Hindi dataset and generates JSON & terminal reports
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import path from "path";
import { mmmluValidator } from "../app/lib/evaluation/mmmlu/validator";

async function main() {
  const args = process.argv.slice(2);
  const targetDataset = args[0] || "MMMLU_HI-IN_456_question_sample.csv";

  console.log(`\n🔍 Initializing TATTVA MMMLU Dataset Validation Engine...`);
  console.log(`🎯 Target Dataset: ${targetDataset}\n`);

  try {
    const { report } = mmmluValidator.validate(targetDataset);

    // 1. Output readable terminal report
    const terminalReport = mmmluValidator.formatTerminalReport(report);
    console.log(terminalReport);

    // 2. Write JSON report
    const writtenPath = mmmluValidator.writeReportToFile(report);
    console.log(`\n💾 Validation JSON report saved to: ${writtenPath}\n`);

    if (!report.isValid) {
      console.warn(`⚠️ Warning: Dataset has ${report.invalidRecords} invalid records.`);
      process.exit(1);
    } else {
      console.log(`🎉 Validation complete: 100% of ${report.validRecords} questions are fully valid.\n`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n❌ Validation Failed:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
