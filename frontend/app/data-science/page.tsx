import type { Metadata } from "next";
import DataScienceStudio from "../components/data-science/data-science-studio";

export const metadata: Metadata = {
  title: "Data Science & Advanced Analytics | TATTVA AI",
  description: "Automated exploratory data analysis, Pearson correlation, IQR outlier detection, natural language tabular query, and AutoML recommender.",
};

export default function DataSciencePage() {
  return <DataScienceStudio />;
}
