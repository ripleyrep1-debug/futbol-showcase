-- Give admin role to the user that matches the login pattern
INSERT INTO public.user_roles (user_id, role)
VALUES ('400be976-5efb-4192-b5a8-095439d1435f', 'admin')
ON CONFLICT DO NOTHING;
