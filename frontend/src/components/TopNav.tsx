import { GITHUB_REPO_URL } from '../config';
import './TopNav.css';

interface TopNavProps {
  variant?: 'landing' | 'app' | 'docs';
  onNavigate?: (path: string) => void;
  onNewRun?: () => void;
  onOpenApp?: () => void;
  onGoHome?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({
  variant = 'app',
  onNavigate,
  onNewRun,
  onOpenApp,
  onGoHome,
}) => {
  const brand = (
    <div className="topnav-brand">
      <span className="topnav-dot" aria-hidden="true" />
      <span className="topnav-name">Delayt</span>
      <span className="topnav-version">v2.0</span>
    </div>
  );

  const openDocs = () => onNavigate?.('/docs');
  const openCliDocs = () => onNavigate?.('/docs#cli');

  return (
    <header className="topnav">
      {(variant === 'app' || variant === 'docs') && onGoHome ? (
        <button type="button" className="topnav-brand-btn" onClick={onGoHome}>
          {brand}
        </button>
      ) : (
        brand
      )}

      <nav className="topnav-links" aria-label="Primary">
        {variant === 'landing' && (
          <>
            <a className="topnav-link" href="#features">
              Features
            </a>
            <button type="button" className="topnav-link" onClick={openDocs}>
              Docs
            </button>
            <a className="topnav-link" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <button type="button" className="topnav-cta" onClick={onOpenApp}>
              Open app <span aria-hidden="true">→</span>
            </button>
          </>
        )}

        {variant === 'docs' && (
          <>
            <button type="button" className="topnav-link topnav-link-active" aria-current="page">
              Docs
            </button>
            <a className="topnav-link" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <button type="button" className="topnav-cta" onClick={onOpenApp}>
              Open app <span aria-hidden="true">→</span>
            </button>
          </>
        )}

        {variant === 'app' && (
          <>
            <button type="button" className="topnav-link" onClick={onNewRun}>
              New run
            </button>
            <button type="button" className="topnav-link" onClick={openDocs}>
              Docs
            </button>
            <a className="topnav-link" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <button type="button" className="topnav-cta" onClick={openCliDocs}>
              Install CLI <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </nav>
    </header>
  );
};

export default TopNav;
