/*
# Seed KPI Data Values, Monthly Series, and Breakdowns

For each KPI, inserts:
- kpi_data row with current_value, target_value, previous_value, trend, and 6-month series
- kpi_breakdowns rows with detailed sub-data (vendedores, modelos, canales, etc.)
Uses a DO block to generate realistic sample values per KPI.
*/

DO $$
DECLARE
  k RECORD;
  v_current numeric;
  v_target numeric;
  v_prev numeric;
  v_trend text;
  v_series jsonb;
  v_months text[] := ARRAY['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];
  v_vals numeric[];
  i int;
  v_breakdown_label text;
  v_breakdown_val numeric;
  v_bd_count int;
BEGIN
  FOR k IN SELECT id, target_direction, sort_order, area_id FROM kpis ORDER BY id LOOP
    -- Generate pseudo-random but deterministic values based on sort_order
    v_target := CASE
      WHEN k.target_direction = 'up' THEN 85 + (k.sort_order % 15)
      ELSE 5 + (k.sort_order % 10)
    END;

    v_current := CASE
      WHEN k.target_direction = 'up' THEN 60 + (k.sort_order % 35) + (random() * 10)::int
      ELSE 3 + (k.sort_order % 8) + (random() * 3)::int
    END;
    v_current := round(v_current::numeric, 1);

    v_prev := CASE
      WHEN k.target_direction = 'up' THEN v_current - (random() * 8)::int + 2
      ELSE v_current + (random() * 4)::int - 1
    END;
    v_prev := round(v_prev::numeric, 1);

    IF k.target_direction = 'up' THEN
      v_trend := CASE WHEN v_current > v_prev THEN 'up' WHEN v_current < v_prev THEN 'down' ELSE 'stable' END;
    ELSE
      v_trend := CASE WHEN v_current < v_prev THEN 'up' WHEN v_current > v_prev THEN 'down' ELSE 'stable' END;
    END IF;

    -- Build 6-month series
    v_vals := ARRAY[]::numeric[];
    FOR i IN 1..6 LOOP
      IF k.target_direction = 'up' THEN
        v_vals := array_append(v_vals, round((v_prev - 5 + i * 2 + (random() * 4 - 2))::numeric, 1));
      ELSE
        v_vals := array_append(v_vals, round((v_prev + 5 - i * 1 + (random() * 3 - 1.5))::numeric, 1));
      END IF;
    END LOOP;

    v_series := jsonb_build_array(
      jsonb_build_object('month', v_months[1], 'value', v_vals[1]),
      jsonb_build_object('month', v_months[2], 'value', v_vals[2]),
      jsonb_build_object('month', v_months[3], 'value', v_vals[3]),
      jsonb_build_object('month', v_months[4], 'value', v_vals[4]),
      jsonb_build_object('month', v_months[5], 'value', v_vals[5]),
      jsonb_build_object('month', v_months[6], 'value', v_vals[6])
    );

    INSERT INTO kpi_data (kpi_id, current_value, target_value, previous_value, trend, series, updated_at)
    VALUES (k.id, v_current, v_target, v_prev, v_trend, v_series, now())
    ON CONFLICT DO NOTHING;

    -- Add a few breakdowns per KPI
    v_bd_count := 3 + (k.sort_order % 3);
    FOR i IN 1..v_bd_count LOOP
      v_breakdown_label := CASE i
        WHEN 1 THEN 'Sucursal Centro'
        WHEN 2 THEN 'Sucursal Norte'
        WHEN 3 THEN 'Sucursal Sur'
        WHEN 4 THEN 'Online'
        WHEN 5 THEN 'Referidos'
      END;
      v_breakdown_val := round((v_current * (0.6 + random() * 0.6))::numeric, 1);
      INSERT INTO kpi_breakdowns (kpi_id, label, value, target, sort_order)
      VALUES (k.id, v_breakdown_label, v_breakdown_val, v_target, i)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;