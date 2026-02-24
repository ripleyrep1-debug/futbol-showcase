import { Trophy, Wallet, Receipt, Gamepad2, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface BottomNavProps {
  onOpenDeposit?: () => void;
  onOpenAuth?: (tab: "login" | "register") => void;
}

const BottomNav = ({ onOpenDeposit, onOpenAuth }: BottomNavProps) => {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border safe-area-bottom">
      <div className="flex items-stretch">
        {user ? (
          <>
            <a
              href="#odds"
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Gamepad2 className="h-5 w-5" />
              <span className="text-[10px] font-medium">Bahisler</span>
            </a>
            <Link
              to="/bahislerim"
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Receipt className="h-5 w-5" />
              <span className="text-[10px] font-medium">Kuponlarım</span>
            </Link>
            {/* Center CTA */}
            <a
              href="#odds"
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-primary"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-bold text-primary">Canlı</span>
            </a>
            <button
              onClick={onOpenDeposit}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Wallet className="h-5 w-5" />
              <span className="text-[10px] font-medium">Bakiye</span>
            </button>
            <a
              href="#standings"
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-[10px] font-medium">Puan</span>
            </a>
          </>
        ) : (
          <>
            <button
              onClick={() => onOpenAuth?.("login")}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <LogIn className="h-5 w-5" />
              <span className="text-[10px] font-medium">Giriş</span>
            </button>
            <button
              onClick={() => onOpenAuth?.("register")}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-[10px] font-medium">Kayıt</span>
            </button>
            <a
              href="#odds"
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-primary"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-bold text-primary">Bahisler</span>
            </a>
            <a
              href="#live"
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Gamepad2 className="h-5 w-5" />
              <span className="text-[10px] font-medium">Spor</span>
            </a>
            <a
              href="#standings"
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-[10px] font-medium">Puan</span>
            </a>
          </>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
