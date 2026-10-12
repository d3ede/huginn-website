import Link from 'next/link';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Huginn">
      huginn
      <span>.</span>
    </Link>
  );
}
