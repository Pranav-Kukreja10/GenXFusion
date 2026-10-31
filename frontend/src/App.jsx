import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { BillsProvider, useBills } from './context/BillsContext';
import ScrollToTopAndFocus from './components/ScrollToTopAndFocus';
import LandingRoute from './components/LandingRoute';
import DashboardPage from './components/DashboardPage';
import NotFoundPage from './components/NotFoundPage';

/**
 * Redirects /dashboard to the latest active bill ID or first available bill.
 */
function DashboardRedirect() {
  const { latestBillId, bills } = useBills();
  const targetId = latestBillId || bills[0]?.invoice_id || 'INV-2026-2260';
  return <Navigate to={`/dashboard/${targetId}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BillsProvider>
          <ScrollToTopAndFocus />
          <Routes>
            <Route path="/" element={<LandingRoute />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/dashboard/:billId" element={<DashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BillsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
