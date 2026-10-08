import { Suspense, useEffect, useRef, useState } from "react";
import PropTypes from 'prop-types';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiGrid,
  FiHelpCircle,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiSearch,
  FiSettings,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { toast } from "sonner";
import {
  Avatar,
  Brand,
  Button,
  ErrorNotice,
  LoadingState,
  Modal,
} from "../components/ui";
import ThemeToggle from "../theme/ThemeToggle";
import { api, errorMessage } from "../lib/api";
import useResource from "../hooks/useResource";
import "./workspace.css";

const primary = [
  {
    label: "Overview",
    mobileLabel: "Home",
    to: "/dashboard",
    icon: FiGrid,
    end: true,
  },
  { label: "Assessments", mobileLabel: "Tests", to: "/dashboard/tests", icon: FiBookOpen },
  { label: "Take a test", mobileLabel: "Take test", to: "/dashboard/take", icon: FiTarget },
  { label: "Results", to: "/dashboard/results", icon: FiTrendingUp },
  { label: "Teams", to: "/dashboard/teams", icon: FiUsers },
];
const secondary = [
  { label: 'Engine library', to: '/dashboard/engines', icon: FiGrid },
  { label: 'Interaction playground', to: '/dashboard/labs', icon: FiGrid },
  { label: "Settings", to: "/dashboard/settings", icon: FiSettings },
  { label: "Help", to: "/dashboard/help", icon: FiHelpCircle },
];

function CommandSearch({ open, onClose, navigation }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const tests = useResource(open ? "/fetchcreatedtests" : null, {
    method: "post",
  });
  const commands = [
    ...navigation,
    { label: "Create assessment", to: "/dashboard/create", icon: FiPlus },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  const matches = query.trim()
    ? (tests.data || [])
        .filter((item) =>
          `${item.testName} ${item.testID}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 5)
    : [];
  const go = (to) => {
    onClose();
    setQuery("");
    navigate(to);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Search"
      className="command-modal"
    >
      <label className="command-input">
        <FiSearch />
        <input
          autoFocus
          placeholder="Search pages or assessments"
          aria-label="Search workspace"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="command-results">
        {commands.map(({ label, to, icon: Icon }) => (
          <button key={to} onClick={() => go(to)}>
            <Icon />
            <span>{label}</span>
            <FiArrowRight />
          </button>
        ))}
        {matches.length > 0 && <p className="eyebrow">Assessments</p>}
        {matches.map((test) => (
          <button
            key={test.testID}
            onClick={() =>
              go(`/dashboard/take?testID=${encodeURIComponent(test.testID)}`)
            }
          >
            <FiBookOpen />
            <span>{test.testName}</span>
            <FiArrowRight />
          </button>
        ))}
        {!commands.length && !matches.length && (
          <p className="command-empty">No results found.</p>
        )}
        {tests.error && (
          <p className="command-empty">Assessment search is unavailable.</p>
        )}
      </div>
    </Modal>
  );
}
CommandSearch.propTypes = { open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired, navigation: PropTypes.array.isRequired };

export default function Workspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useResource("/me");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);
  const previousPath = useRef(location.pathname);
  const adminItems = ["owner", "admin"].includes(user.data?.platformRole)
    ? [{ label: "Admin", to: "/dashboard/admin", icon: FiShield }]
    : [];
  const navigation = [...primary, ...adminItems, ...secondary];
  const current = [
    ...navigation,
    { label: "Create assessment", to: "/dashboard/create" },
  ].find((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to),
  );
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
    document.title = `${current?.label || "Workspace"} · Abyuday`;
  }, [location.pathname, current?.label]);
  useEffect(() => {
    if (previousPath.current === location.pathname || mobileOpen || searchOpen) return;
    const frame = requestAnimationFrame(() => {
      contentRef.current?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, mobileOpen, searchOpen]);
  useEffect(() => {
    const keyboard = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileOpen(false);
        setSearchOpen((value) => !value);
      }
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const change = () => setIsMobile(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = sidebarRef.current;
    sidebar.querySelector(".sidebar-close")?.focus();
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const items = [
        ...sidebar.querySelectorAll("a[href],button:not(:disabled)"),
      ].filter((item) => item.getClientRects().length);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    sidebar.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previousOverflow;
      sidebar.removeEventListener("keydown", trap);
      previousFocus?.focus();
    };
  }, [isMobile, mobileOpen]);
  const logout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/logout");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, "Could not sign out."));
    } finally {
      setLoggingOut(false);
    }
  };
  const navLink = ({ label, to, end, icon: Icon }) => (
    <NavLink key={to} to={to} end={end} title={label} aria-label={label}>
      <Icon aria-hidden="true" />
      <span className="nav-label">{label}</span>
    </NavLink>
  );
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="workspace-navigation"
        className={`workspace-sidebar ${mobileOpen ? "is-open" : ""}`}
        aria-label="Navigation"
        inert={isMobile && !mobileOpen ? "" : undefined}
        aria-hidden={isMobile && !mobileOpen ? true : undefined}
      >
        <div className="sidebar-logo">
          <Brand />
          <button
            className="sidebar-close icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <FiX />
          </button>
        </div>
        <Button
          to="/dashboard/create"
          icon={FiPlus}
          className="sidebar-create"
          title="Create assessment"
          aria-label="Create assessment"
        >
          Create assessment
        </Button>
        <nav aria-label="Workspace">
          {[...primary, ...adminItems].map(navLink)}
        </nav>
        <div className="sidebar-bottom">
          <nav aria-label="Account and tools">{secondary.map(navLink)}</nav>
          <div className="sidebar-profile">
            <Link to="/dashboard/settings" aria-label="Account settings">
              <Avatar name={user.data?.name || "User"} />
              <span>
                <strong>{user.data?.name || "Account"}</strong>
                <small>{user.data?.email || ""}</small>
              </span>
            </Link>
            <button
              className="icon-button"
              onClick={logout}
              disabled={loggingOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>
      <div
        className="workspace-main"
        inert={isMobile && mobileOpen ? "" : undefined}
      >
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="workspace-navigation"
            >
              <FiMenu />
            </button>
            <strong>{current?.label || "Workspace"}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="Search workspace"
            >
              <FiSearch />
              <span>Search</span>
              <kbd>⌘ / Ctrl K</kbd>
            </button>
            <ThemeToggle />
            <Link
              className="topbar-account icon-button"
              to="/dashboard/settings"
              aria-label="Account settings"
            >
              <Avatar name={user.data?.name || "User"} size="small" />
            </Link>
          </div>
        </header>
        <main
          ref={contentRef}
          className="workspace-content"
          id="workspace-content"
          tabIndex={-1}
          aria-label={current?.label || 'Workspace'}
        >
          <ErrorNotice message={user.error} onRetry={user.reload} />
          <Suspense
            fallback={
              <section className="panel">
                <LoadingState rows={5} />
              </section>
            }
          >
            <Outlet context={{ me: user.data, setMe: user.setData }} />
          </Suspense>
        </main>
      </div>
      <nav
        className="mobile-bottom-nav"
        aria-label="Primary"
        inert={mobileOpen ? "" : undefined}
      >
        {primary.map(({ label, mobileLabel, to, end, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} className={to === '/dashboard/take' ? 'mobile-take-test' : undefined}>
            <Icon aria-hidden="true" />
            <span>{mobileLabel || label}</span>
          </NavLink>
        ))}
      </nav>
      <CommandSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        navigation={navigation}
      />
    </div>
  );
}
