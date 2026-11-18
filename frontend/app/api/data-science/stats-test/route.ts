/**
 * TATTVA AI - Statistical Hypothesis Testing API Route
 * POST /api/data-science/stats-test -> Execute Welch's t-test, ANOVA, or Chi-Square tests
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { DataSciencePlatformEngine, StatisticalTestType } from "../../../lib/data-science";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    let rawTestType = body.testType || "two_sample_t_test";
    if (rawTestType === "welch_t_test") rawTestType = "two_sample_t_test";
    const testType: StatisticalTestType = rawTestType;
    const alpha = typeof body.alpha === "number" ? body.alpha : (typeof body.significanceLevel === "number" ? body.significanceLevel : 0.05);

    let testResult;

    if (testType === "two_sample_t_test" || testType === "paired_t_test") {
      const s1 = body.sample1 || body.groupA;
      const s2 = body.sample2 || body.groupB;
      const sample1 = Array.isArray(s1) ? s1.map(Number).filter((v: number) => !isNaN(v)) : [];
      const sample2 = Array.isArray(s2) ? s2.map(Number).filter((v: number) => !isNaN(v)) : [];

      if (sample1.length < 2 || sample2.length < 2) {
        return NextResponse.json(
          { error: "Provide 'sample1' and 'sample2' as numerical arrays with at least 2 points each." },
          { status: 400 }
        );
      }

      testResult = DataSciencePlatformEngine.runTTest(sample1, sample2, alpha);
    } else if (testType === "anova") {
      const groups = Array.isArray(body.groups)
        ? body.groups.map((g: any[]) => g.map(Number).filter((v) => !isNaN(v)))
        : [];

      if (groups.length < 2) {
        return NextResponse.json(
          { error: "ANOVA requires 'groups' array with at least 2 numerical arrays." },
          { status: 400 }
        );
      }

      testResult = DataSciencePlatformEngine.runANOVA(groups, alpha);
    } else if (testType === "chi_square") {
      const table = Array.isArray(body.contingencyTable) ? body.contingencyTable : [];
      if (table.length < 2 || !Array.isArray(table[0]) || table[0].length < 2) {
        return NextResponse.json(
          { error: "Chi-square requires 'contingencyTable' 2D array of counts (minimum 2x2)." },
          { status: 400 }
        );
      }

      testResult = DataSciencePlatformEngine.runChiSquare(table, alpha);
    } else {
      return NextResponse.json(
        { error: `Unsupported testType: ${testType}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: testResult,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to execute statistical test" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
