import heroDnaGenomics from '../assets/images/hero_dna_genomics_1794562665744.jpg';
import dnaCollectionKit from '../assets/images/dna_collection_kit.jpeg';
import nutrigKitImg from '../assets/images/product_nutrig_kit_1794562665944.jpg';
import fitgKitImg from '../assets/images/product_fitg_kit_1794562669093.jpg';
import dermagKitImg from '../assets/images/product_dermag_kit_1794562667120.jpg';
import nutrigProductCardImg from '../assets/images/product_nutrig_final.jpeg';
import fitgProductCardImg from '../assets/images/product_fitg_final.jpeg';
import dermagProductCardImg from '../assets/images/product_dermag_final.jpeg';
import usaLabWorkflowImg from '../assets/images/usa_lab_workflow_1794562668018.jpg';

export const BRAND_ASSETS = {
  heroDnaGenomics,
  dnaCollectionKit,
  usaLabWorkflowImg,
  productImages: {
    nutrig: nutrigKitImg,
    fitg: fitgKitImg,
    dermag: dermagKitImg,
  } as Record<string, string>,
  productCardImages: {
    nutrig: nutrigProductCardImg,
    fitg: fitgProductCardImg,
    dermag: dermagProductCardImg,
  } as Record<string, string>,
};

export function getProductImage(slug: string, fallbackUrl?: string): string {
  return BRAND_ASSETS.productImages[slug] || fallbackUrl || heroDnaGenomics;
}
