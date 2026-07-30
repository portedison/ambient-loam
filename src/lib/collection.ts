import type { MarkerImage } from "@/components/TerrainViewer";

const COLLECTION_API = "https://collection.canterburymuseum.com/api/v3";

// Minimal shape of the fields we read from a Vernon / eHive OPAC object.
type OpacField = { value: string };
type OpacFieldSet = { identifier: string; opacObjectFields: OpacField[] };
type ImageDerivative = {
  identifier: string;
  url: string;
  width: string;
  height: string;
};
type OpacObject = {
  opacObjectId: string;
  slug: string;
  opacObjectFieldSets: OpacFieldSet[];
  imagesCollection?: { images?: { imageDerivatives: ImageDerivative[] }[] };
};

function fieldValue(object: OpacObject, identifier: string): string {
  const set = object.opacObjectFieldSets.find((s) => s.identifier === identifier);
  return set ? set.opacObjectFields.map((f) => f.value).join(" ").trim() : "";
}

/**
 * Fetch one Canterbury Museum collection object by id and derive its card image
 * (URL, intrinsic size, and an accession-stamped credit) straight from the API
 * response. Runs server-side (no CORS) and is cached for a day.
 *
 * Returns null if the object can't be fetched or has no image, so a marker
 * degrades gracefully to text only rather than crashing the page.
 */
export async function fetchCollectionImage(
  opacObjectId: string,
  alt: string,
  derivative: "MEDIUM" | "LARGE" = "MEDIUM",
): Promise<MarkerImage | null> {
  try {
    const res = await fetch(`${COLLECTION_API}/opacobjects/${opacObjectId}`, {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const object = (await res.json()) as OpacObject;

    const derivatives =
      object.imagesCollection?.images?.[0]?.imageDerivatives ?? [];
    const image =
      derivatives.find((d) => d.identifier === derivative) ?? derivatives[0];
    if (!image) throw new Error("no image derivative");

    const name = fieldValue(object, "name");
    const accession = fieldValue(object, "accession_no");

    return {
      src: image.url,
      width: Number(image.width),
      height: Number(image.height),
      alt,
      credit: `${name} — Canterbury Museum${accession ? `, ${accession}` : ""}`,
    };
  } catch (err) {
    console.error(`[collection] failed to fetch object ${opacObjectId}:`, err);
    return null;
  }
}
