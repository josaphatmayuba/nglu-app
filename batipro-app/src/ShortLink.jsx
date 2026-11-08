import React, { useEffect, useState } from "react";
import { shortLinkApi } from "./api";
import EngineerSite from "./EngineerSite.jsx";
import OwnerTracking from "./OwnerTracking.jsx";

// Lien court des SMS : /batipro/c/:code. Le code est accepte comme jeton par les
// routes publiques tracking/site ; on choisit seulement la page selon le type.
export default function ShortLink({ code }) {
  const [kind, setKind] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    shortLinkApi.kind(code).then((r) => { if (!off) setKind(r.kind); }).catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, [code]);
  if (failed) return <p style={{ padding: 24, textAlign: "center" }}>Lien invalide ou expire.</p>;
  if (kind === "engineer") return <EngineerSite token={code} />;
  if (kind === "owner") return <OwnerTracking token={code} />;
  return <p style={{ padding: 24, textAlign: "center" }}>Chargement...</p>;
}
