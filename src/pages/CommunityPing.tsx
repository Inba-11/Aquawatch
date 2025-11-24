import React from 'react';
import { NavLink } from '@/components/NavLink';

const CommunityPing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <nav className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <NavLink to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AquaWatch
              </NavLink>
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/community">Community Pings</NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Community Water Quality
          </h1>
          <p className="text-muted-foreground">
            Report and track water quality issues in your community
          </p>
        </div>
      </main>
    </div>
  );
};

export default CommunityPing;