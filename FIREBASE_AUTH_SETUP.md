# Firebase Authentication Setup

To enable sign-in functionality, you need to configure Firebase Authentication in the Firebase Console.

## Steps to Enable Authentication

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com/
   - Select your project

2. **Enable Authentication**
   - In the left sidebar, click **"Authentication"** (or "Build" > "Authentication")
   - Click **"Get started"** if you haven't enabled it yet

3. **Enable Sign-in Methods**
   - Click on the **"Sign-in method"** tab
   - Enable the following providers:

   **Email/Password:**
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

   **Google Sign-in:**
   - Click on "Google"
   - Toggle "Enable" to ON
   - Enter your project's support email (or use the default)
   - Click "Save"

   **Email Link (Passwordless):**
   - Click on "Email link (passwordless sign-in)"
   - Toggle "Enable" to ON
   - Click "Save"
   - This allows users to sign in without a password by clicking a link sent to their email
   - **Important**: Make sure your domain (e.g., `localhost` for dev, or your production domain) is in the "Authorized domains" list in Settings
   - The email link will redirect to `/auth/action` route in your app

4. **Authorized Domains (for Google Sign-in)**
   - Click on "Settings" tab (gear icon) in the Authentication page
   - Scroll down to "Authorized domains" section
   - By default, `localhost` and your Firebase project domain should already be listed
   - For local development, `localhost` should be sufficient
   - For production, add your custom domain (e.g., `yourdomain.com`) by clicking "Add domain"
   - **Note**: If you don't see this section, it might be because it's only visible after enabling a provider, or it's in a different location in your Firebase Console version

5. **Test It**
   - After enabling, you should see the sign-in button in the navbar
   - Try creating an account or signing in with Google

## Email Verification (Optional)

The email verification settings you see are **optional** for this game. You have two options:

**Option 1: Disable Email Verification (Recommended for Games)**
- Less friction for users
- Users can start playing immediately
- Go to Authentication > Settings > Email templates
- You can leave verification disabled (it's off by default unless you enable it)

**Option 2: Enable Email Verification**
- Better security and prevents fake accounts
- Users must verify email before playing
- Go to Authentication > Settings > Email templates
- Enable "Email address verification" if you want it

**For this game, I recommend leaving email verification disabled** to reduce friction and let players start immediately.

## Important Notes

- **Email/Password**: Works immediately after enabling
- **Google Sign-in**: Should work with default authorized domains (localhost is auto-added)
- **User Profiles**: User profiles are automatically created in Firestore `users` collection when they sign up
- **Security Rules**: Make sure your Firestore security rules allow users to read/write their own profile (see the main plan for security rules)
- **Authorized Domains**: If Google sign-in works on localhost, you don't need to change anything. The authorized domains are usually auto-configured.

## Troubleshooting

**"auth/unauthorized-domain" error:**
- Make sure `localhost` is in the authorized domains list in Firebase Console

**"auth/operation-not-allowed" error:**
- The sign-in method is not enabled in Firebase Console
- Go back and enable Email/Password or Google in the Sign-in method tab

**Users not appearing in Firestore:**
- Check Firestore security rules allow writes to `users/{userId}`
- Check browser console for errors



