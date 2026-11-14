import React, { useId } from 'react';

const DISCLAIMER_TEXT =
  'This genetic wellness report is provided for informational and educational purposes only and is not intended to diagnose, treat, cure, mitigate, or prevent any disease or medical condition. Genetic results reflect inherited predispositions rather than definitive health outcomes and do not account for environmental or lifestyle factors. Always consult a qualified healthcare professional before making changes to your diet, exercise, supplement, or skincare regimen, and continue all regularly scheduled clinical screenings.';

interface GeneticTestingDisclaimerProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onInvalid: () => void;
  error?: string | null;
}

export const GeneticTestingDisclaimer: React.FC<GeneticTestingDisclaimerProps> = ({
  checked,
  onCheckedChange,
  onInvalid,
  error,
}) => {
  const id = useId();
  const checkboxId = `${id}-acknowledged`;
  const textId = `${id}-text`;
  const errorId = `${id}-error`;

  return (
    <aside
      aria-label="Genetic testing disclaimer"
      className="rounded-xl border border-slate-200 bg-[#f8f8f5] px-4 py-3.5 sm:px-5 sm:py-4"
    >
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          required
          onChange={(event) => onCheckedChange(event.target.checked)}
          onInvalid={onInvalid}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-400 accent-[#0D9488] focus:ring-2 focus:ring-[#0D9488]"
        />
        <div className="min-w-0">
          <label htmlFor={checkboxId} className="cursor-pointer">
            <span id={textId} className="block text-[11px] leading-relaxed text-slate-700 sm:text-xs">
              {DISCLAIMER_TEXT}
            </span>
          </label>
          {error && (
            <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};
