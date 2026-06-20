// ErrorBoundary.js - Handle chunk loading errors
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chunk loading error:', error, errorInfo);
    
    // Jika chunk loading failed (network issue, dll)
    if (error.message.includes('Loading chunk') || 
        error.message.includes('Failed to fetch')) {
      
      // Option 1: Retry with page reload
      console.log('Chunk loading failed, reloading page...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Oops! Something went wrong.</h2>
          <p>We're reloading the page to fix this...</p>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
