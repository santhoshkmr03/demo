import React from 'react';
import { CloudUpload, MediaImagePlus } from 'iconoir-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

/**
 * Visual entry point to the upload page. It does not accept files itself —
 * file validation and preview live in `pages/Upload.jsx`.
 */
export function Dropzone({ className, onClick }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else {
      navigate('/upload');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative group rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-all duration-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed border-outline-variant/40 hover:border-secondary',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest shadow-md flex items-center justify-center text-secondary group-hover:scale-105 transition-transform duration-200 mb-4 border border-outline-variant/20">
        <CloudUpload size={32} />
      </div>
      <div className="flex flex-col items-center max-w-md">
        <span className="text-xl font-semibold text-on-surface">
          Choose a handwriting image to screen
        </span>
        <span className="text-sm text-on-surface-variant mt-1">
          One page, photographed or scanned. PNG or JPG.
        </span>
      </div>
      <div className="mt-6">
        <Button variant="primary" icon={MediaImagePlus} onClick={handleClick}>
          Choose image
        </Button>
      </div>
    </div>
  );
}
