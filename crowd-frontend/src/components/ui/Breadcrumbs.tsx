import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Only use where the hierarchy isn't already obvious from the page itself —
 * e.g. an incident's detail view ("Security Command / Incident Log /
 * INC-000123"). List pages get a plain PageHeader with a back link instead.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {index > 0 && <ChevronRight size={12} className="sep" />}
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span className={index === items.length - 1 ? "current" : ""}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
