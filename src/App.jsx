import { useState, useEffect } from 'react';
import './styles/globals.css';
import Header from './components/Header';
import Nav from './components/Nav';
import DashboardPage from './components/dashboard/DashboardPage';
import ConceptsPage from './components/concepts/ConceptsPage';
import PracticePage from './components/practice/PracticePage';
import GlossaryPage from './components/glossary/GlossaryPage';
import AuthPage from './components/auth/AuthPage';
import MigrationPrompt from './components/auth/MigrationPrompt';
import { useAuth } from './hooks/useAuth';
import useStore from './store';
import { hasLocalData } from './lib/migration';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const { session, loading: authLoading, signOut } = useAuth();
  const hydrateFromSupabase = useStore(s => s.hydrateFromSupabase);
  const clearOnLogout = useStore(s => s.clearOnLogout);
  const hydrated = useStore(s => s._hydrated);

  const [showMigration, setShowMigration] = useState(false);

  // Hydrate store from Supabase when user logs in
  useEffect(() => {
    if (!session?.user?.id) return;

    hydrateFromSupabase(session.user.id).then((hasRemoteData) => {
      // If new user (no remote data) and has local data, offer migration
      if (!hasRemoteData && hasLocalData()) {
        setShowMigration(true);
      }
    });
  }, [session?.user?.id]);

  // Clear store on logout
  useEffect(() => {
    if (!session) {
      clearOnLogout();
    }
  }, [session]);

  // Auth loading
  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo">
            <span style={{ color: 'var(--accent)' }}>ES</span> Academy
          </div>
          <p style={{ color: 'var(--muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!session) {
    return <AuthPage />;
  }

  // Migration prompt for existing localStorage users
  if (showMigration) {
    return (
      <MigrationPrompt
        userId={session.user.id}
        onDone={(imported) => {
          setShowMigration(false);
          if (imported) {
            // Re-hydrate from Supabase to get the migrated data
            hydrateFromSupabase(session.user.id);
          }
        }}
      />
    );
  }

  return (
    <>
      <Header signOut={signOut} userEmail={session.user.email} synced={hydrated} />
      <Nav active={tab} onSelect={setTab} />
      {tab === 'dashboard'   && <DashboardPage />}
      {tab === 'concepts'    && <ConceptsPage />}
      {/* Practice stays mounted (hidden) so active trades survive tab switches */}
      <div style={{ display: tab === 'practice' ? 'contents' : 'none' }}>
        <PracticePage />
      </div>
      {tab === 'glossary'    && <GlossaryPage />}
    </>
  );
}
