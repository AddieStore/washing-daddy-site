// Any unknown address (the web preview can open on an odd path) goes to the round.
import { Redirect } from 'expo-router';

export default function NotFound() {
  return <Redirect href="/" />;
}
