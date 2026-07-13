import type { Product } from "./types";
import { siteOrigin } from "./site-url";
import { displayProductTitle } from "./product-title";

export function productStructuredData(product: Product, categoryName: string) {
  const origin = siteOrigin();
  const productUrl = `${origin}/product/${product.id}`;
  const displayTitle = displayProductTitle(product.title);
  const productData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    url: productUrl,
    name: displayTitle,
    description: `${displayTitle}。AI日本度判定 ${product.score}%。${product.evidenceText}`,
    sku: `${product.source}-${product.sourceItemId}`,
  };

  if (product.imageUrl) productData.image = [product.imageUrl];
  const brand = product.brand || product.maker;
  if (brand) productData.brand = { "@type": "Brand", name: brand };
  if (product.price != null) {
    productData.offers = {
      "@type": "Offer",
      priceCurrency: "JPY",
      price: product.price,
    };
  }

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryName,
        item: `${origin}/category/${product.categorySlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: displayTitle,
        item: productUrl,
      },
    ],
  };

  return [productData, breadcrumbData];
}
