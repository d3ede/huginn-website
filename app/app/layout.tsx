import { Workspace } from '@/components/workspace';
export const metadata = { title: 'Workspace', robots: { index: false, follow: false } };
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <Workspace>{children}</Workspace>;
}
