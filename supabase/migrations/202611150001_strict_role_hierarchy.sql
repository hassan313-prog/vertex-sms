alter table public.profiles
  add column if not exists is_active boolean not null default true;

create or replace function public.is_profile_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  );
$$;

create or replace function public.guard_profile_hierarchy_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $guard$
begin
  if auth.role() <> 'service_role'
     and coalesce(current_setting('app.allow_hierarchy_update', true), '') <> 'on'
     and (new.role is distinct from old.role
       or new.parent_id is distinct from old.parent_id
       or new.is_active is distinct from old.is_active) then
    raise exception 'Role, parent and active status can only be changed by the authorized hierarchy workflow';
  end if;
  return new;
end;
$guard$;

drop trigger if exists profiles_guard_hierarchy_fields on public.profiles;
create trigger profiles_guard_hierarchy_fields
before update on public.profiles
for each row execute function public.guard_profile_hierarchy_fields();

create or replace function public.disable_hierarchy_account(p_target_user_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
  v_parent_id uuid;
  v_parent_currency text;
  v_client_currency text;
  v_balance numeric := 0;
  v_reference uuid := gen_random_uuid();
  v_disabled uuid[];
begin
  if v_actor is null or not public.is_profile_active() then
    raise exception 'Active authentication required';
  end if;

  select role into v_actor_role from public.profiles where id = v_actor and is_active;
  select role, parent_id into v_target_role, v_parent_id
    from public.profiles where id = p_target_user_id and is_active for update;

  if v_target_role is null then raise exception 'Account not found or already disabled'; end if;

  if not (
    (v_actor_role = 'admin' and v_target_role = 'manager' and v_parent_id is null)
    or (v_actor_role = 'manager' and v_target_role = 'agent' and v_parent_id = v_actor)
    or (v_actor_role = 'agent' and v_target_role = 'client' and v_parent_id = v_actor)
  ) then
    raise exception 'You are not allowed to disable this account';
  end if;

  if v_target_role = 'client' then
    select balance, currency into v_balance, v_client_currency
      from public.wallets where user_id = p_target_user_id for update;
    if coalesce(v_balance, 0) > 0 then
      select currency into v_parent_currency from public.wallets where user_id = v_actor for update;
      if v_parent_currency is null or v_parent_currency <> v_client_currency then
        raise exception 'Wallet currencies do not match; refund was not processed';
      end if;

      update public.wallets set balance = balance + v_balance, updated_at = now()
        where user_id = v_actor;
      update public.wallets set balance = 0, updated_at = now()
        where user_id = p_target_user_id;

      insert into public.wallet_transactions
        (user_id, amount, currency, transaction_type, status, reference, description)
      values
        (p_target_user_id, -v_balance, v_client_currency, 'adjustment', 'completed', v_reference::text, 'Client deactivation balance refund'),
        (v_actor, v_balance, v_parent_currency, 'adjustment', 'completed', v_reference::text, 'Refund received from disabled client');

      insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
      values (v_actor, 'wallet.client_refund', 'wallet', p_target_user_id::text,
        jsonb_build_object('amount', v_balance, 'currency', v_client_currency, 'reference', v_reference));
    end if;
  end if;

  perform set_config('app.allow_hierarchy_update', 'on', true);

  if v_target_role = 'agent' then
    update public.profiles set is_active = false, updated_at = now()
      where parent_id = p_target_user_id and role = 'client' and is_active;
  end if;

  update public.profiles set is_active = false, updated_at = now()
    where id = p_target_user_id;

  select array_agg(id) into v_disabled
    from public.profiles
    where id = p_target_user_id
       or (v_target_role = 'agent' and parent_id = p_target_user_id and role = 'client');

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_actor, 'account.disable', 'profile', p_target_user_id::text,
    jsonb_build_object('role', v_target_role, 'disabled_user_ids', to_jsonb(v_disabled)));

  return coalesce(v_disabled, array[p_target_user_id]);
end;
$$;

revoke all on function public.disable_hierarchy_account(uuid) from public;
grant execute on function public.disable_hierarchy_account(uuid) to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists profile_select_own_or_admin on public.profiles;
drop policy if exists profiles_parent_read on public.profiles;
create policy profile_select_active_hierarchy on public.profiles
for select to authenticated
using (
  public.is_profile_active()
  and (
    id = auth.uid()
    or public.is_admin()
    or parent_id = auth.uid()
  )
);

drop policy if exists profile_update_own_or_admin on public.profiles;
create policy profile_update_active_own on public.profiles
for update to authenticated
using (public.is_profile_active() and (id = auth.uid() or public.is_admin()))
with check (public.is_profile_active() and (id = auth.uid() or public.is_admin()));

drop policy if exists wallet_read_own_or_admin on public.wallets;
create policy wallet_read_active_own_or_admin on public.wallets
for select to authenticated
using (public.is_profile_active() and (user_id = auth.uid() or public.is_admin()));

drop policy if exists wallet_transactions_read_own_or_admin on public.wallet_transactions;
create policy wallet_transactions_read_active_own_or_admin on public.wallet_transactions
for select to authenticated
using (public.is_profile_active() and (user_id = auth.uid() or public.is_admin()));

drop policy if exists orders_create_for_self on public.number_orders;
create policy orders_create_for_active_self on public.number_orders
for insert to authenticated
with check (public.is_profile_active() and user_id = auth.uid());

drop policy if exists orders_read_own_or_admin on public.number_orders;
create policy orders_read_active_own_or_admin on public.number_orders
for select to authenticated
using (public.is_profile_active() and (user_id = auth.uid() or public.is_admin()));

drop policy if exists otp_read_own_or_admin on public.otp_messages;
create policy otp_read_active_own_or_admin on public.otp_messages
for select to authenticated
using (public.is_profile_active() and (user_id = auth.uid() or public.is_admin()));


create or replace function private.allocate_wallet_balance(p_target_user_id uuid, p_amount numeric, p_description text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $allocation$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
  v_target_parent uuid;
  v_source_currency text;
  v_target_currency text;
  v_reference uuid := gen_random_uuid();
begin
  if v_actor is null or not public.is_profile_active() then
    raise exception 'Active authentication required';
  end if;
  if p_target_user_id = v_actor then raise exception 'Cannot allocate balance to your own wallet'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'Enter a valid amount greater than zero';
  end if;

  select role into v_actor_role from public.profiles where id = v_actor and is_active;
  select role, parent_id into v_target_role, v_target_parent
    from public.profiles where id = p_target_user_id and is_active;

  if v_target_role is null then raise exception 'Target account not found or inactive'; end if;
  if not (
    (v_actor_role = 'admin' and v_target_role = 'manager' and v_target_parent is null)
    or (v_actor_role = 'manager' and v_target_role = 'agent' and v_target_parent = v_actor)
    or (v_actor_role = 'agent' and v_target_role = 'client' and v_target_parent = v_actor)
  ) then
    raise exception 'You can allocate balance only to your directly assigned lower-level account';
  end if;

  select currency into v_source_currency from public.wallets where user_id = v_actor for update;
  select currency into v_target_currency from public.wallets where user_id = p_target_user_id for update;
  if v_source_currency is null or v_target_currency is null then
    raise exception 'Wallet not found for source or target account';
  end if;
  if v_source_currency <> v_target_currency then raise exception 'Wallet currencies must match'; end if;

  update public.wallets set balance = balance - p_amount, updated_at = now()
    where user_id = v_actor and balance >= p_amount;
  if not found then raise exception 'Insufficient available balance'; end if;

  update public.wallets set balance = balance + p_amount, updated_at = now()
    where user_id = p_target_user_id;

  insert into public.wallet_transactions(user_id, amount, currency, transaction_type, status, reference, description)
  values
    (v_actor, -p_amount, v_source_currency, 'adjustment', 'completed', v_reference::text, coalesce(p_description, 'Balance allocated')),
    (p_target_user_id, p_amount, v_target_currency, 'adjustment', 'completed', v_reference::text, coalesce(p_description, 'Balance received'));

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_actor, 'wallet.allocate', 'wallet', p_target_user_id::text,
    jsonb_build_object('amount', p_amount, 'currency', v_source_currency, 'reference', v_reference));
  return v_reference;
end;
$allocation$;
