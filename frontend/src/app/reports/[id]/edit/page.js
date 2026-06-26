'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import ReportForm from '@/components/reports/ReportForm';

export default function EditReportPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return; }
    if (user) {
      api.get(`/reports/${id}`)
        .then((d) => setReport(d.report))
        .catch(() => router.replace('/reports'))
        .finally(() => setFetching(false));
    }
  }, [user, loading, id, router]);

  if (loading || fetching) return <div className="page-loading"><div className="spinner spinner-dark" /></div>;
  if (!report) return null;

  return <ReportForm reportId={id} initialData={report} />;
}
