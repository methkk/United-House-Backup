import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
}

export function SEOHead({
  title = "United-House | Connect with Government Officials & Communities",
  description = "United-House is the premier platform connecting citizens with government officials and departments. Join communities, discuss policies, and engage in productive civic dialogue.",
  keywords = "United House, united-house, government, officials, communities, civic engagement, politics, local government, democracy, citizen participation",
  image = "https://www.united-house.com/og-image.jpg",
  url = "https://www.united-house.com",
  type = "website",
  noindex = false
}: SEOHeadProps) {
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="United-House" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Additional structured data for specific pages */}
      {type === 'article' && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": title,
            "description": description,
            "image": image,
            "url": url,
            "publisher": {
              "@type": "Organization",
              "name": "United-House",
              "logo": "https://www.united-house.com/logo.png"
            }
          })}
        </script>
      )}
    </Helmet>
  );
}