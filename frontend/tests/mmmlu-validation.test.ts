/**
 * TATTVA AI - MMMLU Dataset Loader and Validation Engine Test Suite
 * Automated verification for CSV parsing, Unicode integrity, schema checks, duplicates & metrics
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import assert from "assert";
import path from "path";
import {
  MMMLUDatasetValidator,
  mmmluValidator,
} from "../app/lib/evaluation/mmmlu/validator";

async function runMMMLUValidationTests() {
  console.log("\n========================================================");
  console.log("🧪 TATTVA MMMLU DATASET VALIDATION TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  const test = (name: string, fn: () => void | Promise<void>) => {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err);
      throw err;
    }
  };

  // ----------------------------------------------------
  // TEST GROUP 1: CSV Loading & Path Resolution
  // ----------------------------------------------------
  console.log("--- 1. CSV Loading & Path Resolution ---");

  test("Resolves 456 question sample dataset path reliably", () => {
    const resolved = mmmluValidator.resolveDatasetPath("MMMLU_HI-IN_456_question_sample.csv");
    assert(resolved.endsWith("MMMLU_HI-IN_456_question_sample.csv"), "Resolved correct sample filename");
  });

  test("Parses RFC-4180 CSV with quotes and multi-line content", () => {
    const csvSample = `Question,A,B,C,D,Answer,Subject\n"Line 1\nLine 2",Opt A,Opt B,Opt C,Opt D,A,sample_subject`;
    const rows = mmmluValidator.parseRFC4180CSV(csvSample);
    assert(rows.length === 2, "Parsed into header and 1 data row");
    assert(rows[1][0] === "Line 1\nLine 2", "Preserved multi-line string inside double quotes");
    assert(rows[1][1] === "Opt A", "Parsed option A");
  });

  test("Handles escaped double quotes within fields", () => {
    const csvSample = `Question,A,B,C,D,Answer,Subject\n"He said ""Hello""",A,B,C,D,B,test`;
    const rows = mmmluValidator.parseRFC4180CSV(csvSample);
    assert(rows[1][0] === 'He said "Hello"', "Unescaped RFC-4180 double-double quotes");
  });

  // ----------------------------------------------------
  // TEST GROUP 2: Column Schema & Index Column Handling
  // ----------------------------------------------------
  console.log("\n--- 2. Column Schema & Index Column Handling ---");

  test("Validates standard schema without leading index column", () => {
    const csvContent = `Question,A,B,C,D,Answer,Subject\nप्रश्न 1,विकल्प A,विकल्प B,विकल्प C,विकल्प D,A,physics`;
    const { validQuestions, report } = mmmluValidator.validate(csvContent);
    assert(report.isValid === true, "Report is valid");
    assert(validQuestions.length === 1, "Extracted 1 question");
    assert(validQuestions[0].options.A === "विकल्प A", "Mapped option A correctly");
  });

  test("Handles empty first index column ('Unnamed: 0')", () => {
    const csvWithUnnamed = `Unnamed: 0,Question,A,B,C,D,Answer,Subject\n0,प्रश्न 1,A,B,C,D,C,math`;
    const { validQuestions, report } = mmmluValidator.validate(csvWithUnnamed);
    assert(report.isValid === true, "Report is valid with Unnamed: 0 column");
    assert(validQuestions[0].answer === "C", "Answer mapped correctly ignoring index col");
  });

  test("Throws error when required column is missing", () => {
    const missingSubjectCsv = `Question,A,B,C,D,Answer\nQ1,A,B,C,D,A`;
    let threw = false;
    try {
      mmmluValidator.validate(missingSubjectCsv);
    } catch (e: any) {
      threw = true;
      assert(e.message.includes("Missing required column"), "Error mentions missing column");
    }
    assert(threw, "Validator threw error on missing required column");
  });

  // ----------------------------------------------------
  // TEST GROUP 3: Missing Values & Data Integrity
  // ----------------------------------------------------
  console.log("\n--- 3. Missing Values & Data Integrity ---");

  test("Flags missing question text as an invalid record", () => {
    const missingQCsv = `Question,A,B,C,D,Answer,Subject\n,Opt A,Opt B,Opt C,Opt D,A,math`;
    const { report } = mmmluValidator.validate(missingQCsv);
    assert(report.isValid === false, "Report is flagged as invalid");
    assert(report.invalidRecords === 1, "Exactly 1 invalid record recorded");
    assert(report.errors.some((e) => e.errorType === "missing_question"), "Identified missing_question error");
  });

  test("Flags missing option (e.g. empty Option C)", () => {
    const missingOptCsv = `Question,A,B,C,D,Answer,Subject\nValid Question,Opt A,Opt B,,Opt D,A,math`;
    const { report } = mmmluValidator.validate(missingOptCsv);
    assert(report.invalidRecords === 1, "Recorded 1 invalid record");
    assert(report.errors.some((e) => e.errorType === "missing_option"), "Identified missing_option error");
    assert(report.errors[0].message.includes("C"), "Indicated missing option C");
  });

  test("Flags empty subject field", () => {
    const emptySubCsv = `Question,A,B,C,D,Answer,Subject\nValid Question,A,B,C,D,A,`;
    const { report } = mmmluValidator.validate(emptySubCsv);
    assert(report.invalidRecords === 1, "Recorded invalid record");
    assert(report.errors.some((e) => e.errorType === "empty_subject"), "Identified empty_subject error");
  });

  // ----------------------------------------------------
  // TEST GROUP 4: Answer Validation
  // ----------------------------------------------------
  console.log("\n--- 4. Answer Option Validation ---");

  test("Accepts strictly valid answer letters A, B, C, D", () => {
    const validAnswersCsv = `Question,A,B,C,D,Answer,Subject\nQ1,A,B,C,D,A,s1\nQ2,A,B,C,D,b,s1\nQ3,A,B,C,D,C,s1\nQ4,A,B,C,D,D,s1`;
    const { report } = mmmluValidator.validate(validAnswersCsv);
    assert(report.validRecords === 4, "All 4 valid answer rows passed");
    assert(report.answerDistribution.A.count === 1, "A count is 1");
    assert(report.answerDistribution.B.count === 1, "B count is 1");
    assert(report.answerDistribution.C.count === 1, "C count is 1");
    assert(report.answerDistribution.D.count === 1, "D count is 1");
  });

  test("Rejects invalid answers outside A, B, C, D (e.g. 'E', '1', 'True')", () => {
    const invalidAnswersCsv = `Question,A,B,C,D,Answer,Subject\nQ1,A,B,C,D,E,s1\nQ2,A,B,C,D,1,s1\nQ3,A,B,C,D,True,s1`;
    const { report } = mmmluValidator.validate(invalidAnswersCsv);
    assert(report.invalidRecords === 3, "All 3 invalid answer rows flagged");
    assert(report.errors.every((e) => e.errorType === "invalid_answer"), "All errors marked invalid_answer");
  });

  // ----------------------------------------------------
  // TEST GROUP 5: Duplicate Question Detection
  // ----------------------------------------------------
  console.log("\n--- 5. Duplicate Question Detection ---");

  test("Detects exact and case-insensitive duplicate questions", () => {
    const duplicatesCsv = `Question,A,B,C,D,Answer,Subject\nभारत की राजधानी क्या है?,दिल्ली,मुंबई,कोलकाता,चेन्नई,A,geography\nभारत की राजधानी क्या है?,नई दिल्ली,मुंबई,कोलकाता,चेन्नई,A,geography\nभारत की राजधानी क्या है?  ,दिल्ली,मुंबई,कोलकाता,चेन्नई,A,geography`;
    const { report } = mmmluValidator.validate(duplicatesCsv);
    assert(report.duplicateRecords === 2, "Detected 2 duplicate questions");
    assert(report.warnings.length === 2, "Recorded 2 duplicate warnings with row indices");
  });

  // ----------------------------------------------------
  // TEST GROUP 6: Hindi Unicode Integrity & Normalization
  // ----------------------------------------------------
  console.log("\n--- 6. Hindi Unicode Handling & Encoding Integrity ---");

  test("Preserves Hindi Devanagari script without corruption", () => {
    const hindiCsv = `Question,A,B,C,D,Answer,Subject\n"आँख की पुतली संबंधी प्रकाश अनैच्छिक क्रिया के बारे में निम्नलिखित में से कौन सा कथन सही है?",दृक् तंत्रिका,निचले कॉलीक्युलाई,सहमतिजन्य अनैच्छिक क्रिया,ऑक्युलोमोटर,C,anatomy`;
    const { validQuestions, report } = mmmluValidator.validate(hindiCsv);
    assert(report.unicodeIntegrity.passed === true, "Unicode integrity passed");
    assert(report.unicodeIntegrity.nonAsciiDevanagariDetected === true, "Devanagari script detected");
    assert(validQuestions[0].question.includes("आँख की पुतली"), "Devanagari text preserved verbatim");
  });

  test("Detects and flags Unicode replacement character (U+FFFD)", () => {
    const corruptedText = `Question,A,B,C,D,Answer,Subject\nCorrupted text with \uFFFD replacement,A,B,C,D,A,subject`;
    const { report } = mmmluValidator.validate(corruptedText);
    assert(report.unicodeIntegrity.hasReplacementChar === true, "Flagged replacement char");
    assert(report.unicodeIntegrity.passed === false, "Unicode integrity failed");
    assert(report.isValid === false, "Dataset marked invalid due to Unicode corruption");
  });

  test("Detects and flags null bytes (0x00)", () => {
    const nullByteText = `Question,A,B,C,D,Answer,Subject\nNull byte text \0 here,A,B,C,D,A,subject`;
    const { report } = mmmluValidator.validate(nullByteText);
    assert(report.unicodeIntegrity.hasNullBytes === true, "Flagged null byte");
    assert(report.unicodeIntegrity.passed === false, "Unicode integrity failed");
  });

  // ----------------------------------------------------
  // TEST GROUP 7: Subject Breakdown & Statistics
  // ----------------------------------------------------
  console.log("\n--- 7. Subject Breakdown & Statistics ---");

  test("Computes correct subject counts and answer option distribution", () => {
    const multiSubjectCsv = `Question,A,B,C,D,Answer,Subject\nQ1,A,B,C,D,A,physics\nQ2,A,B,C,D,B,physics\nQ3,A,B,C,D,C,chemistry\nQ4,A,B,C,D,D,biology`;
    const { report } = mmmluValidator.validate(multiSubjectCsv);
    assert(report.totalSubjects === 3, "Total 3 distinct subjects");
    assert(report.subjectsBreakdown["physics"] === 2, "Physics has 2 questions");
    assert(report.subjectsBreakdown["chemistry"] === 1, "Chemistry has 1 question");
    assert(report.subjectsBreakdown["biology"] === 1, "Biology has 1 question");
    assert(report.answerDistribution.A.percentage === 25.0, "A is 25%");
    assert(report.answerDistribution.D.percentage === 25.0, "D is 25%");
  });

  // ----------------------------------------------------
  // TEST GROUP 8: File-Not-Found & Error Handling
  // ----------------------------------------------------
  console.log("\n--- 8. File-Not-Found & Error Handling ---");

  test("Throws informative error when file cannot be located", () => {
    let threw = false;
    try {
      mmmluValidator.resolveDatasetPath("non-existent-fantasy-dataset-xyz.csv");
    } catch (e: any) {
      threw = true;
      assert(e.message.includes("could not be located"), "Error explicitly mentions could not be located");
    }
    assert(threw, "Properly threw on non-existent file path");
  });

  // ----------------------------------------------------
  // TEST GROUP 9: Live Execution on Actual 456-Question Sample
  // ----------------------------------------------------
  console.log("\n--- 9. Live Sample Dataset Validation (456 Questions) ---");

  test("Validates the real 456-question sample dataset from disk", () => {
    const { validQuestions, report } = mmmluValidator.validate("MMMLU_HI-IN_456_question_sample.csv");
    assert(report.totalRecords === 456, `Total records is 456 (got ${report.totalRecords})`);
    assert(report.validRecords === 456, `Valid records is 456 (got ${report.validRecords})`);
    assert(report.invalidRecords === 0, `Invalid records is 0 (got ${report.invalidRecords})`);
    assert(report.duplicateRecords === 0, `Duplicate records is 0 (got ${report.duplicateRecords})`);
    assert(report.totalSubjects === 57, `Subject count is 57 (got ${report.totalSubjects})`);
    assert(validQuestions.length === 456, "All 456 questions loaded into array");
    assert(report.isValid === true, "Sample dataset is 100% valid");
  });

  // ----------------------------------------------------
  // TEST GROUP 10: Report File Persistence & Formatting
  // ----------------------------------------------------
  console.log("\n--- 10. Report File Persistence & Formatting ---");

  test("Generates valid JSON report and readable terminal formatting", () => {
    const { report } = mmmluValidator.validate("MMMLU_HI-IN_456_question_sample.csv");
    const writtenPath = mmmluValidator.writeReportToFile(report);
    assert(writtenPath.endsWith("validation-report.json"), "Wrote to validation-report.json");

    const terminalReport = mmmluValidator.formatTerminalReport(report);
    assert(terminalReport.includes("TATTVA AI"), "Terminal report contains header");
    assert(terminalReport.includes("456"), "Terminal report contains record count");
    assert(terminalReport.includes("PASSED"), "Terminal report contains pass indicator");
  });

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n========================================================");
  console.log(`🎯 VALIDATION TEST SUITE: ${passed}/${total} Tests Passed (100%)`);
  console.log("========================================================\n");
}

runMMMLUValidationTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
