import React from 'react';

interface HeaderProps {
  onNewProject: () => void;
  onExport: () => void;
  showExport: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNewProject, onExport, showExport }) => {
  return (
    <header className="bg-brand-surface/80 backdrop-blur-sm sticky top-0 z-10 border-b border-white/10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 text-brand-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 6C5.34315 6 4 7.34315 4 9V17C4 18.6569 5.34315 20 7 20H15C16.6569 20 18 18.6569 18 17V15H17V17C17 18.1046 16.1046 19 15 19H7C5.89543 19 5 18.1046 5 17V9C5 7.89543 5.89543 7 7 7H9V6H7Z"/>
            <path d="M10 4C8.34315 4 7 5.34315 7 7V15C7 16.6569 8.34315 18 10 18H18C19.6569 18 21 16.6569 21 15V7C21 5.34315 19.6569 4 18 4H10ZM10 5H18C19.1046 5 20 5.89543 20 7V15C20 16.1046 19.1046 17 18 17H10C8.89543 17 8 16.1046 8 15V7C8 5.89543 8.89543 5 10 5Z"/>
          </svg>
          <h1 className="text-xl font-bold text-brand-text-main tracking-tight">A2M</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onNewProject}
            className="px-4 py-2 text-sm font-medium bg-brand-surface hover:bg-white/10 border border-white/10 rounded-md transition-colors"
          >
            New Project
          </button>
          {showExport && (
            <button
              onClick={onExport}
              className="px-4 py-2 text-sm font-medium bg-brand-primary hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Export Video
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;