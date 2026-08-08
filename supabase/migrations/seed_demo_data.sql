-- Demo seed data for MediStock AI.
-- Does NOT touch auth.users or profiles — pharmacies/medicines/stock/sales
-- are public-readable domain data, independent of any signed-up user.
-- Safe to re-run: guarded by NOT EXISTS checks on a unique marker per table.

-- ============ MEDICINES ============
INSERT INTO public.medicines (name, composition, category, manufacturer, dosage)
SELECT * FROM (VALUES
  ('Insulin 100 IU', 'Human Insulin', 'Chronic', 'Biocon', '100 IU/ml'),
  ('Metformin 500mg', 'Metformin Hydrochloride', 'Chronic', 'Sun Pharma', '500 mg'),
  ('Amlodipine 5mg', 'Amlodipine Besylate', 'Chronic', 'Cipla', '5 mg'),
  ('Atorvastatin 10mg', 'Atorvastatin Calcium', 'Chronic', 'Dr. Reddy''s', '10 mg'),
  ('Levothyroxine 50mcg', 'Levothyroxine Sodium', 'Chronic', 'Abbott', '50 mcg'),
  ('Paracetamol 650mg', 'Paracetamol', 'Acute', 'GSK', '650 mg'),
  ('Azithromycin 500mg', 'Azithromycin', 'Acute', 'Cipla', '500 mg'),
  ('Amoxicillin 500mg', 'Amoxicillin', 'Acute', 'Sun Pharma', '500 mg'),
  ('Ibuprofen 400mg', 'Ibuprofen', 'Acute', 'Cadila', '400 mg'),
  ('ORS Sachets', 'Oral Rehydration Salts', 'Acute', 'Government Supply', 'Sachet'),
  ('Cetirizine 10mg', 'Cetirizine Hydrochloride', 'Acute', 'Dr. Reddy''s', '10 mg'),
  ('Salbutamol Inhaler', 'Salbutamol Sulphate', 'Chronic', 'Cipla', '100 mcg/dose'),
  ('Losartan 50mg', 'Losartan Potassium', 'Chronic', 'Sun Pharma', '50 mg'),
  ('Omeprazole 20mg', 'Omeprazole', 'Acute', 'Dr. Reddy''s', '20 mg'),
  ('Cardiac Aspirin 75mg', 'Aspirin', 'Chronic', 'USV', '75 mg')
) AS v(name, composition, category, manufacturer, dosage)
WHERE NOT EXISTS (SELECT 1 FROM public.medicines WHERE medicines.name = v.name);

-- ============ PHARMACIES ============
INSERT INTO public.pharmacies (name, owner_name, phone, address, city, state, pincode, latitude, longitude, pharmacy_type, opening_time, closing_time)
SELECT * FROM (VALUES
  ('Apollo Pharmacy - Salt Lake', 'Demo Owner 1', '9800000001', 'Sector V, Salt Lake', 'Kolkata', 'West Bengal', '700091', 22.5726, 88.4310, 'urban', '08:00'::time, '22:00'::time),
  ('MedPlus - Park Street', 'Demo Owner 2', '9800000002', 'Park Street', 'Kolkata', 'West Bengal', '700016', 22.5535, 88.3510, 'urban', '07:00'::time, '23:00'::time),
  ('City Care Pharmacy - Howrah', 'Demo Owner 3', '9800000003', 'GT Road', 'Howrah', 'West Bengal', '711101', 22.5958, 88.2636, 'urban', '08:00'::time, '21:00'::time),
  ('Wellness Forever - Bandra', 'Demo Owner 4', '9800000004', 'Linking Road', 'Mumbai', 'Maharashtra', '400050', 19.0596, 72.8295, 'urban', '08:00'::time, '23:00'::time),
  ('Guardian Pharmacy - Andheri', 'Demo Owner 5', '9800000005', 'Andheri East', 'Mumbai', 'Maharashtra', '400069', 19.1136, 72.8697, 'urban', '00:00'::time, '23:59'::time),
  ('Health First - Connaught Place', 'Demo Owner 6', '9800000006', 'Connaught Place', 'New Delhi', 'Delhi', '110001', 28.6315, 77.2167, 'urban', '09:00'::time, '21:00'::time),
  ('Rural Seva Medical Store', 'Demo Owner 7', '9800000007', 'Village Road', 'Barasat', 'West Bengal', '700124', 22.7237, 88.4820, 'rural', '08:00'::time, '20:00'::time),
  ('Sanjeevani Pharmacy - Whitefield', 'Demo Owner 8', '9800000008', 'Whitefield Main Road', 'Bengaluru', 'Karnataka', '560066', 12.9698, 77.7500, 'urban', '08:00'::time, '22:00'::time),
  ('Trust Chemist - Koramangala', 'Demo Owner 9', '9800000009', '5th Block, Koramangala', 'Bengaluru', 'Karnataka', '560095', 12.9352, 77.6245, 'urban', '08:30'::time, '22:30'::time),
  ('Grameen Aushadhi Kendra', 'Demo Owner 10', '9800000010', 'Block Road', 'Bardhaman', 'West Bengal', '713101', 23.2324, 87.8615, 'rural', '09:00'::time, '19:00'::time)
) AS v(name, owner_name, phone, address, city, state, pincode, latitude, longitude, pharmacy_type, opening_time, closing_time)
WHERE NOT EXISTS (SELECT 1 FROM public.pharmacies WHERE pharmacies.name = v.name);

-- ============ STOCK ============
-- Each pharmacy stocks 8-11 medicines with deliberately varied quantity/reorder
-- levels so predictions later span the full risk spectrum (Safe -> Out of stock).
WITH pharm AS (
  SELECT id, row_number() OVER (ORDER BY name) AS rn FROM public.pharmacies
),
med AS (
  SELECT id, row_number() OVER (ORDER BY name) AS rn FROM public.medicines
),
pairs AS (
  SELECT p.id AS pharmacy_id, m.id AS medicine_id,
         ((p.rn * 7 + m.rn * 3) % 100) AS bucket
  FROM pharm p CROSS JOIN med m
  WHERE ((p.rn + m.rn) % 3) <> 0  -- skip ~1/3 of combos so not every pharmacy has every medicine
),
sized AS (
  SELECT pharmacy_id, medicine_id,
    CASE
      WHEN bucket < 15 THEN 0                          -- out of stock
      WHEN bucket < 35 THEN 2 + (bucket % 3)            -- critically low
      WHEN bucket < 55 THEN 8 + (bucket % 6)            -- low-ish
      WHEN bucket < 80 THEN 25 + (bucket % 20)          -- healthy
      ELSE 60 + (bucket % 40)                           -- well stocked
    END AS quantity,
    10 + (bucket % 15) AS reorder_level
  FROM pairs
)
INSERT INTO public.stock (pharmacy_id, medicine_id, quantity, reorder_level)
SELECT s.pharmacy_id, s.medicine_id, s.quantity, s.reorder_level
FROM sized s
WHERE NOT EXISTS (
  SELECT 1 FROM public.stock st
  WHERE st.pharmacy_id = s.pharmacy_id AND st.medicine_id = s.medicine_id
);

-- ============ SALES (last 30 days) ============
-- Daily sales derived deterministically from pharmacy/medicine/day so the
-- average lines up with a believable days-of-stock figure per stock row.
WITH base AS (
  SELECT st.pharmacy_id, st.medicine_id, st.quantity,
         (('x' || substr(md5(st.pharmacy_id::text || st.medicine_id::text), 1, 8))::bit(32)::bigint % 5 + 1) AS base_rate
  FROM public.stock st
),
days AS (
  SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS sale_date
),
exploded AS (
  SELECT b.pharmacy_id, b.medicine_id, d.sale_date,
    GREATEST(
      0,
      b.base_rate + ((('x' || substr(md5(b.pharmacy_id::text || b.medicine_id::text || d.sale_date::text), 1, 8))::bit(32)::bigint % 5) - 2)
    ) AS quantity_sold
  FROM base b CROSS JOIN days d
)
INSERT INTO public.sales (pharmacy_id, medicine_id, sale_date, quantity_sold)
SELECT e.pharmacy_id, e.medicine_id, e.sale_date, e.quantity_sold
FROM exploded e
WHERE NOT EXISTS (
  SELECT 1 FROM public.sales sl
  WHERE sl.pharmacy_id = e.pharmacy_id AND sl.medicine_id = e.medicine_id AND sl.sale_date = e.sale_date
);

-- ============ PREDICTIONS ============
-- days_of_stock = quantity / avg_daily_sales (last 14 days, min avg = 1)
-- >15d Safe/None | 8-15d Low | 3-7d Medium | <3d High | qty=0 Out of stock (High)
WITH avg_sales AS (
  SELECT pharmacy_id, medicine_id,
         GREATEST(1, ROUND(AVG(quantity_sold))) AS avg_daily_sales
  FROM public.sales
  WHERE sale_date >= CURRENT_DATE - INTERVAL '13 days'
  GROUP BY pharmacy_id, medicine_id
),
calc AS (
  SELECT st.pharmacy_id, st.medicine_id, st.quantity,
         a.avg_daily_sales,
         FLOOR(st.quantity::numeric / a.avg_daily_sales) AS predicted_days
  FROM public.stock st
  JOIN avg_sales a ON a.pharmacy_id = st.pharmacy_id AND a.medicine_id = st.medicine_id
),
classed AS (
  SELECT pharmacy_id, medicine_id, predicted_days,
    CASE
      WHEN quantity = 0 THEN 'High'
      WHEN predicted_days < 3 THEN 'High'
      WHEN predicted_days <= 7 THEN 'Medium'
      WHEN predicted_days <= 15 THEN 'Low'
      ELSE 'None'
    END AS shortage_class,
    CASE
      WHEN quantity = 0 THEN 0.97
      WHEN predicted_days < 3 THEN 0.90
      WHEN predicted_days <= 7 THEN 0.70
      WHEN predicted_days <= 15 THEN 0.40
      ELSE 0.10
    END AS probability
  FROM calc
)
INSERT INTO public.predictions (pharmacy_id, medicine_id, prediction_date, shortage_class, probability, predicted_days, message)
SELECT c.pharmacy_id, c.medicine_id, CURRENT_DATE, c.shortage_class, c.probability, c.predicted_days,
  m.name || CASE
    WHEN c.shortage_class = 'High' THEN ' — High risk of shortage in ' || GREATEST(c.predicted_days, 0) || ' day(s)'
    WHEN c.shortage_class = 'Medium' THEN ' — Medium risk, approximately ' || c.predicted_days || ' day(s) remaining'
    WHEN c.shortage_class = 'Low' THEN ' — Low stock, approximately ' || c.predicted_days || ' day(s) remaining'
    ELSE ' — Stock level is healthy'
  END
FROM classed c
JOIN public.medicines m ON m.id = c.medicine_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.predictions p
  WHERE p.pharmacy_id = c.pharmacy_id AND p.medicine_id = c.medicine_id AND p.prediction_date = CURRENT_DATE
);

-- ============ ALERTS ============
-- One alert per Medium/High prediction made today.
INSERT INTO public.alerts (pharmacy_id, medicine_id, alert_type, severity, title, message)
SELECT p.pharmacy_id, p.medicine_id, 'shortage',
  CASE WHEN p.shortage_class = 'High' THEN 'High' ELSE 'Medium' END,
  m.name || CASE WHEN p.shortage_class = 'High' THEN ' — High shortage risk' ELSE ' — Medium shortage risk' END,
  p.message
FROM public.predictions p
JOIN public.medicines m ON m.id = p.medicine_id
WHERE p.prediction_date = CURRENT_DATE
  AND p.shortage_class IN ('Medium', 'High')
  AND NOT EXISTS (
    SELECT 1 FROM public.alerts a
    WHERE a.pharmacy_id = p.pharmacy_id AND a.medicine_id = p.medicine_id
      AND a.created_at::date = CURRENT_DATE
  );