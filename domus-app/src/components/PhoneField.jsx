// Champ téléphone international avec drapeaux (comme le CRM immobilier).
// Les drapeaux sont bundlés localement (react-phone-number-input/flags) — pas de
// CDN externe, donc ils s'affichent toujours (le drapeau cassé venait d'un CDN).
import PhoneInputBase from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import fr from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";

// Les numeros existants en base peuvent contenir des espaces (« +243 999 444 555 »),
// or react-phone-number-input exige un E.164 strict (« +243999444555 ») pour la valeur
// initiale, sinon il rejette la valeur (console error) et rend le champ vide → le
// formulaire devient invalide. On nettoie donc les espaces/separateurs avant de la passer.
function toE164(v) {
  if (!v) return undefined;
  const cleaned = String(v).replace(/[\s().-]/g, "");
  return cleaned || undefined;
}

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
        value={toE164(value)}
        onChange={(v) => onChange?.(v || "")}
        placeholder={placeholder}
        className="domus-phone-input"
      />
    </label>
  );
}

export default DomusPhoneField;
