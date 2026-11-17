/**
 * TATTVA AI - Data Cleaning & Transformation Recommender
 * Scans EDA findings and produces actionable, reproducible remediation recipes
 */

import { EDASummary, CleaningRecommendation } from "./types";

export class CleanerRecommender {
  public static generateRecommendations(eda: EDASummary): CleaningRecommendation[] {
    const recommendations: CleaningRecommendation[] = [];
    let counter = 1;

    // 1. Missing Values
    for (const [col, missingCount] of Object.entries(eda.missingValuesByColumn)) {
      if (missingCount > 0) {
        const pct = Math.round((missingCount / eda.rowCount) * 100);
        const isNumeric = !!eda.numericStats[col];

        if (pct > 50) {
          recommendations.push({
            id: `rec_${counter++}`,
            column: col,
            issue: `High Missing Ratio (${pct}% missing, ${missingCount} rows)`,
            severity: "high",
            recommendedAction: `Drop column '${col}' because over 50% of records are null, preventing reliable imputation.`,
            pythonSnippet: `df.drop(columns=['${col}'], inplace=True)`,
          });
        } else if (isNumeric) {
          recommendations.push({
            id: `rec_${counter++}`,
            column: col,
            issue: `Missing Numeric Values (${pct}% missing, ${missingCount} rows)`,
            severity: pct > 20 ? "medium" : "low",
            recommendedAction: `Impute missing values in '${col}' with the column median (${eda.numericStats[col].median}) to resist outlier bias.`,
            pythonSnippet: `df['${col}'].fillna(df['${col}'].median(), inplace=True)`,
          });
        } else {
          recommendations.push({
            id: `rec_${counter++}`,
            column: col,
            issue: `Missing Categorical Values (${pct}% missing, ${missingCount} rows)`,
            severity: "low",
            recommendedAction: `Impute missing categories in '${col}' with the mode or a dedicated 'Unknown' indicator token.`,
            pythonSnippet: `df['${col}'].fillna('Unknown', inplace=True)`,
          });
        }
      }
    }

    // 2. Outliers
    for (const out of eda.outliers) {
      if (out.outlierCount > 0) {
        recommendations.push({
          id: `rec_${counter++}`,
          column: out.column,
          issue: `Detected ${out.outlierCount} Outliers (${out.outlierPercentage}% of dataset)`,
          severity: out.outlierPercentage > 5 ? "medium" : "low",
          recommendedAction: `Winsorize or clip values in '${out.column}' to the IQR boundaries [${out.lowerBound}, ${out.upperBound}] to stabilize variance.`,
          pythonSnippet: `df['${out.column}'] = df['${out.column}'].clip(lower=${out.lowerBound}, upper=${out.upperBound})`,
        });
      }
    }

    // 3. High Skewness
    for (const [col, stat] of Object.entries(eda.numericStats)) {
      if (Math.abs(stat.skewness) > 1.5 && stat.min > 0) {
        recommendations.push({
          id: `rec_${counter++}`,
          column: col,
          issue: `High Distribution Skewness (${stat.skewness > 0 ? "Right" : "Left"}-skewed: ${stat.skewness})`,
          severity: "medium",
          recommendedAction: `Apply a natural log transformation np.log1p() to normalize the distribution of '${col}' prior to linear modeling.`,
          pythonSnippet: `import numpy as np\ndf['${col}_log'] = np.log1p(df['${col}'])`,
        });
      }
    }

    // 4. High Cardinality Categoricals
    for (const [col, stat] of Object.entries(eda.categoricalStats)) {
      if (stat.cardinality > 50 && stat.cardinality < eda.rowCount * 0.9) {
        recommendations.push({
          id: `rec_${counter++}`,
          column: col,
          issue: `High Cardinality (${stat.cardinality} distinct categories)`,
          severity: "medium",
          recommendedAction: `Group rare categories in '${col}' into an 'Other' bucket or use Target Encoding instead of One-Hot Encoding.`,
          pythonSnippet: `top_cats = df['${col}'].value_counts().nlargest(10).index\ndf['${col}'] = df['${col}'].where(df['${col}'].isin(top_cats), other='Other')`,
        });
      }
    }

    return recommendations;
  }
}
