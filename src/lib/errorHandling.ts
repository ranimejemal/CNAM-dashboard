/**
 * Error handling utilities to normalize error messages and prevent information leakage
 */

// Map of internal error patterns to user-friendly messages
const authErrorMappings: Record<string, string> = {
  "invalid_credentials": "Email ou mot de passe incorrect.",
  "invalid login credentials": "Email ou mot de passe incorrect.",
  "email not confirmed": "Email ou mot de passe incorrect.",
  "user not found": "Email ou mot de passe incorrect.",
  "invalid password": "Email ou mot de passe incorrect.",
  "too many requests": "Trop de tentatives. Veuillez réessayer plus tard.",
  "email already registered": "Une erreur s'est produite. Veuillez réessayer.",
  "user already registered": "Une erreur s'est produite. Veuillez réessayer.",
};

const uploadErrorMappings: Record<string, string> = {
  "storage/unauthorized": "Vous n'avez pas les permissions nécessaires.",
  "storage/quota-exceeded": "Espace de stockage insuffisant.",
  "storage/invalid-file-type": "Type de fichier non supporté.",
  "storage/file-too-large": "Le fichier est trop volumineux.",
  "row-level security": "Vous n'avez pas les permissions nécessaires.",
  "violates row-level security": "Vous n'avez pas les permissions nécessaires.",
};

const generalErrorMappings: Record<string, string> = {
  "network error": "Erreur de connexion. Vérifiez votre connexion internet.",
  "timeout": "La requête a expiré. Veuillez réessayer.",
  "row-level security": "Vous n'avez pas les permissions nécessaires.",
  "violates row-level security": "Vous n'avez pas les permissions nécessaires.",
  "jwt expired": "Votre session a expiré. Veuillez vous reconnecter.",
  "invalid jwt": "Session invalide. Veuillez vous reconnecter.",
};

/**
 * Normalizes authentication error messages to prevent account enumeration
 * and information leakage.
 */
export function normalizeAuthError(error: Error | { message: string } | string): string {
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  for (const [pattern, userMessage] of Object.entries(authErrorMappings)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return userMessage;
    }
  }

  // Default fallback - never expose raw error messages
  return "Email ou mot de passe incorrect.";
}

/**
 * Normalizes upload/storage error messages.
 */
export function normalizeUploadError(error: Error | { message: string } | string): string {
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  for (const [pattern, userMessage] of Object.entries(uploadErrorMappings)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return userMessage;
    }
  }

  // Default fallback
  return "Erreur lors du téléversement. Veuillez réessayer.";
}

/**
 * Normalizes general error messages.
 */
export function normalizeError(error: Error | { message: string } | string): string {
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  for (const [pattern, userMessage] of Object.entries(generalErrorMappings)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return userMessage;
    }
  }

  // Default fallback
  return "Une erreur s'est produite. Veuillez réessayer.";
}

/**
 * Normalizes user creation error messages.
 */
export function normalizeUserCreationError(error: Error | { message: string } | string): string {
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("already") || lowerMessage.includes("duplicate")) {
    return "Un utilisateur avec cet email existe déjà.";
  }

  if (lowerMessage.includes("password")) {
    return "Le mot de passe ne respecte pas les exigences de sécurité.";
  }

  if (lowerMessage.includes("email")) {
    return "L'adresse email n'est pas valide.";
  }

  for (const [pattern, userMessage] of Object.entries(generalErrorMappings)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return userMessage;
    }
  }

  // Default fallback
  return "Impossible de créer l'utilisateur. Veuillez réessayer.";
}
