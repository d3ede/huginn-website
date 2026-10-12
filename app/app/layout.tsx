import { Workspace } from '@/components/workspace';
import { localizedTitle } from '@/lib/metadata';
export const generateMetadata = async () => ({
  ...(await localizedTitle('Workspace')),
  robots: { index: false, follow: false },
});
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <Workspace>{children}</Workspace>;
}
