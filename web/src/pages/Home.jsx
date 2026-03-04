import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGeo } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import GeoMap from "@/components/GeoMap";

const HISTORY_KEY = "geo-history";

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;

function isValidIP(ip) {
  if (!ip || typeof ip !== "string") return false;
  const t = ip.trim();
  return IPV4_REGEX.test(t) || IPV6_REGEX.test(t);
}

export default function Home() {
  const { setToken } = useAuth();
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ipInput, setIpInput] = useState("");
  const [searchError, setSearchError] = useState("");
  const [history, setHistory] = useState(loadHistory);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchGeo = useCallback(async (ip = null) => {
    setError("");
    setSearchError("");
    setLoading(true);
    try {
      const data = await getGeo(ip);
      setGeo(data);
      if (ip) {
        setHistory((prev) => {
          const next = [ip.trim(), ...prev.filter((h) => h !== ip.trim())].slice(0, 50);
          saveHistory(next);
          return next;
        });
      }
    } catch (err) {
      setError(err.message);
      if (ip) setSearchError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGeo();
  }, [fetchGeo]);

  function handleSearch(e) {
    e.preventDefault();
    const ip = ipInput.trim();
    setSearchError("");
    if (!ip) {
      fetchGeo();
      return;
    }
    if (!isValidIP(ip)) {
      setSearchError("Please enter a valid IPv4 address.");
      return;
    }
    fetchGeo(ip);
  }

  function handleClear() {
    setIpInput("");
    setSearchError("");
    fetchGeo();
  }

  function handleHistoryClick(ip) {
    setIpInput(ip);
    setSearchError("");
    fetchGeo(ip);
  }

  function toggleSelect(ip) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip);
      else next.add(ip);
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setHistory((prev) => {
      const next = prev.filter((ip) => !selectedIds.has(ip));
      saveHistory(next);
      return next;
    });
    setSelectedIds(new Set());
    if (geo && selectedIds.has(geo.ip)) {
      setIpInput("");
      fetchGeo();
    }
  }

  function handleLogout() {
    setToken(null);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Geo Lookup</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>IP & Geolocation</CardTitle>
            <CardDescription>
              Your current IP and location, or search by IP address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
              <Input
                placeholder="e.g. 8.8.8.8"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                className="flex-1 min-w-[140px]"
              />
              <Button type="submit" disabled={loading}>
                Search
              </Button>
              <Button type="button" variant="outline" onClick={handleClear} disabled={loading}>
                Clear
              </Button>
            </form>
            {searchError && (
              <p className="text-sm text-destructive" role="alert">
                {searchError}
              </p>
            )}
            {error && !searchError && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {loading && !geo ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : geo ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <dt className="font-medium text-muted-foreground">IP</dt>
                <dd>{geo.ip}</dd>
                <dt className="font-medium text-muted-foreground">Country</dt>
                <dd>{geo.country ?? "—"}</dd>
                <dt className="font-medium text-muted-foreground">Country code</dt>
                <dd>{geo.country_code ?? "—"}</dd>
                <dt className="font-medium text-muted-foreground">Continent</dt>
                <dd>{geo.continent ?? "—"}</dd>
                <dt className="font-medium text-muted-foreground">ASN</dt>
                <dd>{geo.asn ?? "—"}</dd>
                <dt className="font-medium text-muted-foreground">AS name</dt>
                <dd>{geo.as_name ?? "—"}</dd>
              </dl>
            ) : null}
          </CardContent>
        </Card>

        {geo && geo.latitude != null && geo.longitude != null && Number.isFinite(geo.latitude) && Number.isFinite(geo.longitude) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Map</CardTitle>
              <CardDescription>
                Location of the current or searched IP address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeoMap
                latitude={geo.latitude}
                longitude={geo.longitude}
                label={geo.ip}
                approximate={geo.approximate}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Search history</CardTitle>
            <CardDescription>Previously searched IPs. Click to show again.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                Delete selected ({selectedIds.size})
              </Button>
            )}
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No search history yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((ip) => (
                  <li key={ip} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(ip)}
                      onChange={() => toggleSelect(ip)}
                      aria-label={`Select ${ip}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleHistoryClick(ip)}
                      className="text-sm text-primary hover:underline text-left"
                    >
                      {ip}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
