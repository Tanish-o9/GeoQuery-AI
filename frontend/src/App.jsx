import React from 'react';
import { MapProvider } from './context/MapContext';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <MapProvider>
      <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        {/* Main Layout */}
        <div className="flex h-full">
          {/* Sidebar */}
          <Sidebar />

          {/* Map Container */}
          <div className="flex-1 relative">
            <MapView />
          </div>
        </div>
      </div>
    </MapProvider>
  );
};

export default App;