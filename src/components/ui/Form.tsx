import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

/**
 * Form controls. Labels are always real <label> elements bound by id, errors
 * are wired through aria-describedby, and the error text sits under the field
 * rather than replacing the hint — so nobody loses the instruction the moment
 * they get something wrong.
 */

const fieldBase =
  'w-full rounded-[2px] border bg-ink-deep px-3 py-2.5 text-base text-bone ' +
  'placeholder:text-bone-faint/60 transition-colors ' +
  'hover:border-rule focus:border-cyan focus:outline-none';

interface FieldShellProps {
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
}: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="spec flex items-baseline gap-2 text-bone-mute">
        {label}
        {optional && <span className="text-bone-faint/60 normal-case tracking-normal">({optionalLabel})</span>}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && (
        <p id={hintId} className="text-sm text-bone-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-rust">
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
      className={clsx(fieldBase, invalid ? 'border-rust' : 'border-rule-soft', className)}
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
      className={clsx(fieldBase, 'resize-y', invalid ? 'border-rust' : 'border-rule-soft', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

/**
 * Multi-select as a set of toggle chips. Uses real checkboxes underneath so
 * keyboard and screen-reader behaviour is the browser's, not ours.
 */
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
      className={clsx(
        'cursor-pointer select-none rounded-[2px] border px-3 py-2 text-sm transition-colors',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan',
        checked
          ? 'border-cyan bg-cyan/10 text-cyan-bright'
          : 'border-rule-soft text-bone-mute hover:border-rule hover:text-bone',
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

/** Single-choice as radio cards — same idea, one answer. */
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
    <div role="radiogroup" className="flex flex-col gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={clsx(
              'flex cursor-pointer items-start gap-3 rounded-[2px] border p-3 transition-colors',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan',
              selected
                ? 'border-cyan bg-cyan/[0.07]'
                : 'border-rule-soft hover:border-rule',
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
                'mt-1 h-3 w-3 shrink-0 rounded-full border',
                selected ? 'border-cyan bg-cyan' : 'border-rule',
              )}
            />
            <span className="flex flex-col gap-0.5">
              <span className={clsx('text-sm', selected ? 'text-bone' : 'text-bone-mute')}>
                {option.label}
              </span>
              {option.hint && <span className="text-xs text-bone-faint">{option.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
