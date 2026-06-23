import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';

interface PurgeRow {
  id: string;
  company_name: string;
  website_url: string | null;
  linkedin_company_url: string | null;
  primary_email: string | null;
  state: string | null;
  city: string | null;
  industry_type: string | null;
  created_at: string;
}

const PAGE_SIZE = 100;

export default function PurgeCandidates() {
  const [rows, setRows] = useState<PurgeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [excluded, setExcluded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    // Strict purge candidate: no website, no LinkedIn, no email, and no related
    // contacts / communications / apollo activity / opportunities / activities /
    // job quotes / pilot programs. Anything with engagement signals is excluded.
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;



    // IDs of companies with ANY downstream signal — fetched in parallel so we can exclude them.
    const [contactIds, commIds, apolloIds, oppIds, actIds, jqIds, pilotIds, looseNoWebsite] = await Promise.all([
      supabase.from('contacts').select('company_id').not('company_id', 'is', null),
      supabase.from('company_communications').select('company_id').not('company_id', 'is', null),
      supabase.from('apollo_email_activities').select('company_id').not('company_id', 'is', null),
      supabase.from('opportunities').select('company_id').not('company_id', 'is', null),
      supabase.from('outreach_activities').select('company_id').not('company_id', 'is', null),
      supabase.from('job_quotes').select('contractor_id').not('contractor_id', 'is', null),
      supabase.from('pilot_programs').select('company_id').not('company_id', 'is', null),
      supabase.from('companies').select('id', { count: 'exact', head: true }).is('website_url', null),
    ]);

    const blocked = new Set<string>();
    [contactIds, commIds, apolloIds, oppIds, actIds, pilotIds].forEach((res) => {
      (res.data ?? []).forEach((r: any) => r.company_id && blocked.add(r.company_id));
    });
    (jqIds.data ?? []).forEach((r: any) => r.contractor_id && blocked.add(r.contractor_id));

    let query = supabase
      .from('companies')
      .select('id,company_name,website_url,linkedin_company_url,primary_email,state,city,industry_type,created_at', { count: 'exact' })
      .is('website_url', null)
      .is('linkedin_company_url', null)
      .is('primary_email', null);

    if (blocked.size > 0) {
      // Postgrest cap: chunk if needed. ~300 IDs is well under the URL limit.
      query = query.not('id', 'in', `(${Array.from(blocked).join(',')})`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    setLoading(false);
    if (error) {
      toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((data ?? []) as PurgeRow[]);
    setTotal(count ?? 0);
    setExcluded(Math.max(0, (looseNoWebsite.count ?? 0) - (count ?? 0)));
  };

  useEffect(() => { load(); }, [page]);


  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from('companies').delete().in('id', ids);
    setDeleting(false);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Purged ${ids.length} companies` });
    setSelected(new Set());
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/reports"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Purge Candidates
          </CardTitle>
          <CardDescription>
            Companies with <strong>no website, no LinkedIn, no email</strong>, and <strong>no contacts,
            communications, Apollo activity, opportunities, activities, job quotes, or pilot programs</strong>.
            Anything with engagement history is automatically excluded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="destructive">{total.toLocaleString()} safe to purge</Badge>
              {excluded > 0 && (
                <Badge variant="outline">{excluded.toLocaleString()} excluded (has signals)</Badge>
              )}
              {selected.size > 0 && (
                <span className="text-muted-foreground">{selected.size} selected</span>
              )}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={selected.size === 0 || deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete Selected ({selected.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Permanently delete {selected.size} companies?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the selected purge candidates from your database. This action cannot be undone.
                    Related contacts, activities, and opportunities will follow your existing cascade rules.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              No purge candidates — every company has a website URL.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2 w-10">
                      <Checkbox
                        checked={selected.size === rows.length && rows.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="p-2">Company</th>
                    <th className="p-2">Industry</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">Signals</th>
                    <th className="p-2">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="p-2">
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                      </td>
                      <td className="p-2 font-medium">
                        <Link to={`/companies?id=${r.id}`} className="hover:underline">{r.company_name}</Link>
                      </td>
                      <td className="p-2 text-muted-foreground">{r.industry_type ?? '—'}</td>
                      <td className="p-2 text-muted-foreground">
                        {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          {r.linkedin_company_url && <Badge variant="outline" className="text-xs">LinkedIn</Badge>}
                          {r.primary_email && <Badge variant="outline" className="text-xs">Email</Badge>}
                          {!r.linkedin_company_url && !r.primary_email && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
