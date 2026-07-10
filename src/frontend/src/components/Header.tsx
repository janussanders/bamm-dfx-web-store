import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Shield, X } from "lucide-react";
import { useState } from "react";
import { SocialLoginButtons } from "../components/SocialLoginButtons";
import { useIsAdmin } from "../hooks/useQueries";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, login, clear, isLoggingIn } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();

  const handleAuth = () => {
    if (isAuthenticated) {
      clear();
      queryClient.clear();
      navigate({ to: "/" });
    } else {
      login();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <img
            src="/assets/generated/bamm-logo-transparent.dim_200x200.png"
            alt="BAMM Logo"
            className="h-8 w-8"
          />
          <span className="text-xl font-bold">
            B.A.M.M<span className="text-primary">!</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            to="/"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Home
          </Link>
          <Link
            to="/premium"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Premium
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Admin
            </Link>
          )}
          {!isAuthenticated ? (
            <div className="relative">
              <Button
                onClick={handleAuth}
                disabled={isLoggingIn}
                variant="default"
                size="sm"
                data-ocid="header.login_button"
              >
                {isLoggingIn ? "Logging in..." : "Login"}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAuth}
              variant="outline"
              size="sm"
              data-ocid="header.logout_button"
            >
              Logout
            </Button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <nav className="container py-4 flex flex-col space-y-3">
            <Link
              to="/"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/premium"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Premium
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            {!isAuthenticated ? (
              <div>
                <Button
                  onClick={() => {
                    handleAuth();
                    setMobileMenuOpen(false);
                  }}
                  disabled={isLoggingIn}
                  variant="default"
                  size="sm"
                  className="w-full"
                  data-ocid="header.mobile_login_button"
                >
                  {isLoggingIn ? "Logging in..." : "Login"}
                </Button>
                <SocialLoginButtons
                  layout="column"
                  onSuccess={() => setMobileMenuOpen(false)}
                />
              </div>
            ) : (
              <Button
                onClick={() => {
                  handleAuth();
                  setMobileMenuOpen(false);
                }}
                variant="outline"
                size="sm"
                className="w-full"
                data-ocid="header.mobile_logout_button"
              >
                Logout
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
