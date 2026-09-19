import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-mark" aria-hidden="true">⚽</span>
          <span>FPL SquadLab</span>
        </Link>
        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>Dashboard</NavLink>
          <NavLink to="/players" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Players</NavLink>
          <NavLink to="/team-builder" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Team Builder</NavLink>
          <NavLink to="/fixtures" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Fixtures</NavLink>
          <NavLink to="/analysis" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Analysis</NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;