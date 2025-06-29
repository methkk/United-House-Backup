import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { CommunityPage } from './pages/CommunityPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { AdminVerification } from './pages/AdminVerification';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { MessagesPage } from './pages/MessagesPage';
import { EmailConfirmationHandler } from './components/EmailConfirmationHandler';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <EmailConfirmationHandler />
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/r/:communityName" element={<CommunityPage />} />
              <Route path="/r/:communityName/post/:postId" element={<PostDetailPage />} />
              <Route path="/r/:communityName/project/:projectId" element={<ProjectDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/user/:username" element={<PublicProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/admin/verification" element={<AdminVerification />} />
            </Routes>
          </main>
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;