-- Domus: injecte deux articles OPTIONNELS (Conditions particulieres + Etat des lieux)
-- dans le modele de bail residentiel v2, via des sections conditionnelles {{#if ...}}.
-- Les blocs disparaissent du PDF quand le champ du bail est vide (terms / moveInNotes).
-- Idempotent: ne modifie que si le marqueur des nouveaux articles est absent.
UPDATE `real_estate_contract_templates`
SET
  `body` = REPLACE(
    `body`,
    'ARTICLE 16 : DISPOSITIONS FINALES',
    CONCAT(
      '{{#if CONDITIONS PARTICULIÈRES}}ARTICLE 16 : CONDITIONS PARTICULIÈRES\n',
      'Les parties conviennent en outre des conditions particulières suivantes, qui complètent et, en cas de contradiction, priment sur les clauses générales du présent contrat :\n',
      '[CONDITIONS PARTICULIÈRES]\n\n{{/if}}',
      '{{#if NOTES ÉTAT DES LIEUX}}ARTICLE 17 : ÉTAT DES LIEUX D''ENTRÉE\n',
      'L''état des lieux d''entrée établi lors de la remise des clés est décrit ci-après et fait partie intégrante du présent contrat :\n',
      '[NOTES ÉTAT DES LIEUX]\n\n{{/if}}',
      'ARTICLE 18 : DISPOSITIONS FINALES'
    )
  ),
  `updated_at` = CURRENT_TIMESTAMP
WHERE `type` = 'residential'
  AND `organization_id` = 1
  AND `is_deleted` = 0
  AND `body` LIKE '%ARTICLE 16 : DISPOSITIONS FINALES%'
  AND `body` NOT LIKE '%{{#if CONDITIONS PARTICULIÈRES}}%';
