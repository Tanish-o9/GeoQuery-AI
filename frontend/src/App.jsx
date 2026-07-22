import React from 'react';
import { MapProvider, useMap } from './context/MapContext';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import AIChatPanel from './components/AIChatPanel';
import LayerManager from './components/LayerManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ProjectManagerWidget from './components/ProjectManagerWidget';
import SpatialFileLoader from './components/SpatialFileLoader';
import WorkflowBuilder from './components/WorkflowBuilder';
import EnterpriseDashboard from './components/EnterpriseDashboard';
import AuthOverlay from './components/AuthOverlay';
import ScenarioWidget from './components/ScenarioWidget';
import KnowledgeGraphWidget from './components/KnowledgeGraphWidget';
import GisPlatformWidget from './components/GisPlatformWidget';
import PluginMarketplace from './components/PluginMarketplace';
import MiniMapWidget from './components/MiniMapWidget';
import LanguageSelector from './components/LanguageSelector';
import AICommandCenter from './components/AICommandCenter';
import { Toaster } from 'react-hot-toast';

const AppContent = () => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111827',
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
      <div className="flex h-full w-full">
        {/* Sidebar Panel */}
        <Sidebar />

        {/* Map & Overlays Container */}
        <div className="flex-1 h-full relative">
          <MapView />
          <LayerManager />
          <AIChatPanel />
          <AnalyticsDashboard />
          <ProjectManagerWidget />
          <SpatialFileLoader />
          <WorkflowBuilder />
          <EnterpriseDashboard />
          <ScenarioWidget />
          <KnowledgeGraphWidget />
          <GisPlatformWidget />
          <PluginMarketplace />
          <MiniMapWidget />
          <LanguageSelector />
          <AuthOverlay />
          <AICommandCenter />
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <MapProvider>
      <AppContent />
    </MapProvider>
  );
};

export default App;