import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  regex: RegExp;
  minLength?: number;
  maxLength?: number;
}

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

const requirements: PasswordRequirement[] = [
  { label: "8-15 characters", regex: /.{8,15}$/, minLength: 8, maxLength: 15 },
  { label: "One capital letter", regex: /[A-Z]/ },
  { label: "One number", regex: /[0-9]/ },
  { label: "One special character", regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

export function PasswordRequirements({ password, className }: PasswordRequirementsProps) {
  const checkRequirement = (req: PasswordRequirement): boolean => {
    if (req.minLength && req.maxLength) {
      return password.length >= req.minLength && password.length <= req.maxLength;
    }
    return req.regex.test(password);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">Password must contain:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => {
          const isMet = checkRequirement(req);
          return (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                isMet ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
              )}
            >
              {isMet ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{req.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
