import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = "Back to Dashboard",
  actions,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header-titles">
        {backTo && (
          <Link to={backTo} className="page-header-back">
            <ArrowLeft size={13} />
            {backLabel}
          </Link>
        )}
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
