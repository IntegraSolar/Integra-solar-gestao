-- Remove trigger that auto-confirms installments when receipt_url is set.
-- Business rule: only confirmInstallment() server action may change status to 'confirmada'.
-- The trigger bypasses pipeline logic (creating client_projects, client_purchases, etc.)
-- causing the client pipeline to get stuck in an inconsistent state.

drop trigger if exists auto_confirm_on_receipt on public.client_installments;
drop trigger if exists trg_confirm_on_receipt on public.client_installments;
drop trigger if exists confirm_installment_on_receipt on public.client_installments;

drop function if exists public.auto_confirm_installment_on_receipt();
drop function if exists public.confirm_on_receipt();
