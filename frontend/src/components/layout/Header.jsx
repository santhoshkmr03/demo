import React from 'react';
import { Search, Settings, CloudUpload, HalfMoon, SunLight, Menu } from 'iconoir-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export function Header({ isScrolled = false, onOpenCommandPalette, onToggleMobileSidebar }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'fixed top-0 left-0 lg:left-64 right-0 h-16 z-40 flex items-center justify-between px-4 sm:px-8 bg-surface-container-lowest border-b transition-shadow duration-200 ease-out font-body',
        isScrolled ? 'border-outline-variant/40 shadow-md' : 'border-outline-variant/20 shadow-none'
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          title="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-on-surface-variant font-medium">Handwriting screening</span>
          <span className="text-sm text-outline-variant">/</span>
          <span className="text-sm font-semibold text-on-surface">Screening aid</span>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-4 sm:mx-8">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="relative flex items-center w-full h-10 pl-9 pr-3 rounded-lg text-sm text-on-surface-variant bg-surface border border-outline-variant/25 hover:border-outline-variant hover:bg-surface-container-low focus:outline-none transition-all cursor-pointer text-left shadow-xs"
        >
          <Search className="absolute left-3 text-on-surface-variant" size={17} />
          <span className="truncate">Search commands or saved screenings...</span>
          <kbd className="hidden sm:inline-block ml-auto px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-mono text-on-surface font-semibold border border-outline-variant/20">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <SunLight size={19} className="text-amber-400" />
          ) : (
            <HalfMoon size={19} />
          )}
        </button>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/15">
          <Settings className="text-secondary" size={15} />
          <span className="font-mono text-xs font-semibold">ConvNeXt-Tiny · 5-fold</span>
        </div>

        <Button
          variant="accent"
          size="sm"
          icon={CloudUpload}
          onClick={() => navigate('/upload')}
          className="hidden sm:inline-flex cursor-pointer text-xs"
        >
          New screening
        </Button>
      </div>
    </header>
  );
}
