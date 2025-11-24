import { useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && (
        <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />
      )}
      {!isLoading && <Dashboard />}
    </>
  );
};

export default Index;
