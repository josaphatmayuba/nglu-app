// Champ téléphone international avec drapeaux (comme le CRM immobilier).
// Les drapeaux sont bundlés localement (react-phone-number-input/flags) — pas de
// CDN externe, donc ils s'affichent toujours (le drapeau cassé venait d'un CDN).
import PhoneInputBase from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import fr from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";

export function DomusPhoneField({
  label,
  value,
  onChange,
  required = false,
  placeholder = "Numéro de téléphone",
  defaultCountry = "CD",
}) {
  return (
    <label className="domus-property-field domus-phone-field">
      {label != null && <span>{label}{required ? <b> *</b> : null}</span>}
      <PhoneInputBase
        international
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry}
        flags={flags}
        labels={fr}
        value={value || undefined}
        onChange={(v) => onChange?.(v || "")}
        placeholder={placeholder}
        className="domus-phone-input"
      />
    </label>
  );
}

export default DomusPhoneField;
