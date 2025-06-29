import React from 'react';
import { MapPin, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { lookupPostcode, reverseGeocode, extractConstituencyInfo, isValidUKPostcode } from '../lib/postcodes';

interface LocationData {
  constituency: string;
  postcode: string;
  country: string;
  region: string;
  admin_district: string;
  admin_county: string;
  latitude: number;
  longitude: number;
}

interface LocationDetectionProps {
  onLocationDetected: (locationData: LocationData) => void;
  onError: (error: string) => void;
}

export function LocationDetection({ onLocationDetected, onError }: LocationDetectionProps) {
  const [loading, setLoading] = React.useState(false);
  const [locationData, setLocationData] = React.useState<LocationData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleAutoDetection = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user's current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      // Use Postcodes.io to reverse geocode the coordinates
      const postcodeData = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );

      if (!postcodeData) {
        throw new Error('Unable to determine postcode from your location. Please ensure location services are enabled and try again.');
      }

      const locationInfo = extractConstituencyInfo(postcodeData);
      setLocationData(locationInfo);
      onLocationDetected(locationInfo);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect location automatically';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (locationData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Location detected successfully</span>
        </div>
        
        <div className="bg-green-50 p-4 rounded-md space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-green-700">Constituency:</span>
              <p className="text-green-800">{locationData.constituency}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Postcode:</span>
              <p className="text-green-800">{locationData.postcode}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Region:</span>
              <p className="text-green-800">{locationData.region}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">District:</span>
              <p className="text-green-800">{locationData.admin_district}</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          This information will be used to verify your eligibility for location-specific communities and services.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Confirm Your Residential Location
        </h3>
        <p className="text-gray-600">
          We need to verify your constituency for access to location-specific communities and government services.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  handleAutoDetection();
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleAutoDetection}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Detecting location...
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5 mr-2" />
              Auto-detect my location
            </>
          )}
        </button>

        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Why do we need this?</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Access to your local parliamentary constituency community</li>
            <li>• Verification for location-specific government services</li>
            <li>• Eligibility for local council and regional discussions</li>
            <li>• Enhanced security and authenticity verification</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">Location Services Required</p>
              <p>Please ensure location services are enabled in your browser and that you're in the UK for accurate detection.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}