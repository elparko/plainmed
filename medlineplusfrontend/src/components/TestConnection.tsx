import { useState } from 'react';
import { Button } from './ui/button';

export function TestConnection() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const testConnection = async () => {
    setStatus('loading');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/test`);
      const data = await response.json();
      setResult(data);
      setStatus('success');
    } catch (error) {
      console.error('Connection test failed:', error);
      setResult(error);
      setStatus('error');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">API Connection Test</h2>
      <Button onClick={testConnection} disabled={status === 'loading'}>
        {status === 'loading' ? 'Testing...' : 'Test Connection'}
      </Button>
      
      {status === 'loading' && <p className="mt-4">Testing connection...</p>}
      {status === 'success' && (
        <pre className="mt-4 p-4 bg-green-100 dark:bg-green-900 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      {status === 'error' && (
        <pre className="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
} 