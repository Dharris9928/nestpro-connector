import { useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'br', 'strong', 'em', 'b', 'i'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const MAX_PLAIN_TEXT_LENGTH = 500000;

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      const escapeHtml = (text: string) => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      
      const htmlContent = value
        .split('\n')
        .map(line => {
          const escaped = escapeHtml(line);
          
          if (escaped.startsWith('# ')) {
            return `<h1>${escaped.substring(2)}</h1>`;
          } else if (escaped.startsWith('## ')) {
            return `<h2>${escaped.substring(3)}</h2>`;
          } else if (escaped.startsWith('### ')) {
            return `<h3>${escaped.substring(4)}</h3>`;
          } else if (escaped.startsWith('- ')) {
            return `<li>${escaped.substring(2)}</li>`;
          } else if (escaped.match(/^\d+\. /)) {
            return `<li>${escaped.substring(escaped.indexOf(' ') + 1)}</li>`;
          } else if (escaped.trim()) {
            return `<p>${escaped}</p>`;
          }
          return '<br>';
        })
        .join('');
      
      // Sanitize before setting innerHTML
      const sanitized = DOMPurify.sanitize(htmlContent, SANITIZE_CONFIG) as string;
      editorRef.current.innerHTML = sanitized;
    }
  }, [value]);

  const extractPlainText = useCallback((html: string): string => {
    // Sanitize first to strip any injected content
    const sanitized = DOMPurify.sanitize(html, SANITIZE_CONFIG) as string;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitized;
    return tempDiv.innerText || tempDiv.textContent || '';
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      
      // Re-sanitize the editor content on every input to strip anything
      // the browser may have injected (e.g. via paste, drag-drop, etc.)
      const sanitized = DOMPurify.sanitize(htmlContent, SANITIZE_CONFIG) as string;
      if (sanitized !== htmlContent) {
        const hadFocus = document.activeElement === editorRef.current;
        editorRef.current.innerHTML = sanitized;
        if (hadFocus) editorRef.current.focus();
      }

      const plainText = extractPlainText(sanitized);
      
      if (plainText.length > MAX_PLAIN_TEXT_LENGTH) {
        toast({
          title: 'Content too long',
          description: 'Please shorten your content (max 500KB)',
          variant: 'destructive',
        });
        return;
      }
      
      onChange(plainText);
    }
  }, [onChange, extractPlainText, toast]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
  }, [handleInput]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const toggleHeading = (level: number) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === 3 ? container.parentElement : container as HTMLElement;

    if (element && editorRef.current?.contains(element)) {
      const heading = document.createElement(`h${level}`);
      heading.textContent = element.textContent || '';
      element.replaceWith(heading);
    }
    editorRef.current?.focus();
    handleInput();
  };

  const formatButtons = [
    { icon: Bold, command: 'bold', label: 'Bold' },
    { icon: Italic, command: 'italic', label: 'Italic' },
    { icon: List, command: 'insertUnorderedList', label: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', label: 'Numbered List' },
    { icon: Heading1, onClick: () => toggleHeading(1), label: 'Heading 1' },
    { icon: Heading2, onClick: () => toggleHeading(2), label: 'Heading 2' },
    { icon: Heading3, onClick: () => toggleHeading(3), label: 'Heading 3' },
    { icon: Undo, command: 'undo', label: 'Undo' },
    { icon: Redo, command: 'redo', label: 'Redo' },
  ];

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        {formatButtons.map((button, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => button.onClick ? button.onClick() : execCommand(button.command!)}
            title={button.label}
            className="h-8 w-8 p-0"
          >
            <button.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className={cn(
          'min-h-[400px] max-h-[600px] overflow-y-auto p-4 outline-none',
          'prose prose-sm max-w-none',
          'focus:bg-accent/5',
          '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6',
          '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5',
          '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4',
          '[&_p]:mb-2 [&_p]:leading-relaxed',
          '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4',
          '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4',
          '[&_li]:mb-1',
          placeholder && !value ? 'before:content-[attr(data-placeholder)] before:text-muted-foreground before:absolute' : ''
        )}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}
