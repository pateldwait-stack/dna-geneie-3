import React, { useState } from 'react';
import {
  Apple,
  ArrowRight,
  Brain,
  ChevronDown,
  Dna,
  Dumbbell,
  Pill,
  Salad,
  type LucideIcon,
} from 'lucide-react';

interface NutritionParameter {
  name: string;
  description: string;
}

interface NutritionCategory {
  number: string;
  name: string;
  introduction: string;
  icon: LucideIcon;
  parameters: NutritionParameter[];
}

interface NutritionParametersSectionProps {
  onExploreReport: () => void;
}

const nutritionCategories: NutritionCategory[] = [
  {
    number: '01',
    name: 'Dietary Requirements',
    introduction: 'Diet composition, healthy fat responses, and sodium sensitivity.',
    icon: Apple,
    parameters: [
      { name: 'Optimum Diet Type', description: 'Best macronutrient balance' },
      { name: 'Monounsaturated Fats', description: 'Response to healthy MUFAs' },
      { name: 'Polyunsaturated Fats', description: 'Response to omega PUFAs' },
      { name: 'Sensitivity to Salt', description: 'Blood pressure salt effect' },
    ],
  },
  {
    number: '02',
    name: 'Exercise & Weight Loss',
    introduction: 'Exercise-related fat loss and weight-related genetic parameters.',
    icon: Dumbbell,
    parameters: [
      { name: 'Metabolic Rate', description: 'Resting calorie burn speed' },
      { name: 'Loss of Body Fat/Exercise', description: 'Fat loss from working out' },
      { name: 'Response to Dieting', description: 'Weight loss from diet alone' },
      { name: 'Weight Loss/Regain', description: 'Tendency to regain weight' },
      { name: 'Best Diet for Weight Loss', description: 'Top slimming diet approach' },
      { name: 'Obesity', description: 'Genetic risk of obesity' },
    ],
  },
  {
    number: '03',
    name: 'Metabolic Health Factors',
    introduction: 'Parameters covering blood fats, glucose, oxidative stress, detoxification, and iron.',
    icon: Dna,
    parameters: [
      { name: 'HDL Cholesterol', description: 'Good cholesterol levels' },
      { name: 'LDL Cholesterol', description: 'Bad cholesterol levels' },
      { name: 'Triglyceride Levels', description: 'Blood fat concentration' },
      { name: 'Blood Sugar Levels', description: 'Glucose regulation ability' },
      { name: 'Oxidative Stress', description: 'Free radical defense level' },
      { name: 'Detoxification', description: 'Toxin clearance efficiency' },
      { name: 'Iron Levels', description: 'Iron absorption & storage' },
    ],
  },
  {
    number: '04',
    name: 'Nutritional Needs',
    introduction: 'Vitamins, minerals, and essential fatty acid balance.',
    icon: Pill,
    parameters: [
      { name: 'Calcium', description: 'Bone & mineral absorption' },
      { name: 'Copper', description: 'Trace mineral requirement' },
      { name: 'Folate', description: 'Vitamin B9 utilization' },
      { name: 'Magnesium', description: 'Muscle & nerve mineral need' },
      { name: 'Omega-3 & Omega-6', description: 'Essential fatty acid balance' },
      { name: 'Phosphorus', description: 'Cellular energy mineral' },
      { name: 'Selenium', description: 'Antioxidant mineral need' },
      { name: 'Vitamin A', description: 'Vision & immunity vitamin' },
      { name: 'Vitamin B2', description: 'Riboflavin energy support' },
      { name: 'Vitamin B6', description: 'Metabolism & mood vitamin' },
      { name: 'Vitamin B12', description: 'Nerve & red blood cell need' },
      { name: 'Vitamin C', description: 'Antioxidant & collagen need' },
      { name: 'Vitamin D', description: 'Sunshine & bone vitamin' },
      { name: 'Vitamin E', description: 'Cell-protecting antioxidant' },
      { name: 'Zinc', description: 'Immunity & repair mineral' },
    ],
  },
  {
    number: '05',
    name: 'Reactions to Food',
    introduction: 'Genetic parameters related to responses to selected foods and beverages.',
    icon: Salad,
    parameters: [
      { name: 'Lactose Intolerance', description: 'Dairy sugar digestion' },
      { name: 'Alcohol Flush', description: 'Alcohol breakdown reaction' },
      { name: 'Caffeine Metabolism', description: 'Caffeine processing speed' },
      { name: 'Gluten Sensitivity', description: 'Wheat protein reaction risk' },
      { name: 'Peanut Allergy', description: 'Peanut immune sensitivity' },
    ],
  },
  {
    number: '06',
    name: 'Eating Behaviors',
    introduction: 'Parameters associated with eating patterns and taste perception.',
    icon: Brain,
    parameters: [
      { name: 'Eating Disinhibition', description: 'Loss of eating restraint' },
      { name: 'Tendency to Overeat', description: 'Likelihood of overeating' },
      { name: 'Satiety', description: 'Fullness feeling after meals' },
      { name: 'Snacking', description: 'Between-meal craving habit' },
      { name: 'Bitter Taste', description: 'Sensitivity to bitter foods' },
      { name: 'Umami Taste', description: 'Savory flavor sensitivity' },
    ],
  },
];

const totalParameters = nutritionCategories.reduce(
  (total, category) => total + category.parameters.length,
  0,
);
const nutritionalNeedsCount =
  nutritionCategories.find((category) => category.name === 'Nutritional Needs')?.parameters.length ?? 0;

interface NutritionParameterItemProps {
  parameter: NutritionParameter;
}

const NutritionParameterItem: React.FC<NutritionParameterItemProps> = ({ parameter }) => (
  <li
    data-nutrition-parameter
    className="rounded-xl border border-slate-100 bg-white/80 p-3.5 transition-colors duration-200 hover:border-teal-200 hover:bg-white motion-reduce:transition-none"
  >
    <p className="text-sm font-semibold text-[#0B2246]">{parameter.name}</p>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">{parameter.description}</p>
  </li>
);

interface NutritionCategoryCardProps {
  category: NutritionCategory;
  expanded: boolean;
  onToggle: () => void;
}

const NutritionCategoryCard: React.FC<NutritionCategoryCardProps> = ({
  category,
  expanded,
  onToggle,
}) => {
  const Icon = category.icon;
  const contentId = `nutrition-category-${category.number}`;
  const isNutritionalNeeds = category.name === 'Nutritional Needs';

  return (
    <article
      data-nutrition-category={category.name}
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none ${
        isNutritionalNeeds ? 'lg:col-span-2' : ''
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D9488] sm:p-6"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#0D9488]">
          <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-bold tracking-[0.16em] text-[#0D9488]">
              CATEGORY {category.number}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
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
          <div className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <ul
              className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${
                isNutritionalNeeds ? 'xl:grid-cols-3' : ''
              }`}
            >
              {category.parameters.map((parameter) => (
                <NutritionParameterItem key={parameter.name} parameter={parameter} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
};

interface NutritionStatProps {
  value: number;
  label: string;
}

const NutritionStat: React.FC<NutritionStatProps> = ({ value, label }) => (
  <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm sm:p-5">
    <p className="font-display text-3xl font-extrabold tracking-tight text-[#0B2246] sm:text-4xl">
      {value}
    </p>
    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 sm:text-sm">{label}</p>
  </div>
);

export const NutritionParametersSection: React.FC<NutritionParametersSectionProps> = ({
  onExploreReport,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="nutrition-parameters-heading"
      className="relative isolate overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/50 p-5 shadow-sm sm:p-8 lg:p-10"
    >
      <Dna
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-2 -z-10 h-24 w-24 text-[#0D9488]/[0.06] sm:h-40 sm:w-40"
        strokeWidth={1}
      />

      <div className="relative">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-[#0D9488]">
            <Dna aria-hidden="true" className="h-3.5 w-3.5" />
            GENETIC NUTRITION PROFILE
          </span>
          <h2
            id="nutrition-parameters-heading"
            className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight text-[#0B2246] sm:text-4xl lg:text-5xl"
          >
            Discover What Your DNA Reveals About Your Nutrition
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Explore 43 scientifically analysed genetic parameters across six key categories to
            understand your nutritional tendencies, metabolic characteristics, dietary responses,
            and personalized nutritional requirements.
          </p>
          <p className="mt-4 inline-flex rounded-xl border border-teal-100 bg-white/80 px-4 py-2.5 text-xs font-bold leading-relaxed text-[#0B2246] sm:text-sm">
            {totalParameters} Tested Parameters | {nutritionCategories.length} Categories | One
            Personalized Genetic Nutrition Profile
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <NutritionStat value={totalParameters} label="Total Tested Parameters" />
          <NutritionStat value={nutritionCategories.length} label="Genetic Nutrition Categories" />
          <NutritionStat value={nutritionalNeedsCount} label="Nutritional Needs Parameters" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          {nutritionCategories.map((category) => (
            <NutritionCategoryCard
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
                Your DNA. Your Nutrition. Your Personalized Blueprint.
              </h3>
              <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                Discover how your unique genetic profile can help inform your nutritional choices
                and support a more personalized approach to wellness.
              </p>
            </div>
            <button
              type="button"
              onClick={onExploreReport}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0B2246] transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2246] motion-reduce:transition-none"
            >
              Explore Your Nutrition Report
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-500">
          Genetic testing parameters are not diagnoses. Results do not confirm food allergies,
          intolerances, or medical conditions.
        </p>
      </div>
    </section>
  );
};
