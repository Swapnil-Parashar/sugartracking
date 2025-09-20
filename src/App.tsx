import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import LoadingScreen from "./components/LoadingScreen";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState<
    "login" | "dashboard" | "loading"
  >("loading");

  React.useEffect(() => {
    // Check if user is already logged in
    const sessionId = localStorage.getItem("sessionId");
    console.log("App useEffect - sessionId:", sessionId);

    if (!sessionId) {
      console.log("No session ID found, showing login");
      setCurrentPage("login");
      return;
    }

    console.log("Session ID found, checking user...");
    fetch(`/api/user?session=${sessionId}`)
      .then((response) => {
        process.env.NODE_ENV === "development" &&
          console.log("User API response:", response.status, response.ok);
        if (response.ok) {
          console.log("User authenticated, showing dashboard");
          setCurrentPage("dashboard");
        } else {
          process.env.NODE_ENV === "development" &&
            console.log(
              "User not authenticated, clearing session and showing login"
            );
          localStorage.removeItem("sessionId");
          setCurrentPage("login");
        }
      })
      .catch((error) => {
        console.error("Error checking user:", error);
        localStorage.removeItem("sessionId");
        setCurrentPage("login");
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        {currentPage === "loading" ? (
          <LoadingScreen message="Initializing Sugar Tracker..." />
        ) : currentPage === "login" ? (
          <Login onLoginSuccess={() => setCurrentPage("dashboard")} />
        ) : (
          <ErrorBoundary>
            <Dashboard onLogout={() => setCurrentPage("login")} />
          </ErrorBoundary>
        )}
      </div>
    </QueryClientProvider>
  );
};

export default App;
