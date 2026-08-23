import type { Product } from "./types";
import { siteOrigin } from "./site-url";
import { displayProductTitle } from "./product-title";
import { buildProductMetaDescription } from "./product-metadata";

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
    description: buildProductMetaDescription(product),
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
