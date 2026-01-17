export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  strength: 'weak' | 'medium' | 'strong';
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumbers: boolean;
    hasSpecialChar: boolean;
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const requirements = {
    minLength: password.length >= 12,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password),
  };

  const complexityCount = [
    requirements.hasUpperCase,
    requirements.hasLowerCase,
    requirements.hasNumbers,
    requirements.hasSpecialChar,
  ].filter(Boolean).length;

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (requirements.minLength && complexityCount >= 4) {
    strength = 'strong';
  } else if (requirements.minLength && complexityCount >= 3) {
    strength = 'medium';
  } else if (password.length >= 8 && complexityCount >= 2) {
    strength = 'medium';
  }

  // Validation errors
  if (!requirements.minLength) {
    return {
      valid: false,
      error: "Le mot de passe doit contenir au moins 12 caractères.",
      strength,
      requirements,
    };
  }

  if (complexityCount < 3) {
    return {
      valid: false,
      error: "Le mot de passe doit contenir au moins 3 des éléments suivants: majuscules, minuscules, chiffres, caractères spéciaux (!@#$%^&*...).",
      strength,
      requirements,
    };
  }

  return { valid: true, strength, requirements };
}

export function getStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'strong':
      return 'bg-success';
    case 'medium':
      return 'bg-warning';
    default:
      return 'bg-destructive';
  }
}

export function getStrengthLabel(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'strong':
      return 'Fort';
    case 'medium':
      return 'Moyen';
    default:
      return 'Faible';
  }
}
