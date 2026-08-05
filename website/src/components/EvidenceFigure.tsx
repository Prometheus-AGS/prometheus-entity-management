import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './EvidenceFigure.module.css';

type Props = {
  assetId: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

export default function EvidenceFigure({assetId, alt, caption, width, height}: Props): ReactNode {
  const small = useBaseUrl(`/evidence/${assetId}-640.webp`);
  const large = useBaseUrl(`/evidence/${assetId}-1280.webp`);
  const original = useBaseUrl(`/evidence/original/${assetId}.png`);
  return (
    <figure className={styles.figure} data-evidence-id={assetId}>
      <a href={original} download={`${assetId}.png`} aria-label={`Download original evidence image: ${alt}`}>
        <img
          src={large}
          srcSet={`${small} 640w, ${large} 1280w`}
          sizes="(max-width: 700px) 100vw, 760px"
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          alt={alt}
        />
      </a>
      <figcaption>{caption} <span>Asset: {assetId}</span></figcaption>
    </figure>
  );
}
