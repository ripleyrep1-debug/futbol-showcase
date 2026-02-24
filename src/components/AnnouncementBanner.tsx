import { useState } from "react";
import { X, AlertTriangle, Megaphone } from "lucide-react";

interface AnnouncementBannerProps {
  announcement?: string;
  maintenanceMode?: boolean;
}

const AnnouncementBanner = ({ announcement, maintenanceMode }: AnnouncementBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (maintenanceMode) {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-3">
        <div className="container mx-auto flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Bakım modu aktif — Bahis işlemleri geçici olarak durdurulmuştur.</span>
        </div>
      </div>
    );
  }

  if (!announcement || dismissed) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2.5">
      <div className="container mx-auto flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 shrink-0" />
          <span>{announcement}</span>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 hover:opacity-70 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
