/**
 * TATTVA AI - Subject Profile & Reference Store (Phase I)
 * Manages subject profiles, multi-angle reference images, and story sequences
 * with multi-tenant workspace isolation, consent enforcement, and local/Supabase storage.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  SubjectIdentityProfile,
  SubjectReferenceImage,
  StorySequence,
  ReferenceViewType,
  SubjectCategory,
} from "./types";

const VAULT_ROOT = path.join(process.cwd(), "public", "vault", "subjects");
const PROFILES_FILE = path.join(VAULT_ROOT, "profiles.json");
const STORIES_FILE = path.join(VAULT_ROOT, "stories.json");

// Ensure vault directory exists
function ensureDirectories() {
  try {
    if (!fs.existsSync(VAULT_ROOT)) {
      fs.mkdirSync(VAULT_ROOT, { recursive: true });
    }
    if (!fs.existsSync(PROFILES_FILE)) {
      fs.writeFileSync(PROFILES_FILE, JSON.stringify([]), "utf-8");
    }
    if (!fs.existsSync(STORIES_FILE)) {
      fs.writeFileSync(STORIES_FILE, JSON.stringify([]), "utf-8");
    }
  } catch (err) {
    // Non-blocking in read-only / restricted environments
  }
}

// In-memory fallback cache
let memoryProfiles: SubjectIdentityProfile[] = [];
let memoryStories: StorySequence[] = [];

function loadProfiles(): SubjectIdentityProfile[] {
  ensureDirectories();
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const data = fs.readFileSync(PROFILES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryProfiles = parsed;
        return memoryProfiles;
      }
    }
  } catch {
    // Fallback to memory
  }
  return memoryProfiles;
}

function persistProfiles(profiles: SubjectIdentityProfile[]) {
  memoryProfiles = profiles;
  ensureDirectories();
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), "utf-8");
  } catch {
    // Graceful fallback in memory
  }
}

function loadStories(): StorySequence[] {
  ensureDirectories();
  try {
    if (fs.existsSync(STORIES_FILE)) {
      const data = fs.readFileSync(STORIES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryStories = parsed;
        return memoryStories;
      }
    }
  } catch {
    // Fallback to memory
  }
  return memoryStories;
}

function persistStories(stories: StorySequence[]) {
  memoryStories = stories;
  ensureDirectories();
  try {
    fs.writeFileSync(STORIES_FILE, JSON.stringify(stories, null, 2), "utf-8");
  } catch {
    // Graceful fallback in memory
  }
}

/**
 * Creates a new subject profile with strict authorization and consent checks.
 */
export function createSubjectProfile(
  profileData: Omit<SubjectIdentityProfile, "id" | "version" | "createdAt" | "updatedAt">
): SubjectIdentityProfile {
  // Real-Person Consent Guardrail
  if (profileData.category === "real_person" && !profileData.userConsentProvided) {
    throw new Error(
      "Authorization Required: Processing real-person reference images strictly requires verified user consent and authorization."
    );
  }

  const profiles = loadProfiles();
  const id = `subj_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();

  const newProfile: SubjectIdentityProfile = {
    ...profileData,
    id,
    version: 1,
    referenceImages: profileData.referenceImages || [],
    importantDetails: profileData.importantDetails || [],
    prohibitedChanges: profileData.prohibitedChanges || [],
    createdAt: now,
    updatedAt: now,
  };

  profiles.unshift(newProfile);
  persistProfiles(profiles);
  return newProfile;
}

/**
 * Lists subject profiles for a specific tenant workspace.
 */
export function listSubjectProfiles(
  workspaceId: string = "default",
  userId?: string
): SubjectIdentityProfile[] {
  const profiles = loadProfiles();
  return profiles.filter((p) => {
    if (p.workspaceId !== workspaceId) return false;
    if (userId && p.userId !== userId) return false;
    return true;
  });
}

/**
 * Retrieves a subject profile by ID with workspace isolation check.
 */
export function getSubjectProfileById(
  id: string,
  workspaceId: string = "default"
): SubjectIdentityProfile | null {
  const profiles = loadProfiles();
  const profile = profiles.find((p) => p.id === id);
  if (!profile) return null;
  if (profile.workspaceId !== workspaceId && workspaceId !== "admin") {
    throw new Error("Access Denied: Subject profile does not belong to this workspace.");
  }
  return profile;
}

/**
 * Updates a subject profile.
 */
export function updateSubjectProfile(
  id: string,
  updates: Partial<SubjectIdentityProfile>,
  workspaceId: string = "default"
): SubjectIdentityProfile {
  const profiles = loadProfiles();
  const index = profiles.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error(`Subject profile not found: ${id}`);
  }

  const current = profiles[index];
  if (current.workspaceId !== workspaceId && workspaceId !== "admin") {
    throw new Error("Access Denied: Subject profile does not belong to this workspace.");
  }

  if (updates.category === "real_person" && !updates.userConsentProvided && !current.userConsentProvided) {
    throw new Error("Authorization Required: Real-person processing requires verified user consent.");
  }

  const updated: SubjectIdentityProfile = {
    ...current,
    ...updates,
    id: current.id,
    workspaceId: current.workspaceId,
    userId: current.userId,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };

  profiles[index] = updated;
  persistProfiles(profiles);
  return updated;
}

/**
 * Deletes a subject profile and all associated reference records.
 */
export function deleteSubjectProfile(id: string, workspaceId: string = "default"): boolean {
  const profiles = loadProfiles();
  const index = profiles.findIndex((p) => p.id === id);
  if (index === -1) return false;

  const current = profiles[index];
  if (current.workspaceId !== workspaceId && workspaceId !== "admin") {
    throw new Error("Access Denied: Subject profile does not belong to this workspace.");
  }

  profiles.splice(index, 1);
  persistProfiles(profiles);

  // Also purge associated stories
  const stories = loadStories().filter((s) => s.subjectId !== id);
  persistStories(stories);

  return true;
}

/**
 * Adds a reference image to a subject profile with view classification.
 */
export function addSubjectReference(
  subjectId: string,
  reference: {
    imageUrl: string;
    viewType?: ReferenceViewType;
    description?: string;
    isPrimary?: boolean;
    colorPalette?: string[];
  },
  workspaceId: string = "default"
): SubjectReferenceImage {
  const profile = getSubjectProfileById(subjectId, workspaceId);
  if (!profile) {
    throw new Error(`Subject profile not found: ${subjectId}`);
  }

  const refId = `ref_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const isPrimary = reference.isPrimary ?? profile.referenceImages.length === 0;

  // If this reference is marked primary, demote existing primary references
  const existingRefs = profile.referenceImages.map((r) =>
    isPrimary ? { ...r, isPrimary: false } : r
  );

  const newRef: SubjectReferenceImage = {
    id: refId,
    subjectId,
    imageUrl: reference.imageUrl,
    viewType: reference.viewType || (isPrimary ? "primary" : "alternate"),
    isPrimary,
    description: reference.description,
    colorPalette: reference.colorPalette || profile.physical.colorScheme,
    uploadedAt: new Date().toISOString(),
  };

  existingRefs.push(newRef);

  updateSubjectProfile(
    subjectId,
    {
      referenceImages: existingRefs,
      primaryReferenceId: isPrimary ? refId : profile.primaryReferenceId,
    },
    workspaceId
  );

  return newRef;
}

/**
 * Removes a reference image from a subject profile.
 */
export function removeSubjectReference(
  subjectId: string,
  referenceId: string,
  workspaceId: string = "default"
): boolean {
  const profile = getSubjectProfileById(subjectId, workspaceId);
  if (!profile) return false;

  const filtered = profile.referenceImages.filter((r) => r.id !== referenceId);
  if (filtered.length === profile.referenceImages.length) return false;

  let newPrimaryId = profile.primaryReferenceId;
  if (profile.primaryReferenceId === referenceId) {
    if (filtered.length > 0) {
      filtered[0].isPrimary = true;
      newPrimaryId = filtered[0].id;
    } else {
      newPrimaryId = undefined;
    }
  }

  updateSubjectProfile(
    subjectId,
    {
      referenceImages: filtered,
      primaryReferenceId: newPrimaryId,
    },
    workspaceId
  );

  return true;
}

/**
 * Creates or updates a multi-scene story sequence.
 */
export function saveStorySequence(story: StorySequence): StorySequence {
  const stories = loadStories();
  const index = stories.findIndex((s) => s.id === story.id);
  const now = new Date().toISOString();

  if (index >= 0) {
    stories[index] = { ...story, updatedAt: now };
  } else {
    stories.unshift({ ...story, createdAt: now, updatedAt: now });
  }

  persistStories(stories);
  return story;
}

/**
 * Retrieves story sequences for a subject.
 */
export function listStoriesForSubject(
  subjectId: string,
  workspaceId: string = "default"
): StorySequence[] {
  const stories = loadStories();
  return stories.filter((s) => s.subjectId === subjectId && s.workspaceId === workspaceId);
}
