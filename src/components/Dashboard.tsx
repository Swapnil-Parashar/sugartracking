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
      console.log("Dashboard - user data:", data);
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
      console.log("Dashboard - readings data:", data);
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

  // Calculate statistics
  const stats = {
    totalReadings: readings.length,
    averageLevel:
      readings.length > 0
        ? (
            readings.reduce((sum, r) => sum + r.value, 0) / readings.length
          ).toFixed(1)
        : "-",
    lastReading:
      readings.length > 0 ? readings[readings.length - 1]?.value || "-" : "-",
    daysTracked: new Set(readings.map((r) => r.date)).size,
  };

  // Prepare chart data with better time handling
  const chartData = {
    datasets: [
      {
        label: "Fasting",
        data: readings
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
        data: readings
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
        data: readings
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
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ fontSize: "1.5rem" }}>🍯 Sugar Tracker Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span>
            Welcome, {user?.username || userData?.username || "User"}!
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem",
        }}
      >
        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "15px",
              padding: "1.5rem",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#667eea",
                marginBottom: "0.5rem",
              }}
            >
              {stats.totalReadings}
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem" }}>
              Total Readings
            </div>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: "15px",
              padding: "1.5rem",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#667eea",
                marginBottom: "0.5rem",
              }}
            >
              {stats.averageLevel}
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem" }}>
              Average Level
            </div>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: "15px",
              padding: "1.5rem",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#667eea",
                marginBottom: "0.5rem",
              }}
            >
              {stats.lastReading}
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem" }}>
              Last Reading
            </div>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: "15px",
              padding: "1.5rem",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#667eea",
                marginBottom: "0.5rem",
              }}
            >
              {stats.daysTracked}
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem" }}>
              Days Tracked
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            marginBottom: "2rem",
          }}
        >
          {/* Add Reading Form */}
          <div
            style={{
              background: "white",
              borderRadius: "15px",
              padding: "1.5rem",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
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
              <div
                style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}
              >
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
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e1e5e9",
                      borderRadius: "8px",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                    }}
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
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e1e5e9",
                      borderRadius: "8px",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                    }}
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
              <div
                style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}
              >
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
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e1e5e9",
                      borderRadius: "8px",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                    }}
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
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "2px solid #e1e5e9",
                      borderRadius: "8px",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={addReadingMutation.isPending}
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: addReadingMutation.isPending
                    ? "not-allowed"
                    : "pointer",
                  opacity: addReadingMutation.isPending ? 0.7 : 1,
                  width: "100%",
                }}
              >
                {addReadingMutation.isPending ? "Adding..." : "Add Reading"}
              </button>
            </form>
          </div>

          {/* Recent Readings */}
          <div
            style={{
              background: "white",
              borderRadius: "15px",
              padding: "1.5rem",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
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
              {readings.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "#666",
                    padding: "2rem",
                  }}
                >
                  No readings yet. Add your first reading!
                </p>
              ) : (
                readings
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
        <div
          style={{
            background: "white",
            borderRadius: "15px",
            padding: "1.5rem",
            boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              marginBottom: "1rem",
              color: "#333",
              fontSize: "1.2rem",
            }}
          >
            Sugar Level Trends
          </h2>
          <div style={{ position: "relative", height: "400px" }}>
            {readings.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  color: "#666",
                }}
              >
                No data to display. Add some readings to see the chart!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
