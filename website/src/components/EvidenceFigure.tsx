import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './EvidenceFigure.module.css';

type Props = {
  assetId: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  smallWidth: number;
  largeWidth: number;
};

export default function EvidenceFigure({
  assetId, alt, caption, width, height, smallWidth, largeWidth,
}: Props): ReactNode {
  const small = useBaseUrl(`/evidence/${assetId}-${smallWidth}.webp`);
  const large = useBaseUrl(`/evidence/${assetId}-${largeWidth}.webp`);
  const original = useBaseUrl(`/evidence/original/${assetId}.png`);
  const srcSet = smallWidth === largeWidth
    ? `${large} ${largeWidth}w`
    : `${small} ${smallWidth}w, ${large} ${largeWidth}w`;
  return (
    <figure className={styles.figure} data-evidence-id={assetId}>
      <a href={original} download={`${assetId}.png`} aria-label={`Download original evidence image: ${alt}`}>
        <img
          src={large}
          srcSet={srcSet}
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
