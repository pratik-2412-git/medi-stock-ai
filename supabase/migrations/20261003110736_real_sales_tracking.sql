-- Real inventory-to-sales tracking support.
--
-- The pharmacy owner's "Update Stock" workflow sets an absolute quantity.
-- When the new quantity is lower than the previous one, that drop is a real
-- sale and gets recorded into `sales` via record_sale() below — one row per
-- (pharmacy, medicine, day), accumulated as the day goes on. Nothing in the
-- app generates synthetic/mock sales rows; this is the only write path.

-- One row per pharmacy/medicine/day so repeated same-day updates accumulate
-- into a single day's total instead of creating duplicate rows.
ALTER TABLE public.sales
  ADD CONSTRAINT sales_pharmacy_medicine_date_unique
  UNIQUE (pharmacy_id, medicine_id, sale_date);

ALTER TABLE public.sales
  ADD CONSTRAINT sales_quantity_sold_non_negative
  CHECK (quantity_sold >= 0);

-- Atomically records a real sale (a stock decrease) for today, accumulating
-- with any sale already recorded today for the same pharmacy/medicine.
-- SECURITY INVOKER (the default) means this still runs as the calling user,
-- so the existing "Owners insert/update their sales" RLS policies apply
-- exactly as if the app had written the row directly — no access-control
-- bypass is introduced.
CREATE OR REPLACE FUNCTION public.record_sale(
  p_pharmacy_id UUID,
  p_medicine_id UUID,
  p_quantity INTEGER
) RETURNS public.sales
LANGUAGE plpgsql
AS $$
DECLARE
  result public.sales;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'record_sale: quantity must be positive';
  END IF;

  INSERT INTO public.sales (pharmacy_id, medicine_id, sale_date, quantity_sold)
  VALUES (p_pharmacy_id, p_medicine_id, CURRENT_DATE, p_quantity)
  ON CONFLICT (pharmacy_id, medicine_id, sale_date)
  DO UPDATE SET quantity_sold = public.sales.quantity_sold + EXCLUDED.quantity_sold
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_sale(UUID, UUID, INTEGER) TO authenticated;