import { Redirect } from 'expo-router';
import { useApp } from '@/lib/store';

export default function Index() {
  const { profile } = useApp();
  return <Redirect href={profile ? '/board' : '/setup'} />;
}
