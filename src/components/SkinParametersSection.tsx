import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Dna,
  Fingerprint,
  Flame,
  Pill,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from 'lucide-react';

interface SkinParameter {
  name: string;
  description: string;
}

interface SkinCategory {
  number: string;
  name: string;
  introduction: string;
  icon: LucideIcon;
  parameters: SkinParameter[];
}

interface SkinParametersSectionProps {
  onExploreReport: () => void;
}

const skinCategories: SkinCategory[] = [
  {
    number: '01',
    name: 'Texture & Elasticity',
    introduction: 'Parameters associated with skin texture, connective tissue, and elasticity.',
    icon: Fingerprint,
    parameters: [
      { name: 'Cellulite', description: 'Subcutaneous fat dimpling' },
      { name: 'Collagen Degradation', description: 'Skin collagen breakdown rate' },
      { name: 'Stretch Marks', description: 'Skin striae scarring risk' },
      { name: 'Varicose Veins', description: 'Vein valve & pooling risk' },
    ],
  },
  {
    number: '02',
    name: 'Moisture & Defense',
    introduction: 'Explore moisture balance, antioxidant response, and environmental defense parameters.',
    icon: ShieldCheck,
    parameters: [
      { name: 'Antioxidant Response', description: 'Free radical skin defense' },
      { name: 'Detoxification', description: 'Skin toxin clearance rate' },
      { name: 'Pollution Defense', description: 'Air pollution skin defense' },
      { name: 'Dry Skin', description: 'Moisture barrier & dryness' },
      { name: 'Glycation & Accelerated Aging', description: 'Sugar-linked collagen aging' },
    ],
  },
  {
    number: '03',
    name: 'Photoaging & Pigmentation',
    introduction: 'Parameters related to UV response, pigmentation, and skin aging.',
    icon: Sun,
    parameters: [
      { name: 'Freckles', description: 'Sun-induced freckling risk' },
      { name: 'UV Damage & Sunspots', description: 'Sunspot & UV aging risk' },
      { name: 'Melanin Production & Tanning', description: 'Tanning & pigment response' },
      { name: 'UV Repair', description: 'UV DNA damage repair rate' },
    ],
  },
  {
    number: '04',
    name: 'Skin Inflammation',
    introduction: 'Parameters related to skin responses, inflammation, and sleep-linked repair.',
    icon: Flame,
    parameters: [
      { name: 'Acne', description: 'Breakout & pore inflammation' },
      { name: 'Eczema', description: 'Atopic dermatitis risk' },
      { name: 'Psoriasis', description: 'Autoimmune skin plaque risk' },
      { name: 'Sleep Quality', description: 'Circadian skin repair & rest' },
    ],
  },
  {
    number: '05',
    name: 'Nutritional Needs',
    introduction: 'Vitamins and cellular nutrients included in the genetic skin profile.',
    icon: Pill,
    parameters: [
      { name: 'Folate', description: 'Cell renewal & skin firmness' },
      { name: 'Vitamin A', description: 'Beta-carotene & skin renewal' },
      { name: 'Vitamin B12', description: 'Pigment & cell health level' },
      { name: 'Vitamin B2', description: 'Riboflavin skin barrier need' },
      { name: 'Vitamin B6', description: 'Skin inflammation & B6 level' },
      { name: 'Vitamin C', description: 'Collagen & UV repair vitamin' },
      { name: 'Vitamin E', description: 'UV & lipid skin antioxidant' },
      { name: 'CoQ10', description: 'Cellular energy & anti-aging' },
    ],
  },
];

const totalParameters = skinCategories.reduce(
  (total, category) => total + category.parameters.length,
  0,
);
const nutritionalNeedsCount =
  skinCategories.find((category) => category.name === 'Nutritional Needs')?.parameters.length ?? 0;

interface SkinParameterItemProps {
  parameter: SkinParameter;
  className?: string;
}

const SkinParameterItem: React.FC<SkinParameterItemProps> = ({ parameter, className = '' }) => (
  <li
    data-skin-parameter
    className={`rounded-xl border border-[#eee9df] bg-white/85 p-3.5 transition-colors duration-200 hover:border-teal-200 hover:bg-white motion-reduce:transition-none ${className}`}
  >
    <p className="text-sm font-semibold text-[#0B2246]">{parameter.name}</p>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">{parameter.description}</p>
  </li>
);

interface SkinCategoryCardProps {
  category: SkinCategory;
  expanded: boolean;
  onToggle: () => void;
}

const SkinCategoryCard: React.FC<SkinCategoryCardProps> = ({
  category,
  expanded,
  onToggle,
}) => {
  const Icon = category.icon;
  const contentId = `skin-category-${category.number}`;
  const isNutritionalNeeds = category.name === 'Nutritional Needs';
  const isMoistureDefense = category.name === 'Moisture & Defense';

  return (
    <article
      data-skin-category={category.name}
      className={`overflow-hidden rounded-2xl border border-[#e9e4da] bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none ${
        isNutritionalNeeds ? 'md:col-span-2' : ''
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D9488] sm:p-6"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f7f3eb] text-[#0D9488]">
          <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-bold tracking-[0.16em] text-[#0D9488]">
              CATEGORY {category.number}
            </span>
            <span className="rounded-full bg-[#f6f4f0] px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {category.parameters.length} parameters
            </span>
          </span>
          <span className="mt-1 block font-display text-lg font-bold leading-snug text-[#0B2246] sm:text-xl">
            {category.name}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-slate-500">
            {category.introduction}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        id={contentId}
        aria-hidden={!expanded}
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[#eee9df] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <ul
              className={`grid grid-cols-1 gap-2.5 ${
                isNutritionalNeeds ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2'
              }`}
            >
              {category.parameters.map((parameter, index) => (
                <SkinParameterItem
                  key={parameter.name}
                  parameter={parameter}
                  className={
                    isMoistureDefense && index === category.parameters.length - 1
                      ? 'sm:col-span-2'
                      : ''
                  }
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
};

interface SkinStatProps {
  value: number;
  label: string;
}

const SkinStat: React.FC<SkinStatProps> = ({ value, label }) => (
  <div className="rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm sm:p-5">
    <p className="font-display text-3xl font-extrabold tracking-tight text-[#0B2246] sm:text-4xl">
      {value}
    </p>
    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 sm:text-sm">{label}</p>
  </div>
);

export const SkinParametersSection: React.FC<SkinParametersSectionProps> = ({
  onExploreReport,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="skin-parameters-heading"
      className="relative isolate overflow-hidden rounded-[2rem] border border-[#e9e4da] bg-gradient-to-br from-[#fffefa] via-white to-[#f7f3eb] p-5 shadow-sm sm:p-8 lg:p-10"
    >
      <Dna
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-2 -z-10 h-24 w-24 text-[#0D9488]/[0.06] sm:h-40 sm:w-40"
        strokeWidth={1}
      />

      <div className="relative">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#eee9df] bg-white/85 px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-[#0D9488]">
            <Fingerprint aria-hidden="true" className="h-3.5 w-3.5" />
            SKIN GENETICS & CELLULAR WELLNESS
          </span>
          <h2
            id="skin-parameters-heading"
            className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight text-[#0B2246] sm:text-4xl lg:text-5xl"
          >
            Discover What Your DNA Reveals About Your Skin
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Explore 25 scientifically analysed genetic parameters to understand your skin’s natural
            characteristics, collagen-related tendencies, moisture balance, environmental
            responses, pigmentation, and cellular aging. Discover personalized biological insights
            that help inform your approach to skin health and lifelong skin wellness.
          </p>
          <p className="mt-4 inline-flex rounded-xl border border-[#eee9df] bg-white/85 px-4 py-2.5 text-xs font-bold leading-relaxed text-[#0B2246] sm:text-sm">
            {totalParameters} Tested Parameters | {skinCategories.length} Categories | One
            Personalized Skin Profile
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <SkinStat value={totalParameters} label="Total Tested Parameters" />
          <SkinStat value={skinCategories.length} label="Skin Science Categories" />
          <SkinStat value={nutritionalNeedsCount} label="Nutritional Needs Parameters" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          {skinCategories.map((category) => (
            <SkinCategoryCard
              key={category.number}
              category={category}
              expanded={expandedCategory === category.number}
              onToggle={() =>
                setExpandedCategory((current) =>
                  current === category.number ? null : category.number,
                )
              }
            />
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-[#0B2246] p-6 text-white shadow-lg shadow-[#0B2246]/10 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h3 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                Your Skin. Your Genetics. Your Personalized Blueprint.
              </h3>
              <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                Discover the genetic factors associated with your skin characteristics,
                environmental responses, and cellular wellness. Explore a more personalized
                perspective on skin health and longevity with DNA GENEIE.
              </p>
            </div>
            <button
              type="button"
              onClick={onExploreReport}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0B2246] transition-colors hover:bg-[#f7f3eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2246] motion-reduce:transition-none"
            >
              Explore Your Skin Report
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-500">
          These are genetic testing parameters, not diagnoses. They do not diagnose dermatological
          diseases or replace clinical evaluation. Genetics alone does not determine skin
          appearance or aging.
        </p>
      </div>
    </section>
  );
};
