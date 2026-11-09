import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Workspace | TATTVA AI Integrated Productivity Suite",
  description:
    "Integrated productivity platform featuring Word, Excel, PowerPoint, Outlook, OneNote, Publisher, and Access with genuine Office Open XML file export.",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col font-sans">
      {children}
    </div>
  );
}

