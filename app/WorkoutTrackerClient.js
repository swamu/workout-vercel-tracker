'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const DAYS_PER_WEEK = 7;
const GUEST_COMPLETIONS_KEY = 'guest-workout-completions-v1';
const GUEST_MEASUREMENTS_KEY = 'guest-weekly-measurements-v1';
const EMPTY_MEASUREMENTS = {
  weight: '',
  neck: '',
  shoulders: '',
  chestBust: '',
  upperArmBiceps: '',
  forearm: '',
  midsection: '',
  waist: '',
  abdomen: '',
  hips: '',
  thighTop: '',
  midThigh: '',
  knee: '',
  calf: '',
  ankle: ''
};

const UPPER_BODY_FIELDS = [
  { key: 'neck', label: 'Neck' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chestBust', label: 'Chest / Bust' },
  { key: 'upperArmBiceps', label: 'Upper arm (biceps)' },
  { key: 'forearm', label: 'Forearm' },
  { key: 'midsection', label: 'Midsection' },
  { key: 'waist', label: 'Waist' },
  { key: 'abdomen', label: 'Abdomen' },
  { key: 'hips', label: 'Hips' }
];

const LOWER_BODY_FIELDS = [
  { key: 'thighTop', label: 'Thigh (top)' },
  { key: 'midThigh', label: 'Mid-thigh' },
  { key: 'knee', label: 'Knee' },
  { key: 'calf', label: 'Calf' },
  { key: 'ankle', label: 'Ankle' }
];

export default function WorkoutTrackerClient({ plan }) {
  const [completedDays, setCompletedDays] = useState({});
  const [measurementsByWeek, setMeasurementsByWeek] = useState({});
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [syncMode, setSyncMode] = useState('cloud');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [measurementDraft, setMeasurementDraft] = useState(EMPTY_MEASUREMENTS);
  const [measurementStatus, setMeasurementStatus] = useState('');
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [savingDayId, setSavingDayId] = useState('');

  const loadCompletions = async () => {
    const response = await fetch('/api/completions', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to load completions');
    }
    const result = await response.json();
    setCompletedDays(result.completedDays || {});
  };

  const loadMeasurements = async () => {
    const response = await fetch('/api/measurements', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to load measurements');
    }
    const result = await response.json();
    setMeasurementsByWeek(result.measurementsByWeek || {});
  };

  const loadGuestState = () => {
    if (typeof window === 'undefined') return;

    let guestCompletedDays = {};
    let guestMeasurementsByWeek = {};

    try {
      const savedCompletions = localStorage.getItem(GUEST_COMPLETIONS_KEY);
      if (savedCompletions) {
        guestCompletedDays = JSON.parse(savedCompletions);
      }
    } catch {
      guestCompletedDays = {};
    }

    try {
      const savedMeasurements = localStorage.getItem(GUEST_MEASUREMENTS_KEY);
      if (savedMeasurements) {
        guestMeasurementsByWeek = JSON.parse(savedMeasurements);
      }
    } catch {
      guestMeasurementsByWeek = {};
    }

    setCompletedDays(guestCompletedDays);
    setMeasurementsByWeek(guestMeasurementsByWeek);
    setSyncMode('local');
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setAuthLoading(true);

      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) {
          setUser(null);
          loadGuestState();
          return;
        }

        const result = await response.json();
        setUser(result.user || null);
        try {
          await Promise.all([loadCompletions(), loadMeasurements()]);
          setSyncMode('cloud');
        } catch {
          // Keep session active even if profile data fetch fails.
          setCompletedDays({});
          setMeasurementsByWeek({});
          setSyncMode('local');
        }
      } catch {
        setUser(null);
        loadGuestState();
      } finally {
        setAuthLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (authLoading || user || typeof window === 'undefined') return;
    localStorage.setItem(GUEST_COMPLETIONS_KEY, JSON.stringify(completedDays));
    localStorage.setItem(GUEST_MEASUREMENTS_KEY, JSON.stringify(measurementsByWeek));
  }, [authLoading, user, completedDays, measurementsByWeek]);

  const doneCount = useMemo(
    () => Object.values(completedDays).filter(Boolean).length,
    [completedDays]
  );

  const weeks = useMemo(() => {
    const grouped = [];
    for (let i = 0; i < plan.length; i += DAYS_PER_WEEK) {
      const days = plan.slice(i, i + DAYS_PER_WEEK);
      const completed = days.reduce((count, item) => {
        const id = `${item.date}-${item.day}`;
        return count + (completedDays[id] ? 1 : 0);
      }, 0);

      grouped.push({
        id: `week-${i / DAYS_PER_WEEK + 1}`,
        label: `Week ${i / DAYS_PER_WEEK + 1}`,
        completed,
        total: days.length,
        days
      });
    }

    return grouped;
  }, [plan, completedDays]);

  useEffect(() => {
    if (weeks.length === 0) return;
    if (selectedWeekIndex > weeks.length - 1) {
      setSelectedWeekIndex(weeks.length - 1);
    }
  }, [weeks.length, selectedWeekIndex]);

  const activeWeek = weeks[selectedWeekIndex] ?? null;
  const activeWeekNumber = selectedWeekIndex + 1;

  const saveCompletionToCloud = async (dayId, isDone) => {
    const response = await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayId, isDone })
    });
    if (!response.ok) {
      throw new Error('Failed to save completion');
    }
  };

  const toggleDay = (id) => {
    const previousValue = Boolean(completedDays[id]);
    const nextValue = !previousValue;
    setCompletedDays((prev) => ({ ...prev, [id]: nextValue }));
    if (!user) return;

    setSavingDayId(id);
    saveCompletionToCloud(id, nextValue)
      .catch(() => {
        setCompletedDays((prev) => ({ ...prev, [id]: previousValue }));
        setSyncMode('local');
      })
      .finally(() => setSavingDayId(''));
  };

  useEffect(() => {
    setMeasurementDraft(measurementsByWeek[activeWeekNumber] || EMPTY_MEASUREMENTS);
    setMeasurementStatus('');
  }, [activeWeekNumber, measurementsByWeek]);

  const onChangeMeasurement = (key, value) => {
    setMeasurementDraft((prev) => ({ ...prev, [key]: value }));
  };

  const saveMeasurements = async () => {
    if (!user) {
      setMeasurementsByWeek((prev) => ({
        ...prev,
        [activeWeekNumber]: measurementDraft
      }));
      setMeasurementStatus('Saved locally');
      setSyncMode('local');
      return;
    }

    setSavingMeasurements(true);
    setMeasurementStatus('');
    try {
      const response = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekIndex: activeWeekNumber,
          metrics: measurementDraft
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save measurements');
      }

      setMeasurementsByWeek((prev) => ({
        ...prev,
        [activeWeekNumber]: measurementDraft
      }));
      setMeasurementStatus('Saved');
    } catch {
      setMeasurementStatus('Could not save');
      setSyncMode('local');
    } finally {
      setSavingMeasurements(false);
    }
  };

  const onSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
    loadGuestState();
  };

  const formatMainWorkout = (value) => {
    const [prefix, ...rest] = String(value || '').split(':');
    const hasColon = rest.length > 0;

    if (!hasColon) {
      return String(value || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }

    const details = rest.join(':').trim();
    const detailLines = details
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    return [`${prefix.trim()}:`, ...detailLines];
  };

  const formatLowerBack = (value) =>
    String(value || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

  return (
    <main className="container">
      <header className="header">
        <div className="header-top">
          <div>
            <h1>Workout Progress Tracker</h1>
            <p>
              {user
                ? 'Signed in mode: progress and measurements sync to your private database.'
                : 'Guest mode: your progress and measurements are saved in this browser only.'}
            </p>
          </div>
          <div className="user-actions">
            <span className="user-pill">{user ? user.email : 'Guest Mode'}</span>
            {user ? (
              <button type="button" className="secondary-btn" onClick={onSignOut}>
                Sign Out
              </button>
            ) : (
              <div className="auth-links">
                <Link href="/signin" className="primary-btn">
                  Sign In
                </Link>
                <Link href="/signup" className="secondary-btn">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="stats">
          <p className="progress">
            Completed: <strong>{doneCount}</strong> / {plan.length}
          </p>
          <p className="progress">
            Weeks: <strong>{weeks.length}</strong>
          </p>
          <p className="progress">
            Sync: <strong>{syncMode === 'cloud' ? 'Cloud' : 'Local'}</strong>
          </p>
        </div>
      </header>

      <section className="weeks-grid">
        {activeWeek && (
          <article className="week-card" key={activeWeek.id}>
            <div className="week-nav">
              <div className="week-tabs">
                {weeks.map((week, index) => (
                  <button
                    key={week.id}
                    type="button"
                    className={`week-tab ${index === selectedWeekIndex ? 'active' : ''}`}
                    onClick={() => setSelectedWeekIndex(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="week-header">
              <h2>{activeWeek.label}</h2>
              <span className="week-pill">
                {activeWeek.completed}/{activeWeek.total} done
              </span>
            </div>

            <div className="table-wrap desktop-only">
              <table className="workout-table">
                <thead>
                  <tr>
                    <th>Done</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Main Workout</th>
                    <th>Stretching Focus</th>
                    <th>Abs Focus</th>
                  </tr>
                </thead>
                <tbody>
                  {activeWeek.days.map((item) => {
                    const id = `${item.date}-${item.day}`;
                    const isDone = Boolean(completedDays[id]);

                    return (
                      <tr key={id} className={isDone ? 'done-row' : ''}>
                        <td data-label="Done" className="cell-done">
                          <input
                            type="checkbox"
                            aria-label={`Mark ${item.date} as done`}
                            checked={isDone}
                            onChange={() => toggleDay(id)}
                            disabled={savingDayId === id}
                          />
                        </td>
                        <td data-label="Date">{item.date}</td>
                        <td data-label="Day">{item.day}</td>
                        <td data-label="Main Workout">
                          {formatMainWorkout(item.mainWorkout).map((part, index) => (
                            <div key={`${id}-main-${index}`}>{part}</div>
                          ))}
                        </td>
                        <td data-label="Stretching Focus">
                          {item.plankFocus ? (
                            <div>
                              <strong>Plank:</strong> {item.plankFocus}
                            </div>
                          ) : null}
                          {item.lowerBack ? (
                            <>
                              <div>
                                <strong>Lower Back:</strong>
                              </div>
                              {formatLowerBack(item.lowerBack).map((part, index) => (
                                <div key={`${id}-lower-back-${index}`}>{part}</div>
                              ))}
                            </>
                          ) : null}
                        </td>
                        <td data-label="Abs Focus">{item.absFocus}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-day-list mobile-only">
              {activeWeek.days.map((item) => {
                const id = `${item.date}-${item.day}`;
                const isDone = Boolean(completedDays[id]);

                return (
                  <article key={`${id}-mobile`} className={`mobile-day-card ${isDone ? 'done-row' : ''}`}>
                    <div className="mobile-day-top">
                      <label className="mobile-checkbox-wrap">
                        <input
                          type="checkbox"
                          aria-label={`Mark ${item.date} as done`}
                          checked={isDone}
                          onChange={() => toggleDay(id)}
                          disabled={savingDayId === id}
                        />
                        <span>Done</span>
                      </label>
                      <div className="mobile-date-wrap">
                        <strong>{item.date}</strong>
                        <span>{item.day}</span>
                      </div>
                    </div>

                    <div className="mobile-field">
                      <strong>Main Workout</strong>
                      {formatMainWorkout(item.mainWorkout).map((part, index) => (
                        <div key={`${id}-mobile-main-${index}`}>{part}</div>
                      ))}
                    </div>

                    <div className="mobile-field">
                      <strong>Stretching Focus</strong>
                      {item.plankFocus ? (
                        <div>
                          <strong>Plank:</strong> {item.plankFocus}
                        </div>
                      ) : null}
                      {item.lowerBack ? (
                        <>
                          <div>
                            <strong>Lower Back:</strong>
                          </div>
                          {formatLowerBack(item.lowerBack).map((part, index) => (
                            <div key={`${id}-mobile-lower-back-${index}`}>{part}</div>
                          ))}
                        </>
                      ) : null}
                    </div>

                    <div className="mobile-field">
                      <strong>Abs Focus</strong>
                      <div>{item.absFocus}</div>
                    </div>
                  </article>
                );
              })}
            </div>

            <section className="measurements-card">
              <div className="measurements-head">
                <h3>End of Week {activeWeekNumber} Check-in</h3>
                <p>Add your weight and body measurements for progress tracking.</p>
              </div>

              <div className="measurement-groups">
                <div className="measurement-group">
                  <h4>General</h4>
                  <label className="measurement-field">
                    Weight
                    <input
                      type="text"
                      value={measurementDraft.weight}
                      onChange={(event) => onChangeMeasurement('weight', event.target.value)}
                      placeholder="e.g. 68.5 kg"
                    />
                  </label>
                </div>

                <div className="measurement-group">
                  <h4>Upper Body</h4>
                  <div className="measurement-grid">
                    {UPPER_BODY_FIELDS.map((field) => (
                      <label className="measurement-field" key={field.key}>
                        {field.label}
                        <input
                          type="text"
                          value={measurementDraft[field.key]}
                          onChange={(event) =>
                            onChangeMeasurement(field.key, event.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="measurement-group">
                  <h4>Lower Body</h4>
                  <div className="measurement-grid">
                    {LOWER_BODY_FIELDS.map((field) => (
                      <label className="measurement-field" key={field.key}>
                        {field.label}
                        <input
                          type="text"
                          value={measurementDraft[field.key]}
                          onChange={(event) =>
                            onChangeMeasurement(field.key, event.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="measurement-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={saveMeasurements}
                  disabled={savingMeasurements}
                >
                  {savingMeasurements ? 'Saving...' : 'Save Measurements'}
                </button>
                {measurementStatus ? (
                  <span className="measurement-status">{measurementStatus}</span>
                ) : null}
              </div>
            </section>
          </article>
        )}
      </section>
    </main>
  );
}
