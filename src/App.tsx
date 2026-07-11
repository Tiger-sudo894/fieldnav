import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  Compass,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import './App.css'

type LocationFix = {
  latitude: number
  longitude: number
  accuracy: number | null
  altitude: number | null
  altitudeAccuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

type SavedLocation = LocationFix & {
  id: string
  name: string
  notes: string
}

type PermissionStatus = 'idle' | 'watching' | 'error'

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number
}

const savedLocationsKey = 'field-nav-kit:saved-locations'

const formatCoordinate = (value: number | null | undefined, axis: 'lat' | 'lon') => {
  if (typeof value !== 'number') return '--'

  const direction = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
  return `${Math.abs(value).toFixed(6)} ${direction}`
}

const formatMeters = (value: number | null | undefined) => {
  if (typeof value !== 'number') return 'Unknown'
  if (value >= 1000) return `${(value / 1000).toFixed(2)} km`
  return `${Math.round(value)} m`
}

const formatSpeed = (value: number | null | undefined) => {
  if (typeof value !== 'number') return 'Unknown'
  return `${(value * 3.6).toFixed(1)} km/h`
}

const formatHeading = (value: number | null | undefined) => {
  if (typeof value !== 'number') return '--'
  return `${Math.round(value)} deg`
}

const cardinalDirection = (degrees: number | null | undefined) => {
  if (typeof degrees !== 'number') return 'Waiting'
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return directions[Math.round(degrees / 45) % directions.length]
}

const normalizeDegrees = (value: number) => (value + 360) % 360

function App() {
  const [currentFix, setCurrentFix] = useState<LocationFix | null>(null)
  const [gpsStatus, setGpsStatus] = useState<PermissionStatus>('idle')
  const [gpsError, setGpsError] = useState('')
  const [compassHeading, setCompassHeading] = useState<number | null>(null)
  const [compassStatus, setCompassStatus] = useState('Enable compass')
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(savedLocationsKey) ?? '[]')
    } catch {
      return []
    }
  })
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    localStorage.setItem(savedLocationsKey, JSON.stringify(savedLocations))
  }, [savedLocations])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('error')
      setGpsError('GPS is not available on this device.')
      return
    }

    setGpsStatus('watching')
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { coords } = position
        setCurrentFix({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          heading: coords.heading,
          speed: coords.speed,
          timestamp: position.timestamp,
        })
        setGpsError('')
      },
      (error) => {
        setGpsStatus('error')
        setGpsError(error.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const displayHeading = compassHeading ?? currentFix?.heading ?? null

  const coordinates = useMemo(
    () => ({
      latitude: formatCoordinate(currentFix?.latitude, 'lat'),
      longitude: formatCoordinate(currentFix?.longitude, 'lon'),
    }),
    [currentFix],
  )

  const enableCompass = async () => {
    const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<PermissionState>
    }

    try {
      if (typeof orientationEvent.requestPermission === 'function') {
        const permission = await orientationEvent.requestPermission()
        if (permission !== 'granted') {
          setCompassStatus('Compass permission denied')
          return
        }
      }

      window.addEventListener('deviceorientation', handleOrientation, true)
      setCompassStatus('Compass active')
    } catch {
      setCompassStatus('Compass unavailable')
    }
  }

  const handleOrientation = (event: DeviceOrientationEventWithCompass) => {
    const heading =
      typeof event.webkitCompassHeading === 'number'
        ? event.webkitCompassHeading
        : typeof event.alpha === 'number'
          ? 360 - event.alpha
          : null

    if (typeof heading === 'number') {
      setCompassHeading(normalizeDegrees(heading))
    }
  }

  const saveLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentFix || !name.trim()) return

    setSavedLocations((locations) => [
      {
        ...currentFix,
        id: crypto.randomUUID(),
        name: name.trim(),
        notes: notes.trim(),
      },
      ...locations,
    ])
    setName('')
    setNotes('')
  }

  const removeLocation = (id: string) => {
    setSavedLocations((locations) => locations.filter((location) => location.id !== id))
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Outdoor navigation kit</p>
          <h1>FieldNav</h1>
        </div>
        <div className={`status-pill ${gpsStatus}`}>
          {gpsStatus === 'error' ? <AlertTriangle size={18} /> : <LocateFixed size={18} />}
          <span>{gpsStatus === 'watching' ? 'GPS live' : gpsStatus}</span>
        </div>
      </header>

      <section className="coordinate-panel" aria-label="Current GPS coordinates">
        <div className="panel-title">
          <Crosshair size={22} />
          <span>Current position</span>
        </div>
        <div className="coordinate-grid">
          <div>
            <span>Latitude</span>
            <strong>{coordinates.latitude}</strong>
          </div>
          <div>
            <span>Longitude</span>
            <strong>{coordinates.longitude}</strong>
          </div>
        </div>
        {gpsError ? <p className="sensor-error">{gpsError}</p> : null}
        <div className="metrics-strip">
          <span>Accuracy: {formatMeters(currentFix?.accuracy)}</span>
          <span>Altitude: {formatMeters(currentFix?.altitude)}</span>
          <span>Speed: {formatSpeed(currentFix?.speed)}</span>
          <span>
            Updated:{' '}
            {currentFix ? new Intl.DateTimeFormat([], { timeStyle: 'medium' }).format(currentFix.timestamp) : 'Waiting'}
          </span>
        </div>
      </section>

      <section className="tool-grid">
        <div className="compass-panel" aria-label="Compass">
          <div className="panel-title">
            <Compass size={22} />
            <span>Compass</span>
          </div>
          <div className="compass-dial">
            <div className="compass-ring">
              <span className="north">N</span>
              <span className="east">E</span>
              <span className="south">S</span>
              <span className="west">W</span>
              <Navigation
                className="needle"
                size={84}
                style={{ transform: `rotate(${displayHeading ?? 0}deg)` }}
                aria-hidden="true"
              />
            </div>
            <div>
              <strong>{formatHeading(displayHeading)}</strong>
              <span>{cardinalDirection(displayHeading)}</span>
            </div>
          </div>
          <button type="button" className="secondary-button" onClick={enableCompass}>
            <RefreshCw size={18} />
            <span>{compassStatus}</span>
          </button>
        </div>

        <form className="save-panel" onSubmit={saveLocation}>
          <div className="panel-title">
            <MapPin size={22} />
            <span>Save this spot</span>
          </div>
          <label>
            Short name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Trail cache, gate 3, sample point..."
              maxLength={60}
            />
          </label>
          <label>
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional details"
              rows={4}
              maxLength={180}
            />
          </label>
          <button type="submit" className="primary-button" disabled={!currentFix || !name.trim()}>
            <Plus size={18} />
            <span>Save current location</span>
          </button>
        </form>
      </section>

      <section className="saved-panel" aria-label="Saved locations">
        <div className="panel-title saved-title">
          <MapPin size={22} />
          <span>Saved locations</span>
          <small>{savedLocations.length}</small>
        </div>
        {savedLocations.length === 0 ? (
          <p className="empty-state">Saved field points will appear here.</p>
        ) : (
          <ul className="location-list">
            {savedLocations.map((location) => (
              <li key={location.id}>
                <div>
                  <strong>{location.name}</strong>
                  {location.notes ? <p>{location.notes}</p> : null}
                  <span>
                    {formatCoordinate(location.latitude, 'lat')} / {formatCoordinate(location.longitude, 'lon')}
                  </span>
                  <span>
                    Accuracy {formatMeters(location.accuracy)} •{' '}
                    {new Intl.DateTimeFormat([], { dateStyle: 'medium', timeStyle: 'short' }).format(location.timestamp)}
                  </span>
                </div>
                <button type="button" aria-label={`Remove ${location.name}`} onClick={() => removeLocation(location.id)}>
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
