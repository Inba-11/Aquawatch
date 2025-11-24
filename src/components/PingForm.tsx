import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface SensorData {
  ph: number;
  tds: number;
  turbidity: number;
}

const PingForm = () => {
  const [locationId, setLocationId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [sensorData, setSensorData] = useState<SensorData>({
    ph: 7.0,
    tds: 300,
    turbidity: 2.5,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          toast.success('Location detected');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not detect location. Please enter manually.');
        }
      );
    }

    const fetchLatest = async () => {
      try {
        const apiUrl = import.meta.env.DEV 
          ? '/api/latest' 
          : 'http://127.0.0.1:8000/latest';
        const res = await fetch(apiUrl);
        if (!res.ok) {
          if (res.status === 404) {
            console.warn('No sensor data available yet');
            return;
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setSensorData({
          ph: data.ph,
          tds: data.tds,
          turbidity: data.turbidity,
        });
      } catch (error) {
        console.error('Error fetching latest sensor data', error);
        toast.error('Failed to fetch current sensor readings');
      }
    };

    fetchLatest();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationId || !type || latitude === null || longitude === null) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/ping' 
        : 'http://127.0.0.1:8000/ping';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          name: name || null,
          type,
          ph: sensorData.ph,
          tds: sensorData.tds,
          turbidity: sensorData.turbidity,
          lat: latitude,
          lon: longitude,
          comments: comments || null,
          status: 'pending',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      toast.success('Water quality issue reported successfully!');

      // Reset form
      setLocationId('');
      setName('');
      setType('');
      setComments('');
    } catch (error) {
      console.error('Error submitting ping:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Water Quality Issue</CardTitle>
        <CardDescription>
          Help improve water safety in your community by reporting water quality concerns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locationId">Location ID *</Label>
              <Input
                id="locationId"
                placeholder="e.g., TN-CBE-Block23-Tank03"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                placeholder="e.g., Joel, Coimbatore"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Location Type *</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select location type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home_tank">Home Tank</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="pond">Pond</SelectItem>
                <SelectItem value="lake">Lake</SelectItem>
                <SelectItem value="river">River</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude || ''}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                placeholder="Auto-detected"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude || ''}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                placeholder="Auto-detected"
              />
            </div>
          </div>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Current Sensor Readings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">pH</p>
                <p className="text-2xl font-bold">{sensorData.ph.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TDS</p>
                <p className="text-2xl font-bold">{sensorData.tds.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Turbidity</p>
                <p className="text-2xl font-bold">{sensorData.turbidity.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Describe the water situation..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PingForm;