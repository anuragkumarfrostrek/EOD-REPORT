'use client';

export default function AppShell({ children, title, subtitle, actions }) {
  return (
    <div className="main-content">
      <header className="header">
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-3 items-center">{actions}</div>}
      </header>
      <main className="page-container">{children}</main>
    </div>
  );
}
