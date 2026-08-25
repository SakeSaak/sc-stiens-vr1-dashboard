-- SC Stiens VR1 — speelsters laten zelf doelen toevoegen (tabblad Ontwikkeling)
--
-- Deze functie laat NIET-ingelogde bezoekers (de speelsters) alleen de DOELEN van één
-- speelster wijzigen. De rest van het dashboard (taakschema, boetepot, gesteldheid,
-- metingen, telefoonnummers) blijft volledig beschermd: daar kan niemand bij zonder
-- staf-login. Zo staat het tabblad open zonder dat iemand per ongeluk alles overschrijft.
--
-- Eenmalig uitvoeren in Supabase → SQL Editor → New query → plak dit → Run.

create or replace function public.save_goals(p_player text, p_goals jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d jsonb;
begin
  -- alleen een array met doelen accepteren
  if p_goals is null or jsonb_typeof(p_goals) <> 'array' then
    raise exception 'ongeldige doelen';
  end if;

  -- niet meer dan 50 doelen per speelster (rem tegen misbruik)
  if jsonb_array_length(p_goals) > 50 then
    raise exception 'te veel doelen';
  end if;

  select coalesce(data, '{}'::jsonb) into d
    from dashboard_state where id = 'main' for update;

  if d is null then
    raise exception 'dashboard niet gevonden';
  end if;

  if d->'store' is null then
    d := jsonb_set(d, '{store}', '{}'::jsonb, true);
  end if;

  if d->'store'->p_player is null then
    d := jsonb_set(d, array['store', p_player], '{}'::jsonb, true);
  end if;

  d := jsonb_set(d, array['store', p_player, 'goals'], p_goals, true);

  update dashboard_state set data = d where id = 'main';
end;
$$;

-- Speelsters (niet ingelogd) mogen deze ene functie aanroepen.
grant execute on function public.save_goals(text, jsonb) to anon;
grant execute on function public.save_goals(text, jsonb) to authenticated;
