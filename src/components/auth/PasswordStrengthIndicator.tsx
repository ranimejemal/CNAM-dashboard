import { validatePassword, getStrengthColor, getStrengthLabel } from "@/lib/passwordValidation";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password);
  
  if (!password) return null;

  const RequirementItem = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="h-3 w-3 text-success" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={cn(met ? "text-success" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              getStrengthColor(validation.strength)
            )}
            style={{
              width: validation.strength === 'strong' ? '100%' : 
                     validation.strength === 'medium' ? '66%' : '33%'
            }}
          />
        </div>
        <span className={cn(
          "text-xs font-medium",
          validation.strength === 'strong' && "text-success",
          validation.strength === 'medium' && "text-warning",
          validation.strength === 'weak' && "text-destructive"
        )}>
          {getStrengthLabel(validation.strength)}
        </span>
      </div>

      {/* Requirements list */}
      <div className="grid grid-cols-2 gap-1">
        <RequirementItem 
          met={validation.requirements.minLength} 
          label="12+ caractères" 
        />
        <RequirementItem 
          met={validation.requirements.hasUpperCase} 
          label="Majuscule" 
        />
        <RequirementItem 
          met={validation.requirements.hasLowerCase} 
          label="Minuscule" 
        />
        <RequirementItem 
          met={validation.requirements.hasNumbers} 
          label="Chiffre" 
        />
        <RequirementItem 
          met={validation.requirements.hasSpecialChar} 
          label="Caractère spécial" 
        />
      </div>
    </div>
  );
}
