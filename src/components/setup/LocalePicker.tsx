import LocaleCarousel from "./LocaleCarousel";
import type { LocaleValue } from "./LocalePicker.types";

export type { LocaleValue } from "./LocalePicker.types";

type Props = {
  value: LocaleValue;
  onChange: (next: LocaleValue) => void;
  disabled?: boolean;
};

export default function LocalePicker({ value, onChange, disabled }: Props) {
  return (
    <LocaleCarousel
      value={value}
      onChange={onChange}
      disabled={disabled}
      hint="Tap a flag — language and region stay paired."
    />
  );
}
