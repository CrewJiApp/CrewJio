// Google sign-in returns here. The sign-in sheet usually captures the redirect itself; if the
// system opens the link instead, send the user back to the start, which routes them on.
import { Redirect } from 'expo-router';

export default function AuthCallback() {
  return <Redirect href="/" />;
}
