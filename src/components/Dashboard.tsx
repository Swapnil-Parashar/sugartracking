import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import LoadingScreen from "./LoadingScreen";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface User {
  userId: string;
  username: string;
}

interface Reading {
  date: string;
  time: string;
  type: "fasting" | "evening" | "night";
  value: number;
}

interface ReadingFormData {
  date: string;
  time: string;
  type: string;
  value: number;
}

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Helper function to get session token
  const getSessionToken = () => {
    const sessionId = localStorage.getItem("sessionId");
    return sessionId ? `?session=${sessionId}` : "";
  };

  // Helper function to get current time
  const getCurrentTime = () => {
    return new Date().toTimeString().slice(0, 5);
  };

  // Helper function to get default time based on reading type
  const getDefaultTimeForType = (type: string) => {
    switch (type) {
      case "fasting":
        return "08:00"; // Morning fasting reading
      case "evening":
        return "18:00"; // Evening reading
      case "night":
        return "22:00"; // Night reading
      default:
        return getCurrentTime();
    }
  };

  // Helper function to filter readings based on date filter
  const getFilteredReadings = (allReadings: Reading[]) => {
    if (dateFilter === "all") return allReadings;

    const now = new Date();
    const filterDate = new Date();

    switch (dateFilter) {
      case "7":
        filterDate.setDate(now.getDate() - 7);
        break;
      case "10":
        filterDate.setDate(now.getDate() - 10);
        break;
      case "20":
        filterDate.setDate(now.getDate() - 20);
        break;
      case "30":
        filterDate.setDate(now.getDate() - 30);
        break;
      case "90":
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        return allReadings;
    }

    return allReadings.filter((reading) => {
      const readingDate = new Date(reading.date);
      return readingDate >= filterDate;
    });
  };
  const [readingForm, setReadingForm] = useState<ReadingFormData>({
    date: new Date().toISOString().split("T")[0] || "",
    time: "",
    type: "",
    value: 0,
  });

  const queryClient = useQueryClient();

  // Fetch user data
  const { data: userData, error: userError } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const sessionToken = getSessionToken();
      process.env.NODE_ENV === "development" &&
        console.log("Dashboard - fetching user with token:", sessionToken);
      if (!sessionToken) {
        throw new Error("No session token available");
      }
      const response = await fetch(`/api/user${sessionToken}`);
      process.env.NODE_ENV === "development" &&
        console.log(
          "Dashboard - user API response:",
          response.status,
          response.ok
        );
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data;
    },
    enabled: !!localStorage.getItem("sessionId"),
  });

  // Update user state when data is fetched
  React.useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  // Fetch readings
  const {
    data: readings = [],
    isLoading,
    error: readingsError,
  } = useQuery<Reading[]>({
    queryKey: ["readings"],
    queryFn: async () => {
      const sessionToken = getSessionToken();
      process.env.NODE_ENV === "development" &&
        console.log("Dashboard - fetching readings with token:", sessionToken);
      if (!sessionToken) {
        throw new Error("No session token available");
      }
      const response = await fetch(`/api/readings${sessionToken}`);
      process.env.NODE_ENV === "development" &&
        console.log(
          "Dashboard - readings API response:",
          response.status,
          response.ok
        );
      if (!response.ok) throw new Error("Failed to fetch readings");
      const data = await response.json();
      return data;
    },
    enabled: !!localStorage.getItem("sessionId"),
  });

  // Add reading mutation
  const addReadingMutation = useMutation({
    mutationFn: async (data: ReadingFormData) => {
      const response = await fetch("/api/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: data.date,
          time: data.time,
          type: data.type,
          value: data.value,
          session: localStorage.getItem("sessionId") || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add reading");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readings"] });
      setReadingForm({
        date: new Date().toISOString().split("T")[0] || "",
        time: "",
        type: "",
        value: 0,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      ...readingForm,
      time: readingForm.time || getDefaultTimeForType(readingForm.type),
    };
    addReadingMutation.mutate(formData);
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      const sessionId = localStorage.getItem("sessionId");
      fetch(`/api/logout?session=${sessionId}`, { method: "POST" }).then(() => {
        localStorage.removeItem("sessionId");
        onLogout();
      });
    }
  };

  // Get filtered readings
  const filteredReadings = getFilteredReadings(readings);

  // Calculate statistics based on filtered readings
  const stats = {
    totalReadings: filteredReadings.length,
    averageLevel:
      filteredReadings.length > 0
        ? (
            filteredReadings.reduce((sum, r) => sum + r.value, 0) /
            filteredReadings.length
          ).toFixed(1)
        : "-",
    lastReading:
      filteredReadings.length > 0
        ? filteredReadings[filteredReadings.length - 1]?.value || "-"
        : "-",
    daysTracked: new Set(filteredReadings.map((r) => r.date)).size,
  };

  // Prepare chart data with better time handling using filtered readings
  const chartData = {
    datasets: [
      {
        label: "Fasting",
        data: filteredReadings
          .filter((r) => r.type === "fasting")
          .map((r) => ({
            x: new Date(r.date + "T" + (r.time || "08:00")),
            y: r.value,
          }))
          .sort((a, b) => a.x.getTime() - b.x.getTime()),
        borderColor: "#1976d2",
        backgroundColor: "rgba(25, 118, 210, 0.1)",
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: "Evening",
        data: filteredReadings
          .filter((r) => r.type === "evening")
          .map((r) => ({
            x: new Date(r.date + "T" + (r.time || "18:00")),
            y: r.value,
          }))
          .sort((a, b) => a.x.getTime() - b.x.getTime()),
        borderColor: "#f57c00",
        backgroundColor: "rgba(245, 124, 0, 0.1)",
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: "Night",
        data: filteredReadings
          .filter((r) => r.type === "night")
          .map((r) => ({
            x: new Date(r.date + "T" + (r.time || "22:00")),
            y: r.value,
          }))
          .sort((a, b) => a.x.getTime() - b.x.getTime()),
        borderColor: "#7b1fa2",
        backgroundColor: "rgba(123, 31, 162, 0.1)",
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "day" as const,
          displayFormats: {
            day: "MMM dd",
            hour: "MMM dd HH:mm",
          },
        },
        title: {
          display: true,
          text: "Date & Time",
        },
      },
      y: {
        title: {
          display: true,
          text: "Sugar Level (mg/dL)",
        },
        min: 0,
        max: 300,
        ticks: {
          stepSize: 50,
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const date = new Date(context[0].parsed.x);
            return (
              date.toLocaleDateString() +
              " " +
              date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
          },
          label: (context: any) => {
            return context.dataset.label + ": " + context.parsed.y + " mg/dL";
          },
        },
      },
    },
  };

  if (isLoading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (userError || readingsError) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.2rem",
          color: "#d32f2f",
        }}
      >
        <h2>Error loading dashboard</h2>
        <p>{userError?.message || readingsError?.message}</p>
        <button
          onClick={() => {
            localStorage.removeItem("sessionId");
            window.location.reload();
          }}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        background: "#f5f7fa",
        color: "#333",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">🍯 Sugar Tracker Dashboard</h1>
        <div className="dashboard-user-info">
          <span className="dashboard-welcome">
            Welcome, {user?.username || userData?.username || "User"}!
          </span>
          <button onClick={handleLogout} className="dashboard-logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-container">
        {/* Stats Cards */}
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-value">{stats.totalReadings}</div>
            <div className="dashboard-stat-label">Total Readings</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-value">{stats.averageLevel}</div>
            <div className="dashboard-stat-label">Average Level</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-value">{stats.lastReading}</div>
            <div className="dashboard-stat-label">Last Reading</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-value">{stats.daysTracked}</div>
            <div className="dashboard-stat-label">Days Tracked</div>
          </div>
        </div>

        <div className="dashboard-main-grid">
          {/* Add Reading Form */}
          <div className="dashboard-card">
            <h2
              style={{
                marginBottom: "1rem",
                color: "#333",
                fontSize: "1.2rem",
              }}
            >
              Add New Reading
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="dashboard-form-row">
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "#555",
                      fontWeight: "500",
                    }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={readingForm.date}
                    onChange={(e) =>
                      setReadingForm({ ...readingForm, date: e.target.value })
                    }
                    required
                    className="dashboard-form-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "#555",
                      fontWeight: "500",
                    }}
                  >
                    Time
                  </label>
                  <input
                    type="time"
                    value={readingForm.time}
                    onChange={(e) =>
                      setReadingForm({ ...readingForm, time: e.target.value })
                    }
                    placeholder="Auto-set based on type"
                    className="dashboard-form-input"
                  />
                  <small
                    style={{
                      color: "#666",
                      fontSize: "0.8rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    Leave empty for default time: Fasting (8:00 AM), Evening
                    (6:00 PM), Night (10:00 PM)
                  </small>
                </div>
              </div>
              <div className="dashboard-form-row">
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "#555",
                      fontWeight: "500",
                    }}
                  >
                    Reading Type
                  </label>
                  <select
                    value={readingForm.type}
                    onChange={(e) =>
                      setReadingForm({ ...readingForm, type: e.target.value })
                    }
                    required
                    className="dashboard-form-input"
                  >
                    <option value="">Select Type</option>
                    <option value="fasting">Fasting</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      color: "#555",
                      fontWeight: "500",
                    }}
                  >
                    Sugar Level (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={readingForm.value || ""}
                    onChange={(e) =>
                      setReadingForm({
                        ...readingForm,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="50"
                    max="500"
                    step="0.1"
                    required
                    className="dashboard-form-input"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={addReadingMutation.isPending}
                className="dashboard-btn"
              >
                {addReadingMutation.isPending ? "Adding..." : "Add Reading"}
              </button>
            </form>
          </div>

          {/* Recent Readings */}
          <div className="dashboard-card">
            <h2
              style={{
                marginBottom: "1rem",
                color: "#333",
                fontSize: "1.2rem",
              }}
            >
              Recent Readings
            </h2>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {filteredReadings.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "#666",
                    padding: "2rem",
                  }}
                >
                  {readings.length === 0
                    ? "No readings yet. Add your first reading!"
                    : `No readings found for the selected time period.`}
                </p>
              ) : (
                filteredReadings
                  .slice(-5)
                  .reverse()
                  .map((reading, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#333",
                          }}
                        >
                          {reading.date}
                        </div>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#666",
                          }}
                        >
                          {reading.time || getDefaultTimeForType(reading.type)}{" "}
                          •
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "12px",
                              fontSize: "0.8rem",
                              fontWeight: "500",
                              textTransform: "uppercase",
                              background:
                                reading.type === "fasting"
                                  ? "#e3f2fd"
                                  : reading.type === "evening"
                                  ? "#fff3e0"
                                  : "#f3e5f5",
                              color:
                                reading.type === "fasting"
                                  ? "#1976d2"
                                  : reading.type === "evening"
                                  ? "#f57c00"
                                  : "#7b1fa2",
                              marginLeft: "0.5rem",
                            }}
                          >
                            {reading.type}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: "bold",
                          color: "#667eea",
                        }}
                      >
                        {reading.value} mg/dL
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="dashboard-card">
          <div className="dashboard-chart-header">
            <h2
              style={{
                color: "#333",
                fontSize: "1.2rem",
                margin: 0,
              }}
            >
              Sugar Level Trends
            </h2>
            <div className="dashboard-filter-buttons">
              {[
                { value: "all", label: "All Time" },
                { value: "7", label: "7 Days" },
                { value: "10", label: "10 Days" },
                { value: "20", label: "20 Days" },
                { value: "30", label: "30 Days" },
                { value: "90", label: "3 Months" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setDateFilter(filter.value)}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "2px solid #e1e5e9",
                    borderRadius: "20px",
                    background:
                      dateFilter === filter.value ? "#667eea" : "white",
                    color: dateFilter === filter.value ? "white" : "#666",
                    fontSize: "0.8rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: "400px" }}>
            {filteredReadings.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  color: "#666",
                  textAlign: "center",
                  padding: "2rem",
                }}
              >
                {readings.length === 0
                  ? "No data to display. Add some readings to see the chart!"
                  : `No readings found for the selected time period (${
                      dateFilter === "all"
                        ? "All Time"
                        : `Last ${dateFilter} days`
                    }).`}
              </div>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="dashboard-card">
          <h2
            style={{
              color: "#333",
              fontSize: "1.2rem",
              marginBottom: "1rem",
            }}
          >
            Reading History
          </h2>
          {filteredReadings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#666",
                padding: "2rem",
              }}
            >
              {readings.length === 0
                ? "No readings yet. Add your first reading!"
                : `No readings found for the selected time period.`}
            </div>
          ) : (
            <div className="dashboard-table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Value (mg/dL)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings
                    .sort((a, b) => {
                      const dateA = new Date(a.date + "T" + (a.time || "00:00"));
                      const dateB = new Date(b.date + "T" + (b.time || "00:00"));
                      return dateB.getTime() - dateA.getTime(); // Newest first
                    })
                    .map((reading, index) => {
                      const readingTime = reading.time || getDefaultTimeForType(reading.type);
                      return (
                        <tr key={index}>
                          <td>{reading.date}</td>
                          <td>{readingTime}</td>
                          <td>
                            <span
                              className={`dashboard-type-badge dashboard-type-badge-${reading.type}`}
                            >
                              {reading.type}
                            </span>
                          </td>
                          <td className="dashboard-table-value">
                            {reading.value} mg/dL
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
