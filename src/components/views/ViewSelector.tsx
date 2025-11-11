import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table2,
  Kanban,
  Calendar,
  LayoutGrid,
  List,
  FileText,
  GanttChart,
  Clock,
  Plus,
  Star,
  Lock,
  Users,
  Network,
} from 'lucide-react';

export type ViewType = 'grid' | 'kanban' | 'calendar' | 'gallery' | 'list' | 'form' | 'timeline' | 'gantt' | 'hierarchy';

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (viewType: ViewType) => void;
  savedViews?: any[];
  onCreateView?: () => void;
}

const VIEW_ICONS = {
  grid: Table2,
  kanban: Kanban,
  calendar: Calendar,
  gallery: LayoutGrid,
  list: List,
  form: FileText,
  timeline: Clock,
  gantt: GanttChart,
  hierarchy: Network,
};

const VIEW_LABELS = {
  grid: 'Grid',
  kanban: 'Kanban',
  calendar: 'Calendar',
  gallery: 'Gallery',
  list: 'List',
  form: 'Form',
  timeline: 'Timeline',
  gantt: 'Gantt',
  hierarchy: 'Hierarchy',
};

export function ViewSelector({ 
  currentView, 
  onViewChange, 
  savedViews = [],
  onCreateView 
}: ViewSelectorProps) {
  const CurrentIcon = VIEW_ICONS[currentView];

  return (
    <div className="flex items-center gap-2">
      {/* Current View Display */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
        <CurrentIcon className="h-4 w-4" />
        <span className="font-medium text-sm">{VIEW_LABELS[currentView]}</span>
      </div>

      {/* View Switcher Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Switch View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* View Type Options */}
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              View Types
            </div>
            {Object.entries(VIEW_ICONS).map(([type, Icon]) => (
              <DropdownMenuItem
                key={type}
                onClick={() => onViewChange(type as ViewType)}
                className="flex items-center gap-3 py-2"
              >
                <Icon className="h-4 w-4" />
                <span>{VIEW_LABELS[type as ViewType]}</span>
                {type === currentView && (
                  <span className="ml-auto text-primary">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator />

          {/* Saved Views */}
          {savedViews.length > 0 && (
            <>
              <div className="p-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Saved Views
                </div>
                {savedViews.map((view) => {
                  const Icon = VIEW_ICONS[view.view_type as ViewType];
                  return (
                    <DropdownMenuItem
                      key={view.id}
                      className="flex items-center gap-3 py-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{view.view_name}</span>
                      {view.is_favorite && <Star className="h-3 w-3 fill-[hsl(var(--status-pilot))] text-[hsl(var(--status-pilot))] ml-auto" />}
                      {view.view_permission_type === 'locked' && <Lock className="h-3 w-3 text-muted-foreground" />}
                      {view.view_permission_type === 'personal' && <Users className="h-3 w-3 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Create New View */}
          {onCreateView && (
            <DropdownMenuItem onClick={onCreateView} className="flex items-center gap-3 py-2">
              <Plus className="h-4 w-4" />
              <span>Create New View</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
