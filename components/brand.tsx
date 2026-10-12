import Link from 'next/link';
import { Feather } from 'lucide-react';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Huginn">
      <span className="brand-symbol">
        <Feather size={23} strokeWidth={1.7} />
      </span>
      <span className="brand-word">
        huginn<span>.</span>
      </span>
    </Link>
  );
}
