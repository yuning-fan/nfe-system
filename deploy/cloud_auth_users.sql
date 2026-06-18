--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', '387eb85b-d3fb-4642-a783-955da649de89', 'authenticated', 'authenticated', 'gris@nfe.com', '$2a$06$6YgQax4BMzXAS1NIy3hiFO27FHxyvfVzKegZOM0H9UunXrhY1w4Qq', '2026-06-18 03:27:52.156363+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', false, '2026-06-18 03:27:52.156363+00', '2026-06-18 03:27:52.156363+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', '2fd3da6d-60c5-4ee8-838b-bfb802337c14', 'authenticated', 'authenticated', 'ryan@nfe.com', '$2a$06$Ulw9gof/gTfI/m3UyL9B2ue0zU.IKIrXASHwgsIlFxzRg.sP8hlgO', '2026-06-18 03:27:52.156363+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', false, '2026-06-18 03:27:52.156363+00', '2026-06-18 03:27:52.156363+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', 'cbf3871f-cf37-4aa7-90d0-04ece15f4b35', 'authenticated', 'authenticated', 'riley@nfe.com', '$2a$06$N2gECxmMaHgTbSXNJr49dOzsyVFr5MTDFhOXWSIG77.hwY48YlD9W', '2026-06-18 03:27:52.156363+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{}', false, '2026-06-18 03:27:52.156363+00', '2026-06-18 03:27:52.156363+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', 'af7bc275-63a5-4eb3-9f59-f48b9556fb3e', 'authenticated', 'authenticated', 'admin@nfe.com', '$2a$10$sbXKn0aa/zMiCx8rT76MTOvZ2TjGZxzCgLXU6EX5/l3oOLXlo.xYy', '2026-06-16 02:15:55.046262+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 03:59:59.505814+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-06-16 02:15:55.032054+00', '2026-06-18 03:59:59.518412+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', '8d9e251c-d811-4ef2-a9d3-1b8e21b838c4', 'authenticated', 'authenticated', 'krystal@nfe.com', '$2a$06$yrWBVEjUjpXy8mkiXCfZ8eJfHkF0h.oKhxsCiGcVCUG1ez2UXAaFe', '2026-06-18 03:27:52.156363+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 04:13:54.912453+00', '{"provider": "email", "providers": ["email"]}', '{}', false, '2026-06-18 03:27:52.156363+00', '2026-06-18 04:13:54.92291+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('af7bc275-63a5-4eb3-9f59-f48b9556fb3e', 'af7bc275-63a5-4eb3-9f59-f48b9556fb3e', '{"sub": "af7bc275-63a5-4eb3-9f59-f48b9556fb3e", "email": "admin@nfe.com", "email_verified": false, "phone_verified": false}', 'email', '2026-06-16 02:15:55.039926+00', '2026-06-16 02:15:55.039962+00', '2026-06-16 02:15:55.039962+00', 'e19dff2e-c6aa-4790-9604-38a011b5a461');
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('krystal@nfe.com', '8d9e251c-d811-4ef2-a9d3-1b8e21b838c4', '{"sub": "8d9e251c-d811-4ef2-a9d3-1b8e21b838c4", "email": "krystal@nfe.com", "email_verified": false, "phone_verified": false}', 'email', '2026-06-18 03:34:44.35951+00', '2026-06-18 03:34:44.35951+00', '2026-06-18 03:34:44.35951+00', '297094e1-7fe8-429f-9174-8a5ca198e066');
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('gris@nfe.com', '387eb85b-d3fb-4642-a783-955da649de89', '{"sub": "387eb85b-d3fb-4642-a783-955da649de89", "email": "gris@nfe.com", "email_verified": false, "phone_verified": false}', 'email', '2026-06-18 03:34:44.35951+00', '2026-06-18 03:34:44.35951+00', '2026-06-18 03:34:44.35951+00', '5519baf2-b555-4d61-87c4-5865e5b5586c');
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('ryan@nfe.com', '2fd3da6d-60c5-4ee8-838b-bfb802337c14', '{"sub": "2fd3da6d-60c5-4ee8-838b-bfb802337c14", "email": "ryan@nfe.com", "email_verified": false, "phone_verified": false}', 'email', '2026-06-18 03:34:44.35951+00', '2026-06-18 03:34:44.35951+00', '2026-06-18 03:34:44.35951+00', '35264dda-d8b0-4acd-8fa1-2c27ebac3326');
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('riley@nfe.com', 'cbf3871f-cf37-4aa7-90d0-04ece15f4b35', '{"sub": "cbf3871f-cf37-4aa7-90d0-04ece15f4b35", "email": "riley@nfe.com", "email_verified": false, "phone_verified": false}', 'email', '2026-06-18 03:34:44.35951+00', '2026-06-18 03:34:44.35951+00', '2026-06-18 03:34:44.35951+00', 'cc89ca64-fa30-479a-9863-e64f958ae185');


--
-- PostgreSQL database dump complete
--


