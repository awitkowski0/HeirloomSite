import Image from 'next/image';

/**
 * Phil's brand sketch illustrations under public/images/brand/.
 * Fills a framed figure; width/height match the source JPEGs so next/image
 * can size without layout shift.
 */
interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export default function BrandSketch({
  src,
  alt,
  width,
  height,
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
        sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 560px"
        priority={priority}
      />
    </figure>
  );
}
