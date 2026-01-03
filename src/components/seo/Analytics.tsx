import { Helmet } from 'react-helmet-async';

// Placeholder IDs - replace with real IDs when ready
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Google Analytics 4
const GTM_ID = 'GTM-XXXXXXX'; // Google Tag Manager

interface AnalyticsProps {
  gaId?: string;
  gtmId?: string;
}

export const GoogleAnalytics = ({ gaId = GA_MEASUREMENT_ID }: { gaId?: string }) => {
  // Don't load in development or if placeholder ID
  if (gaId.includes('XXXX') || import.meta.env.DEV) {
    return null;
  }

  return (
    <Helmet>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
      <script>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
      </script>
    </Helmet>
  );
};

export const GoogleTagManager = ({ gtmId = GTM_ID }: { gtmId?: string }) => {
  // Don't load if placeholder ID
  if (gtmId.includes('XXXX') || import.meta.env.DEV) {
    return null;
  }

  return (
    <Helmet>
      <script>
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `}
      </script>
    </Helmet>
  );
};

// Combined analytics component
export const Analytics = ({ gaId, gtmId }: AnalyticsProps) => {
  return (
    <>
      <GoogleAnalytics gaId={gaId} />
      <GoogleTagManager gtmId={gtmId} />
    </>
  );
};

// Search Console verification meta tag placeholder
export const SearchConsoleVerification = ({ verificationCode }: { verificationCode?: string }) => {
  if (!verificationCode || verificationCode.includes('XXXX')) {
    return null;
  }

  return (
    <Helmet>
      <meta name="google-site-verification" content={verificationCode} />
    </Helmet>
  );
};
