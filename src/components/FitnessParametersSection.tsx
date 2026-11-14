import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Dna,
  Dumbbell,
  HeartPulse,
  Moon,
  PersonStanding,
  Timer,
  type LucideIcon,
} from 'lucide-react';

interface FitnessParameter {
  name: string;
  description: string;
}

interface FitnessCategory {
  number: string;
  name: string;
  introduction: string;
  icon: LucideIcon;
  parameters: FitnessParameter[];
}

interface FitnessParametersSectionProps {
  onExploreReport: () => void;
}

const fitnessCategories: FitnessCategory[] = [
  {
    number: '01',
    name: 'Build',
    introduction: 'Parameters related to body structure, muscle volume, and pain response.',
    icon: PersonStanding,
    parameters: [
      { name: 'Blood Pressure & Muscle Growth', description: 'BP risk & muscle gain' },
      { name: 'Muscle Volume', description: 'Natural muscle mass level' },
      { name: 'Pain Tolerance', description: 'Pain threshold & sensitivity' },
    ],
  },
  {
    number: '02',
    name: 'Cardiovascular',
    introduction: 'Explore aerobic capacity and genetic parameters related to circulation.',
    icon: HeartPulse,
    parameters: [
      { name: 'Aerobic Capacity', description: 'VO2 max & endurance level' },
      { name: 'Aerobic Exercise Response', description: 'Cardio fitness improvement' },
      { name: 'Anaerobic Exercise Response', description: 'High-intensity stamina level' },
      { name: 'Blood Vessel Formation', description: 'New blood vessel growth' },
      { name: 'Nitric Oxide Metabolism', description: 'Blood vessel widening & flow' },
      { name: 'Vascular Function', description: 'Blood pressure & vessel tone' },
    ],
  },
  {
    number: '03',
    name: 'Metabolics',
    introduction: 'Exercise response parameters involving endurance, glucose, insulin, fats, and testosterone.',
    icon: Activity,
    parameters: [
      { name: 'Benefit from Endurance Training', description: 'Endurance exercise response' },
      { name: 'HDL Response to Exercise', description: 'Good cholesterol boost' },
      { name: 'Insulin Response to Exercise', description: 'Exercise insulin sensitivity' },
      { name: 'Glucose Response to Exercise', description: 'Blood sugar exercise control' },
      { name: 'Fat Loss in Response to Exercise', description: 'Exercise-driven fat burn' },
      { name: 'Testosterone Levels', description: 'Baseline testosterone level' },
    ],
  },
  {
    number: '04',
    name: 'Perform',
    introduction: 'Parameters related to exercise motivation and exercise-type preferences.',
    icon: Timer,
    parameters: [
      { name: 'Motivation to Exercise', description: 'Innate drive to work out' },
      { name: 'Optimum Type of Exercise', description: 'Best workout intensity type' },
      { name: 'Endurance vs. Strength', description: 'Power vs. endurance bias' },
    ],
  },
  {
    number: '05',
    name: 'Recovery',
    introduction: 'Explore parameters associated with injury risk, recovery, inflammation, and sleep.',
    icon: Moon,
    parameters: [
      { name: 'Ligament Strength', description: 'Ligament sprain & tear risk' },
      { name: 'Tendinopathy & Osteoarthritis', description: 'Joint & tendon wear risk' },
      { name: 'Achilles Tendinopathy', description: 'Achilles tendon injury risk' },
      { name: 'Injury Risk', description: 'Bone density & fracture risk' },
      { name: 'Recovery Time', description: 'Post-workout healing speed' },
      { name: 'Inflammation', description: 'Post-exercise inflammation' },
      { name: 'Sleep Duration', description: 'Average nightly sleep length' },
      { name: 'Sleep Quality', description: 'Circadian rhythm & rest' },
    ],
  },
  {
    number: '06',
    name: 'Strength',
    introduction: 'Parameters related to muscle development, strength, metabolism, and nerve activity.',
    icon: Dumbbell,
    parameters: [
      { name: 'Glucose Metabolism & Muscle Strength', description: 'Muscle oxygen & fuel use' },
      { name: 'Muscle Growth & Development', description: 'Anabolic muscle growth rate' },
      { name: 'Muscle Strength', description: 'Natural contractile force' },
      { name: 'Muscle Development', description: 'Muscle vs. fat gain response' },
      { name: 'Nerve Activity', description: 'Nerve-to-muscle signal speed' },
    ],
  },
];

const totalParameters = fitnessCategories.reduce(
  (total, category) => total + category.parameters.length,
  0,
);
const recoveryParameters =
  fitnessCategories.find((category) => category.name === 'Recovery')?.parameters.length ?? 0;

interface FitnessParameterItemProps {
  parameter: FitnessParameter;
  className?: string;
}

const FitnessParameterItem: React.FC<FitnessParameterItemProps> = ({ parameter, className = '' }) => (
  <li
    data-fitness-parameter
    className={`rounded-xl border border-slate-100 bg-white/80 p-3.5 transition-colors duration-200 hover:border-teal-200 hover:bg-white motion-reduce:transition-none ${className}`}
  >
    <p className="text-sm font-semibold text-[#0B2246]">{parameter.name}</p>
    <p className="mt-1 text-xs leading-relaxed text-slate-500">{parameter.description}</p>
  </li>
);

interface FitnessCategoryCardProps {
  category: FitnessCategory;
  expanded: boolean;
  onToggle: () => void;
}

const FitnessCategoryCard: React.FC<FitnessCategoryCardProps> = ({
  category,
  expanded,
  onToggle,
}) => {
  const Icon = category.icon;
  const contentId = `fitness-category-${category.number}`;
  const isRecovery = category.name === 'Recovery';
  const isCompact = category.parameters.length === 3;
  const isStrength = category.name === 'Strength';

  return (
    <article
      data-fitness-category={category.name}
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none ${
        isRecovery ? 'md:col-span-2' : ''
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D9488] sm:p-6"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0D9488]">
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
              className={`grid grid-cols-1 gap-2.5 ${
                isRecovery ? 'sm:grid-cols-2 xl:grid-cols-4' : isCompact ? '' : 'sm:grid-cols-2'
              }`}
            >
              {category.parameters.map((parameter, index) => (
                <FitnessParameterItem
                  key={parameter.name}
                  parameter={parameter}
                  className={
                    isStrength && index === category.parameters.length - 1 ? 'sm:col-span-2' : ''
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

interface FitnessStatProps {
  value: number;
  label: string;
}

const FitnessStat: React.FC<FitnessStatProps> = ({ value, label }) => (
  <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm sm:p-5">
    <p className="font-display text-3xl font-extrabold tracking-tight text-[#0B2246] sm:text-4xl">
      {value}
    </p>
    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 sm:text-sm">{label}</p>
  </div>
);

export const FitnessParametersSection: React.FC<FitnessParametersSectionProps> = ({
  onExploreReport,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="fitness-parameters-heading"
      className="relative isolate overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-5 shadow-sm sm:p-8 lg:p-10"
    >
      <Dna
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-2 -z-10 h-24 w-24 text-[#0D9488]/[0.06] sm:h-40 sm:w-40"
        strokeWidth={1}
      />

      <div className="relative">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-[#0D9488]">
            <Activity aria-hidden="true" className="h-3.5 w-3.5" />
            GENETIC FITNESS PROFILE
          </span>
          <h2
            id="fitness-parameters-heading"
            className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight text-[#0B2246] sm:text-4xl lg:text-5xl"
          >
            Discover Your Genetic Potential for Peak Performance
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Explore 31 scientifically analysed genetic parameters to understand your body’s natural
            athletic characteristics, cardiovascular capacity, exercise responses, muscular
            potential, and recovery tendencies. Discover genetic insights that help inform a more
            personalized approach to fitness and performance.
          </p>
          <p className="mt-4 inline-flex rounded-xl border border-blue-100 bg-white/80 px-4 py-2.5 text-xs font-bold leading-relaxed text-[#0B2246] sm:text-sm">
            {totalParameters} Tested Parameters | {fitnessCategories.length} Categories | One
            Personalized Fitness Profile
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <FitnessStat value={totalParameters} label="Total Tested Parameters" />
          <FitnessStat value={fitnessCategories.length} label="Fitness Categories" />
          <FitnessStat value={recoveryParameters} label="Recovery Parameters" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          {fitnessCategories.map((category) => (
            <FitnessCategoryCard
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
                Train Smarter. Understand Your Genetics. Unlock Your Potential.
              </h3>
              <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                Your genetic profile offers insights into your natural athletic characteristics,
                exercise responses, and recovery tendencies. Discover a more personalized
                perspective on your fitness journey with DNA GENEIE.
              </p>
            </div>
            <button
              type="button"
              onClick={onExploreReport}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0B2246] transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2246] motion-reduce:transition-none"
            >
              Explore Your Fitness Report
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-500">
          These are genetic testing parameters, not diagnoses or guaranteed outcomes. Genetics
          alone does not determine athletic ability or physical performance.
        </p>
      </div>
    </section>
  );
};
