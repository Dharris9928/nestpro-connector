
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY contractor_id, product, quantity, price, date_received, COALESCE(comments, '')
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.job_quotes
)
DELETE FROM public.job_quotes
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
