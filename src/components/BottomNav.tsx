import { Trophy, UserPlus, LogIn, Gamepad2 } from "lucide-react";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border safe-area-bottom">
      <div className="flex items-stretch">
        <a
          href="#"
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <LogIn className="h-5 w-5" />
          <span className="text-[10px] font-medium">Giriş</span>
        </a>

        <a
          href="#"
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          <span className="text-[10px] font-medium">Kayıt</span>
        </a>

        {/* Center CTA */}
        <a
          href="#odds"
          className="relative flex flex-col items-center justify-center px-4 py-2 gap-0.5"
        >
          <div className="absolute -top-5 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-background">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-[10px] font-bold text-primary mt-4">Bahisler</span>
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
      </div>
    </nav>
  );
};

export default BottomNav;
