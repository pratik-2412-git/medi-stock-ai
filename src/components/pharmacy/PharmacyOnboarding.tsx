import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidLatitude, isValidLongitude, parseCoordinate } from "@/lib/pharmacy-signup";

export function PharmacyOnboarding({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  // Raw strings while typing (not numbers), so a partial entry like "19."
  // isn't silently rounded mid-keystroke. Parsed + range-validated on submit.
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported by this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success("Location captured");
      },
      () => {
        setLocating(false);
        toast.error("Could not get your location — you can enter it manually");
      },
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // A trailing decimal point ("19.") is an incomplete entry, and a value
    // outside the real coordinate range is never storable.
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);
    if (latitude.trim() !== "" && parsedLatitude === null) {
      toast.error("Latitude must be a complete decimal number, e.g. 19.0760");
      return;
    }
    if (longitude.trim() !== "" && parsedLongitude === null) {
      toast.error("Longitude must be a complete decimal number, e.g. 72.8777");
      return;
    }
    if (parsedLatitude !== null && !isValidLatitude(parsedLatitude)) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }
    if (parsedLongitude !== null && !isValidLongitude(parsedLongitude)) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }

    setLoading(true);
    try {
      // Saving pincode + latitude/longitude here is what makes this pharmacy
      // show up in a patient's "within 10km" medicine search — without
      // these, the pharmacy is created but permanently invisible to search.
      const { data: pharmacy, error: pharmacyError } = await supabase
        .from("pharmacies")
        .insert({
          name,
          address,
          city,
          state,
          phone,
          pincode: pincode || null,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          owner_name: null,
        })
        .select("id")
        .single();
      if (pharmacyError) throw pharmacyError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ pharmacy_id: pharmacy.id })
        .eq("id", userId);
      if (profileError) throw profileError;

      toast.success("Pharmacy created");
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create pharmacy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Set up your pharmacy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us about your pharmacy so we can link it to your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Pharmacy name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              inputMode="numeric"
              pattern="[0-9]{4,10}"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                aria-label="Latitude"
                placeholder="Latitude"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              <Input
                aria-label="Longitude"
                placeholder="Longitude"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={detectLocation}
              disabled={locating}
            >
              <MapPin className="mr-2 size-4" />
              {locating ? "Getting location..." : "Use my current location"}
            </Button>
            <p className="text-xs text-muted-foreground">
              This is required so patients searching nearby can find your pharmacy.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create pharmacy & continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}