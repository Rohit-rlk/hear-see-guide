import { useState, useEffect } from "react";
import { Download, Share, Smartphone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">App Installed!</h1>
        <p className="text-muted-foreground text-center">
          HearSee Guide is installed on your device. Open it from your home screen.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <Smartphone className="w-16 h-16 text-primary mb-6" />
      <h1 className="text-3xl font-bold mb-2">Install HearSee Guide</h1>
      <p className="text-muted-foreground text-center mb-8 max-w-sm">
        Install this app on your phone for the best experience — works offline and launches instantly.
      </p>

      {isIOS ? (
        <div className="bg-muted rounded-xl p-6 max-w-sm text-center space-y-3">
          <p className="font-semibold">To install on iPhone/iPad:</p>
          <div className="flex items-center gap-2 justify-center text-sm">
            <Share className="w-5 h-5" />
            <span>Tap the <strong>Share</strong> button in Safari</span>
          </div>
          <div className="flex items-center gap-2 justify-center text-sm">
            <Download className="w-5 h-5" />
            <span>Then tap <strong>"Add to Home Screen"</strong></span>
          </div>
        </div>
      ) : deferredPrompt ? (
        <Button size="lg" onClick={handleInstall} className="gap-2">
          <Download className="w-5 h-5" />
          Install App
        </Button>
      ) : (
        <div className="bg-muted rounded-xl p-6 max-w-sm text-center space-y-3">
          <p className="font-semibold">To install:</p>
          <p className="text-sm text-muted-foreground">
            Open this page in Chrome or Edge, then tap the browser menu (⋮) and select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
          </p>
        </div>
      )}
    </div>
  );
};

export default Install;
