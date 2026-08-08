import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PharmacyOnboarding({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data: pharmacy, error: pharmacyError } = await supabase
        .from("pharmacies")
        .insert({ name, address, city, state, phone, owner_name: null })
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
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create pharmacy & continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
