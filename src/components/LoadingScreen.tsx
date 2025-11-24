import { useEffect, useState } from "react";
import { Droplet } from "lucide-react";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onLoadingComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-primary">
      <div className="text-center animate-scale-in">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <Droplet className="w-24 h-24 text-white animate-pulse-glow" strokeWidth={1.5} />
            <div className="absolute inset-0 blur-2xl bg-white/30 rounded-full" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
          AquaWatch
        </h1>
        
        {/* Slogan */}
        <p className="text-xl text-white/90 mb-8 font-light">
          Real-time water quality at your fingertips
        </p>

        {/* Progress Bar */}
        <div className="w-64 mx-auto">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/70 text-sm mt-3">
            {progress < 100 ? "Connecting to sensors..." : "Ready!"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
