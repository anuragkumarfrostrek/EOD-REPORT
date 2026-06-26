'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatDateDisplay, minutesToDisplay } from '@/lib/formatReport';
import { formatReport } from '@/lib/formatReport';
import Sidebar from '@/components/layout/Sidebar';
import AppShell from '@/components/layout/AppShell';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', date: '', project_id: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [pastDate, setPastDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });

  const loadReports = useCallback((f, pNum = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.search) params.set('search', f.search);
    if (f.date) params.set('date', f.date);
    if (f.project_id) params.set('project_id', f.project_id);
    params.set('page', pNum);
    params.set('limit', 10);
    api.get(`/reports?${params.toString()}`)
      .then((d) => {
        setReports(d.reports);
        if (d.pagination) {
          setPagination(d.pagination);
          setPage(d.pagination.page);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return; }
    if (user) {
      api.get('/projects').then((d) => setProjects(d.projects)).catch(console.error);
      loadReports({}, 1);
    }
  }, [user, authLoading, router, loadReports]);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    loadReports(newFilters, 1);
  };

  const handleClearFilters = () => {
    const reset = { search: '', date: '', project_id: '' };
    setFilters(reset);
    loadReports(reset, 1);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/reports/${id}`);
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success('Deleted', 'Report has been deleted.');
    } catch (err) {
      toast.error('Delete failed', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (report) => {
    try {
      const fullReport = await api.get(`/reports/${report.id}`);
      const text = formatReport(fullReport.report);
      await navigator.clipboard.writeText(text);
      toast.success('Copied!', 'Report copied to clipboard.');
    } catch {
      toast.error('Copy failed', 'Please try again.');
    }
  };

  const hasFilters = filters.search || filters.date || filters.project_id;

  return (
    <div className="app-shell">
      <Sidebar />
      <AppShell
        title="All Reports"
        subtitle="Browse, search, and manage your EOD reports"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowDateModal(true)} className="btn btn-secondary btn-sm" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline', marginRight: 6 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Create Past EOD
            </button>
            <Link href="/reports/new" className="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Today's Report
            </Link>
          </div>
        }
      >
        {/* Filters */}
        <div className="reports-filters">
          <div className="form-group" style={{ flex: '2', minWidth: 200 }}>
            <label className="form-label">Search</label>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="Search by task description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: 160 }}>
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: 160 }}>
            <label className="form-label">Project</label>
            <select
              className="form-select"
              value={filters.project_id}
              onChange={(e) => handleFilterChange('project_id', e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={handleClearFilters} style={{ alignSelf: 'flex-end' }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="page-loading"><div className="spinner spinner-dark" /><span>Loading reports...</span></div>
        ) : reports.length === 0 ? (
          <div className="reports-table-wrap">
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="empty-title">{hasFilters ? 'No reports match your filters' : 'No reports yet'}</div>
              <div className="empty-desc">
                {hasFilters ? 'Try adjusting your search or filters.' : 'Submit your first EOD report to get started.'}
              </div>
              {!hasFilters && <Link href="/reports/new" className="btn btn-primary">Create First Report</Link>}
            </div>
          </div>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Hours Today</th>
                  <th>Week Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="report-date-cell">{formatDateDisplay(report.report_date)}</div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{report.project_name}</span>
                    </td>
                    <td className="report-hours-cell">{minutesToDisplay(report.total_hours)}</td>
                    <td className="report-hours-cell">{minutesToDisplay(report.week_total_hours)}</td>
                    <td>
                      <div className="report-actions">
                        <Link href={`/reports/${report.id}`} className="btn-icon" title="View">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                        <Link href={`/reports/${report.id}/edit`} className="btn-icon" title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Link>
                        <button className="btn-icon" title="Copy" onClick={() => handleCopy(report)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                        <button
                          className="btn-icon danger"
                          title="Delete"
                          onClick={() => handleDelete(report.id)}
                          disabled={deletingId === report.id}
                        >
                          {deletingId === report.id ? <span className="spinner spinner-dark" style={{ width: 14, height: 14 }} /> : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 24px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalCount} total reports)
            </span>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => pagination.page > 1 && loadReports(filters, pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  className={`btn btn-sm ${pagination.page === pNum ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => loadReports(filters, pNum)}
                  style={{ minWidth: '32px' }}
                >
                  {pNum}
                </button>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => pagination.page < pagination.totalPages && loadReports(filters, pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Summary footer */}
        {reports.length > 0 && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>
            Showing {reports.length} report{reports.length !== 1 ? 's' : ''} on this page
            {hasFilters ? ' (filtered)' : ''}
          </div>
        )}

        {/* Date Selection Modal */}
        {showDateModal && (
          <div className="modal-overlay" onClick={() => setShowDateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Create Past EOD Report</h3>
                <button className="btn-close" type="button" onClick={() => setShowDateModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={pastDate}
                    onChange={(e) => setPastDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowDateModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  disabled={!pastDate}
                  onClick={() => {
                    setShowDateModal(false);
                    router.push(`/reports/new?date=${pastDate}`);
                  }}
                >
                  Go to Report
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </div>
  );
}
