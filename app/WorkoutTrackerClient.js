'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'workout-plan-completed-days-v1';

export default function WorkoutTrackerClient({ plan }) {
  const [completedDays, setCompletedDays] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setCompletedDays(JSON.parse(raw));
      }
    } catch {
      setCompletedDays({});
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedDays));
  }, [completedDays, mounted]);

  const doneCount = useMemo(
    () => Object.values(completedDays).filter(Boolean).length,
    [completedDays]
  );

  const toggleDay = (id) => {
    setCompletedDays((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className="container">
      <header className="header">
        <h1>Workout Progress Tracker</h1>
        <p>
          Check each day after you finish it. Progress is saved in your browser.
        </p>
        <p className="progress">
          Completed: <strong>{doneCount}</strong> / {plan.length}
        </p>
      </header>

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
            {plan.map((item) => {
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
                  <td>{item.mainWorkout}</td>
                  <td>{item.plankFocus}</td>
                  <td>{item.absFocus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
