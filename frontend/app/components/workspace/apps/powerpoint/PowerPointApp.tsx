"use client";

import React from "react";
import { PresentationStudio } from "../../../presentation-studio/PresentationStudio";
import { WorkspaceItem, PresentationContent } from "../../types";
import { saveWorkspaceItem } from "../../storage";

interface PowerPointAppProps {
  item?: WorkspaceItem<PresentationContent>;
  onSave?: (item: WorkspaceItem<PresentationContent>) => void;
  onBack?: () => void;
}

export function PowerPointApp({ item, onSave, onBack }: PowerPointAppProps) {
  const initialTitle = item?.name || "TATTVA Presentation.pptx";
  const initialTheme = item?.content?.themeId || "dark_modern";
  const initialSlides = item?.content?.slides || [
    {
      number: 1,
      title: initialTitle,
      category: "EXECUTIVE BRIEF",
      bullets: [
        "Executive presentation authored with TATTVA Presentation Studio.",
        "Verified OpenXML standard compliant PowerPoint slide deck.",
        "Interactive editable elements, rich speaker notes, and dynamic themes.",
      ],
      takeaway: `Core architectural summary and foundational overview.`,
      notes: "Speaker Notes: Welcome the audience and outline the key objectives.",
    },
    {
      number: 2,
      title: "Core Cognitive Architecture",
      category: "ARCHITECTURE",
      bullets: [
        "Foundation models serve as central natural language processing engines.",
        "Hierarchical planners break macro objectives into sequential sub-tasks.",
        "Memory modules retain context across long multi-turn interactions.",
      ],
      takeaway: "Modularity ensures scalability, safety, and verifiable domain execution.",
      notes: "Speaker Notes: Explain how planning and memory interact in real time.",
    },
  ];

  return (
    <div className="relative w-full h-full">
      <PresentationStudio
        initialTitle={initialTitle}
        initialThemeId={initialTheme}
        initialSlides={initialSlides}
        onClose={onBack}
        vaultFileId={item?.id}
      />
    </div>
  );
}

