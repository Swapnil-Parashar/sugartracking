import React from "react";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading...",
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* Animated Sugar Tracker Logo */}
      <div
        style={{
          fontSize: "4rem",
          marginBottom: "2rem",
          animation: "pulse 2s infinite",
        }}
      >
        🍯
      </div>

      {/* App Title */}
      <h1
        style={{
          fontSize: "2.5rem",
          marginBottom: "1rem",
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        Sugar Tracker
      </h1>

      {/* Loading Message */}
      <p
        style={{
          fontSize: "1.2rem",
          marginBottom: "2rem",
          opacity: 0.9,
          textAlign: "center",
        }}
      >
        {message}
      </p>

      {/* Animated Loading Spinner */}
      <div
        style={{
          width: "50px",
          height: "50px",
          border: "4px solid rgba(255, 255, 255, 0.3)",
          borderTop: "4px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />

      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingScreen;
