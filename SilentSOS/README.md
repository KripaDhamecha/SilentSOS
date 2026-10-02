# SilentSOS — Simple Full-Stack Starter

A small, easy-to-understand SilentSOS project using:

- Plain HTML/CSS/JavaScript frontend
- Supabase Auth + PostgreSQL + Storage
- One Supabase Edge Function
- TextBee for real SMS through your registered Android phone/SIM

## Files

```text
SilentSOS/
├── index.html
├── style.css
├── config.js
├── app.js
├── .gitignore
├── README.md
└── supabase/
    ├── schema.sql
    └── functions/
        └── send-sos/
            └── index.ts
```

## 1. Create Supabase project

Create a project at https://supabase.com/

Open **SQL Editor** and run:

```text
supabase/schema.sql
```

## 2. Configure the frontend

Open `config.js` and replace:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SEND_SOS_URL`

The Edge Function URL will look like:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-sos
```

The Supabase publishable/anon key is okay in frontend code. NEVER put your TextBee API key here.

## 3. Configure TextBee

Create your TextBee account and register an Android phone with a working SIM.

Create an API key and keep it private.

Deploy the Edge Function, then add the TextBee secret:

```bash
supabase secrets set TEXTBEE_API_KEY=YOUR_TEXTBEE_API_KEY
```

Optional, if you want to force a particular registered phone:

```bash
supabase secrets set TEXTBEE_DEVICE_ID=YOUR_DEVICE_ID
```

Supabase automatically provides:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not put the service-role key in frontend code.

## 4. Deploy the Edge Function

Install/login to the Supabase CLI, then from this project folder:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-sos
```

Then set the TextBee secret as shown above.

## 5. Run the frontend

Do not double-click `index.html` and expect all browser features to work.

Use VS Code Live Server, or:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## 6. Test

1. Create an account.
2. Add an emergency contact using E.164 format, e.g. `+919876543210`.
3. Make sure your TextBee Android phone is online.
4. Allow browser location permission.
5. Allow microphone permission if you want the optional short audio capture.
6. Enter the secret code `2580`.
7. Check the recipient phone.

Change `SECRET_CODE` in `app.js` before using your own project.

## Important

A successful TextBee API response means TextBee accepted/queued the SMS request; it does not by itself prove the recipient received the SMS. Check TextBee's delivery status for the final delivery state.

This is a student/project prototype, not a certified emergency service. Keep another trusted emergency communication method available.
