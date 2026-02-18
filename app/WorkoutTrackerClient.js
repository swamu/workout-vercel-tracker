'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'workout-plan-completed-days-v1';
const DAYS_PER_WEEK = 7;

export default function WorkoutTrackerClient({ plan }) {
  const [completedDays, setCompletedDays] = useState({});
  const [mounted, setMounted] = useState(false);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [syncMode, setSyncMode] = useState('local');

  useEffect(() => {
    const loadInitialData = async () => {
      let localData = {};

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          localData = JSON.parse(raw);
        }
      } catch {
        localData = {};
      }

      setCompletedDays(localData);

      try {
        const response = await fetch('/api/completions', { cache: 'no-store' });
        if (!response.ok) {
          setSyncMode('local');
          return;
        }

        const result = await response.json();
        if (result.enabled) {
          setCompletedDays(result.completedDays || {});
          setSyncMode('cloud');
        } else {
          setSyncMode('local');
        }
      } catch {
        setSyncMode('local');
      } finally {
        setMounted(true);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedDays));
  }, [completedDays, mounted]);

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

  const saveCompletionToCloud = async (dayId, isDone) => {
    try {
      await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayId, isDone })
      });
    } catch {
      setSyncMode('local');
    }
  };

  const toggleDay = (id) => {
    setCompletedDays((prev) => {
      const nextValue = !prev[id];
      if (syncMode === 'cloud') {
        saveCompletionToCloud(id, nextValue);
      }
      return { ...prev, [id]: nextValue };
    });
  };

  const formatMainWorkout = (value) => {
    const [prefix, ...rest] = value.split(':');
    const hasColon = rest.length > 0;

    if (!hasColon) {
      return value
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

  return (
    <main className="container">
      <header className="header">
        <h1>Workout Progress Tracker</h1>
        <p>
          Check each day after you finish it. Progress is saved in your browser.
        </p>
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

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Done</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Main Workout</th>
                    <th>Plank Focus</th>
                    <th>Abs Focus</th>
                  </tr>
                </thead>
                <tbody>
                  {activeWeek.days.map((item) => {
                    const id = `${item.date}-${item.day}`;
                    const isDone = Boolean(completedDays[id]);

                    return (
                      <tr key={id} className={isDone ? 'done-row' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Mark ${item.date} as done`}
                            checked={isDone}
                            onChange={() => toggleDay(id)}
                          />
                        </td>
                        <td>{item.date}</td>
                        <td>{item.day}</td>
                        <td>
                          {formatMainWorkout(item.mainWorkout).map((part, index) => (
                            <div key={`${id}-main-${index}`}>{part}</div>
                          ))}
                        </td>
                        <td>{item.plankFocus}</td>
                        <td>{item.absFocus}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
