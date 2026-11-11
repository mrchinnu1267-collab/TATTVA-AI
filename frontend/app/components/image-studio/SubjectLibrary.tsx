"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SubjectIdentityProfile,
  SubjectCategory,
  ReferenceViewType,
  SubjectGenerationResult,
  StorySequence,
} from "@/app/lib/image-engine/consistency/types";
import {
  User,
  Plus,
  Trash2,
  Edit3,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Camera,
  Layers,
  BookOpen,
  X,
  ChevronRight,
  Shield,
  RefreshCw,
  Eye,
} from "lucide-react";

interface SubjectLibraryProps {
  onSelectImageForStudio?: (imageUrl: string) => void;
}

export function SubjectLibrary({ onSelectImageForStudio }: SubjectLibraryProps) {
  const [profiles, setProfiles] = useState<SubjectIdentityProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeProfile, setActiveProfile] = useState<SubjectIdentityProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "create" | "generate" | "story">("library");

  // Create Form State
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<SubjectCategory>("fictional_character");
  const [formDescription, setFormDescription] = useState("");
  const [formSpecies, setFormSpecies] = useState("human");
  const [formHairColor, setFormHairColor] = useState("");
  const [formHairStyle, setFormHairStyle] = useState("");
  const [formEyeColor, setFormEyeColor] = useState("");
  const [formClothing, setFormClothing] = useState("");
  const [formAccessories, setFormAccessories] = useState("");
  const [formMarkings, setFormMarkings] = useState("");
  const [formArtisticStyle, setFormArtisticStyle] = useState("Digital illustration");
  const [formProhibited, setFormProhibited] = useState("");
  const [formConsent, setFormConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Single Generation State
  const [genPrompt, setGenPrompt] = useState("");
  const [genPose, setGenPose] = useState("");
  const [genExpression, setGenExpression] = useState("");
  const [genAngle, setGenAngle] = useState("");
  const [genClothing, setGenClothing] = useState("");
  const [genEnvironment, setGenEnvironment] = useState("");
  const [genLighting, setGenLighting] = useState("");
  const [genPreferredView, setGenPreferredView] = useState<ReferenceViewType>("primary");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<SubjectGenerationResult | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Story Mode State
  const [storyTitle, setStoryTitle] = useState("A Day in the Life");
  const [storyScenes, setStoryScenes] = useState<Array<{ title: string; prompt: string; action: string }>>([
    { title: "Scene 1: Introduction", prompt: "Walking through a busy city street in morning light", action: "walking forward confidently" },
    { title: "Scene 2: The Discovery", prompt: "Examining an intriguing glowing relic inside an old library", action: "crouching low inspecting relic" },
    { title: "Scene 3: The Challenge", prompt: "Running dynamically escaping mysterious cloaked figures in rain", action: "sprinting across wet pavement" },
    { title: "Scene 4: Resolution", prompt: "Resting safely on a balcony overlooking the sunset city skyline", action: "leaning back leaning on railing" },
  ]);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [activeStory, setActiveStory] = useState<StorySequence | null>(null);

  // Reference Upload State
  const [uploadViewType, setUploadViewType] = useState<ReferenceViewType>("front");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isPrimaryUpload, setIsPrimaryUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subject");
      const data = await res.json();
      if (data.profiles) {
        setProfiles(data.profiles);
        if (!activeProfile && data.profiles.length > 0) {
          setActiveProfile(data.profiles[0]);
        }
      }
    } catch {
      // Quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formCategory === "real_person" && !formConsent) {
      setFormError("Consent is strictly required for real-person reference processing.");
      return;
    }

    try {
      const res = await fetch("/api/subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory,
          description: formDescription.trim(),
          physical: {
            speciesOrType: formSpecies.trim(),
            hairColor: formHairColor.trim() || undefined,
            hairStyle: formHairStyle.trim() || undefined,
            primaryClothing: formClothing.trim() || undefined,
            colorScheme: ["#2B2D42", "#8D99AE", "#EDF2F4"],
            signatureAccessories: formAccessories
              ? formAccessories.split(",").map((s) => s.trim()).filter(Boolean)
              : [],
            distinguishingMarkings: formMarkings
              ? formMarkings.split(",").map((s) => s.trim()).filter(Boolean)
              : [],
          },
          facial: {
            eyeColor: formEyeColor.trim() || undefined,
          },
          style: {
            artisticStyle: formArtisticStyle.trim(),
          },
          prohibitedChanges: formProhibited
            ? formProhibited.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          userConsentProvided: formConsent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create subject");

      await fetchProfiles();
      setActiveProfile(data.profile);
      setActiveTab("library");

      // Reset form
      setFormName("");
      setFormDescription("");
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProfile) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUri = evt.target?.result as string;
      if (!dataUri) return;

      try {
        const res = await fetch("/api/subject/references", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: activeProfile.id,
            imageUrl: dataUri,
            viewType: uploadViewType,
            description: uploadDescription.trim(),
            isPrimary: isPrimaryUpload,
          }),
        });
        const data = await res.json();
        if (data.reference) {
          await fetchProfiles();
          const updated = profiles.find((p) => p.id === activeProfile.id);
          if (updated) setActiveProfile(updated);
        }
      } catch (err) {
        console.error("Reference upload failed:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject profile?")) return;
    try {
      await fetch(`/api/subject?id=${id}`, { method: "DELETE" });
      await fetchProfiles();
      if (activeProfile?.id === id) {
        setActiveProfile(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleGenerate = async () => {
    if (!activeProfile) return;
    setGenerating(true);
    setGenError(null);
    setGenResult(null);

    try {
      const res = await fetch("/api/subject/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: activeProfile.id,
          prompt: genPrompt || `Portrait of ${activeProfile.name}`,
          variation: {
            pose: genPose.trim() || undefined,
            expression: genExpression.trim() || undefined,
            cameraAngle: genAngle.trim() || undefined,
            clothing: genClothing.trim() || undefined,
            environment: genEnvironment.trim() || undefined,
            lighting: genLighting.trim() || undefined,
          },
          preferredViewType: genPreferredView,
          autoCorrectOnFailure: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGenResult(data.result);
    } catch (err: any) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateStory = async () => {
    if (!activeProfile) return;
    setGeneratingStory(true);
    setActiveStory(null);

    try {
      const res = await fetch("/api/subject/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: activeProfile.id,
          storyTitle,
          scenes: storyScenes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Story generation failed");
      setActiveStory(data.story);
    } catch (err: any) {
      alert(`Story generation error: ${err.message}`);
    } finally {
      setGeneratingStory(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[640px] text-zinc-200">
      {/* Top Header Bar */}
      <div className="border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-lg">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Subject Library & Consistency</h2>
            <p className="text-xs text-zinc-400">Phase I: Identity preservation, multi-angle views & visual storyboards</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === "library" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
              activeTab === "create" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Subject</span>
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            disabled={!activeProfile}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
              activeTab === "generate" ? "bg-white text-black" : "text-zinc-400 hover:text-white disabled:opacity-40"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate</span>
          </button>
          <button
            onClick={() => setActiveTab("story")}
            disabled={!activeProfile}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
              activeTab === "story" ? "bg-white text-black" : "text-zinc-400 hover:text-white disabled:opacity-40"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Multi-Scene Story</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        {/* Left Column: Subject Profiles List (if tab is library, generate, or story) */}
        {activeTab !== "create" && (
          <div className="w-full lg:w-72 p-4 bg-zinc-950/80 flex flex-col space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Your Subjects</span>
              <span className="text-xs text-zinc-500 font-mono">{profiles.length} total</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-zinc-500 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading profiles...
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-white/10 rounded-xl">
                <p className="text-xs text-zinc-400 mb-3">No subject profiles yet.</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-3 py-1.5 bg-white text-black rounded-lg text-xs font-semibold hover:bg-zinc-200"
                >
                  Create First Subject
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[520px]">
                {profiles.map((p) => {
                  const isSelected = activeProfile?.id === p.id;
                  const primaryRef = p.referenceImages.find((r) => r.isPrimary) || p.referenceImages[0];

                  return (
                    <div
                      key={p.id}
                      onClick={() => setActiveProfile(p)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-zinc-800/80 border-white/30 shadow-md"
                          : "bg-zinc-900/40 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                          {primaryRef ? (
                            <img src={primaryRef.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-semibold text-white truncate">{p.name}</h4>
                          <p className="text-xs text-zinc-400 capitalize truncate">
                            {p.category.replace(/_/g, " ")} • {p.referenceImages.length} refs
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubject(p.id);
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded-md transition"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Right Column: View Dependent */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[700px]">
          {/* TAB 1: LIBRARY DETAILS */}
          {activeTab === "library" && (
            <div>
              {activeProfile ? (
                <div className="space-y-6">
                  {/* Subject Hero Card */}
                  <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-2xl font-bold text-white">{activeProfile.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-zinc-300 capitalize border border-white/10">
                          {activeProfile.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 max-w-xl">
                        {activeProfile.description || "Consistent character profile for high-fidelity multi-image generations."}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setActiveTab("generate")}
                        className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-xl hover:bg-zinc-200 transition flex items-center space-x-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Generate with Subject</span>
                      </button>
                    </div>
                  </div>

                  {/* Physical & Style Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl space-y-2">
                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Physical Identity</h4>
                      <div className="text-xs space-y-1.5 text-zinc-400">
                        <div><strong className="text-zinc-200">Species/Form:</strong> {activeProfile.physical.speciesOrType}</div>
                        {activeProfile.physical.hairColor && (
                          <div><strong className="text-zinc-200">Hair:</strong> {activeProfile.physical.hairColor} ({activeProfile.physical.hairStyle || "default"})</div>
                        )}
                        {activeProfile.facial?.eyeColor && (
                          <div><strong className="text-zinc-200">Eyes:</strong> {activeProfile.facial.eyeColor}</div>
                        )}
                        {activeProfile.physical.primaryClothing && (
                          <div><strong className="text-zinc-200">Canonical Clothing:</strong> {activeProfile.physical.primaryClothing}</div>
                        )}
                        {activeProfile.physical.signatureAccessories.length > 0 && (
                          <div><strong className="text-zinc-200">Accessories:</strong> {activeProfile.physical.signatureAccessories.join(", ")}</div>
                        )}
                        {activeProfile.physical.distinguishingMarkings.length > 0 && (
                          <div><strong className="text-zinc-200">Markings:</strong> {activeProfile.physical.distinguishingMarkings.join(", ")}</div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl space-y-2">
                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Style & Integrity Rules</h4>
                      <div className="text-xs space-y-1.5 text-zinc-400">
                        <div><strong className="text-zinc-200">Artistic Style:</strong> {activeProfile.style.artisticStyle}</div>
                        {activeProfile.prohibitedChanges.length > 0 && (
                          <div><strong className="text-zinc-200">Prohibited Drift:</strong> {activeProfile.prohibitedChanges.join("; ")}</div>
                        )}
                        {activeProfile.category === "real_person" && (
                          <div className="flex items-center space-x-1.5 text-emerald-400 mt-2">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Verified Authorization & Consent Attached</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Angle Reference Images Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-white" />
                        <h4 className="text-sm font-bold text-white">Reference Images ({activeProfile.referenceImages.length})</h4>
                      </div>

                      <div className="flex items-center space-x-2">
                        <select
                          value={uploadViewType}
                          onChange={(e) => setUploadViewType(e.target.value as ReferenceViewType)}
                          className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-300"
                        >
                          <option value="front">Front View</option>
                          <option value="side">Side View</option>
                          <option value="three_quarter">3/4 View</option>
                          <option value="back">Back View</option>
                          <option value="close_up">Close-Up</option>
                          <option value="action">Action View</option>
                          <option value="alternate">Alternate</option>
                        </select>

                        <label className="flex items-center space-x-1 text-xs text-zinc-400">
                          <input
                            type="checkbox"
                            checked={isPrimaryUpload}
                            onChange={(e) => setIsPrimaryUpload(e.target.checked)}
                            className="rounded bg-zinc-900 border-white/20"
                          />
                          <span>Primary</span>
                        </label>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1 border border-white/10"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Photo</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleReferenceUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {activeProfile.referenceImages.length === 0 ? (
                      <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center">
                        <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-xs text-zinc-400">No multi-angle references uploaded for this subject yet.</p>
                        <p className="text-[11px] text-zinc-500 mt-1">Upload front, side, and 3/4 views for higher 3D identity consistency.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {activeProfile.referenceImages.map((ref) => (
                          <div
                            key={ref.id}
                            className="relative group rounded-xl overflow-hidden border border-white/10 bg-zinc-900/40 aspect-square"
                          >
                            <img src={ref.imageUrl} alt={ref.viewType} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase bg-white/20 px-1.5 py-0.5 rounded text-white backdrop-blur-sm">
                                  {ref.viewType}
                                </span>
                                {ref.isPrimary && (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                                    Primary
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <User className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">Select or create a subject profile to view identity specs.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE SUBJECT */}
          {activeTab === "create" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-white">Create Structured Subject Profile</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Define permanent character/product attributes that the AI consistency engine will preserve across variations.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Subject Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Captain Lyra Vance"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Subject Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as SubjectCategory)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                    >
                      <option value="fictional_character">Fictional Character</option>
                      <option value="original_ai_character">Original AI Character</option>
                      <option value="user_character_design">User Character Design</option>
                      <option value="product">Product</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="object">Object / Prop</option>
                      <option value="brand_mascot">Brand Mascot</option>
                      <option value="custom_illustration">Custom Illustration</option>
                      <option value="real_person">Real Person (Requires Consent)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Bio / Overview</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Short description of the character or product's role and identity..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Physical Specifications */}
                <div className="p-4 bg-zinc-900/40 border border-white/10 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Physical Identity Features</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Species / Form *</label>
                      <input
                        type="text"
                        required
                        value={formSpecies}
                        onChange={(e) => setFormSpecies(e.target.value)}
                        placeholder="human, robot, cat..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Hair Color & Style</label>
                      <input
                        type="text"
                        value={formHairColor}
                        onChange={(e) => setFormHairColor(e.target.value)}
                        placeholder="auburn, braided..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Eye Color</label>
                      <input
                        type="text"
                        value={formEyeColor}
                        onChange={(e) => setFormEyeColor(e.target.value)}
                        placeholder="amber, neon blue..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Canonical Attire / Surface Material</label>
                      <input
                        type="text"
                        value={formClothing}
                        onChange={(e) => setFormClothing(e.target.value)}
                        placeholder="navy flight suit, matte carbon fiber..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Signature Accessories (comma-separated)</label>
                      <input
                        type="text"
                        value={formAccessories}
                        onChange={(e) => setFormAccessories(e.target.value)}
                        placeholder="brass goggles, silver pendant..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Style & Prohibited */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Artistic Style</label>
                    <input
                      type="text"
                      value={formArtisticStyle}
                      onChange={(e) => setFormArtisticStyle(e.target.value)}
                      placeholder="e.g. Studio Ghibli, 3D Pixar, Cinematic..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Prohibited Drift (comma-separated)</label>
                    <input
                      type="text"
                      value={formProhibited}
                      onChange={(e) => setFormProhibited(e.target.value)}
                      placeholder="do not change eye color, no extra limbs..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Real-Person Consent Verification Checkbox */}
                {formCategory === "real_person" && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start space-x-2 text-xs text-amber-200">
                    <input
                      type="checkbox"
                      id="consentCheck"
                      checked={formConsent}
                      onChange={(e) => setFormConsent(e.target.checked)}
                      className="mt-0.5 rounded bg-zinc-900 border-amber-500/50"
                    />
                    <label htmlFor="consentCheck">
                      I certify that I possess explicit authorization and verified consent from this individual to process their reference likeness for AI generation.
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("library")}
                    className="px-4 py-2 border border-white/10 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-white text-black font-semibold text-xs rounded-xl hover:bg-zinc-200 transition"
                  >
                    Save Subject Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: GENERATE WITH SUBJECT */}
          {activeTab === "generate" && activeProfile && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generation Controls */}
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/40 border border-white/10 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-xs">
                      {activeProfile.name[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{activeProfile.name}</h4>
                      <p className="text-xs text-zinc-400 capitalize">{activeProfile.category.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                    Identity Locked
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Scene Description / Action *</label>
                  <textarea
                    rows={3}
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder={`e.g. ${activeProfile.name} reading an ancient scroll in a moonlit observatory...`}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Variations Accordion */}
                <div className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl space-y-3">
                  <h5 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Requested Variations</h5>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Pose</label>
                      <input
                        type="text"
                        value={genPose}
                        onChange={(e) => setGenPose(e.target.value)}
                        placeholder="sitting, running, drawing sword..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Expression</label>
                      <input
                        type="text"
                        value={genExpression}
                        onChange={(e) => setGenExpression(e.target.value)}
                        placeholder="smiling warmly, focused, surprised..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Camera Angle</label>
                      <input
                        type="text"
                        value={genAngle}
                        onChange={(e) => setGenAngle(e.target.value)}
                        placeholder="low angle, close-up, 3/4 view..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Clothing Override</label>
                      <input
                        type="text"
                        value={genClothing}
                        onChange={(e) => setGenClothing(e.target.value)}
                        placeholder="black tuxedo, winter parka..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Lighting</label>
                      <input
                        type="text"
                        value={genLighting}
                        onChange={(e) => setGenLighting(e.target.value)}
                        placeholder="golden hour, neon rim light..."
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Target Reference View</label>
                      <select
                        value={genPreferredView}
                        onChange={(e) => setGenPreferredView(e.target.value as ReferenceViewType)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="primary">Primary View</option>
                        <option value="front">Front</option>
                        <option value="side">Side</option>
                        <option value="three_quarter">3/4 View</option>
                        <option value="close_up">Close-Up</option>
                        <option value="back">Back</option>
                      </select>
                    </div>
                  </div>
                </div>

                {genError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{genError}</span>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Consistent Subject...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Consistent Image</span>
                    </>
                  )}
                </button>
              </div>

              {/* Output & Consistency Scorecard */}
              <div className="flex flex-col space-y-4">
                {genResult ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 aspect-square relative group">
                      <img src={genResult.image} alt="Generated Consistent Subject" className="w-full h-full object-cover" />
                      {onSelectImageForStudio && (
                        <button
                          onClick={() => onSelectImageForStudio(genResult.image)}
                          className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/80 hover:bg-black text-white text-xs font-semibold rounded-lg border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition"
                        >
                          Send to Image Studio
                        </button>
                      )}
                    </div>

                    {/* Consistency Scorecard */}
                    <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">Consistency Scorecard</h5>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-zinc-400">Overall:</span>
                          <span className="text-sm font-bold text-white font-mono">
                            {(genResult.consistency.overallScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-zinc-400">
                        <div>Visual Match: <strong className="text-white font-mono">{(genResult.consistency.visualSimilarity * 100).toFixed(0)}%</strong></div>
                        <div>Shape & Body: <strong className="text-white font-mono">{(genResult.consistency.shapeConsistency * 100).toFixed(0)}%</strong></div>
                        <div>Palette & Color: <strong className="text-white font-mono">{(genResult.consistency.colorConsistency * 100).toFixed(0)}%</strong></div>
                        <div>Attire Fidelity: <strong className="text-white font-mono">{(genResult.consistency.clothingConsistency * 100).toFixed(0)}%</strong></div>
                        <div>Accessories: <strong className="text-white font-mono">{(genResult.consistency.accessoryConsistency * 100).toFixed(0)}%</strong></div>
                        <div>Signatures: <strong className="text-white font-mono">{(genResult.consistency.distinguishingFeaturePreservation * 100).toFixed(0)}%</strong></div>
                      </div>

                      {genResult.corrected && (
                        <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
                          Targeted self-correction triggered automatically (1 refinement cycle). Identity verified.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[360px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
                    <Sparkles className="w-10 h-10 text-zinc-600 mb-3" />
                    <h5 className="text-sm font-semibold text-zinc-300">Awaiting Generation</h5>
                    <p className="text-xs text-zinc-500 max-w-xs mt-1">
                      Configure your scene prompt and variations on the left to generate an image preserving {activeProfile.name}&apos;s identity.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-SCENE STORY MODE */}
          {activeTab === "story" && activeProfile && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Multi-Scene Sequential Storyboard</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Generate cohesive multi-scene story sequences featuring {activeProfile.name} across progressive environments and narrative arcs.
                  </p>
                </div>
                <button
                  onClick={handleGenerateStory}
                  disabled={generatingStory}
                  className="px-5 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition disabled:opacity-50 flex items-center space-x-2 shadow-lg"
                >
                  {generatingStory ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Storybook...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      <span>Generate Story ({storyScenes.length} Scenes)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Story Scenes Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Story Narrative Arc</h4>
                  <button
                    onClick={() =>
                      setStoryScenes([
                        ...storyScenes,
                        {
                          title: `Scene ${storyScenes.length + 1}`,
                          prompt: "Continuing the adventure...",
                          action: "standing thoughtfully",
                        },
                      ])
                    }
                    className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Scene</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {storyScenes.map((scene, idx) => (
                    <div key={idx} className="p-4 bg-zinc-900/40 border border-white/10 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={scene.title}
                          onChange={(e) => {
                            const copy = [...storyScenes];
                            copy[idx].title = e.target.value;
                            setStoryScenes(copy);
                          }}
                          className="bg-transparent font-bold text-xs text-white focus:outline-none"
                        />
                        {storyScenes.length > 2 && (
                          <button
                            onClick={() => setStoryScenes(storyScenes.filter((_, i) => i !== idx))}
                            className="text-zinc-600 hover:text-red-400 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={scene.prompt}
                        onChange={(e) => {
                          const copy = [...storyScenes];
                          copy[idx].prompt = e.target.value;
                          setStoryScenes(copy);
                        }}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
                        placeholder="Scene prompt..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Story Display */}
              {activeStory && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{activeStory.title}</h4>
                    <span className="text-xs text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                      Overall Story Consistency: {((activeStory.overallConsistencyScore || 0.85) * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {activeStory.scenes.map((sc) => (
                      <div
                        key={sc.sceneNumber}
                        className="rounded-xl overflow-hidden border border-white/10 bg-zinc-900 flex flex-col"
                      >
                        <div className="aspect-square bg-zinc-950 relative">
                          {sc.generatedImage ? (
                            <img src={sc.generatedImage} alt={sc.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                              {sc.status}
                            </div>
                          )}
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm">
                            Scene {sc.sceneNumber}
                          </span>
                        </div>
                        <div className="p-3 space-y-1">
                          <h6 className="text-xs font-semibold text-white truncate">{sc.title}</h6>
                          <p className="text-[11px] text-zinc-400 line-clamp-2">{sc.prompt}</p>
                          {sc.consistencyScore && (
                            <span className="text-[10px] font-mono text-zinc-500 block">
                              Match: {(sc.consistencyScore.overallScore * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
