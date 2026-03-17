import { useState } from 'react';
import './styles/globals.css';
import Header from './components/Header';
import Nav from './components/Nav';
import DashboardPage from './components/dashboard/DashboardPage';
import ConceptsPage from './components/concepts/ConceptsPage';
import PracticePage from './components/practice/PracticePage';
import JournalPage from './components/journal/JournalPage';
import GlossaryPage from './components/glossary/GlossaryPage';

export default function App() {
  const [tab, setTab] = useState('dashboard');

  return (
    <>
      <Header />
      <Nav active={tab} onSelect={setTab} />
      {tab === 'dashboard'   && <DashboardPage />}
      {tab === 'concepts'    && <ConceptsPage />}
      {/* Practice stays mounted (hidden) so active trades survive tab switches */}
      <div style={{ display: tab === 'practice' ? 'contents' : 'none' }}>
        <PracticePage />
      </div>
      {tab === 'journal'     && <JournalPage />}
      {tab === 'glossary'    && <GlossaryPage />}
    </>
  );
}
