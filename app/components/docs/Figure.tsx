/**
 * Image with an optional caption. Rendered from the Markdoc `figure` tag. Plain
 * <img> — unlike the template there is no image-optimization layer here, so the
 * next/image eslint pragma the template carried is not needed.
 */
export function Figure({
	src,
	alt = "",
	caption,
}: {
	src: string;
	alt?: string;
	caption?: string;
}) {
	return (
		<figure>
			<img src={src} alt={alt} />
			<figcaption>{caption}</figcaption>
		</figure>
	);
}
