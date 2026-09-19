import React from 'react';

// Without this, any error thrown while rendering a page unmounts the whole tree
// and the deployed site shows a blank screen with nothing in the UI to explain
// or recover from it. The boundary keeps the navbar usable and offers a retry.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the details in the console so they are still visible when debugging.
    console.error('Unhandled error while rendering the page:', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="page-container">
        <div className="card error-card">
          <h1>Something went wrong</h1>
          <p>This page could not be displayed. Your saved squad is unaffected.</p>
          <p style={{ color: 'var(--text-secondary)' }}>{error.message || 'Unknown error'}</p>
          <div className="error-actions">
            <button onClick={this.handleRetry} className="action-button">Try again</button>
            <button onClick={this.handleReload} className="action-button secondary-button">Reload page</button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
