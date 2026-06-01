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
      <span className="topnav-name">delayt</span>
      <span className="topnav-version">v2.0.1</span>
    </div>
  );

  const openDocs = () => onNavigate?.('/docs');
  const openCliDocs = () => onNavigate?.('/docs#cli');

  return (
    <header className="topnav">
      <div className="topnav-inner">
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
              <button type="button" className="topnav-link" onClick={openDocs}>
                docs
              </button>
              <a className="topnav-link" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                github
              </a>
              <button type="button" className="topnav-cta" onClick={onOpenApp}>
                open_app →
              </button>
            </>
          )}

          {variant === 'docs' && (
            <>
              <button type="button" className="topnav-link topnav-link-active" aria-current="page">
                docs
              </button>
              <a className="topnav-link" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                github
              </a>
              <button type="button" className="topnav-cta" onClick={onOpenApp}>
                open_app →
              </button>
            </>
          )}

          {variant === 'app' && (
            <>
              <button type="button" className="topnav-link" onClick={onNewRun}>
                new_run
              </button>
              <button type="button" className="topnav-link" onClick={openDocs}>
                docs
              </button>
              <a className="topnav-link" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                github
              </a>
              <button type="button" className="topnav-cta" onClick={openCliDocs}>
                install_cli →
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
