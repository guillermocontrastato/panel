/*
# Add customizable area card colors

## Overview
Adds a persistent color value to each business area so administrators can create and visually organize dashboard cards without changing existing KPI data.

## Modified Tables
- `areas.color` — hex color used for the area card and navigation accent; existing areas receive a blue default.

## Security
- The existing `areas` table remains protected by its current anon + authenticated CRUD policies for this shared dashboard.
- No data is deleted, renamed, or retyped.

## Important Notes
1. Existing areas keep their current names, icons, descriptions, KPIs, and order.
2. New areas may use any valid hex color selected in the administrator screen.
*/

ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#2563eb';
