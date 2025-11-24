import React, { useEffect, useRef, useState } from 'react';

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Ping {
  id: string;
  location_id: string;
  name: string | null;

  type: string;
  ph: number;
  tds: number;
  turbidity: number;
  latitude: number;
  longitude: number;
  comments: string | null;
  status: string;
  created_at: string;
}

interface PingApiResponse {
  ping_id: number;
  location_id: string;
  name: string | null;
  type: string;
  ph: number;
  tds: number;
  turbidity: number;
  lat: number;
  lon: number;
  comments: string | null;
  status: string;
  timestamp: string;
}

const PingMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [selectedPing, setSelectedPing] = useState<Ping | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');

  const fetchPings = async () => {
    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/pings' 
        : 'http://127.0.0.1:8000/pings';
      const res = await fetch(apiUrl);
      if (!res.ok) {
        if (res.status === 400) {
          console.error('Invalid request parameters');
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data: PingApiResponse[] = await res.json();
      const mapped = data
        .filter((p) => p.lat != null && p.lon != null) // Filter out pings without coordinates
        .map((p) => ({
          id: String(p.ping_id),
          location_id: p.location_id,
          name: p.name,
          type: p.type,
          ph: p.ph ?? 0,
          tds: p.tds ?? 0,
          turbidity: p.turbidity ?? 0,
          latitude: p.lat!,
          longitude: p.lon!,
          comments: p.comments,
          status: p.status,
          created_at: p.timestamp,
        }));
      setPings(mapped);
    } catch (error) {
      console.error('Error fetching pings', error);
      setPings([]); // Set empty array on error
    }
  };

  useEffect(() => {
    fetchPings();
    // Refresh pings every 30 seconds
    const interval = setInterval(fetchPings, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 20.5937], // Center of India
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current || pings.length === 0) return;

    // Clear existing markers
    const markers = document.getElementsByClassName('mapboxgl-marker');
    while (markers[0]) {
      markers[0].remove();
    }

    // Add markers for each ping
    pings.forEach((ping) => {
      const el = document.createElement('div');
      el.className = 'ping-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.border = '3px solid white';
      
      // Color based on status
      if (ping.status === 'pending') {
        el.style.backgroundColor = 'hsl(var(--destructive))';
      } else if (ping.status === 'in_progress') {
        el.style.backgroundColor = 'hsl(var(--warning))';
      } else {
        el.style.backgroundColor = 'hsl(var(--success))';
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([ping.longitude, ping.latitude])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedPing(ping);
        map.current?.flyTo({
          center: [ping.longitude, ping.latitude],
          zoom: 12,
        });
      });
    });

    // Fit map to show all pings
    if (pings.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      pings.forEach((ping) => {
        bounds.extend([ping.longitude, ping.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [pings]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-success text-success-foreground">Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getWaterQuality = (ph: number, tds: number, turbidity: number) => {
    const issues = [];
    if (ph < 6.5 || ph > 8.5) issues.push('pH out of range');
    if (tds > 500) issues.push('High TDS');
    if (turbidity > 5) issues.push('High turbidity');
    
    if (issues.length === 0) return { status: 'Safe', color: 'success' };
    if (issues.length === 1) return { status: 'Needs Attention', color: 'warning' };
    return { status: 'Unsafe', color: 'destructive' };
  };

  if (!mapboxToken) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Community Water Quality Pings</CardTitle>
          <CardDescription>Enter your Mapbox token to view the map</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            placeholder="Enter Mapbox Public Token"
            className="w-full px-4 py-2 border rounded-lg"
            onChange={(e) => setMapboxToken(e.target.value)}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Get your token from{' '}
            <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              mapbox.com
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="h-[600px]">
          <CardHeader>
            <CardTitle>Community Water Quality Map</CardTitle>
            <CardDescription>Click on markers to view details</CardDescription>
          </CardHeader>
          <CardContent className="h-[500px]">
            <div ref={mapContainer} className="w-full h-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
              <span className="text-sm">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(var(--warning))' }} />
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(var(--success))' }} />
              <span className="text-sm">Resolved</span>
            </div>
          </CardContent>
        </Card>

        {selectedPing && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedPing.name || 'Anonymous'}</CardTitle>
                  <CardDescription className="capitalize">
                    {selectedPing.type.replace('_', ' ')}
                  </CardDescription>
                </div>
                {getStatusBadge(selectedPing.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Location ID</p>
                <p className="text-sm text-muted-foreground">{selectedPing.location_id}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Water Quality</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">pH</span>
                    <span className="text-sm font-medium">{selectedPing.ph.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">TDS</span>
                    <span className="text-sm font-medium">{selectedPing.tds.toFixed(0)} ppm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Turbidity</span>
                    <span className="text-sm font-medium">{selectedPing.turbidity.toFixed(1)} NTU</span>
                  </div>
                </div>
              </div>

              {selectedPing.comments && (
                <div>
                  <p className="text-sm font-medium">Comments</p>
                  <p className="text-sm text-muted-foreground">{selectedPing.comments}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium">Reported</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedPing.created_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PingMap;