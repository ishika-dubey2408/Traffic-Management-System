import React, { useState } from 'react';

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleAccounts, setShowGoogleAccounts] = useState(false);

  const fakeLogin = () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    if (password !== "khushi") {
      alert("Incorrect password.");
      return;
    }

    onLogin();
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const selectAccount = (selectedEmail) => {
    setEmail(selectedEmail);
    setShowGoogleAccounts(false);
  };

  const googleAccounts = [
    'user1@gmail.com',
    'user2@gmail.com',
    'user3@gmail.com'
  ];

  return (
    <div id="loginScreen">
      <h2>Login to Continue</h2>
      <div className="login-input-container">
        <input
          type="email"
          className="login-input"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="login-input-container">
        <input
          type={showPassword ? "text" : "password"}
          className="login-input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="password-toggle" onClick={togglePassword}>
          <span className="material-symbols-outlined">
            {showPassword ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
      <button className="login-button" onClick={fakeLogin}>
        Login
      </button>
      <div style={{ position: 'relative' }}>
        <button 
          className="google-btn" 
          onClick={() => setShowGoogleAccounts(!showGoogleAccounts)}
        >
          <img src="/google.jpg" alt="Google Logo" />
          Continue with Google
        </button>
        {showGoogleAccounts && (
          <div id="googleAccounts" style={{ display: 'block' }}>
            {googleAccounts.map((account) => (
              <div 
                key={account}
                className="google-account" 
                onClick={() => selectAccount(account)}
              >
                {account}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen; 