-- Storefront domain allowlist for public widget analytics validation.
-- Empty array keeps existing MVP workspaces unrestricted until the merchant
-- adds production storefront domains in Brand & embed settings.

alter table public.widget_settings
add column if not exists allowed_domains text[] not null default '{}';
