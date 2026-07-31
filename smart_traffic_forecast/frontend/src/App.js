import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import MainContent from './components/MainContent';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);// change it later

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <MainContent />
      )}
    </div>
  );
}

export default App; 