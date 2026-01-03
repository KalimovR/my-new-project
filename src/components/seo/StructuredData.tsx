import { Helmet } from 'react-helmet-async';

interface AuthorData {
  name: string;
  bio?: string;
  image?: string;
  url?: string;
}

interface ArticleStructuredDataProps {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: AuthorData;
  url: string;
  section?: string;
  keywords?: string[];
}

interface WebsiteStructuredDataProps {
  name?: string;
  description?: string;
  url?: string;
}

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://kontekst.news';

export const ArticleStructuredData = ({
  title,
  description,
  image,
  datePublished,
  dateModified,
  author,
  url,
  section,
  keywords = [],
}: ArticleStructuredDataProps) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: description,
    image: image.startsWith('http') ? image : `${SITE_URL}${image}`,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author.name,
      ...(author.bio && { description: author.bio }),
      ...(author.image && { image: author.image }),
      ...(author.url && { url: author.url }),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Контекст',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}${url}`,
    },
    ...(section && { articleSection: section }),
    ...(keywords.length > 0 && { keywords: keywords.join(', ') }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};

export const WebsiteStructuredData = ({
  name = 'Контекст',
  description = 'Независимые новости и аналитика',
  url = SITE_URL,
}: WebsiteStructuredDataProps) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: name,
    description: description,
    url: url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};

export const BreadcrumbStructuredData = ({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};
