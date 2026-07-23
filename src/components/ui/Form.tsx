import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

/**
 * Form controls. Fields are filled wells rather than outlined boxes — on paper
 * a recessed surface reads as "type here" more immediately than a border does,
 * and it keeps the page free of the rectangles the design otherwise avoids.
 *
 * Labels are real <label> elements bound by id; errors are wired through
 * aria-describedby and sit under the hint rather than replacing it, so nobody
 * loses the instruction the moment they get something wrong.
 */

/**
 * Fields carry their own lighter surface *and* a hairline, so they stay
 * legible on every ground the site has — paper, a paper-2 card, or a tinted
 * panel. Relying on fill alone is what made them disappear inside cards.
 */
const fieldBase =
  'w-full rounded-2xl bg-field px-5 py-4 text-base text-ink placeholder:text-ink-mute ' +
  'border border-line transition-colors duration-200 ' +
  'hover:border-ink/25 focus:border-blue focus:outline-none';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({
  label,
  hint,
  error,
  optional,
  optionalLabel = 'optional',
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-mute">({optionalLabel})</span>}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && (
        <p id={hintId} className="text-sm text-ink-mute">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-red">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={clsx(fieldBase, invalid && 'border-red', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function TextArea({
  invalid,
  className,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={rows}
      className={clsx(fieldBase, 'resize-y', invalid && 'border-red', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(fieldBase, 'cursor-pointer py-3.5 pr-10', className)} {...rest}>
      {children}
    </select>
  );
}

/** Multi-select as toggle pills, with a real checkbox underneath. */
export function CheckChip({
  checked,
  onChange,
  children,
  name,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  name?: string;
}) {
  return (
    <label
      data-cursor="link"
      className={clsx(
        'cursor-pointer select-none rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-200',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-blue',
        checked ? 'bg-blue text-paper' : 'bg-paper-2 text-ink-soft hover:bg-paper-3 hover:text-ink',
      )}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {children}
    </label>
  );
}

/** Single choice as stacked cards. */
export function RadioRow<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | null;
  options: Array<{ value: T; label: string; hint?: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2.5">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            data-cursor="link"
            className={clsx(
              'flex cursor-pointer items-start gap-3.5 rounded-2xl p-4 transition-colors duration-200',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-blue',
              selected ? 'bg-blue text-paper' : 'bg-paper-2 hover:bg-paper-3',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={clsx(
                'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                selected ? 'border-paper' : 'border-ink/30',
              )}
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-paper" />}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className={clsx('text-sm font-medium', selected ? 'text-paper' : 'text-ink')}>
                {option.label}
              </span>
              {option.hint && (
                <span className={clsx('text-xs', selected ? 'text-paper/70' : 'text-ink-mute')}>
                  {option.hint}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
