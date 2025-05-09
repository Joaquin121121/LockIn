import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  addDays,
  startOfDay,
  subDays,
  format,
  parseISO,
  isWithinInterval,
} from "date-fns";
import {
  getTimerSettings,
  saveTimerSettings,
  saveSession,
  getAllSessions,
} from "./services/firestore";

// Timer type definitions
type TimerType = "Lock In" | "Small Break" | "Long Break";

// Sound files
const TIMER_SOUND = "/sounds/timer-complete.mp3";
const LOCK_IN_SOUND = "/sounds/lock-in.mp3";

// Stats period type
type StatsPeriod = "Last Week" | "Last Two Weeks" | "Last Month";

// Session type
type Session = {
  id: string;
  date: string;
  type: string;
  duration: number;
  completed: boolean;
  timestamp: any;
};

function App() {
  // Timer states
  const [activeTimer, setActiveTimer] = useState<TimerType>("Lock In");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // Default 25 minutes
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("Last Week");

  // Timer settings (editable)
  const [timerSettings, setTimerSettings] = useState({
    "Lock In": 25 * 60, // 25 minutes
    "Small Break": 5 * 60, // 5 minutes
    "Long Break": 15 * 60, // 15 minutes
  });

  // State for storing all sessions from Firestore
  const [sessions, setSessions] = useState<Session[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Derived state - report data from sessions
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Timer interval reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Audio element references
  const timerCompleteAudioRef = useRef<HTMLAudioElement | null>(null);
  const lockInAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements
  useEffect(() => {
    timerCompleteAudioRef.current = new Audio(TIMER_SOUND);
    lockInAudioRef.current = new Audio(LOCK_IN_SOUND);
  }, []);

  // Fetch settings and sessions from Firestore on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Load timer settings
      const storedSettings = await getTimerSettings();
      if (storedSettings) {
        setTimerSettings(storedSettings as any);
        // Also update the current timer
        setTimeLeft(
          storedSettings[activeTimer as keyof typeof storedSettings] as number
        );
      } else {
        // If no settings in Firestore, save the default ones
        await saveTimerSettings(timerSettings);
      }

      // Load all sessions
      const allSessions = await getAllSessions();
      setSessions(allSessions as Session[]);

      setIsLoading(false);
    };

    loadData();
  }, []);

  // Compute reportData from sessions
  const reportData = React.useMemo(() => {
    const data: { [date: string]: number } = {};

    sessions.forEach((session) => {
      if (session.type === "Lock In" && session.completed) {
        if (!data[session.date]) {
          data[session.date] = 0;
        }
        data[session.date] += session.duration;
      }
    });

    return data;
  }, [sessions]);

  // Background color based on timer type
  const getBackgroundColor = () => {
    switch (activeTimer) {
      case "Small Break":
        return "#357E86";
      case "Long Break":
        return "#3D74A0";
      default:
        return "#B8584B"; // Lock In color (from image)
    }
  };

  // Handle timer selection
  const handleTimerSelect = (timerType: TimerType) => {
    setActiveTimer(timerType);
    setTimeLeft(timerSettings[timerType]);
    setIsRunning(false);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Start/pause timer
  const toggleTimer = () => {
    if (isRunning) {
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // Start timer - play lock-in sound if it's the Lock In timer
      if (activeTimer === "Lock In") {
        playLockInSound();
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Timer complete
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setIsRunning(false);
            playTimerCompleteSound();

            // Record completed session if it was a 'Lock In' timer
            if (activeTimer === "Lock In") {
              const today = new Date().toISOString().split("T")[0];
              const sessionTime = timerSettings["Lock In"];

              // Save session to Firestore
              saveCompletedSession(today, activeTimer, sessionTime);
            }

            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    setIsRunning(!isRunning);
  };

  // Save a completed session to Firestore and update local state
  const saveCompletedSession = async (
    date: string,
    type: string,
    duration: number
  ) => {
    setIsSyncing(true);

    try {
      const sessionData = {
        date,
        type,
        duration,
        completed: true,
      };

      const sessionId = await saveSession(sessionData);

      if (sessionId) {
        // Update local sessions state with the new session
        setSessions((prevSessions) => [
          ...prevSessions,
          {
            id: sessionId,
            ...sessionData,
            timestamp: new Date(),
          } as Session,
        ]);
      }
    } catch (error) {
      console.error("Error saving completed session:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Play timer complete sound
  const playTimerCompleteSound = () => {
    if (timerCompleteAudioRef.current) {
      timerCompleteAudioRef.current
        .play()
        .catch((error) => console.error("Error playing sound:", error));
    }
  };

  // Play lock in sound
  const playLockInSound = () => {
    if (lockInAudioRef.current) {
      lockInAudioRef.current
        .play()
        .catch((error) => console.error("Error playing lock-in sound:", error));
    }
  };

  // Save updated timer settings to both state and Firestore
  const saveSettings = async (newSettings: typeof timerSettings) => {
    setIsSyncing(true);

    try {
      const success = await saveTimerSettings(newSettings);

      if (success) {
        setTimerSettings(newSettings);
        setTimeLeft(newSettings[activeTimer]);
      }
    } catch (error) {
      console.error("Error saving timer settings:", error);
    } finally {
      setIsSyncing(false);
      setShowSettings(false);
    }
  };

  // Reset timer
  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(timerSettings[activeTimer]);
    setIsRunning(false);
  };

  // Get date range for stats period
  const getDateRangeForStats = (): [Date, Date] => {
    const today = startOfDay(new Date());
    let startDate: Date;

    switch (statsPeriod) {
      case "Last Week":
        startDate = subDays(today, 6); // Last 7 days including today
        break;
      case "Last Two Weeks":
        startDate = subDays(today, 13); // Last 14 days including today
        break;
      case "Last Month":
        startDate = subDays(today, 29); // Last 30 days including today
        break;
      default:
        startDate = subDays(today, 6);
    }

    return [startDate, today];
  };

  // Calculate stats for the selected period
  const calculateStats = () => {
    const [startDate, endDate] = getDateRangeForStats();

    // Get data for the period
    const periodData: { [day: string]: number } = {};
    const dayTotals: { [dayOfWeek: string]: { total: number; count: number } } =
      {
        Sunday: { total: 0, count: 0 },
        Monday: { total: 0, count: 0 },
        Tuesday: { total: 0, count: 0 },
        Wednesday: { total: 0, count: 0 },
        Thursday: { total: 0, count: 0 },
        Friday: { total: 0, count: 0 },
        Saturday: { total: 0, count: 0 },
      };

    // Process data within the date range
    let totalTimeInPeriod = 0;
    let daysWithActivity = 0;

    Object.entries(reportData).forEach(([dateStr, seconds]) => {
      const date = parseISO(dateStr);

      if (isWithinInterval(date, { start: startDate, end: endDate })) {
        // Add to period data
        periodData[dateStr] = seconds;

        // Add to day of week totals
        const dayOfWeek = format(date, "EEEE");
        dayTotals[dayOfWeek].total += seconds;
        dayTotals[dayOfWeek].count += 1;

        // Add to total time
        totalTimeInPeriod += seconds;
        daysWithActivity += 1;
      }
    });

    // Calculate average per day (for days with activity)
    const averagePerActiveDay =
      daysWithActivity > 0
        ? Math.round(totalTimeInPeriod / daysWithActivity)
        : 0;

    // Calculate day of week averages
    const dayAverages: { [day: string]: number } = {};
    Object.entries(dayTotals).forEach(([day, data]) => {
      dayAverages[day] =
        data.count > 0 ? Math.round(data.total / data.count) : 0;
    });

    // Find days with highest and lowest averages
    let highestDay = "";
    let highestAvg = 0;
    let lowestDay = "";
    let lowestAvg = Infinity;

    Object.entries(dayAverages).forEach(([day, avg]) => {
      if (avg > highestAvg) {
        highestAvg = avg;
        highestDay = day;
      }
      if (avg < lowestAvg && avg > 0) {
        lowestAvg = avg;
        lowestDay = day;
      }
    });

    // If no lowest day found (all zeros), set it to the first day with zero
    if (lowestAvg === Infinity) {
      lowestAvg = 0;
      Object.keys(dayAverages).forEach((day) => {
        if (dayAverages[day] === 0 && lowestDay === "") {
          lowestDay = day;
        }
      });
    }

    return {
      periodStart: format(startDate, "yyyy-MM-dd"),
      periodEnd: format(endDate, "yyyy-MM-dd"),
      totalTimeInPeriod,
      averagePerActiveDay,
      daysWithActivity,
      dayAverages,
      highestDay,
      highestAvg,
      lowestDay,
      lowestAvg,
    };
  };

  // Format seconds to hours and minutes
  const formatHoursMinutes = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Get stats for current period
  const stats = calculateStats();

  // Loading indicator
  if (isLoading) {
    return (
      <div className="App" style={{ backgroundColor: getBackgroundColor() }}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading your data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="App" style={{ backgroundColor: getBackgroundColor() }}>
      <header className="App-header">
        <div className="logo">
          <span className="check-icon">✓</span>
          <h1>Lock In</h1>
        </div>
        <div className="app-controls">
          <button
            className="report-btn"
            onClick={() => setShowReport(!showReport)}
          >
            Report
          </button>
          <button
            className="stats-btn"
            onClick={() => setShowStats(!showStats)}
          >
            Get Stats
          </button>
          <button
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
          >
            Setting
          </button>
          <div className="user-avatar">J</div>
        </div>
      </header>

      {isSyncing && (
        <div className="sync-indicator">
          <div className="sync-spinner"></div>
          <span>Syncing...</span>
        </div>
      )}

      <main className="timer-container">
        <div className="timer-tabs">
          {(["Lock In", "Small Break", "Long Break"] as TimerType[]).map(
            (timerType) => (
              <button
                key={timerType}
                className={activeTimer === timerType ? "active" : ""}
                onClick={() => handleTimerSelect(timerType)}
              >
                {timerType}
              </button>
            )
          )}
        </div>

        <div className="timer-display">
          <div className="time">{formatTime(timeLeft)}</div>
          <button className="start-btn" onClick={toggleTimer}>
            {isRunning ? "PAUSE" : "START"}
          </button>
        </div>

        <div className="session-count">
          #
          {sessions.filter((s) => s.type === "Lock In" && s.completed).length +
            1}
          <div className="session-text">Time to focus!</div>
        </div>
      </main>

      {showSettings && (
        <div className="modal settings-modal">
          <h2>Timer Settings</h2>
          <div className="settings-form">
            {Object.entries(timerSettings).map(([timerType, seconds]) => (
              <div key={timerType} className="setting-item">
                <label>{timerType}</label>
                <input
                  type="number"
                  value={Math.floor(seconds / 60)}
                  onChange={(e) => {
                    const newSettings = { ...timerSettings };
                    newSettings[timerType as TimerType] =
                      parseInt(e.target.value) * 60;
                    setTimerSettings(newSettings);
                  }}
                />{" "}
                minutes
              </div>
            ))}
            <div className="modal-buttons">
              <button onClick={() => setShowSettings(false)}>Cancel</button>
              <button onClick={() => saveSettings(timerSettings)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="modal report-modal">
          <h2>Focus Report</h2>
          <div className="calendar-nav">
            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1
                  )
                )
              }
            >
              &lt;
            </button>
            <h3>
              {currentMonth.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <button
              onClick={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1
                  )
                )
              }
            >
              &gt;
            </button>
          </div>
          <div className="calendar">
            <div className="calendar-header">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="calendar-cell header">
                  {day}
                </div>
              ))}
            </div>
            <div className="calendar-body">
              {Array.from({ length: 35 }, (_, i) => {
                const firstDay = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  1
                );
                const startOffset = firstDay.getDay();
                const day = i - startOffset + 1;
                const date = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  day
                );
                const dateString = date.toISOString().split("T")[0];
                const isCurrentMonth =
                  date.getMonth() === currentMonth.getMonth();
                const timeWorked = reportData[dateString] || 0;

                return (
                  <div
                    key={i}
                    className={`calendar-cell ${
                      isCurrentMonth ? "current-month" : "other-month"
                    }`}
                  >
                    {isCurrentMonth && (
                      <>
                        <div className="day-number">{day}</div>
                        {timeWorked > 0 && (
                          <div className="time-worked">
                            {Math.floor(timeWorked / 60)} min
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button className="close-btn" onClick={() => setShowReport(false)}>
            Close
          </button>
        </div>
      )}

      {showStats && (
        <div className="modal stats-modal">
          <h2>Focus Statistics</h2>

          <div className="stats-period-selector">
            <button
              className={statsPeriod === "Last Week" ? "active" : ""}
              onClick={() => setStatsPeriod("Last Week")}
            >
              Last Week
            </button>
            <button
              className={statsPeriod === "Last Two Weeks" ? "active" : ""}
              onClick={() => setStatsPeriod("Last Two Weeks")}
            >
              Last Two Weeks
            </button>
            <button
              className={statsPeriod === "Last Month" ? "active" : ""}
              onClick={() => setStatsPeriod("Last Month")}
            >
              Last Month
            </button>
          </div>

          <div className="stats-data">
            <div className="stats-period-info">
              {format(parseISO(stats.periodStart), "MMM d")} -{" "}
              {format(parseISO(stats.periodEnd), "MMM d, yyyy")}
            </div>

            <div className="stats-summary">
              <div className="stats-item">
                <div className="stats-label">Total Focus Time:</div>
                <div className="stats-value">
                  {formatHoursMinutes(stats.totalTimeInPeriod)}
                </div>
              </div>

              <div className="stats-item">
                <div className="stats-label">Average Daily Focus:</div>
                <div className="stats-value">
                  {formatHoursMinutes(stats.averagePerActiveDay)}
                </div>
                <div className="stats-subtext">
                  ({stats.daysWithActivity} active days)
                </div>
              </div>
            </div>

            <div className="stats-highlights">
              <h3>Day Analysis</h3>

              {stats.highestAvg > 0 && (
                <div className="stats-item highlight">
                  <div className="stats-label">Most Productive Day:</div>
                  <div className="stats-value">{stats.highestDay}</div>
                  <div className="stats-subtext">
                    Avg: {formatHoursMinutes(stats.highestAvg)}
                  </div>
                </div>
              )}

              {stats.lowestDay && (
                <div className="stats-item highlight">
                  <div className="stats-label">Least Productive Day:</div>
                  <div className="stats-value">{stats.lowestDay}</div>
                  <div className="stats-subtext">
                    Avg: {formatHoursMinutes(stats.lowestAvg)}
                  </div>
                </div>
              )}
            </div>

            <div className="stats-daily-breakdown">
              <h3>Daily Breakdown</h3>
              <div className="daily-bars">
                {Object.entries(stats.dayAverages).map(([day, seconds]) => {
                  // Calculate percentage relative to highest value
                  const maxValue = stats.highestAvg || 1; // Avoid division by zero
                  const percentage = Math.max(
                    5,
                    Math.floor((seconds / maxValue) * 100)
                  );

                  return (
                    <div key={day} className="day-stat">
                      <div className="day-name">{day.substring(0, 3)}</div>
                      <div className="day-bar-container">
                        <div
                          className="day-bar"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="day-time">
                        {formatHoursMinutes(seconds)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button className="close-btn" onClick={() => setShowStats(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
