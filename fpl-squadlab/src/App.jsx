import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import PlayerDetails from './pages/PlayerDetails';
import TeamBuilder from './pages/TeamBuilder';
import Fixtures from './pages/Fixtures';
import Analysis from './pages/Analysis';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:id" element={<PlayerDetails />} />
            <Route path="/team-builder" element={<TeamBuilder />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/analysis" element={<Analysis />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
