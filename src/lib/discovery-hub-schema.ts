import { SITE_URL, absoluteUrl } from "@/lib/site";

export type DiscoveryListItem = {
  name: string;
  path: string;
};

/**
 * CollectionPage node for a server-rendered discovery hub.
 * The caller supplies page-specific factual content and the canonical page URL.
 */
export function buildDiscoveryCollectionPageSchema(input: {
  name: string;
  description: string;
  path: string;
  itemListPath: string;
}) {
  const url = absoluteUrl(input.path);
  const itemListUrl = absoluteUrl(input.itemListPath);
  return {
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: input.name,
    description: input.description,
    url,
    inLanguage: "en-IN",
    isPartOf: { "@id": `${SITE_URL}#website` },
    mainEntity: { "@id": `${itemListUrl}#job-list` },
  };
}

/**
 * ItemList must be built from the exact items rendered in the current response.
 * It describes canonical detail URLs; it does not create JobPosting entities.
 */
export function buildDiscoveryItemListSchema(input: {
  name: string;
  description: string;
  path: string;
  items: DiscoveryListItem[];
  positionOffset?: number;
}) {
  const url = absoluteUrl(input.path);
  const offset = input.positionOffset ?? 0;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${url}#job-list`,
    name: input.name,
    description: input.description,
    numberOfItems: input.items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: offset + index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}
