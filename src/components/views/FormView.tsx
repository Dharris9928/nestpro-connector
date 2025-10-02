import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

interface FormViewProps {
  formTitle: string;
  formDescription?: string;
  fields: FormField[];
  onSubmit: (data: any) => Promise<void>;
  successMessage?: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  maxLength?: number;
}

export function FormView({ 
  formTitle, 
  formDescription,
  fields, 
  onSubmit,
  successMessage = 'Form submitted successfully!'
}: FormViewProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    // Client-side validation
    for (const field of fields) {
      if (field.required && !formData[field.name]) {
        toast({
          title: 'Validation Error',
          description: `${field.label} is required`,
          variant: 'destructive'
        });
        return false;
      }

      // Email validation
      if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name])) {
          toast({
            title: 'Validation Error',
            description: `Invalid email format for ${field.label}`,
            variant: 'destructive'
          });
          return false;
        }
      }

      // Length validation
      if (field.maxLength && formData[field.name]?.length > field.maxLength) {
        toast({
          title: 'Validation Error',
          description: `${field.label} must be less than ${field.maxLength} characters`,
          variant: 'destructive'
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Sanitize data before submission
      const sanitizedData = Object.entries(formData).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? value.trim() : value;
        return acc;
      }, {} as Record<string, any>);

      await onSubmit(sanitizedData);
      setSubmitted(true);
      setFormData({});
      toast({
        title: 'Success',
        description: successMessage
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit form',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-[hsl(var(--status-active))] mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
            <p className="text-muted-foreground mb-6">{successMessage}</p>
            <Button onClick={() => setSubmitted(false)}>
              Submit Another Response
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          {formDescription && (
            <CardDescription>{formDescription}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    maxLength={field.maxLength}
                    className="mt-2"
                    rows={4}
                  />
                ) : field.type === 'select' ? (
                  <Select
                    value={formData[field.name] || ''}
                    onValueChange={(value) => handleChange(field.name, value)}
                    required={field.required}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    maxLength={field.maxLength}
                    className="mt-2"
                  />
                )}

                {field.helpText && (
                  <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                )}
              </div>
            ))}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
