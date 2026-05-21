import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
// Phase 2 pages
import { BudgetPage } from './pages/BudgetPage';
import { RecurringPage } from './pages/RecurringPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { TransactionsPage } from './pages/TransactionsPage';
// Phase 4 pages
import { BillingPage } from './pages/BillingPage';
import { AccountsPage } from './pages/AccountsPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { CommandPalette } from './components/CommandPalette';
import { Toaster } from 'react-hot-toast';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0f1225',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '600',
                padding: '12px 18px',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
              },
            }}
          />
          <CommandPalette />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <PrivateRoute><DashboardPage /></PrivateRoute>
            } />
            <Route path="/transactions" element={
              <PrivateRoute><TransactionsPage /></PrivateRoute>
            } />
            <Route path="/budgets" element={
              <PrivateRoute><BudgetPage /></PrivateRoute>
            } />
            <Route path="/recurring" element={
              <PrivateRoute><RecurringPage /></PrivateRoute>
            } />
            <Route path="/receipts" element={
              <PrivateRoute><ReceiptsPage /></PrivateRoute>
            } />
            <Route path="/billing" element={
              <PrivateRoute><BillingPage /></PrivateRoute>
            } />
            <Route path="/accounts" element={
              <PrivateRoute><AccountsPage /></PrivateRoute>
            } />
            <Route path="/ai-assistant" element={
              <PrivateRoute><AiAssistantPage /></PrivateRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

