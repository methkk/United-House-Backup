import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessagesModal } from '../components/MessagesModal';

export function MessagesPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50">
      <MessagesModal
        isOpen={true}
        onClose={handleClose}
      />
    </div>
  );
}