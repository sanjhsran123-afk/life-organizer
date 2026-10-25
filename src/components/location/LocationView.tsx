import React, { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  MapPin,
  Compass,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  Key,
  Satellite,
  Smartphone,
  Globe,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface CoordinatesState {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

type LocationStatus = 'idle' | 'loading' | 'success' | 'denied' | 'unavailable' | 'error';
type EmbedMode = 'place' | 'view';

export const LocationView: React.FC = () => {
  const { showToast } = useApp();

  // Purely ephemeral component state: NOT stored in localStorage, NOT sent to DayLedger backend
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<CoordinatesState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showKeyGuide, setShowKeyGuide] = useState<boolean>(false);

  // Embed API configuration
  const [embedMode, setEmbedMode] = useState<EmbedMode>('place'); // 'place' mode supports a marker at coordinates
  const [mapType, setMapType] = useState<'satellite' | 'roadmap'>('satellite');
  const [zoomLevel, setZoomLevel] = useState<number>(18);

  // Environment variable configured Google Maps Embed API Key
  const envEmbedKey = (
    (import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY as string | undefined) ||
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
    ''
  ).trim();

  const [sessionApiKey, setSessionApiKey] = useState<string>(envEmbedKey);
  const [tempKeyInput, setTempKeyInput] = useState<string>('');

  // Determine runtime platform
  const isNative = Capacitor.isNativePlatform();
  const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const platformLabel = isNative ? 'Android App (Capacitor)' : isPwa ? 'Progressive Web App (PWA)' : 'Web Browser';

  // Request location only upon explicit user tap
  const handleGetLocation = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    // Native Capacitor Android / iOS path
    if (isNative) {
      try {
        let perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          perm = await Geolocation.requestPermissions();
        }

        if (perm.location === 'denied') {
          setStatus('denied');
          setErrorMessage('Location permission was denied. Please allow location access in your Android device settings.');
          showToast('Location permission denied on device', 'error');
          return;
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });

        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp,
        });
        setStatus('success');
        showToast('Current location successfully acquired', 'success');
        return;
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.toLowerCase().includes('denied')) {
          setStatus('denied');
          setErrorMessage('Location permission was denied by Android OS. Please grant location permission to DayLedger in Settings.');
          showToast('Location permission denied', 'error');
        } else if (msg.toLowerCase().includes('disabled') || msg.toLowerCase().includes('services') || msg.toLowerCase().includes('provider')) {
          setStatus('unavailable');
          setErrorMessage('Device GPS / Location Services are disabled. Please turn on Location in your device quick settings.');
          showToast('GPS / Location services disabled', 'warning');
        } else {
          setStatus('unavailable');
          setErrorMessage(msg || 'Unable to retrieve location from Android GPS.');
          showToast('Failed to acquire location', 'error');
        }
        return;
      }
    }

    // Web & PWA browser path
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setErrorMessage('Geolocation API is not supported by this browser environment.');
      showToast('Geolocation not supported in browser', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp,
        });
        setStatus('success');
        showToast('Current location updated', 'success');
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setStatus('denied');
            setErrorMessage(
              'Location permission was denied. To view your location, click the site settings or lock icon in your browser address bar and set Location to Allow.'
            );
            showToast('Location permission denied', 'error');
            break;
          case error.POSITION_UNAVAILABLE:
            setStatus('unavailable');
            setErrorMessage(
              'Location information is unavailable. Ensure your device has an active Wi-Fi or cellular network connection and GPS enabled.'
            );
            showToast('Location unavailable', 'warning');
            break;
          case error.TIMEOUT:
            setStatus('unavailable');
            setErrorMessage('The request to determine your location timed out. Please try refreshing again.');
            showToast('Location request timed out', 'warning');
            break;
          default:
            setStatus('error');
            setErrorMessage(error.message || 'An unexpected error occurred while obtaining your location.');
            showToast('Failed to get location', 'error');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [isNative, showToast]);

  // Open location directly in Google Maps
  const handleOpenGoogleMaps = () => {
    if (!coords) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Copy coordinates string
  const handleCopyCoords = () => {
    if (!coords) return;
    const text = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Copied coordinates: ${text}`, 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  const activeApiKey = sessionApiKey.trim();

  // Build the Google Maps Embed API URL:
  // - Mode "place": uses /maps/embed/v1/place?key=KEY&q=lat,lng&maptype=satellite (shows a red marker pin on coordinates)
  // - Mode "view": uses /maps/embed/v1/view?key=KEY&center=lat,lng&zoom=...&maptype=satellite (shows centered satellite view without pin)
  // - If no key is set yet: falls back to the Google Maps standard embed URL: https://maps.google.com/maps?q=lat,lng&t=k&z=17&output=embed (t=k is satellite, shows marker, requires no API key)
  const getEmbedUrl = (): string | null => {
    if (!coords) return null;
    const { latitude, longitude } = coords;

    if (activeApiKey) {
      if (embedMode === 'place') {
        // Embed API 'place' mode supports a visible marker on coordinates
        return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
          activeApiKey
        )}&q=${latitude},${longitude}&zoom=${zoomLevel}&maptype=${mapType}`;
      } else {
        // Embed API 'view' mode centers the map without a marker
        return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(
          activeApiKey
        )}&center=${latitude},${longitude}&zoom=${zoomLevel}&maptype=${mapType}`;
      }
    }

    // Keyless fallback: provides an embedded satellite map with marker directly
    const mapTypeCode = mapType === 'satellite' ? 'k' : 'm';
    return `https://maps.google.com/maps?q=${latitude},${longitude}&t=${mapTypeCode}&z=${zoomLevel}&output=embed`;
  };

  const embedUrl = getEmbedUrl();

  return (
    <div className="space-y-6 animate-pop-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Location &amp; Satellite Map
            </h2>
            <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
              Google Maps Embed API (No-Charge Tier)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time on-demand GPS coordinates with Google Maps Embed satellite view.
          </p>
        </div>

        {/* Platform Badge */}
        <div className="flex items-center flex-wrap gap-2">
          <Badge variant="neutral" size="sm" className="gap-1.5 py-1">
            {isNative ? <Smartphone className="w-3 h-3 text-indigo-500" /> : <Globe className="w-3 h-3 text-emerald-500" />}
            <span>{platformLabel}</span>
          </Badge>

          <Badge variant="success" size="sm" className="gap-1.5 py-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>On-Demand Only</span>
          </Badge>
        </div>
      </div>

      {/* Accurate Privacy Disclosure */}
      <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Accurate Privacy &amp; Data Handling Notice</span>
        </div>
        <p className="text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
          <strong>DayLedger Backend:</strong> Location permission is queried <em>only when you tap</em>. Coordinates are held solely in temporary device memory, are never tracked in the background, and are never saved or sent to DayLedger’s database/backend.
        </p>
        <p className="text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
          <strong>Google Service Notice:</strong> When the satellite map is loaded below, your browser sends an embedded request directly to Google’s servers for the coordinates displayed, so Google receives the request to render the satellite map tiles and place marker.
        </p>
      </div>

      {/* Main Location Controls & Metrics Card */}
      <Card padded className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs shrink-0">
              <Compass className={`w-6 h-6 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {coords ? 'Device Location Acquired' : 'Locate Device Position'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {coords
                  ? `Updated at ${new Date(coords.timestamp).toLocaleTimeString()}`
                  : 'Tap the button below to query current GPS coordinates.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {coords ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGetLocation}
                  loading={status === 'loading'}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />}
                >
                  Refresh Location
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenGoogleMaps}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Open in Google Maps
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyCoords}
                  icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Copied' : 'Copy Coords'}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleGetLocation}
                loading={status === 'loading'}
                icon={<MapPin className="w-4 h-4" />}
                className="shadow-md"
              >
                {status === 'loading' ? 'Acquiring GPS...' : 'Show my location'}
              </Button>
            )}
          </div>
        </div>

        {/* Status Feedback Alerts */}
        {status === 'loading' && (
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/60 flex items-center gap-3 animate-pulse">
            <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="text-xs text-indigo-900 dark:text-indigo-200">
              <p className="font-semibold">Acquiring current position from your device...</p>
              <p className="text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                Requesting high-accuracy GPS coordinates through {isNative ? 'Capacitor Android Geolocation' : 'browser Geolocation API'}.
              </p>
            </div>
          </div>
        )}

        {status === 'denied' && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200 flex-1">
              <p className="font-semibold">Location Permission Denied</p>
              <p className="text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                {errorMessage || 'Access to your device location was rejected.'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="danger" size="xs" onClick={handleGetLocation}>
                  Try Again
                </Button>
                <span className="text-[11px] text-rose-700 dark:text-rose-300">
                  Tip: Check your browser address bar lock icon or Android App Settings &gt; Permissions.
                </span>
              </div>
            </div>
          </div>
        )}

        {status === 'unavailable' && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 flex-1">
              <p className="font-semibold">Location Unavailable</p>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                {errorMessage || 'Your device position could not be determined at this moment.'}
              </p>
              <div className="mt-3">
                <Button variant="outline" size="xs" onClick={handleGetLocation}>
                  Retry GPS Connection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Live Coordinates Grid when acquired */}
        {coords && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Latitude
              </span>
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5 block">
                {coords.latitude.toFixed(6)}°
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 block">
                {coords.latitude >= 0 ? 'North' : 'South'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Longitude
              </span>
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5 block">
                {coords.longitude.toFixed(6)}°
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 block">
                {coords.longitude >= 0 ? 'East' : 'West'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                GPS Accuracy
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                  ±{coords.accuracy} m
                </span>
                <Badge
                  variant={coords.accuracy <= 20 ? 'success' : coords.accuracy <= 60 ? 'warning' : 'danger'}
                  size="xs"
                >
                  {coords.accuracy <= 20 ? 'High' : coords.accuracy <= 60 ? 'Medium' : 'Low'}
                </Badge>
              </div>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 block">
                Confidence radius
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Fix Timestamp
              </span>
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5 block">
                {new Date(coords.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 block">
                {new Date(coords.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Satellite Map Container (Google Maps Embed API) */}
      <Card padded={false} className="overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-md">
        {/* Map Header & Controls */}
        <div className="p-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2.5 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <Satellite className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Google Maps Embed Satellite View
            </h4>
            <Badge variant="success" size="xs">
              $0 No-Charge API
            </Badge>
          </div>

          {/* Embed Mode & Map Controls */}
          {coords && (
            <div className="flex items-center flex-wrap gap-2 text-xs">
              {/* Embed Mode (Place mode shows marker, View mode does not) */}
              <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setEmbedMode('place')}
                  className={`px-2.5 py-1 font-medium transition-colors ${
                    embedMode === 'place'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Embed 'place' mode drops a red location marker pin directly at your coordinates"
                >
                  Place (With Marker)
                </button>
                <button
                  type="button"
                  onClick={() => setEmbedMode('view')}
                  className={`px-2.5 py-1 font-medium transition-colors ${
                    embedMode === 'view'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Embed 'view' mode centers the map without any marker pin"
                >
                  View (No Marker)
                </button>
              </div>

              {/* Map Type Toggle (Satellite vs Roadmap) */}
              <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMapType('satellite')}
                  className={`px-2 py-1 font-medium transition-colors ${
                    mapType === 'satellite'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  Satellite
                </button>
                <button
                  type="button"
                  onClick={() => setMapType('roadmap')}
                  className={`px-2 py-1 font-medium transition-colors ${
                    mapType === 'roadmap'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  Map
                </button>
              </div>

              {/* Zoom Selector */}
              <select
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] focus:outline-none"
              >
                <option value={19}>Zoom: Ultra (19)</option>
                <option value={18}>Zoom: Close (18)</option>
                <option value={16}>Zoom: Street (16)</option>
                <option value={14}>Zoom: Area (14)</option>
              </select>
            </div>
          )}
        </div>

        {/* Map Frame Container */}
        <div className="relative w-full h-[420px] sm:h-[520px] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden">
          {coords && embedUrl ? (
            <iframe
              key={`${coords.latitude}-${coords.longitude}-${embedMode}-${mapType}-${zoomLevel}-${activeApiKey ? 'keyed' : 'keyless'}`}
              title="Google Maps Embed Satellite View"
              src={embedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            // Idle initial state before user taps "Show my location"
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm space-y-3.5 text-zinc-300">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 shadow-md">
                <Satellite className="w-7 h-7" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-white">
                  Satellite Map Ready
                </h5>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Tap "Show my location" to locate your current device position and display it on the satellite view.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleGetLocation}
                icon={<MapPin className="w-3.5 h-3.5" />}
              >
                Show my location
              </Button>
            </div>
          )}
        </div>

        {/* Marker & Embed Mode Verification Note */}
        {coords && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>
                {embedMode === 'place'
                  ? 'Embed Mode: "place" — Google Maps renders an official red marker pin at your coordinates.'
                  : 'Embed Mode: "view" — Centered satellite imagery without a marker pin.'}
              </span>
            </div>
            <span className="font-mono text-zinc-600 dark:text-zinc-300">
              {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
            </span>
          </div>
        )}
      </Card>

      {/* Embed API Key Setup, Billing Transparency & Restriction Guide Card */}
      <Card padded className="border-indigo-100 dark:border-indigo-950/60">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setShowKeyGuide((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Google Maps Embed API Key Setup &amp; Billing Notice</span>
                <Badge variant={activeApiKey ? 'success' : 'neutral'} size="xs">
                  {activeApiKey ? 'Embed Key Configured' : 'Using Keyless Embed'}
                </Badge>
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Important information regarding Google Cloud billing account requirements, $0 usage, and referrer restrictions.
              </p>
            </div>
          </div>
          <button className="text-zinc-400 p-1 hover:text-zinc-600 dark:hover:text-zinc-200">
            {showKeyGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showKeyGuide && (
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {/* Quick Session Key Tester */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                Test Embed API Key in Current Session:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste AIzaSy... Embed API key"
                  value={tempKeyInput}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (tempKeyInput.trim()) {
                      setSessionApiKey(tempKeyInput.trim());
                      showToast('Embed API key applied to current session', 'success');
                    }
                  }}
                >
                  Apply
                </Button>
                {sessionApiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSessionApiKey('');
                      setTempKeyInput('');
                      showToast('Session key cleared; switched to keyless embed', 'info');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Crucial Billing Requirement Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Google Cloud Billing Account Requirement for API Keys:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The <strong>Maps Embed API is a $0.00 SKU (unlimited free embeds with no usage charges)</strong>. However, Google Cloud Platform mandates that a valid <strong>Cloud Billing Account</strong> (credit/debit card on file) be linked to your GCP project before it allows activating any Maps API or generating a working API key.
              </p>
              <p className="text-[11px] leading-relaxed">
                If you do <em>not</em> want to link a billing card to Google Cloud, <strong>you do not need an API key</strong>: DayLedger automatically falls back to the keyless embed endpoint (<code>https://maps.google.com/maps?q=lat,lng&amp;t=k&amp;output=embed</code>), which displays the satellite view and location pin without requiring a billing account.
              </p>
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    If Creating a Key in Google Cloud Platform
                  </strong>
                  <p className="mt-0.5">
                    Open{' '}
                    <a
                      href="https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentskills_v1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 underline font-medium"
                    >
                      Google Cloud Console Credentials
                    </a>{' '}
                    and enable only the <strong>Maps Embed API</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    Add Environment Variable
                  </strong>
                  <p className="mt-0.5">
                    Set the key in your local <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]">.env</code> or hosting environment variables (Cloudflare Pages / Netlify):
                  </p>
                  <pre className="mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-mono text-[11px] text-zinc-800 dark:text-zinc-200 overflow-x-auto">
                    VITE_GOOGLE_MAPS_EMBED_API_KEY=AIzaSyYourEmbedKeyHere
                  </pre>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    Restrict the Key (Never Skip This)
                  </strong>
                  <p className="mt-0.5">
                    In Cloud Console &gt; Credentials &gt; Edit Key:
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                    <li>
                      <strong>API Restrictions:</strong> Select <em>Restrict key</em> and choose <strong>Maps Embed API</strong> only. Do not select Maps JavaScript API or Places API.
                    </li>
                    <li>
                      <strong>Application Restrictions:</strong> Select <strong>Websites (HTTP referrers)</strong> and enter:
                      <br />
                      <code>https://&lt;your-project&gt;.pages.dev/*</code> (Cloudflare Pages)
                      <br />
                      <code>https://your-domain.netlify.app/*</code> (Netlify fallback)
                      <br />
                      <code>https://localhost/*</code> (allows the embed to load inside local Vite and the Capacitor Android WebView).
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
