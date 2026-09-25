const input = "w-full rounded-md border border-line bg-navy px-3 py-2 text-sm placeholder:text-muted/60";

type FieldProps = {
  label: string; name: string; type?: string; required?: boolean;
  defaultValue?: string | number; hint?: string; step?: string; placeholder?: string; autoComplete?: string; accept?: string;
};

export function Field({ label, name, type = "text", required, defaultValue, hint, step, placeholder, autoComplete, accept }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm">{label}{required && <span aria-hidden className="text-muted"> *</span>}</label>
      <input id={name} name={name} type={type} required={required} defaultValue={defaultValue} step={step}
        placeholder={placeholder} autoComplete={autoComplete} accept={accept} aria-describedby={hintId} className={input} />
      {hint && <p id={hintId} className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Select({ label, name, options, defaultValue, required, hint }: {
  label: string; name: string; options: { value: string; label: string }[];
  defaultValue?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm">{label}</label>
      <select id={name} name={name} required={required} defaultValue={defaultValue} className={input}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#6D6AF8]" /> {label}
    </label>
  );
}

export function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm">{label}</label>
      <textarea id={name} name={name} rows={3} defaultValue={defaultValue} className={input} />
    </div>
  );
}
