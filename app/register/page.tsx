import { AuthForm } from '@/components/auth-form';
import { localizedTitle } from '@/lib/metadata';
export const generateMetadata = () => localizedTitle('Get started');
export default function Register() {
  return <AuthForm register />;
}
