import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";

interface LoginFormData {
  username: string;
  password: string;
}

interface SignupFormData extends LoginFormData {
  name: string;
  age: string;
  gender: string;
}

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState<string>("");

  const [loginForm, setLoginForm] = useState<LoginFormData>({
    username: "",
    password: "",
  });

  const [signupForm, setSignupForm] = useState<SignupFormData>({
    username: "",
    password: "",
    name: "",
    age: "",
    gender: "",
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("password", data.password);

      const response = await fetch("/api/login", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Login successful, data:", data);
      localStorage.setItem("sessionId", data.sessionId);
      console.log("Session ID stored:", data.sessionId);
      onLoginSuccess();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("password", data.password);
      formData.append("name", data.name);
      formData.append("age", data.age);
      formData.append("gender", data.gender);

      const response = await fetch("/api/signup", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Signup successful, data:", data);
      localStorage.setItem("sessionId", data.sessionId);
      console.log("Session ID stored:", data.sessionId);
      onLoginSuccess();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(loginForm);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    signupMutation.mutate(signupForm);
  };

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{ color: "#333", fontSize: "2rem", marginBottom: "0.5rem" }}
          >
            🍯 Sugar Tracker
          </h1>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>
            Track your blood sugar levels easily
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#f8d7da",
              color: "#721c24",
              padding: "0.75rem",
              borderRadius: "10px",
              marginBottom: "1rem",
              border: "1px solid #f5c6cb",
            }}
          >
            {error}
          </div>
        )}

        {!isSignup ? (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#333",
                  fontWeight: "500",
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#333",
                  fontWeight: "500",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                opacity: loginMutation.isPending ? 0.7 : 1,
              }}
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#333",
                  fontWeight: "500",
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={signupForm.username}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, username: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#333",
                  fontWeight: "500",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={signupForm.password}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, password: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#333",
                  fontWeight: "500",
                }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={signupForm.name}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, name: e.target.value })
                }
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}
            >
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    color: "#333",
                    fontWeight: "500",
                  }}
                >
                  Age
                </label>
                <input
                  type="number"
                  value={signupForm.age}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, age: e.target.value })
                  }
                  min="1"
                  max="120"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e1e5e9",
                    borderRadius: "10px",
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
                    color: "#333",
                    fontWeight: "500",
                  }}
                >
                  Gender
                </label>
                <select
                  value={signupForm.gender}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, gender: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #e1e5e9",
                    borderRadius: "10px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={signupMutation.isPending}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: signupMutation.isPending ? "not-allowed" : "pointer",
                opacity: signupMutation.isPending ? 0.7 : 1,
              }}
            >
              {signupMutation.isPending ? "Creating account..." : "Sign Up"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#667eea",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {isSignup
              ? "Already have an account? Login"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
