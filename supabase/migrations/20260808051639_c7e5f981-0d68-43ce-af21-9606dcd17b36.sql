-- pharmacies
CREATE TABLE public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  pharmacy_type TEXT,
  opening_time TIME,
  closing_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pharmacies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacies TO authenticated;
GRANT ALL ON public.pharmacies TO service_role;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient','pharmacy')),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- helper: current user's pharmacy
CREATE OR REPLACE FUNCTION public.owns_pharmacy(_pharmacy_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'pharmacy'
      AND pharmacy_id = _pharmacy_id
  )
$$;

CREATE POLICY "Anyone can view pharmacies" ON public.pharmacies FOR SELECT USING (true);
CREATE POLICY "Signed in users can create pharmacies" ON public.pharmacies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owners can update their pharmacy" ON public.pharmacies FOR UPDATE TO authenticated USING (public.owns_pharmacy(id)) WITH CHECK (public.owns_pharmacy(id));
CREATE POLICY "Owners can delete their pharmacy" ON public.pharmacies FOR DELETE TO authenticated USING (public.owns_pharmacy(id));

-- medicines
CREATE TABLE public.medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  composition TEXT,
  category TEXT,
  manufacturer TEXT,
  dosage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.medicines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view medicines" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Signed in users can add medicines" ON public.medicines FOR INSERT TO authenticated WITH CHECK (true);

-- stock
CREATE TABLE public.stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, medicine_id)
);
GRANT SELECT ON public.stock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock TO authenticated;
GRANT ALL ON public.stock TO service_role;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stock" ON public.stock FOR SELECT USING (true);
CREATE POLICY "Owners manage their stock" ON public.stock FOR INSERT TO authenticated WITH CHECK (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners update their stock" ON public.stock FOR UPDATE TO authenticated USING (public.owns_pharmacy(pharmacy_id)) WITH CHECK (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners delete their stock" ON public.stock FOR DELETE TO authenticated USING (public.owns_pharmacy(pharmacy_id));

-- sales
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_sold INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their sales" ON public.sales FOR SELECT TO authenticated USING (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners insert their sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners update their sales" ON public.sales FOR UPDATE TO authenticated USING (public.owns_pharmacy(pharmacy_id)) WITH CHECK (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners delete their sales" ON public.sales FOR DELETE TO authenticated USING (public.owns_pharmacy(pharmacy_id));

-- predictions
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shortage_class TEXT NOT NULL DEFAULT 'None' CHECK (shortage_class IN ('None','Low','Medium','High')),
  probability NUMERIC(5,4),
  predicted_days INTEGER,
  message TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their predictions" ON public.predictions FOR SELECT TO authenticated USING (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners insert their predictions" ON public.predictions FOR INSERT TO authenticated WITH CHECK (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners update their predictions" ON public.predictions FOR UPDATE TO authenticated USING (public.owns_pharmacy(pharmacy_id)) WITH CHECK (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners delete their predictions" ON public.predictions FOR DELETE TO authenticated USING (public.owns_pharmacy(pharmacy_id));

-- alerts
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL DEFAULT 'shortage',
  severity TEXT NOT NULL DEFAULT 'Low' CHECK (severity IN ('Low','Medium','High','Critical')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their alerts" ON public.alerts FOR SELECT TO authenticated USING (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners insert their alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners update their alerts" ON public.alerts FOR UPDATE TO authenticated USING (public.owns_pharmacy(pharmacy_id)) WITH CHECK (public.owns_pharmacy(pharmacy_id));
CREATE POLICY "Owners delete their alerts" ON public.alerts FOR DELETE TO authenticated USING (public.owns_pharmacy(pharmacy_id));

-- keep stock.updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER stock_touch_updated_at BEFORE UPDATE ON public.stock
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_stock_pharmacy ON public.stock(pharmacy_id);
CREATE INDEX idx_stock_medicine ON public.stock(medicine_id);
CREATE INDEX idx_sales_pharmacy ON public.sales(pharmacy_id);
CREATE INDEX idx_predictions_pharmacy ON public.predictions(pharmacy_id);
CREATE INDEX idx_alerts_pharmacy ON public.alerts(pharmacy_id);
CREATE INDEX idx_profiles_pharmacy ON public.profiles(pharmacy_id);