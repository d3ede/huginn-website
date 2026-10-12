import Link from 'next/link';
import Image from 'next/image';
import styles from './brand.module.css';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${styles.logo} ${light ? 'brand-light' : ''}`}
      aria-label="Huginn"
    >
      <span className={styles.artwork}>
        <Image
          src="/images/brand/huginn-logo-v1.png"
          alt=""
          width={2001}
          height={786}
          sizes="210px"
          className={styles.image}
        />
      </span>
    </Link>
  );
}
