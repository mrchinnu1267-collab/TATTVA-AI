/**
 * TATTVA AI - Machine Learning Model Recommender & Pipeline Generator
 * Selects optimal algorithms, feature preprocessing, evaluation metrics, and executable scikit-learn code
 */

import { Dataset, MLModelRecommendation, MLTaskType, SuggestedMLAlgorithm } from "./types";

export class MLRecommender {
  public static recommendPipeline(
    dataset: Dataset,
    targetColumn?: string
  ): MLModelRecommendation {
    const target = targetColumn || this.inferTargetColumn(dataset);
    const targetSchema = dataset.columns.find((c) => c.name === target);

    let taskType: MLTaskType = "regression";
    if (!targetSchema) {
      taskType = "clustering";
    } else if (targetSchema.type === "boolean" || targetSchema.uniqueCount === 2) {
      taskType = "classification";
    } else if (targetSchema.type === "categorical" || targetSchema.uniqueCount <= 10) {
      taskType = "classification";
    } else if (targetSchema.type === "numeric") {
      taskType = "regression";
    }

    const algorithms = this.selectAlgorithms(taskType, dataset.rowCount);
    const featureEngineering = this.suggestFeatureEngineering(dataset, target);
    const evaluationMetrics = this.selectMetrics(taskType);
    const pythonSnippet = this.generatePythonPipeline(dataset, target, taskType);

    return {
      targetColumn: target || "None (Unsupervised)",
      taskType,
      suggestedAlgorithms: algorithms,
      featureEngineeringSuggestions: featureEngineering,
      evaluationMetrics,
      pythonPipelineSnippet: pythonSnippet,
    };
  }

  private static inferTargetColumn(dataset: Dataset): string {
    const candidates = ["target", "label", "churn", "price", "revenue", "sales", "converted", "is_fraud", "class"];
    for (const cand of candidates) {
      const match = dataset.columns.find((c) => c.name.toLowerCase().includes(cand));
      if (match) return match.name;
    }
    // Return last column
    return dataset.columns[dataset.columns.length - 1].name;
  }

  private static selectAlgorithms(task: MLTaskType, rowCount: number): SuggestedMLAlgorithm[] {
    if (task === "classification") {
      return [
        {
          name: "LightGBM Classifier",
          family: "Gradient Boosted Decision Trees",
          rationale: "Exceptional efficiency with leaf-wise tree growth, native handling of categorical features, and high predictive power.",
          pros: ["Extremely fast training", "Handles missing values natively", "Low memory footprint"],
          cons: ["Can overfit on very small datasets (< 500 rows)"],
          hyperparameters: { n_estimators: 200, learning_rate: 0.05, num_leaves: 31, random_state: 42 },
        },
        {
          name: "Random Forest Classifier",
          family: "Ensemble Bagging",
          rationale: "Robust against overfitting, requires minimal hyperparameter tuning, and provides straightforward feature importance.",
          pros: ["Resistant to noise and outliers", "No feature scaling required", "Parallelizable"],
          cons: ["Slower inference with deep trees", "Large memory footprint for large ensembles"],
          hyperparameters: { n_estimators: 150, max_depth: 12, min_samples_split: 5, random_state: 42 },
        },
        {
          name: "Logistic Regression (ElasticNet)",
          family: "Generalized Linear Models",
          rationale: "Calibrated probabilistic baseline offering full interpretability of odds ratios and fast execution.",
          pros: ["Highly interpretable", "Fastest training/inference", "Good with sparse matrices"],
          cons: ["Assumes linear decision boundaries", "Requires careful feature scaling and encoding"],
          hyperparameters: { penalty: "elasticnet", l1_ratio: 0.5, solver: "saga", max_iter: 1000 },
        },
      ];
    }

    if (task === "regression") {
      return [
        {
          name: "XGBoost Regressor",
          family: "Gradient Boosted Decision Trees",
          rationale: "Gold standard for tabular continuous target prediction with second-order gradient approximations and L1/L2 regularization.",
          pros: ["Superior accuracy on structured data", "Built-in regularization against overfitting", "Handles non-linear relationships"],
          cons: ["Requires tuning learning rate and tree depth"],
          hyperparameters: { n_estimators: 250, learning_rate: 0.03, max_depth: 6, subsample: 0.8, random_state: 42 },
        },
        {
          name: "Random Forest Regressor",
          family: "Ensemble Bagging",
          rationale: "Reduces variance through bagging; robust against monotonic non-linearities and outliers.",
          pros: ["Out-of-the-box performance", "No scaling needed", "Feature importance rankings"],
          cons: ["Cannot extrapolate beyond training target range"],
          hyperparameters: { n_estimators: 150, max_depth: 10, random_state: 42 },
        },
        {
          name: "Ridge Regression with Polynomial Features",
          family: "Regularized Linear Models",
          rationale: "L2-regularized linear model preventing multicollinearity inflation while capturing polynomial interactions.",
          pros: ["Exact analytical solution", "Stable under collinearity", "Extremely fast"],
          cons: ["Sensitive to outliers", "Requires standardized features"],
          hyperparameters: { alpha: 1.0 },
        },
      ];
    }

    // Default Clustering
    return [
      {
        name: "K-Means++",
        family: "Centroid-based Clustering",
        rationale: "Fast, scalable clustering with smart centroid initialization to partition data into K coherent clusters.",
        pros: ["Scales linearly O(N)", "Intuitive centroid representations"],
        cons: ["Assumes spherical clusters", "Sensitive to scale"],
        hyperparameters: { n_clusters: 4, init: "k-means++", random_state: 42 },
      },
    ];
  }

  private static suggestFeatureEngineering(dataset: Dataset, target?: string): string[] {
    const suggestions: string[] = [];
    const numCols = dataset.columns.filter((c) => c.type === "numeric" && c.name !== target);
    const catCols = dataset.columns.filter((c) => c.type === "categorical" && c.name !== target);
    const dateCols = dataset.columns.filter((c) => c.type === "datetime");

    if (numCols.length > 0) {
      suggestions.push(`StandardScaler / RobustScaler on ${numCols.length} numeric features: ${numCols.map((c) => c.name).slice(0, 3).join(", ")}`);
    }
    if (catCols.length > 0) {
      suggestions.push(`OneHotEncoder (drop='first') or TargetEncoder for categorical features: ${catCols.map((c) => c.name).slice(0, 3).join(", ")}`);
    }
    if (dateCols.length > 0) {
      suggestions.push(`Extract cyclical temporal features (day_of_week_sin/cos, month, is_weekend) from ${dateCols[0].name}`);
    }
    suggestions.push(`Apply SelectFromModel or Permutation Importance to eliminate zero-variance or noisy features.`);

    return suggestions;
  }

  private static selectMetrics(task: MLTaskType): string[] {
    if (task === "classification") {
      return ["ROC-AUC Score", "F1-Score (Macro / Weighted)", "Precision-Recall AUC (PR-AUC)", "Log-Loss", "Confusion Matrix"];
    }
    if (task === "regression") {
      return ["Root Mean Squared Error (RMSE)", "Mean Absolute Error (MAE)", "R-squared (R² Coefficient of Determination)", "Mean Absolute Percentage Error (MAPE)"];
    }
    return ["Silhouette Coefficient", "Davies-Bouldin Index", "Calinski-Harabasz Score"];
  }

  private static generatePythonPipeline(dataset: Dataset, target: string, task: MLTaskType): string {
    const numCols = dataset.columns.filter((c) => c.type === "numeric" && c.name !== target).map((c) => `'${c.name}'`);
    const catCols = dataset.columns.filter((c) => c.type === "categorical" && c.name !== target).map((c) => `'${c.name}'`);

    const modelImport =
      task === "classification"
        ? `from lightgbm import LGBMClassifier\nmodel = LGBMClassifier(n_estimators=200, learning_rate=0.05, random_state=42)`
        : `from xgboost import XGBRegressor\nmodel = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42)`;

    return [
      `import pandas as pd`,
      `import numpy as np`,
      `from sklearn.model_selection import train_test_split, cross_val_score`,
      `from sklearn.compose import ColumnTransformer`,
      `from sklearn.pipeline import Pipeline`,
      `from sklearn.preprocessing import StandardScaler, OneHotEncoder`,
      `from sklearn.impute import SimpleImputer`,
      modelImport,
      ``,
      `# 1. Load Data and Separate Target`,
      `# df = pd.read_csv('dataset.csv')`,
      `X = df.drop(columns=['${target}'])`,
      `y = df['${target}']`,
      ``,
      `# 2. Define Preprocessing Pipelines`,
      `numeric_features = [${numCols.join(", ")}]`,
      `categorical_features = [${catCols.join(", ")}]`,
      ``,
      `numeric_transformer = Pipeline(steps=[`,
      `    ('imputer', SimpleImputer(strategy='median')),`,
      `    ('scaler', StandardScaler())`,
      `])`,
      ``,
      `categorical_transformer = Pipeline(steps=[`,
      `    ('imputer', SimpleImputer(strategy='constant', fill_value='Unknown')),`,
      `    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))`,
      `])`,
      ``,
      `preprocessor = ColumnTransformer(transformers=[`,
      `    ('num', numeric_transformer, numeric_features),`,
      `    ('cat', categorical_transformer, categorical_features)`,
      `])`,
      ``,
      `# 3. Create Full Pipeline`,
      `pipeline = Pipeline(steps=[`,
      `    ('preprocessor', preprocessor),`,
      `    ('model', model)`,
      `])`,
      ``,
      `# 4. Train & Cross-Validate`,
      `X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)`,
      `pipeline.fit(X_train, y_train)`,
      `print(f"Test Score: {pipeline.score(X_test, y_test):.4f}")`,
    ].join("\n");
  }
}
