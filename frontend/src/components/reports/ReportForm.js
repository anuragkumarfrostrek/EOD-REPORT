'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { calcDuration, minutesToDisplay, formatReport, renderFormattedReport } from '@/lib/formatReport';
import { useDraftStorage } from '@/hooks/useAutoSave';
import Sidebar from '@/components/layout/Sidebar';
import AppShell from '@/components/layout/AppShell';

// ─── Utility ─────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const cleanDate = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal.split('T')[0];
  try {
    return new Date(dateVal).toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};
const newTask = () => ({ id: Date.now() + Math.random(), description: '', start_time: '', end_time: '' });
const newIP = () => ({ id: Date.now() + Math.random(), description: '', progress_status: '' });
const newBlocker = () => ({ id: Date.now() + Math.random(), description: '' });

// ─── Trash icon ──────────────────────────────────────────────────────
function TrashBtn({ onClick }) {
  return (
    <button type="button" className="btn-icon danger" onClick={onClick} title="Remove">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
      </svg>
    </button>
  );
}

// ─── Done Tasks Section ───────────────────────────────────────────────
function DoneSection({ tasks, onChange }) {
  const updateTask = (id, field, value) => {
    const updated = tasks.map((t) => {
      if (t.id !== id) return t;
      return { ...t, [field]: value };
    });

    // Auto-sync: when end_time changes, set next task's start_time
    if (field === 'end_time') {
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx < tasks.length - 1 && value) {
        updated[idx + 1] = { ...updated[idx + 1], start_time: value };
      }
    }
    onChange(updated);
  };

  const addTask = () => {
    const lastTask = tasks[tasks.length - 1];
    const newT = newTask();
    if (lastTask?.end_time) newT.start_time = lastTask.end_time;
    onChange([...tasks, newT]);
  };

  const removeTask = (id) => onChange(tasks.filter((t) => t.id !== id));

  return (
    <div className="report-form-section-sub">
      <div className="section-header-sub">
        <div className="section-title-sub">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Done
        </div>
      </div>
      <div className="section-body-sub">
        {tasks.length > 0 && (
          <div className="task-row-header">
            <span>Description</span><span>Start Time</span><span>End Time</span><span>Duration</span><span />
          </div>
        )}
        {tasks.map((task) => {
          const dur = calcDuration(task.start_time, task.end_time);
          return (
            <div key={task.id} className="task-row">
              <input
                type="text"
                className="form-input"
                placeholder="Task description..."
                value={task.description}
                onChange={(e) => updateTask(task.id, 'description', e.target.value)}
              />
              <input
                type="time"
                className="form-input"
                value={task.start_time}
                onChange={(e) => updateTask(task.id, 'start_time', e.target.value)}
              />
              <input
                type="time"
                className="form-input"
                value={task.end_time}
                onChange={(e) => updateTask(task.id, 'end_time', e.target.value)}
              />
              <div className="duration-display">{dur > 0 ? minutesToDisplay(dur) : '—'}</div>
              <TrashBtn onClick={() => removeTask(task.id)} />
            </div>
          );
        })}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addTask} style={{ marginTop: '8px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Add Task
        </button>
      </div>
    </div>
  );
}

// ─── In Progress Section ──────────────────────────────────────────────
function InProgressSection({ items, onChange }) {
  const update = (id, field, value) => onChange(items.map((t) => t.id === id ? { ...t, [field]: value } : t));
  const add = () => onChange([...items, newIP()]);
  const remove = (id) => onChange(items.filter((t) => t.id !== id));

  return (
    <div className="report-form-section-sub">
      <div className="section-header-sub">
        <div className="section-title-sub">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          In Progress
        </div>
      </div>
      <div className="section-body-sub">
        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 36px', gap: '12px', padding: '0 8px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
            <span>Description</span><span>Progress Status</span><span />
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="ip-row">
            <input
              type="text"
              className="form-input"
              placeholder="What are you working on..."
              value={item.description}
              onChange={(e) => update(item.id, 'description', e.target.value)}
            />
            <input
              type="text"
              className="form-input"
              placeholder="85% complete, continues tomorrow"
              value={item.progress_status}
              onChange={(e) => update(item.id, 'progress_status', e.target.value)}
            />
            <TrashBtn onClick={() => remove(item.id)} />
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={add} style={{ marginTop: '8px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Add Item
        </button>
      </div>
    </div>
  );
}

// ─── Blockers Section ─────────────────────────────────────────────────
function BlockersSection({ items, onChange }) {
  const update = (id, value) => onChange(items.map((t) => t.id === id ? { ...t, description: value } : t));
  const add = () => onChange([...items, newBlocker()]);
  const remove = (id) => onChange(items.filter((t) => t.id !== id));

  return (
    <div className="report-form-section">
      <div className="section-header">
        <div className="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          Blockers
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{items.length} blocker{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="section-body">
        {items.map((item) => (
          <div key={item.id} className="blocker-row">
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Waiting for API documentation, None"
              value={item.description}
              onChange={(e) => update(item.id, e.target.value)}
            />
            <TrashBtn onClick={() => remove(item.id)} />
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={add} style={{ marginTop: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Add Blocker
        </button>
      </div>
    </div>
  );
}

// ─── Project Section Wrapper ──────────────────────────────────────────
function ProjectSectionComponent({
  section,
  projects,
  onChange,
  onRemove,
  showRemove,
  onAddNewProject
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddProjectLocal = async () => {
    if (!newProjectName.trim()) return;
    setAdding(true);
    try {
      const proj = await onAddNewProject(newProjectName.trim());
      onChange({ ...section, project_id: proj.id });
      setNewProjectName('');
    } finally {
      setAdding(false);
    }
  };

  const updateDoneTasks = (done_tasks) => {
    onChange({ ...section, done_tasks });
  };

  const updateIPTasks = (in_progress_tasks) => {
    onChange({ ...section, in_progress_tasks });
  };

  return (
    <div className="report-form-section" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
      <div className="section-header" style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
          <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
            <select
              className="form-select"
              value={section.project_id || ''}
              onChange={(e) => onChange({ ...section, project_id: e.target.value })}
              style={{ width: '100%', height: '36px' }}
            >
              <option value="">Select Project...</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Or add new project..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProjectLocal())}
              style={{ width: '180px', height: '36px', fontSize: '13px' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddProjectLocal}
              disabled={adding || !newProjectName.trim()}
              style={{ height: '36px', whiteSpace: 'nowrap' }}
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>
        </div>
        {showRemove && (
          <button type="button" className="btn btn-icon danger" onClick={onRemove} title="Remove Project Section" style={{ margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        <DoneSection tasks={section.done_tasks} onChange={updateDoneTasks} />
        <div style={{ height: '24px' }} />
        <InProgressSection items={section.in_progress_tasks} onChange={updateIPTasks} />
      </div>
    </div>
  );
}

// ─── Report Preview Panel ─────────────────────────────────────────────
function ReportPreview({ formData, projects }) {
  const [copied, setCopied] = useState(false);

  // Sum total hours from all sections
  const totalHours = formData.sections.reduce((sum, sec) => {
    return sum + (sec.done_tasks || []).reduce((s, t) => s + calcDuration(t.start_time, t.end_time), 0);
  }, 0);

  // Map sections to include project name
  const processedSections = formData.sections.map((sec) => {
    const proj = projects.find((p) => p.id === sec.project_id);
    return {
      project_name: proj?.name || 'Unknown Project',
      done_tasks: sec.done_tasks,
      in_progress_tasks: sec.in_progress_tasks,
    };
  });

  const reportText = formatReport({
    report_date: formData.report_date,
    sections: processedSections,
    blockers: formData.blockers,
    total_hours: totalHours,
    week_total_hours: (formData.week_total_hours || 0) + totalHours,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="report-preview">
      <div className="preview-header">
        <span className="preview-title">
          <svg style={{ display: 'inline', marginRight: 6 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Live Preview
        </span>
        <button id="copy-report-btn" type="button" className="btn btn-accent btn-sm" onClick={handleCopy}>
          {copied ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
          )}
        </button>
      </div>
      <div className="preview-body">
        <pre className="preview-text">{renderFormattedReport(reportText)}</pre>
      </div>

      {/* Hours summary */}
      <div style={{ padding: '0 20px 20px' }}>
        <div className="hours-summary">
          <div className="hours-item">
            <div className="hours-label">Hours Today</div>
            <div className="hours-value">{minutesToDisplay(totalHours)}</div>
          </div>
          <div className="hours-item">
            <div className="hours-label">Week Total</div>
            <div className="hours-value">{minutesToDisplay((formData.week_total_hours || 0) + totalHours)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Report Form ─────────────────────────────────────────────────
export default function ReportFormPage({ reportId, initialData }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!reportId;

  const dateKey = initialData?.report_date || today();
  const { saveDraft, loadDraft, clearDraft } = useDraftStorage(isEdit ? `edit_${reportId}` : dateKey);

  const [projects, setProjects] = useState([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');

  const defaultForm = {
    report_date: today(),
    sections: [
      {
        id: Date.now() + Math.random(),
        project_id: '',
        done_tasks: [newTask()],
        in_progress_tasks: [newIP()],
      }
    ],
    blockers: [newBlocker()],
    week_total_hours: 0,
  };

  const [form, setForm] = useState(defaultForm);

  // Load projects and initialize form
  useEffect(() => {
    if (!user) return;
    api.get('/projects').then((d) => setProjects(d.projects)).catch(console.error);

    if (isEdit && initialData) {
      // Map initial data (which could be single project or structured sections)
      const loadedSections = initialData.sections?.length
        ? initialData.sections.map((sec) => ({
            id: Date.now() + Math.random(),
            project_id: sec.project_id,
            done_tasks: sec.done_tasks?.length ? sec.done_tasks.map((t) => ({ ...t, id: t.id || Date.now() + Math.random() })) : [newTask()],
            in_progress_tasks: sec.in_progress_tasks?.length ? sec.in_progress_tasks.map((t) => ({ ...t, id: t.id || Date.now() + Math.random() })) : [newIP()],
          }))
        : [
            {
              id: Date.now() + Math.random(),
              project_id: initialData.project_id || '',
              done_tasks: initialData.done_tasks?.length ? initialData.done_tasks.map((t) => ({ ...t, id: t.id || Date.now() + Math.random() })) : [newTask()],
              in_progress_tasks: initialData.in_progress_tasks?.length ? initialData.in_progress_tasks.map((t) => ({ ...t, id: t.id || Date.now() + Math.random() })) : [newIP()],
            }
          ];

      setForm({
        report_date: cleanDate(initialData.report_date),
        sections: loadedSections,
        blockers: initialData.blockers?.length ? initialData.blockers.map((t) => ({ ...t, id: t.id || Date.now() + Math.random() })) : [newBlocker()],
        week_total_hours: initialData.week_total_hours || 0,
      });
    } else {
      const currentToday = today();
      const defaultDate = initialData?.report_date || currentToday;
      const draft = loadDraft();
      if (draft) {
        setForm({
          ...defaultForm,
          report_date: defaultDate,
          ...draft,
          report_date: draft.report_date || defaultDate,
          sections: draft.sections?.length
            ? draft.sections.map((sec) => ({
                ...sec,
                id: sec.id || Date.now() + Math.random(),
                done_tasks: sec.done_tasks?.length ? sec.done_tasks : [newTask()],
                in_progress_tasks: sec.in_progress_tasks?.length ? sec.in_progress_tasks : [newIP()],
              }))
            : defaultForm.sections,
          blockers: draft.blockers?.length ? draft.blockers : [newBlocker()],
        });
      } else {
        setForm((prev) => ({
          ...prev,
          report_date: defaultDate,
        }));
      }
    }
  }, [user, isEdit, initialData?.report_date]);

  // Fetch week total when date changes
  useEffect(() => {
    if (!user || !form.report_date) return;
    api.get(`/reports/week-hours?date=${form.report_date}`)
      .then((d) => {
        const wt = isEdit ? Math.max(0, (d.week_total_hours || 0) - (initialData?.total_hours || 0)) : (d.week_total_hours || 0);
        setWeekTotal(wt);
        setForm((prev) => ({ ...prev, week_total_hours: wt }));
      })
      .catch(console.error);
  }, [form.report_date, user]);

  // Auto-submit previous days' drafts on load or date change
  useEffect(() => {
    if (!user || projects.length === 0) return;

    const checkAndAutoSubmitDrafts = async () => {
      try {
        const todayStr = today();
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('eod_draft_') && !key.startsWith('eod_draft_edit_')) {
            keys.push(key);
          }
        }

        for (const key of keys) {
          const dateStr = key.replace('eod_draft_', '');
          if (dateStr < todayStr) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const draft = JSON.parse(raw);

            const hasDone = draft.sections?.some(s => s.done_tasks?.some(t => t.description?.trim())) ||
                            draft.done_tasks?.some(t => t.description?.trim());
            const hasIP = draft.sections?.some(s => s.in_progress_tasks?.some(t => t.description?.trim())) ||
                          draft.in_progress_tasks?.some(t => t.description?.trim());

            if (hasDone || hasIP) {
              let payload;
              if (draft.sections && draft.sections.length > 0) {
                const processedSections = draft.sections.map(sec => {
                  const done = (sec.done_tasks || []).filter(t => t.description?.trim());
                  const ip = (sec.in_progress_tasks || []).filter(t => t.description?.trim());
                  return {
                    project_id: sec.project_id || projects[0]?.id,
                    done_tasks: done.map(t => ({
                      description: t.description,
                      start_time: t.start_time || '09:00',
                      end_time: t.end_time || '09:00',
                      duration: calcDuration(t.start_time || '09:00', t.end_time || '09:00')
                    })),
                    in_progress_tasks: ip.map(t => ({
                      description: t.description,
                      progress_status: t.progress_status || 'In Progress'
                    }))
                  };
                });

                payload = {
                  project_id: draft.project_id || projects[0]?.id,
                  report_date: dateStr,
                  sections: processedSections,
                  blockers: (draft.blockers || []).filter(b => b.description?.trim()).map(b => ({ description: b.description }))
                };
              } else {
                const done = (draft.done_tasks || []).filter(t => t.description?.trim());
                const ip = (draft.in_progress_tasks || []).filter(t => t.description?.trim());

                payload = {
                  project_id: draft.project_id || projects[0]?.id,
                  report_date: dateStr,
                  done_tasks: done.map(t => ({
                    description: t.description,
                    start_time: t.start_time || '09:00',
                    end_time: t.end_time || '09:00',
                    duration: calcDuration(t.start_time || '09:00', t.end_time || '09:00')
                  })),
                  in_progress_tasks: ip.map(t => ({
                    description: t.description,
                    progress_status: t.progress_status || 'In Progress'
                  })),
                  blockers: (draft.blockers || []).filter(b => b.description?.trim()).map(b => ({ description: b.description }))
                };
              }

              const flatDoneTasks = payload.sections ? payload.sections.flatMap(s => s.done_tasks) : payload.done_tasks;
              if (flatDoneTasks.length === 0) {
                const dummyTask = {
                  description: 'Automated EOD submission',
                  start_time: '09:00',
                  end_time: '09:00',
                  duration: 0
                };
                if (payload.sections && payload.sections.length > 0) {
                  payload.sections[0].done_tasks.push(dummyTask);
                } else {
                  payload.done_tasks.push(dummyTask);
                }
              }

              console.log('Auto-submitting legacy draft:', key, payload);
              try {
                await api.post('/reports', payload);
                toast.success('Auto-submitted!', `EOD report for ${dateStr} has been auto-submitted.`);
                localStorage.removeItem(key);
              } catch (err) {
                console.error(`Failed to auto-submit draft for ${dateStr}:`, err);
                const isNetworkError = !err.message || 
                                       err.message.includes('fetch') || 
                                       err.message.includes('NetworkError') || 
                                       err.message.includes('Failed to fetch');
                if (err.message?.includes('already exists') || err.message?.includes('409') || !isNetworkError) {
                  localStorage.removeItem(key);
                }
              }
            } else {
              localStorage.removeItem(key);
            }
          }
        }
      } catch (e) {
        console.error('Error auto-submitting drafts:', e);
      }
    };

    checkAndAutoSubmitDrafts();

    const interval = setInterval(() => {
      checkAndAutoSubmitDrafts();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, projects, toast]);

  // Watch for midnight crossing to start a fresh daily report
  useEffect(() => {
    const checkDateChange = () => {
      const todayStr = today();
      if (!isEdit && !initialData?.report_date && form.report_date !== todayStr) {
        setForm({
          report_date: todayStr,
          sections: [
            {
              id: Date.now() + Math.random(),
              project_id: form.sections[0]?.project_id || (projects[0]?.id || ''),
              done_tasks: [newTask()],
              in_progress_tasks: [newIP()]
            }
          ],
          blockers: [newBlocker()],
          week_total_hours: 0,
        });
        toast.info('New Day Started', "It's past midnight! A fresh report has been started.");
      }
    };

    const interval = setInterval(checkDateChange, 10000);
    return () => clearInterval(interval);
  }, [form.report_date, isEdit, projects, initialData?.report_date]);

  // Auto-save to localStorage
  const handleAutoSave = useCallback((data) => {
    if (!isEdit) {
      saveDraft(data);
      setAutoSaveStatus('saved');
    }
  }, [saveDraft, isEdit]);

  useEffect(() => {
    setAutoSaveStatus('saving');
    const timer = setTimeout(() => handleAutoSave(form), 1500);
    return () => clearTimeout(timer);
  }, [form, handleAutoSave]);

  const handleAddNewProject = async (name) => {
    try {
      const { project } = await api.post('/projects', { name });
      setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Project created', `"${project.name}" has been added.`);
      return project;
    } catch (err) {
      toast.error('Error', err.message);
      throw err;
    }
  };

  const handleUpdateSection = (id, updatedFields) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => (sec.id === id ? { ...sec, ...updatedFields } : sec)),
    }));
  };

  const handleAddSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: Date.now() + Math.random(),
          project_id: '',
          done_tasks: [newTask()],
          in_progress_tasks: [newIP()],
        }
      ],
    }));
  };

  const handleRemoveSection = (id) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((sec) => sec.id !== id),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.report_date) { toast.error('Validation', 'Please select a report date.'); return; }

    const validSections = [];
    for (const sec of form.sections) {
      if (!sec.project_id) {
        toast.error('Validation', 'Please select a project for all sections.');
        return;
      }

      const validDone = sec.done_tasks.filter((t) => t.description.trim() && t.start_time && t.end_time);
      const validIP = sec.in_progress_tasks.filter((t) => t.description.trim());

      validSections.push({
        project_id: sec.project_id,
        done_tasks: validDone.map((t) => ({
          description: t.description,
          start_time: t.start_time,
          end_time: t.end_time,
          duration: calcDuration(t.start_time, t.end_time),
        })),
        in_progress_tasks: validIP.map((t) => ({
          description: t.description,
          progress_status: t.progress_status || 'In Progress',
        })),
      });
    }

    const flatDone = validSections.flatMap((s) => s.done_tasks);
    if (flatDone.length === 0) {
      toast.error('Validation', 'Please add at least one completed task in any section.');
      return;
    }

    const validBlockers = form.blockers.filter((t) => t.description.trim());

    const payload = {
      report_date: form.report_date,
      sections: validSections,
      blockers: validBlockers.map((t) => ({ description: t.description })),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/reports/${reportId}`, payload);
        toast.success('Report updated!', 'Your EOD report has been updated.');
      } else {
        const { report } = await api.post('/reports', payload);
        clearDraft();
        toast.success('Report submitted!', 'Your EOD report has been saved.');
        router.push(`/reports/${report.id}`);
        return;
      }
      router.push(`/reports/${reportId}`);
    } catch (err) {
      toast.error('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="page-loading"><div className="spinner spinner-dark" /></div>;

  return (
    <div className="app-shell">
      <Sidebar />
      <AppShell
        title={isEdit ? 'Edit Report' : "Today's Report"}
        subtitle={isEdit ? 'Update your submitted EOD report' : 'Log your daily work, progress, and blockers'}
        actions={
          <div className="flex items-center gap-3">
            <div className="auto-save-indicator">
              <div className="auto-save-dot" style={{ background: autoSaveStatus === 'saving' ? 'var(--warning)' : 'var(--success)' }} />
              {autoSaveStatus === 'saving' ? 'Saving...' : 'Draft saved'}
            </div>
            <button id="submit-report-btn" type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <><span className="spinner" />{isEdit ? 'Updating...' : 'Submitting...'}</> : (isEdit ? 'Update Report' : 'Submit Report')}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="report-form-page">
            {/* Left: Form */}
            <div>
              {/* Report Date */}
              <div className="report-form-section" style={{ marginBottom: '24px' }}>
                <div className="section-header">
                  <div className="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Report Date
                  </div>
                </div>
                <div className="section-body">
                  <div className="form-group" style={{ maxWidth: '300px', margin: 0 }}>
                    <input
                      type="date"
                      className="form-input"
                      value={form.report_date}
                      onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                      disabled={true}
                    />
                  </div>
                </div>
              </div>

              {/* Project Sections */}
              {form.sections.map((sec, index) => {
                const otherSelectedIds = form.sections
                  .filter((s) => s.id !== sec.id)
                  .map((s) => s.project_id)
                  .filter(Boolean);
                const filteredProjects = projects.filter((p) => !otherSelectedIds.includes(p.id));
                return (
                  <ProjectSectionComponent
                    key={sec.id}
                    section={sec}
                    projects={filteredProjects}
                    onChange={(updatedSec) => handleUpdateSection(sec.id, updatedSec)}
                    onRemove={() => handleRemoveSection(sec.id)}
                    showRemove={form.sections.length > 1}
                    onAddNewProject={handleAddNewProject}
                  />
                );
              })}

              {/* Add Project Section Button */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddSection}
                style={{ width: '100%', marginBottom: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', height: '48px', borderStyle: 'dashed' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Add Another Project Section
              </button>

              {/* Blockers Section */}
              <BlockersSection items={form.blockers} onChange={(b) => setForm({ ...form, blockers: b })} />
            </div>

            {/* Right: Preview */}
            <div>
              <ReportPreview formData={{ ...form, week_total_hours: weekTotal }} projects={projects} />
            </div>
          </div>
        </form>
      </AppShell>
    </div>
  );
}
