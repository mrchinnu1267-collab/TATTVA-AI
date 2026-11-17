"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Database,
  Search,
  Sparkles,
  Cpu,
  Calculator,
  Download,
  AlertTriangle,
  TrendingUp,
  Table,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowUpDown,
  Activity,
  Code2,
} from "lucide-react";
import {
  Dataset,
  EDASummary,
  CleaningRecommendation,
  NLQueryResult,
  MLModelRecommendation,
  StatisticalTestResult,
} from "../../lib/data-science/types";

export default function DataScienceStudio() {
  const [activeTab, setActiveTab] = useState<
    "datasets" | "eda" | "cleaning" | "query" | "automl" | "stats" | "report"
  >("eda");

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [edaData, setEdaData] = useState<{ eda: EDASummary; recommendations: CleaningRecommendation[] } | null>(null);
  const [edaLoading, setEdaLoading] = useState(false);

  // NL Query State
  const [nlQuery, setNlQuery] = useState("What was the highest revenue in the dataset?");
  const [queryResult, setQueryResult] = useState<NLQueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // AutoML State
  const [targetColumn, setTargetColumn] = useState("");
  const [mlRec, setMlRec] = useState<MLModelRecommendation | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Stats Test State
  const [statsSample1, setStatsSample1] = useState("102, 115, 120, 108, 125, 130, 118, 122");
  const [statsSample2, setStatsSample2] = useState("85, 92, 88, 95, 90, 84, 98, 89");
  const [statsResult, setStatsResult] = useState<StatisticalTestResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Report State
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Upload State
  const [csvInput, setCsvInput] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Datasets
  const fetchDatasets = async () => {
    try {
      const res = await fetch("/api/data-science/datasets");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setDatasets(data.data);
        if (!selectedDatasetId) {
          setSelectedDatasetId(data.data[0].id);
        }
      }
    } catch {
      // Non-fatal
    }
  };

  // Run EDA
  const handleRunEDA = async (dsId?: string) => {
    const idToUse = dsId || selectedDatasetId;
    setEdaLoading(true);
    try {
      const res = await fetch("/api/data-science/eda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: idToUse }),
      });
      const data = await res.json();
      if (data.success) {
        setEdaData(data.data);
        showNotification("Automated EDA profiling complete!");
      } else {
        showNotification(data.error || "Failed to execute EDA");
      }
    } catch {
      showNotification("Error connecting to EDA engine");
    } finally {
      setEdaLoading(false);
    }
  };

  // Run NL Query
  const handleRunQuery = async () => {
    if (!nlQuery.trim()) return;
    setQueryLoading(true);
    try {
      const res = await fetch("/api/data-science/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetId: selectedDatasetId,
          query: nlQuery,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQueryResult(data.data);
        showNotification("Query executed successfully!");
      } else {
        showNotification(data.error || "Query failed");
      }
    } catch {
      showNotification("Error executing natural language query");
    } finally {
      setQueryLoading(false);
    }
  };

  // Run AutoML Recommender
  const handleRecommendML = async () => {
    setMlLoading(true);
    try {
      const res = await fetch("/api/data-science/ml-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetId: selectedDatasetId,
          targetColumn: targetColumn || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMlRec(data.data);
        showNotification("ML architecture recommended!");
      } else {
        showNotification(data.error || "Failed to recommend ML pipeline");
      }
    } catch {
      showNotification("Error running ML recommender");
    } finally {
      setMlLoading(false);
    }
  };

  // Run Statistical Hypothesis Test
  const handleRunStatsTest = async () => {
    setStatsLoading(true);
    try {
      const s1 = statsSample1.split(",").map((v) => Number(v.trim())).filter((v) => !isNaN(v));
      const s2 = statsSample2.split(",").map((v) => Number(v.trim())).filter((v) => !isNaN(v));

      const res = await fetch("/api/data-science/stats-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testType: "two_sample_t_test",
          sample1: s1,
          sample2: s2,
          alpha: 0.05,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatsResult(data.data);
        showNotification("Hypothesis test completed!");
      } else {
        showNotification(data.error || "Test execution failed");
      }
    } catch {
      showNotification("Error running statistical hypothesis test");
    } finally {
      setStatsLoading(false);
    }
  };

  // Generate Report
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch("/api/data-science/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: selectedDatasetId }),
      });
      const data = await res.json();
      if (data.success) {
        setReportMarkdown(data.data.markdownReport);
        showNotification("Analytics report synthesized!");
      } else {
        showNotification(data.error || "Report generation failed");
      }
    } catch {
      showNotification("Error generating analytics report");
    } finally {
      setReportLoading(false);
    }
  };

  // Upload Custom Dataset
  const handleUploadDataset = async () => {
    if (!csvInput.trim()) return;
    setUploadLoading(true);
    try {
      const res = await fetch("/api/data-science/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadName || "User Ingested Data",
          csvContent: csvInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Dataset '${data.data.name}' uploaded successfully!`);
        setCsvInput("");
        setUploadName("");
        await fetchDatasets();
        setSelectedDatasetId(data.data.id);
        handleRunEDA(data.data.id);
      } else {
        showNotification(data.error || "Upload failed");
      }
    } catch {
      showNotification("Error uploading dataset");
    } finally {
      setUploadLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      handleRunEDA(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto mb-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-sky-300 via-indigo-300 to-emerald-300 bg-clip-text text-transparent">
                Data Science & Advanced Analytics Studio
              </h1>
              <p className="text-sm text-slate-400">
                Automated EDA profiling, natural language queries, outlier clipping, AutoML recommender, and hypothesis testing.
              </p>
            </div>
          </div>

          {/* Active Dataset Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Database className="w-4 h-4 text-sky-400" />
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-950 text-slate-100">
                    {d.name} ({d.rowCount} rows)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="mt-4 p-3 rounded-lg bg-sky-900/60 border border-sky-700/60 text-sky-200 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            {notification}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("eda")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "eda"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Exploratory Data Analysis
          </button>
          <button
            onClick={() => setActiveTab("cleaning")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "cleaning"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Cleaning Recommendations
          </button>
          <button
            onClick={() => setActiveTab("query")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "query"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Search className="w-4 h-4" />
            Natural Language Query
          </button>
          <button
            onClick={() => setActiveTab("automl")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "automl"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Cpu className="w-4 h-4" />
            AutoML Recommender
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "stats"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Calculator className="w-4 h-4" />
            Hypothesis Testing
          </button>
          <button
            onClick={() => setActiveTab("datasets")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "datasets"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Table className="w-4 h-4" />
            Ingest / Upload
          </button>
          <button
            onClick={() => {
              setActiveTab("report");
              handleGenerateReport();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "report"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Download className="w-4 h-4" />
            Analytics Report
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* TAB 1: EDA */}
        {activeTab === "eda" && (
          <div className="space-y-6">
            {edaData ? (
              <div className="space-y-6">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Rows</span>
                    <div className="text-2xl font-bold text-slate-100 mt-1">{edaData.eda.rowCount}</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Columns</span>
                    <div className="text-2xl font-bold text-slate-100 mt-1">{edaData.eda.columnCount}</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Missing Values</span>
                    <div className="text-2xl font-bold text-slate-100 mt-1">{edaData.eda.missingValuesTotal}</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Outliers Flagged</span>
                    <div className="text-2xl font-bold text-amber-400 mt-1">
                      {edaData.eda.outliers.reduce((acc, o) => acc + o.outlierCount, 0)}
                    </div>
                  </div>
                </div>

                {/* Numeric Statistics Cards */}
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-sky-400" />
                    Descriptive Statistics (Continuous Features)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-2.5 px-3">Column</th>
                          <th className="py-2.5 px-3">Mean</th>
                          <th className="py-2.5 px-3">Median</th>
                          <th className="py-2.5 px-3">StdDev</th>
                          <th className="py-2.5 px-3">Min</th>
                          <th className="py-2.5 px-3">Max</th>
                          <th className="py-2.5 px-3">IQR</th>
                          <th className="py-2.5 px-3">Skewness</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {Object.values(edaData.eda.numericStats).map((st) => (
                          <tr key={st.column} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{st.column}</td>
                            <td className="py-2.5 px-3 text-sky-300">{st.mean}</td>
                            <td className="py-2.5 px-3 text-slate-300">{st.median}</td>
                            <td className="py-2.5 px-3 text-slate-400">{st.stdDev}</td>
                            <td className="py-2.5 px-3 text-slate-400">{st.min}</td>
                            <td className="py-2.5 px-3 text-slate-400">{st.max}</td>
                            <td className="py-2.5 px-3 text-slate-400">{st.iqr}</td>
                            <td className="py-2.5 px-3 text-slate-400">{st.skewness}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pearson Correlations & Outlier Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Correlations */}
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                    <h3 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-emerald-400" />
                      Pearson Correlation Pairs
                    </h3>
                    <div className="space-y-2.5">
                      {edaData.eda.correlations.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                        >
                          <span className="font-mono text-slate-300">
                            {c.col1} ↔ {c.col2}
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              c.pearsonR >= 0.5
                                ? "bg-emerald-500/20 text-emerald-300"
                                : c.pearsonR <= -0.5
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            r = {c.pearsonR}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outliers */}
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                    <h3 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Tukey's IQR Outlier Detections
                    </h3>
                    <div className="space-y-3">
                      {edaData.eda.outliers.map((o, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <div className="flex items-center justify-between font-semibold text-slate-200 mb-1">
                            <span>{o.column}</span>
                            <span className="text-amber-400">{o.outlierCount} outliers ({o.outlierPercentage}%)</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">
                            Bounds: [{o.lowerBound}, {o.upperBound}] • Samples: {o.sampleOutliers.join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                <BarChart3 className="w-12 h-12 mb-3 text-slate-600" />
                <p>Click Run EDA to compute descriptive statistics and correlations.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CLEANING RECOMMENDATIONS */}
        {activeTab === "cleaning" && (
          <div className="space-y-4">
            {edaData?.recommendations && edaData.recommendations.length > 0 ? (
              edaData.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          rec.severity === "high"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : rec.severity === "medium"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        }`}
                      >
                        {rec.severity}
                      </span>
                      <h4 className="font-semibold text-slate-200 text-sm">{rec.issue}</h4>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Column: {rec.column}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{rec.recommendedAction}</p>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">Python Remediation Recipe</div>
                    <pre className="text-xs text-emerald-300 font-mono overflow-x-auto">{rec.pythonSnippet}</pre>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500" />
                <p>No critical data anomalies detected. The dataset satisfies baseline modeling requirements.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NL QUERY CONSOLE */}
        {activeTab === "query" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <Search className="w-5 h-5 text-sky-400" />
                Conversational Query
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Ask questions in plain English. The engine maps filters, aggregations, and produces interactive charts.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Your Question</label>
                  <textarea
                    rows={3}
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    placeholder="e.g. What was the highest revenue in the dataset?"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleRunQuery}
                  disabled={queryLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50"
                >
                  {queryLoading ? "Computing Query..." : "Execute Query"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {queryResult ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-100 text-base">{queryResult.query}</h4>
                      <p className="text-xs text-slate-400">{queryResult.interpretation}</p>
                    </div>
                    <span className="text-xs text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/20">
                      {queryResult.executionTimeMs} ms
                    </span>
                  </div>

                  {queryResult.aggregationSummary && (
                    <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs font-medium">
                      {queryResult.aggregationSummary}
                    </div>
                  )}

                  {/* Tabular Result */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          {queryResult.resultRows[0] &&
                            Object.keys(queryResult.resultRows[0]).map((k) => (
                              <th key={k} className="py-2 px-3 capitalize">
                                {k}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {queryResult.resultRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            {Object.values(row).map((v: any, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 text-slate-300">
                                {String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Search className="w-12 h-12 mb-3 text-slate-600" />
                  <p>Type a question on the left to see answers and aggregations.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUTOML RECOMMENDER */}
        {activeTab === "automl" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-400" />
                AutoML Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Target Feature (Optional)</label>
                  <input
                    type="text"
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    placeholder="e.g. churned or revenue"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  onClick={handleRecommendML}
                  disabled={mlLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50"
                >
                  {mlLoading ? "Synthesizing Pipeline..." : "Recommend ML Pipeline"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {mlRec ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs text-sky-400 uppercase tracking-widest font-bold">
                        Task: {mlRec.taskType}
                      </span>
                      <h3 className="text-lg font-bold text-slate-100 mt-0.5">Target: {mlRec.targetColumn}</h3>
                    </div>
                  </div>

                  {/* Suggested Algorithms */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Optimal Machine Learning Algorithms
                    </h4>
                    {mlRec.suggestedAlgorithms.map((alg, i) => (
                      <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-200 text-sm">{alg.name}</h5>
                          <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {alg.family}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{alg.rationale}</p>
                      </div>
                    ))}
                  </div>

                  {/* Scikit-Learn Python Pipeline Snippet */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-sky-400" />
                      Scikit-Learn Reproducible Pipeline
                    </h4>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto leading-relaxed">
                      {mlRec.pythonPipelineSnippet}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Cpu className="w-12 h-12 mb-3 text-slate-600" />
                  <p>Click Recommend ML Pipeline to inspect model architectures and code pipelines.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: STATISTICAL TESTING */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-sky-400" />
                Welch's Two-Sample t-Test
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Sample 1 (CSV numbers)</label>
                  <input
                    type="text"
                    value={statsSample1}
                    onChange={(e) => setStatsSample1(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Sample 2 (CSV numbers)</label>
                  <input
                    type="text"
                    value={statsSample2}
                    onChange={(e) => setStatsSample2(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <button
                  onClick={handleRunStatsTest}
                  disabled={statsLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50"
                >
                  {statsLoading ? "Computing p-value..." : "Execute t-Test"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {statsResult ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-slate-100">{statsResult.testName}</h3>
                    <span
                      className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${
                        statsResult.isSignificant
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {statsResult.conclusion === "reject_null" ? "Reject H0 (Significant)" : "Fail to Reject H0"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Test Statistic (t)</span>
                      <span className="text-base font-bold text-sky-400">{statsResult.testStatistic}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">p-Value</span>
                      <span className="text-base font-bold text-sky-400">{statsResult.pValue}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Deg of Freedom (df)</span>
                      <span className="text-base font-bold text-slate-300">{statsResult.degreesOfFreedom}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Alpha (α)</span>
                      <span className="text-base font-bold text-slate-300">{statsResult.alpha}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                    <p className="text-slate-400">
                      <strong className="text-slate-300">Null Hypothesis:</strong> {statsResult.nullHypothesis}
                    </p>
                    <p className="text-slate-400">
                      <strong className="text-slate-300">Alternative:</strong> {statsResult.alternativeHypothesis}
                    </p>
                    <p className="text-slate-200 mt-2 leading-relaxed">
                      <strong className="text-sky-300">Interpretation:</strong> {statsResult.interpretation}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Calculator className="w-12 h-12 mb-3 text-slate-600" />
                  <p>Provide two numerical samples to compute Welch's t-test and p-values.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: INGEST / UPLOAD */}
        {activeTab === "datasets" && (
          <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Table className="w-5 h-5 text-sky-400" />
              Upload Tabular CSV Dataset
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Dataset Name</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Q4 Financial Results"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">CSV Content (Headers + Data)</label>
                <textarea
                  rows={8}
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder="product,sales,cost,returns\nWidget A,120,40,2\nWidget B,450,110,8"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 resize-none focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                onClick={handleUploadDataset}
                disabled={uploadLoading || !csvInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50"
              >
                {uploadLoading ? "Parsing & Ingesting..." : "Ingest Dataset"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: ANALYTICS REPORT */}
        {activeTab === "report" && (
          <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Download className="w-5 h-5 text-sky-400" />
                Synthesized Analytics Report
              </h2>
              <button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className="py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-all"
              >
                {reportLoading ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
            {reportMarkdown ? (
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {reportMarkdown}
              </pre>
            ) : (
              <div className="p-8 text-center text-slate-500">Generating report...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
