'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatReport, formatDateDisplay, renderFormattedReport } from '@/lib/formatReport';
import Sidebar from '@/components/layout/Sidebar';
import AppShell from '@/components/layout/AppShell';

export default function ViewReportPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return; }
    if (user) {
      api.get(`/reports/${id}`)
        .then((d) => setReport(d.report))
        .catch(() => router.replace('/reports'))
        .finally(() => setFetching(false));
    }
  }, [user, loading, id, router]);

  const reportText = report ? formatReport(report) : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied!', 'Report copied to clipboard.');
    } catch {
      toast.error('Copy failed', 'Please copy manually.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this report? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/reports/${id}`);
      toast.success('Deleted', 'Report has been deleted.');
      router.replace('/reports');
    } catch (err) {
      toast.error('Delete failed', err.message);
      setDeleting(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="main-content"><div className="page-loading"><div className="spinner spinner-dark" /></div></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <AppShell
        title={report ? `EOD Report — ${formatDateDisplay(report.report_date)}` : 'Report'}
        subtitle={report?.project_name}
        actions={
          <div className="flex gap-2">
            <button
              id="copy-report-view-btn"
              className="btn btn-secondary btn-sm"
              onClick={handleCopy}
            >
              {copied
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Report</>
              }
            </button>
            <Link href={`/reports/${id}/edit`} className="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </Link>
            <button
              id="delete-report-btn"
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '...' : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg> Delete</>
              )}
            </button>
          </div>
        }
      >
        <div style={{ maxWidth: 760 }}>
          <div className="card">
            <div className="card-body">
              <pre className="report-view-text">{renderFormattedReport(reportText)}</pre>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <Link href="/reports" className="btn btn-secondary">
              ← Back to Reports
            </Link>
            <Link href={`/reports/${id}/edit`} className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline', marginRight: 6 }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Report
            </Link>
          </div>
        </div>
      </AppShell>
    </div>
  );
}
