import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a signed URL for accessing private documents.
 * This ensures documents are only accessible with a time-limited, authenticated URL.
 * @param filePath - The path to the file in the 'documents' bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if an error occurred
 */
export async function getSignedDocumentUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  // If the filePath is already a full URL, extract just the path
  const cleanPath = extractFilePathFromUrl(filePath);
  
  if (!cleanPath) {
    console.error("Invalid file path:", filePath);
    return null;
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(cleanPath, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Extracts the file path from a full Supabase storage URL.
 * Handles both new paths (just filename) and legacy full URLs.
 * @param urlOrPath - Either a full URL or just the file path
 * @returns The clean file path
 */
export function extractFilePathFromUrl(urlOrPath: string): string | null {
  if (!urlOrPath) return null;

  // If it's already just a path (e.g., "memberId/timestamp.ext")
  if (!urlOrPath.startsWith("http")) {
    return urlOrPath;
  }

  // Extract path from full Supabase URL
  // Format: https://[project].supabase.co/storage/v1/object/public/documents/[path]
  // or: https://[project].supabase.co/storage/v1/object/sign/documents/[path]
  const publicMatch = urlOrPath.match(/\/storage\/v1\/object\/public\/documents\/(.+)$/);
  if (publicMatch) {
    return decodeURIComponent(publicMatch[1].split("?")[0]);
  }

  const signedMatch = urlOrPath.match(/\/storage\/v1\/object\/sign\/documents\/(.+?)(\?|$)/);
  if (signedMatch) {
    return decodeURIComponent(signedMatch[1]);
  }

  // Fallback: try to get everything after /documents/
  const fallbackMatch = urlOrPath.match(/\/documents\/(.+?)(\?|$)/);
  if (fallbackMatch) {
    return decodeURIComponent(fallbackMatch[1]);
  }

  // Return as-is if no patterns matched (might already be a clean path)
  return urlOrPath;
}

/**
 * Downloads a document using a signed URL
 * @param filePath - The path to the file in the 'documents' bucket
 * @param fileName - The name to use when downloading
 */
export async function downloadDocument(
  filePath: string,
  fileName: string
): Promise<void> {
  const signedUrl = await getSignedDocumentUrl(filePath);
  
  if (!signedUrl) {
    throw new Error("Impossible de générer le lien de téléchargement");
  }

  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.href = signedUrl;
  link.download = fileName;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a document in a new tab using a signed URL
 * @param filePath - The path to the file in the 'documents' bucket
 */
export async function viewDocument(filePath: string): Promise<void> {
  const signedUrl = await getSignedDocumentUrl(filePath);
  
  if (!signedUrl) {
    throw new Error("Impossible de générer le lien de visualisation");
  }

  window.open(signedUrl, "_blank");
}
