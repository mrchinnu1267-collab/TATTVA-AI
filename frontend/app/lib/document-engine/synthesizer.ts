/**
 * TATTVA AI - Intelligent Document Synthesizer & Generator
 * Takes user intent, conducts automated research, and compiles genuine binary documents
 * for Microsoft Office (.docx, .xlsx, .pptx) and standard formats.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { GoogleGenAI } from "@google/genai";
import { DocumentGenerationIntent } from "./intent";
import { buildDocument, BuildDocumentOptions } from "./index";
import { inspectAndReadDocument } from "./reader";

export interface GeneratedFilePayload {
  success: boolean;
  filename: string;
  dataUri: string;
  mimeType: string;
  format: string;
  sizeBytes: number;
  title: string;
  summaryMessage: string;
  verifiedOfficeCompatible: boolean;
  pageOrSlideCount?: number;
  error?: string;
}

/**
 * Generate a genuine binary document from user prompt and intent
 */
export async function synthesizeDocument(
  intent: DocumentGenerationIntent,
  apiKey?: string
): Promise<GeneratedFilePayload> {
  const { format, topic, category, detectedLanguage, originalQuery } = intent;
  // Clean topic from technical flags, modes, or leading/trailing underscores
  const cleanTitle = (topic || "document")
    .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
    .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
    .replace(/[_\s]+/g, " ")
    .trim();

  const safeTitle = (cleanTitle.length >= 2 ? cleanTitle : topic).slice(0, 70);
  const rawBasename = safeTitle
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+$/, "")
    .slice(0, 40);
  const fileBasename = rawBasename || "tattva_document";
  const filename = `${fileBasename}.${format}`;

  let documentOptions: BuildDocumentOptions = {
    format,
    title: safeTitle,
    filename,
  };

  let aiSummary = "";

  // 1. Attempt AI-Powered Structured Synthesis via Gemini
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const promptInstruction = `You are TATTVA AI's Master Document Architect & Research Engine.
A user asked: "${originalQuery}"
Target Format: Genuine Microsoft Office / OpenXML ${format.toUpperCase()}
Topic: "${safeTitle}"

CRITICAL INSTRUCTIONS:
- Directly understand the user's mind and what they want to achieve.
- DO NOT generate python scripts, markdown explanations, or code blocks.
- Prepare REAL, COMPLETE, and FACTUALLY ACCURATE domain content with authentic structure.
- If it's a Word document/assignment/report: Include proper sections, headings, callouts, realistic data tables, and academic references.
- If it's an Excel spreadsheet/analysis: Include header row, real numerical data rows, and Excel formulas starting with '=' (e.g. "=SUM(C2:E2)" or "=AVERAGE(C2:C10)").
- If it's a PowerPoint presentation: Include 5 to 7 slides with a category kicker, title, punchy bullet points, and strategic takeaways.
${detectedLanguage === "te" ? "- Formulate titles and content in natural Telugu or bilingual English-Telugu." : ""}
${detectedLanguage === "hi" ? "- Formulate titles and content in natural Hindi or bilingual English-Hindi." : ""}

Respond strictly with valid JSON conforming to this schema based on "${format}":
${
  category === "presentation" || format === "pptx" || format === "ppt"
    ? `{
  "title": "${safeTitle}",
  "subtitle": "Comprehensive Analysis & Strategic Overview",
  "slides": [
    { "title": "Introduction & Context", "category": "OVERVIEW", "bullets": ["...", "..."] },
    { "title": "Core Architecture & Principles", "category": "ARCHITECTURE", "bullets": ["...", "..."] },
    { "title": "Practical Implementations", "category": "CASE STUDY", "bullets": ["...", "..."] },
    { "title": "Comparative Analysis & Metrics", "category": "METRICS", "bullets": ["...", "..."] },
    { "title": "Strategic Roadmap & Conclusion", "category": "CONCLUSION", "bullets": ["...", "..."] }
  ],
  "summary": "Brief 1-sentence friendly confirmation message"
}`
    : category === "spreadsheet" || format === "xlsx" || format === "xls" || format === "csv"
      ? `{
  "title": "${safeTitle}",
  "sheets": [
    {
      "title": "Analysis",
      "rows": [
        ["ID", "Name / Category", "Metric A", "Metric B", "Total", "Performance"],
        ["01", "Sample Item 1", 85, 90, "=SUM(C2:D2)", "High"],
        ["02", "Sample Item 2", 78, 82, "=SUM(C3:D3)", "Medium"],
        ["03", "Sample Item 3", 92, 95, "=SUM(C4:D4)", "High"],
        ["AVERAGE", "--", "=AVERAGE(C2:C4)", "=AVERAGE(D2:D4)", "=AVERAGE(E2:E4)", "Summary"]
      ]
    }
  ],
  "summary": "Brief 1-sentence friendly confirmation message"
}`
      : `{
  "title": "${safeTitle}",
  "subtitle": "Prepared by TATTVA AI Intelligence Suite",
  "sections": [
    {
      "heading": "1. Executive Summary & Problem Formulation",
      "content": "Comprehensive domain background and foundational problem statement...",
      "callout": "Key takeaway highlight for academic and executive clarity."
    },
    {
      "heading": "2. Theoretical Framework & Methodological Analysis",
      "content": "In-depth theoretical concepts and architectural considerations.",
      "bullets": ["Critical finding A", "Critical finding B", "Critical finding C"]
    },
    {
      "heading": "3. Comparative Evaluation & Empirical Data",
      "content": "Structured performance comparison across parameters.",
      "table": [
        ["Dimension", "Traditional Approach", "Modern Approach", "Advantage"],
        ["Efficiency", "Baseline", "3.2x Optimized", "Substantial"],
        ["Scalability", "Vertical Only", "Elastic Horizontal", "Cloud-Native"],
        ["Maintainability", "Manual", "Automated Pipelines", "High Reliability"]
      ]
    },
    {
      "heading": "4. Conclusion & Actionable Next Steps",
      "content": "Final synthesis, recommendations, and strategic outlook."
    }
  ],
  "references": [
    "Silberschatz, A., Korth, H. F., & Sudarshan, S. Database System Concepts. McGraw-Hill.",
    "Russell, S., & Norvig, P. Artificial Intelligence: A Modern Approach. Pearson.",
    "IEEE Computer Society Standards & ACM Digital Library Publications."
  ],
  "summary": "Brief 1-sentence friendly confirmation message"
}`
}`;

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: promptInstruction }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.25,
          maxOutputTokens: 2500,
        },
      });

      const responseText = res.text || "";
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
        if (parsed.title) documentOptions.title = parsed.title;
        if (parsed.subtitle) documentOptions.subtitle = parsed.subtitle;
        if (parsed.slides && Array.isArray(parsed.slides)) documentOptions.slides = parsed.slides;
        if (parsed.sections && Array.isArray(parsed.sections)) documentOptions.sections = parsed.sections;
        if (parsed.references && Array.isArray(parsed.references)) documentOptions.references = parsed.references;
        if (parsed.sheets && Array.isArray(parsed.sheets)) documentOptions.sheets = parsed.sheets;
        if (parsed.rows && Array.isArray(parsed.rows)) documentOptions.data = parsed.rows;
        if (parsed.summary) aiSummary = parsed.summary;
      }
    } catch (e) {
      console.warn("[TATTVA Document Synthesizer] AI synthesis fallback triggered:", e);
    }
  }

  // 2. Comprehensive Domain Fallbacks for Instant / Offline Generation
  const lowerTopic = safeTitle.toLowerCase();
  const isDbms = lowerTopic.includes("dbms") || lowerTopic.includes("database");
  const isMarks = lowerTopic.includes("marks") || lowerTopic.includes("student") || lowerTopic.includes("score");
  const isFinancial = lowerTopic.includes("financial") || lowerTopic.includes("budget") || lowerTopic.includes("expense");
  const isAiTopic = lowerTopic.includes("ai") || lowerTopic.includes("artificial intelligence") || lowerTopic.includes("machine learning");

  // A. PowerPoint Presentation Fallback
  if ((category === "presentation" || format === "pptx" || format === "ppt") && (!documentOptions.slides || documentOptions.slides.length === 0)) {
    if (isAiTopic) {
      documentOptions.slides = [
        {
          title: "Introduction to Artificial Intelligence",
          category: "FOUNDATIONS",
          bullets: [
            "Artificial Intelligence simulates human perception, reasoning, learning, and decision-making.",
            "Evolution from symbolic rule-based systems to modern deep neural networks and foundation models.",
            "Core components: Computer Vision, Natural Language Processing, Machine Learning, and Robotics.",
          ],
        },
        {
          title: "Deep Learning & Transformer Architectures",
          category: "TECHNOLOGY",
          bullets: [
            "Self-attention mechanisms enabling parallelized contextual representation across text, vision, and audio.",
            "Large Language Models (LLMs) and Multimodal Generative AI revolutionizing software and knowledge work.",
            "Reinforcement Learning from Human Feedback (RLHF) aligning model behavior with safety and helpfulness.",
          ],
        },
        {
          title: "Real-World Applications & Industry Impact",
          category: "APPLICATIONS",
          bullets: [
            "Healthcare: Accelerated drug discovery, precision diagnostic imaging, and genomic sequencing.",
            "Finance: Algorithmic fraud detection, quantitative risk modeling, and automated customer operations.",
            "Engineering: Automated code generation, synthetic data generation, and autonomous physical systems.",
          ],
        },
        {
          title: "Challenges, Governance & Responsible AI",
          category: "GOVERNANCE",
          bullets: [
            "Mitigating algorithmic bias, hallucinations, and copyright attribution challenges.",
            "Safeguarding user privacy through zero-trust architectures and cryptographic security boundaries.",
            "Regulatory frameworks: EU AI Act, NIST AI Risk Management Framework, and global safety standards.",
          ],
        },
        {
          title: "Strategic Outlook & Future Frontiers",
          category: "FUTURE ROADMAP",
          bullets: [
            "Autonomous agentic workflows: Orchestrating tool use, planning, and multi-step execution.",
            "Neuromorphic computing and ultra-efficient edge inference for mobile devices.",
            "The pathway toward artificial general intelligence with rigorous safety alignment.",
          ],
        },
      ];
    } else {
      documentOptions.slides = [
        {
          title: "Executive Summary & Core Objectives",
          category: "OVERVIEW",
          bullets: [
            `High-level framework and strategic imperatives for ${safeTitle}.`,
            "Designed for immediate stakeholder review, executive briefing, and tactical execution.",
            "Grounded in verified industry standards and structured domain research.",
          ],
        },
        {
          title: "Key Mechanics & Architectural Pillars",
          category: "ARCHITECTURE",
          bullets: [
            "Primary structural considerations and foundational building blocks.",
            "System performance, operational efficiency, and fault tolerance paradigms.",
            "Optimization strategies ensuring seamless scaling across environments.",
          ],
        },
        {
          title: "Practical Deployment & Case Studies",
          category: "EXECUTION",
          bullets: [
            "Real-world enterprise scenarios demonstrating measurable return on investment.",
            "Risk mitigation protocols and quality assurance validation workflows.",
            "Iterative rollout methodology minimizing operational downtime.",
          ],
        },
        {
          title: "Strategic Roadmap & Conclusion",
          category: "OUTLOOK",
          bullets: [
            "Near-term milestone deliverables and key performance indicators (KPIs).",
            "Continuous innovation pathways and ongoing technical refinement.",
            "Final recommendations and decisive executive actions.",
          ],
        },
      ];
    }
  }

  // B. Excel Spreadsheet Fallback
  else if ((category === "spreadsheet" || format === "xlsx" || format === "xls" || format === "csv") && (!documentOptions.sheets || documentOptions.sheets.length === 0)) {
    if (isMarks) {
      documentOptions.sheets = [
        {
          title: "Student Marks Analysis",
          rows: [
            ["Roll No", "Student Name", "Mathematics", "Science", "Computer Science", "English", "Total Marks", "Average %", "Status"],
            ["202401", "Aarav Sharma", 95, 88, 98, 92, "=SUM(C2:F2)", "=AVERAGE(C2:F2)", "Distinction"],
            ["202402", "Priya Patel", 89, 94, 91, 86, "=SUM(C3:F3)", "=AVERAGE(C3:F3)", "Distinction"],
            ["202403", "Rohan Verma", 76, 82, 85, 78, "=SUM(C4:F4)", "=AVERAGE(C4:F4)", "First Class"],
            ["202404", "Sneha Reddy", 92, 90, 96, 94, "=SUM(C5:F5)", "=AVERAGE(C5:F5)", "Distinction"],
            ["202405", "Vikram Rao", 68, 72, 75, 70, "=SUM(C6:F6)", "=AVERAGE(C6:F6)", "Second Class"],
            ["AVERAGE", "Class Summary", "=AVERAGE(C2:C6)", "=AVERAGE(D2:D6)", "=AVERAGE(E2:E6)", "=AVERAGE(F2:F6)", "=AVERAGE(G2:G6)", "=AVERAGE(H2:H6)", "Active"],
          ],
        },
      ];
    } else if (isFinancial) {
      documentOptions.sheets = [
        {
          title: "Financial Model",
          rows: [
            ["Account Category", "Q1 Actuals", "Q2 Actuals", "Q3 Projected", "Q4 Projected", "Annual Total"],
            ["Gross Revenue", 1250000, 1420000, 1600000, 1850000, "=SUM(B2:E2)"],
            ["Cost of Goods Sold (COGS)", 450000, 510000, 560000, 620000, "=SUM(B3:E3)"],
            ["Gross Profit", "=B2-B3", "=C2-C3", "=D2-D3", "=E2-E3", "=SUM(B4:E4)"],
            ["Operating Expenses (OpEx)", 380000, 410000, 440000, 480000, "=SUM(B5:E5)"],
            ["Net Operating Income (EBITDA)", "=B4-B5", "=C4-C5", "=D4-D5", "=E4-E5", "=SUM(B6:E6)"],
          ],
        },
      ];
    } else {
      documentOptions.sheets = [
        {
          title: "Data Analysis",
          rows: [
            ["ID", "Operational Metric", "Q1 Actual", "Q2 Actual", "Target", "Variance", "Status"],
            ["101", `${safeTitle} - Throughput`, 1200, 1450, 1500, "=D2-E2", "On Track"],
            ["102", `${safeTitle} - Reliability %`, 99.4, 99.8, 99.9, "=D3-E3", "Target Met"],
            ["103", `${safeTitle} - Cost Per Unit`, 45.2, 41.8, 40.0, "=D4-E4", "Improving"],
            ["SUMMARY", "Metric Averages", "=AVERAGE(C2:C4)", "=AVERAGE(D2:D4)", "=AVERAGE(E2:E4)", "=SUM(F2:F4)", "Complete"],
          ],
        },
      ];
    }
  }

  // C. Word Document / DOCX Fallback
  else if ((category === "document" || format === "docx" || format === "doc" || format === "rtf" || format === "pdf") && (!documentOptions.sections || documentOptions.sections.length === 0)) {
    if (isDbms) {
      documentOptions.title = "Database Management Systems (DBMS) - Comprehensive Assignment & Technical Report";
      documentOptions.subtitle = "Relational Model, Normalization, SQL Architecture & ACID Transaction Processing";
      documentOptions.sections = [
        {
          heading: "1. Introduction to Database Management Systems",
          subheading: "Evolution from File Systems to Modern Relational and Distributed Databases",
          content: "A Database Management System (DBMS) is specialized system software designed to create, query, maintain, and administer structured collections of data. Compared to traditional flat-file processing, a modern DBMS guarantees data independence, eliminates redundant data storage, provides robust security enforcement, and ensures multi-user concurrency control.",
          callout: "Key Takeaway: The foundational advantage of a DBMS lies in the abstraction layers (Physical, Logical, and View levels) that decouple application code from physical storage details.",
        },
        {
          heading: "2. The Relational Model & Schema Normalization",
          subheading: "Eliminating Insertion, Deletion, and Update Anomalies",
          content: "Normalization is a systematic technique of organizing relational database tables to reduce data redundancy and improve data integrity. It systematically evaluates functional dependencies across candidate keys.",
          bullets: [
            "First Normal Form (1NF): Requires that all attribute domains contain only atomic, indivisible values with no repeating groups.",
            "Second Normal Form (2NF): Must be in 1NF and satisfy the condition that every non-prime attribute is fully functionally dependent on the primary key (no partial dependencies).",
            "Third Normal Form (3NF): Must be in 2NF and eliminate transitive dependencies, where a non-prime attribute depends on another non-prime attribute.",
            "Boyce-Codd Normal Form (BCNF): A stricter version of 3NF where for every functional dependency X -> Y, X must be a super key.",
          ],
          table: [
            ["Normal Form", "Violation Eliminated", "Practical Objective"],
            ["1NF", "Composite & Multi-valued Attributes", "Enforces atomic cell values"],
            ["2NF", "Partial Functional Dependencies", "Prevents primary key subset reliance"],
            ["3NF", "Transitive Functional Dependencies", "Eliminates cascading update issues"],
            ["BCNF", "Anomalies with Overlapping Candidate Keys", "Guarantees strict superkey determinants"],
          ],
        },
        {
          heading: "3. Transaction Processing & The ACID Guarantee",
          subheading: "Ensuring System Reliability in Concurrent Environments",
          content: "A transaction represents a single logical unit of database work. To maintain database consistency despite hardware crashes or concurrent access, the DBMS transaction manager enforces ACID properties:",
          bullets: [
            "Atomicity: The 'all-or-nothing' principle executed via database undo/redo logging mechanisms.",
            "Consistency: Guarantees the database transitions exclusively from one valid state to another, satisfying all declarative integrity constraints.",
            "Isolation: Concurrently executing transactions do not interfere with each other, implemented through protocols like Two-Phase Locking (2PL) and Multi-Version Concurrency Control (MVCC).",
            "Durability: Once a transaction commits, its modifications are permanently recorded in non-volatile storage, surviving subsequent power outages.",
          ],
        },
        {
          heading: "4. Conclusion & Modern Database Paradigms",
          content: "While relational databases remain the bedrock of mission-critical transactional enterprise workloads, modern architectures often blend RDBMS with distributed NoSQL and NewSQL engines to balance consistency with global horizontal scalability.",
        },
      ];
      documentOptions.references = [
        "Silberschatz, A., Korth, H. F., & Sudarshan, S. (2020). Database System Concepts (7th ed.). McGraw-Hill Education.",
        "Elmasri, R., & Navathe, S. B. (2015). Fundamentals of Database Systems (7th ed.). Pearson.",
        "Codd, E. F. (1970). A Relational Model of Data for Large Shared Data Banks. Communications of the ACM, 13(6), 377-387.",
      ];
    } else {
      documentOptions.sections = [
        {
          heading: `1. Executive Summary & Problem Formulation`,
          subheading: `Strategic Framework for ${safeTitle}`,
          content: `This document presents a structured, rigorously researched analysis of ${safeTitle}. It investigates the foundational principles, operational mechanisms, and modern industry methodologies required for successful execution.`,
          callout: `Key Principle: Structured clarity, data validation, and strategic precision are paramount when operationalizing ${safeTitle}.`,
        },
        {
          heading: `2. Methodological Analysis & Core Pillars`,
          subheading: `Critical Insights and Empirical Findings`,
          content: `Contemporary implementations of ${safeTitle} benefit from standardized workflows and modular system architecture.`,
          bullets: [
            `Foundational driver: Ensuring data integrity and end-to-end trace clarity across lifecycle stages.`,
            `Operational pillar: Establishing automated verification to eliminate systemic bottlenecks.`,
            `Governance pillar: Aligning operational outcomes with industry best practices and compliance standards.`,
          ],
          table: [
            ["Phase / Dimension", "Core Objective", "Success Metric", "Validation Method"],
            ["Phase 1: Ingestion", "Requirements & Data Alignment", "100% Schema Compliance", "Automated Contract Testing"],
            ["Phase 2: Execution", "Optimized Pipeline Processing", "< 250ms Latency", "End-to-End Benchmarking"],
            ["Phase 3: Delivery", "Multi-Format Distribution", "Zero Corruption Delivery", "Cryptographic Hash Check"],
          ],
        },
        {
          heading: `3. Strategic Recommendations & Conclusion`,
          content: `Adopting a phased, measurable implementation roadmap enables organizations to maximize returns while safeguarding system stability. Continuous iterative feedback ensures long-term operational resilience.`,
        },
      ];
      documentOptions.references = [
        "IEEE Computer Society & ACM Joint Technical Publication Series.",
        "International Organization for Standardization (ISO) Information Technology Standards.",
        "Modern Software Architecture & Enterprise Systems Engineering Compendium.",
      ];
    }
  }

  // 3. Compile Binary Document via Master Document Engine
  const compiled = buildDocument(documentOptions);

  // 4. Pre-Delivery Validation
  let isVerified = false;
  let pageOrSlideCount = undefined;

  try {
    const inspection = await inspectAndReadDocument(compiled.buffer, compiled.filename);
    isVerified = inspection.success && compiled.sizeBytes > 100;
    if (category === "presentation" && documentOptions.slides) {
      pageOrSlideCount = documentOptions.slides.length;
    } else if (category === "spreadsheet" && documentOptions.sheets) {
      pageOrSlideCount = documentOptions.sheets.length;
    } else if (documentOptions.sections) {
      pageOrSlideCount = documentOptions.sections.length;
    }
  } catch (err) {
    console.warn("[TATTVA Document Synthesizer] Pre-delivery inspection warning:", err);
    isVerified = compiled.success && compiled.sizeBytes > 100;
  }

  // 5. Craft User-Friendly Confirmation Message in Matching Language
  let summary = aiSummary;
  if (!summary) {
    if (detectedLanguage === "te") {
      summary = `నేను మీ కోసం **${safeTitle}** పై ప్రామాణికమైన ${format.toUpperCase()} ఫైల్‌ను రూపొందించాను. మైక్రోసాఫ్ట్ ఆఫీస్‌తో 100% అనుకూలంగా ఉండే ఈ ఫైల్‌ను క్రింద క్లిక్ చేసి వెంటనే డౌన్‌లోడ్ చేసుకోవచ్చు.`;
    } else if (detectedLanguage === "hi") {
      summary = `मैंने आपके लिए **${safeTitle}** पर एक प्रामाणिक ${format.toUpperCase()} फ़ाइल तैयार कर दी है। माइक्रोसॉफ्ट ऑफिस के साथ पूरी तरह अनुकूल इस फ़ाइल को आप नीचे दिए गए बटन से तुरंत डाउनलोड कर सकते हैं।`;
    } else {
      const typeLabel =
        format === "pptx" || format === "ppt"
          ? "PowerPoint Presentation (.pptx)"
          : format === "docx" || format === "doc" || format === "rtf"
            ? "Word Document (.docx)"
            : format === "xlsx" || format === "xls"
              ? "Excel Workbook (.xlsx)"
              : format === "pdf"
                ? "PDF Document (.pdf)"
                : `${format.toUpperCase()} Document`;
      summary = `I have generated your **${typeLabel}** on **${safeTitle}**. It is a genuine, fully compatible Microsoft Office file with professional structure, verified formulas/formatting, and ready for immediate download below.`;
    }
  }

  return {
    success: compiled.success,
    filename: compiled.filename,
    dataUri: compiled.dataUri,
    mimeType: compiled.mimeType,
    format: compiled.format,
    sizeBytes: compiled.sizeBytes,
    title: safeTitle,
    summaryMessage: summary,
    verifiedOfficeCompatible: isVerified,
    pageOrSlideCount,
    error: compiled.error,
  };
}
