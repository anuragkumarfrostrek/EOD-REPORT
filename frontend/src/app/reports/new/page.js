'use client';
import { useAuth } from '@/lib/auth';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import ReportForm from '@/components/reports/ReportForm';

function NewReportContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);

  const queryDate = searchParams ? searchParams.get('date') : null;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = queryDate || todayStr;

    // Check if target date's report is already submitted
    api.get(`/reports?date=${targetDate}`)
      .then((d) => {
        if (d.reports && d.reports.length > 0) {
          router.replace(`/reports/${d.reports[0].id}`);
        } else {
          setChecking(false);
        }
      })
      .catch((err) => {
        console.error(err);
        setChecking(false);
      });
  }, [user, loading, router, queryDate]);

  if (loading || checking) {
    return (
      <div className="page-loading" style={{ height: '100vh' }}>
        <div className="spinner spinner-dark" />
        <span>Loading Report Details...</span>
      </div>
    );
  }

  return <ReportForm initialData={queryDate ? { report_date: queryDate } : null} />;
}

export default function NewReportPage() {
  return (
    <Suspense fallback={
      <div className="page-loading" style={{ height: '100vh' }}>
        <div className="spinner spinner-dark" />
        <span>Loading...</span>
      </div>
    }>
      <NewReportContent />
    </Suspense>
  );
}
