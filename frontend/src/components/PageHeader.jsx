export default function PageHeader({ title, actions }) {
  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      {actions && <div className="btn-row">{actions}</div>}
    </div>
  );
}
