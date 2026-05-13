import { Helmet } from "react-helmet-async";

const SITE = "https://tagex.app";

interface SEOProps {
  title: string;
  description: string;
  path: string; // e.g. "/auth"
  noIndex?: boolean;
}

export function SEO({ title, description, path, noIndex }: SEOProps) {
  const url = `${SITE}${path === "/" ? "/" : path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
