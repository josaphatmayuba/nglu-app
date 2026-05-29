// SCRUM-229 — Phone input with country selector (flags + dial code).
//
// Wraps react-phone-number-input in an antd-friendly shell so it
// can be dropped inside <Form.Item> like any other antd input.
// Output value is the E.164 string ("+243999123456") or undefined.

import { forwardRef } from "react";
import PhoneInputBase from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "./PhoneInput.css";

const PhoneInput = forwardRef(function PhoneInput(
  { value, onChange, defaultCountry = "CD", placeholder = "Numéro de téléphone", disabled, ...rest },
  _ref,
) {
  return (
    <PhoneInputBase
      international
      countryCallingCodeEditable={false}
      defaultCountry={defaultCountry}
      value={value || undefined}
      onChange={(v) => onChange?.(v || "")}
      placeholder={placeholder}
      disabled={disabled}
      className="nglu-phone-input"
      {...rest}
    />
  );
});

export default PhoneInput;
