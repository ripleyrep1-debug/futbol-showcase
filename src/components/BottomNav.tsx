import { Trophy, Wallet, Receipt, Gamepad2, LogIn, UserPlus, Spade } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface BottomNavProps {
  onOpenDeposit?: () => void;
  onOpenAuth?: (tab: "login" | "register") => void;
}

const BottomNav = ({ onOpenDeposit, onOpenAuth }: BottomNavProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const oddsHref = isHome ? "#odds" : "/#odds";
  const standingsHref = isHome ? "#standings" : "/#standings";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border safe-area-bottom">
      <div className="flex items-stretch">
        {user ? (
          <>
            <Link
              to={oddsHref}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground active:text-primary transition-colors"
            >
              <Gamepad2 className="h-5 w-5" />
              <span className="text-[10px] font-medium">Bahisler</span>
            </Link>
            <Link
              to="/bahislerim"
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${location.pathname === "/bahislerim" ? "text-primary" : "text-muted-foreground active:text-primary"}`}
            >
              <Receipt className="h-5 w-5" />
              <span className="text-[10px] font-medium">Kuponlarım</span>
            </Link>
            <Link
              to={oddsHref}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-primary"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-bold text-primary">Canlı</span>
            </Link>
            <button
              type="button"
              onClick={onOpenDeposit}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground active:text-primary transition-colors"
            >
              <Wallet className="h-5 w-5" />
              <span className="text-[10px] font-medium">Bakiye</span>
            </button>
            <Link
              to="/blackjack"
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${location.pathname === "/blackjack" ? "text-primary" : "text-muted-foreground active:text-primary"}`}
            >
              <Spade className="h-5 w-5" />
              <span className="text-[10px] font-medium">Blackjack</span>
            </Link>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onOpenAuth?.("login")}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground active:text-primary transition-colors"
            >
              <LogIn className="h-5 w-5" />
              <span className="text-[10px] font-medium">Giriş</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth?.("register")}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground active:text-primary transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-[10px] font-medium">Kayıt</span>
            </button>
            <Link
              to={oddsHref}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-primary"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-bold text-primary">Bahisler</span>
            </Link>
            <Link
              to={oddsHref}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground active:text-primary transition-colors"
            >
              <Gamepad2 className="h-5 w-5" />
              <span className="text-[10px] font-medium">Spor</span>
            </Link>
            <Link
              to={standingsHref}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground active:text-primary transition-colors"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-[10px] font-medium">Puan</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
