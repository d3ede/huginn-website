import { AuthForm } from '@/components/auth-form';
import { localizedTitle } from '@/lib/metadata';
export const generateMetadata = () => localizedTitle('Sign in');
export default function Login() {
  return <AuthForm />;
}
