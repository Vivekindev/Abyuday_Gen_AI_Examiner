import { useEffect, useId, useRef } from "react";
import PropTypes from 'prop-types';
import { Link } from "react-router-dom";
import {
  FiArrowUpRight,
  FiCheck,
  FiLoader,
  FiX,
  FiAlertCircle,
  FiInbox,
} from "react-icons/fi";

export function Brand({ compact = false }) {
  return (
    <Link to="/" className="brand" aria-label="Abyuday home">
      <span className="brand-symbol" aria-hidden="true">
        <img src="/abyuday-mark.svg" alt="" width="36" height="36" />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          abyuday<span className="brand-period">.</span>
        </span>
      )}
    </Link>
  );
}
export function Button({
  children,
  to,
  variant = "primary",
  className = "",
  icon: Icon,
  disabled = false,
  ...props
}) {
  const Component = to ? disabled ? 'span' : Link : "button";
  return (
    <Component
      {...(to ? disabled ? { role: 'link', 'aria-disabled': true } : { to } : { type: "button", disabled })}
      className={`btn btn-${variant} ${className}`}
      {...props}
      onClick={disabled ? undefined : props.onClick}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </Component>
  );
}
export function Avatar({ name = "User", size = "", color = "" }) {
  return (
    <span className={`avatar ${size} ${color}`} aria-hidden="true">
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
export function Status({ value }) {
  const normalized = String(value || "Queued").toLowerCase();
  const type = ["done", "ready", "completed"].includes(normalized)
    ? "ready"
    : normalized === "error"
      ? "error"
      : normalized === "processing"
        ? "processing"
        : "queued";
  const label = {
    ready: normalized === "completed" ? "Completed" : "Ready",
    error: "Failed",
    processing: "Generating",
    queued: "Queued",
  }[type];
  return (
    <span className={`status status-${type}`}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function EmptyState({
  icon: Icon = FiInbox,
  title,
  description,
  children,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        <Icon />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ErrorNotice({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      <FiAlertCircle aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}
export function LoadingState({ rows = 3 }) {
  return (
    <div className="skeleton-group" role="status" aria-label="Loading content">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton" />
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  );
}
export function PageLoader() {
  return (
    <div className="page-loader" role="status">
      <Brand />
      <FiLoader className="spin" />
      <span>Opening your workspace…</span>
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
  closeDisabled = false,
}) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (open && !ref.current.open) ref.current.showModal();
    else if (!open && ref.current.open) ref.current.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        if (!closeDisabled) onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (!closeDisabled && event.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="modal-content">
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={closeDisabled}
          >
            <FiX />
          </button>
        </div>
        {description && (
          <p id={descriptionId} className="muted">
            {description}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
export function SectionLink({ to, children }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <FiArrowUpRight />
    </Link>
  );
}
export function Stepper({ steps, current }) {
  return (
    <ol className="stepper" aria-label="Creation progress">
      {steps.map((step, index) => (
        <li
          key={step}
          className={
            index === current ? "current" : index < current ? "complete" : ""
          }
          aria-current={index === current ? "step" : undefined}
        >
          <span>{index < current ? <FiCheck /> : index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

Brand.propTypes = { compact: PropTypes.bool };
Button.propTypes = {
  children: PropTypes.node,
  to: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  variant: PropTypes.string,
  className: PropTypes.string,
  icon: PropTypes.elementType,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};
Avatar.propTypes = { name: PropTypes.string, size: PropTypes.string, color: PropTypes.string };
Status.propTypes = { value: PropTypes.string };
PageHeading.propTypes = { eyebrow: PropTypes.node, title: PropTypes.node, description: PropTypes.node, children: PropTypes.node };
EmptyState.propTypes = { icon: PropTypes.elementType, title: PropTypes.node, description: PropTypes.node, children: PropTypes.node };
ErrorNotice.propTypes = { message: PropTypes.string, onRetry: PropTypes.func };
LoadingState.propTypes = { rows: PropTypes.number };
Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  description: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
  closeDisabled: PropTypes.bool,
};
SectionLink.propTypes = { to: PropTypes.oneOfType([PropTypes.string, PropTypes.object]), children: PropTypes.node };
Stepper.propTypes = { steps: PropTypes.arrayOf(PropTypes.string).isRequired, current: PropTypes.number.isRequired };
