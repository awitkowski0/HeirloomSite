import Image from 'next/image';

/**
 * Phil's brand sketch illustrations under public/images/brand/.
 * Fills a framed figure; width/height match the source JPEGs so next/image
 * can size without layout shift. Styled by .brand-sketch in globals.css.
 */
interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  /**
   * The slot the figure occupies, for next/image. The default describes the
   * two-up rows; a full-width slot must say so or it downloads a half-width
   * file and renders it stretched.
   */
  sizes?: string;
  caption?: string;
  priority?: boolean;
  className?: string;
}

export default function BrandSketch({
  src,
  alt,
  width,
  height,
  sizes = '(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 560px',
  caption,
  priority = false,
  className,
}: Props) {
  return (
    <figure className={className ? `brand-sketch ${className}` : 'brand-sketch'}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
