'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { minutesToDisplay, formatDateDisplay } from '@/lib/formatReport';
import Sidebar from '@/components/layout/Sidebar';
import AppShell from '@/components/layout/AppShell';

function StatCard({ icon, iconClass, value, label, badge, badgeClass }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon-wrap ${iconClass}`}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {badge && <div className={`stat-badge ${badgeClass}`}>{badge}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      Promise.all([api.get('/reports/stats'), api.get('/reports/recent')])
        .then(([statsData, recentData]) => {
          setStats(statsData.stats);
          setRecentReports(recentData.reports);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <div className="page-loading"><div className="spinner spinner-dark" /><span>Loading dashboard...</span></div>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="app-shell">
      <Sidebar />
      <AppShell
        title="Dashboard"
        subtitle={dateStr}
      >
        {/* Quick Action Banner */}
        <div className="quick-action-banner">
          <div className="quick-action-text">
            <h2>
              {stats?.today_submitted
                ? "Today's report is submitted ✓"
                : "Ready to submit today's EOD report?"}
            </h2>
            <p>
              {stats?.today_submitted
                ? 'You can view or edit it from the reports page.'
                : 'Log your tasks, progress, and blockers for the day.'}
            </p>
          </div>
          {stats?.today_submitted ? (
            <Link href={`/reports/${stats.today_report_id}`} className="btn btn-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Today&apos;s Report
            </Link>
          ) : (
            <Link href="/reports/new" className="btn btn-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Create Today&apos;s Report
            </Link>
          )}
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
            iconClass="blue"
            value={stats?.total_reports ?? 0}
            label="Total Reports Submitted"
          />
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            iconClass="green"
            value={minutesToDisplay(stats?.week_total_hours ?? 0)}
            label="Hours This Week"
            badge={stats?.week_total_hours > 0 ? 'Mon–Today' : 'No data yet'}
            badgeClass={stats?.week_total_hours > 0 ? 'success' : 'info'}
          />
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            iconClass="accent"
            value={stats?.today_submitted ? 'Submitted' : 'Pending'}
            label="Today's Report Status"
            badge={stats?.today_submitted ? '✓ Done' : '⏳ Pending'}
            badgeClass={stats?.today_submitted ? 'success' : 'warning'}
          />
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Reports</h2>
            <Link href="/reports" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          {recentReports.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="empty-title">No reports yet</div>
              <div className="empty-desc">Submit your first EOD report to get started.</div>
              <Link href="/reports/new" className="btn btn-primary">Create First Report</Link>
            </div>
          ) : (
            <div>
              {recentReports.map((report, idx) => (
                <div key={report.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: idx < recentReports.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>
                      {formatDateDisplay(report.report_date)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {report.project_name} · {minutesToDisplay(report.total_hours)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/reports/${report.id}`} className="btn btn-secondary btn-sm">View</Link>
                    <Link href={`/reports/${report.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </div>
  );
}
