-- SCRUM-192 (suite) -- Molecules actives / classes de vaccins usuels et
-- source de reference pour chaque maladie du catalogue global (organization_id
-- NULL). Contenu redige a partir de recherches web reelles (Merck Veterinary
-- Manual, PubMed/PMC, universites, revues veterinaires). Educatif, pas de
-- posologie ni de marque commerciale -- toujours confirmer avec un veterinaire.
-- Idempotent : UPDATE simple, rejouable sans effet de bord.

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique intramammaire de la famille des beta-lactamines : cephapirine, amoxicilline, ceftiofur, cloxacilline, ou lincosamide (pirlimycine). Traitement de premiere intention pour une mammite legere sur un seul quartier. Respecter le delai d attente du lait selon le produit choisi. Confirmer avec un veterinaire, surtout si mammite severe ou gangreneuse.',
  `recommended_products_source_url` = 'https://amrls.umn.edu/node/41'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Mammite';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique local ou systemique : oxytetracycline longue action, souvent associee au parage et au nettoyage de la plaie. Anti-inflammatoire pour la douleur. Si non ameliore sous 2-3 jours, consulter un veterinaire pour identifier une cause plus profonde (abces, corps etranger, fourbure).',
  `recommended_products_source_url` = 'https://www.norbrook.com/us/foot-rot-in-cattle/'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Boiterie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique de reference : ceftiofur (cephalosporine de 3e generation), forme cristalline longue action preferee car sans delai d attente sur le lait. Sur prescription veterinaire uniquement, en cas de metrite aigue ou fievre associee.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/reproductive-system/uterine-diseases-in-production-animals/metritis-in-production-animals'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Métrite';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Anti-inflammatoire non steroidien (AINS) : carprofen ou ketoprofen sur prescription. Ne jamais donner d antipyretique avant d avoir identifie la cause sous-jacente (mammite, metrite, pneumonie, plaie), car cela peut masquer le diagnostic. Repos complet et hydratation recommandes.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/generalized-conditions/bovine-ephemeral-fever/bovine-ephemeral-fever'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Fièvre';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire : ivermectine (lactone macrocyclique, spectre large parasites internes et externes) ou fenbendazole/albendazole (benzimidazoles, moins de resistance rapportee). Alterner les familles de molecules pour limiter le developpement de resistance dans le troupeau.',
  `recommended_products_source_url` = 'https://www.beefresearch.ca/topics/parasites-internal/'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Parasites internes';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin inactive contenant l antigene de la souche virale locale, formule avec adjuvant. Pas de traitement curatif specifique une fois l animal infecte : soins de support uniquement (isolement, alimentation molle pour lesions buccales). Maladie a declaration obligatoire dans la plupart des pays.',
  `recommended_products_source_url` = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8537456/'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Fièvre aphteuse';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant modifie (une dose, animaux non gestants) ou vaccin inactive (deux doses a 2 semaines d intervalle) contre le BVDV type 1 et/ou type 2 selon la souche circulante. Pas de traitement antiviral specifique, soins de support en cas de complication.',
  `recommended_products_source_url` = 'https://www.vet.cornell.edu/animal-health-diagnostic-center/programs/nyschap/modules-documents/bovine-viral-diarrhea-background-management-and-control'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Diarrhée virale bovine (BVD)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun traitement disponible chez le bovin. Controle exclusivement par depistage (test tuberculinique) et politique d abattage des animaux positifs. Vaccin BCG utilise chez la faune sauvage dans certains pays mais pas en routine chez le bovin domestique. Declaration obligatoire.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/generalized-conditions/overview-of-tuberculosis-in-animals/overview-of-tuberculosis-in-animals'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Tuberculose bovine';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin RB51 (souche rugueuse, n interfere pas avec le diagnostic serologique, utilisable sur genisses et vaches adultes) ou vaccin S19 (reserve aux genisses de 3-8 mois). Aucun traitement curatif : les animaux positifs sont isoles ou abattus selon le programme national. Declaration obligatoire, risque zoonotique.',
  `recommended_products_source_url` = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10583465/'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Brucellose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique systemique : oxytetracycline longue action ou florfenicol. Traitement topique oculaire a base d oxytetracycline en complement. Un vaccin existe mais son efficacite reste limitee en pratique. Isoler les animaux atteints, proteger de la lumiere directe.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/eye-diseases-and-disorders/infectious-keratoconjunctivitis/infectious-keratoconjunctivitis-in-cattle-and-small-ruminants'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Kératoconjonctivite infectieuse';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Calcium borogluconate (solution 23-40%) en injection intraveineuse lente sous surveillance cardiaque, seul traitement efficace en urgence. Ne jamais injecter rapidement ni a froid (rechauffer a temperature corporelle) : risque d arret cardiaque. Pronostic excellent si intervention precoce.',
  `recommended_products_source_url` = 'https://pubmed.ncbi.nlm.nih.gov/22923322/'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Fièvre de lait (hypocalcémie)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Propylene glycol par voie orale (drenchage) en premiere intention, source d energie rapidement convertie en glucose par le foie. Dextrose intraveineux possible en complement mais effet transitoire seul. Corriger aussi la ration energetique post-velage.',
  `recommended_products_source_url` = 'https://www.msdvetmanual.com/metabolic-disorders/hyperketonemia-in-cattle/hyperketonemia-in-cattle'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Cétose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant attenue souche Sterne 34F2, tres efficace en prevention. Important : ne jamais administrer d antibiotique dans la semaine suivant la vaccination (le vaccin vivant perd son efficacite). En cas de suspicion de cas actif, ne pas ouvrir la carcasse (risque de sporulation), alerter les autorites veterinaires immediatement.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/infectious-diseases/anthrax/anthrax-in-animals'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Charbon bactéridien';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant attenue souche Neethling, le plus efficace disponible en prevention (des reactions post-vaccinales legeres sont possibles chez une faible proportion d animaux). Pas de traitement antiviral specifique : soins de support des nodules cutanes et lutte contre les insectes vecteurs (moustiques, mouches).',
  `recommended_products_source_url` = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9734455/'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Dermatose nodulaire contagieuse';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Trypanocide : diminazene aceturate (traitement curatif) ou isometamidium chloride (traitement et prevention prolongee). Attention a la resistance croissante rapportee dans plusieurs regions d Afrique : alterner les molecules et confirmer l efficacite avec un veterinaire. Lutte antivectorielle (mouches tse-tse) en complement indispensable.',
  `recommended_products_source_url` = 'https://journals.asm.org/doi/10.1128/aac.42.5.1012'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Trypanosomiase';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Rehydratation orale par electrolytes en priorite (la deshydratation tue plus que l infection elle-meme). Antibiotique selon antibiogramme si disponible : aminoglycoside (gentamicine) en premiere intention chez le porcelet de 1 a 3 jours, ou penicilline/amoxicilline. Garder les porcelets au chaud et au sec.',
  `recommended_products_source_url` = 'https://www.nadis.org.uk/disease-a-z/pigs/neonatal-colibacillosis/'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Diarrhée néonatale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Ameliorer immediatement la ventilation et reduire la poussiere. Si la toux persiste ou s accompagne de fievre, antibiotique de la famille des tetracyclines, macrolides, lincosamides, ou pleuromutilines sur prescription (efficaces notamment contre Mycoplasma hyopneumoniae, cause frequente de toux chronique). Vaccin disponible mais reduit seulement la gravite, ne previent pas l infection.',
  `recommended_products_source_url` = 'https://www.mdpi.com/2079-6382/11/7/893'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Toux';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant modifie (protection la plus efficace mesuree) ou vaccin inactive (reponse immunitaire plus faible). Aucun traitement antiviral specifique : soins de support, controle des infections secondaires. Biosecurite stricte pour limiter l introduction de nouvelles souches dans l elevage.',
  `recommended_products_source_url` = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7926738/'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'PRRS';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Prevention prioritaire : materiel a mordiller (chaines, tuyaux, corde, bois) disponible en permanence, densite d elevage adaptee, alimentation fibreuse suffisante. Sur plaie de morsure : nettoyage, antiseptique local, surveiller l apparition d abces (risque de propagation a la colonne vertebrale ou aux articulations). Pas de vaccin, c est un trouble comportemental.',
  `recommended_products_source_url` = 'https://www.nadis.org.uk/disease-a-z/pigs/tail-biting/'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Morsure de queue';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique : penicilline, ampicilline, ou lincomycine en premiere intention ; oxytetracycline, amoxicilline ou enrofloxacine en alternative. Traiter tot et pendant au moins 3 a 5 jours pour de meilleurs resultats. Anti-inflammatoire (ketoprofen ou flunixine meglumine) recommande pour la douleur, notamment chez le porcelet.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/musculoskeletal-system/lameness-in-pigs/overview-of-lameness-in-pigs'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Boiterie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun vaccin homologue largement disponible ni traitement curatif. Controle exclusivement par biosecurite stricte, depistage precoce, abattage sanitaire des foyers, restriction des mouvements d animaux. Ne jamais tenter d auto-traiter : declarer immediatement aux autorites veterinaires en cas de suspicion.',
  `recommended_products_source_url` = 'https://www.thepigsite.com/news/2026/07/woah-issues-field-guidelines-for-african-swine-fever-vaccination'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Peste porcine africaine';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant attenue tres efficace, utilise dans les programmes d eradication obligatoires de plusieurs pays. Vaccins marqueurs (sous-unite E2) disponibles pour permettre de distinguer animaux vaccines et infectes (DIVA). Aucun traitement curatif disponible une fois l animal infecte : abattage sanitaire selon reglementation locale, maladie a declaration obligatoire.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/generalized-conditions/classical-swine-fever/classical-swine-fever'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Peste porcine classique';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun traitement efficace disponible, soins de support uniquement (maladie devenue rare, plus de vaccin commercial disponible dans la plupart des pays). En cas de suspicion, isoler immediatement et contacter un veterinaire : mesures non specifiques (restriction des mouvements, desinfection) sont la seule option de controle.',
  `recommended_products_source_url` = 'https://www.msdvetmanual.com/nervous-system/teschovirus-encephalomyelitis/overview-of-teschovirus-encephalomyelitis'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Maladie de Teschen';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique de reference : penicilline (injection rapide deux fois par jour pendant 3 jours, ou forme longue action en dose unique repetable) ; ceftiofur ou ampicilline en alternative acceptable. Amelioration marquee attendue en 24-36h si traite tot. Vaccin inactive (bacterine, serotypes 1 ou 2) recommande en prevention chez les reproducteurs.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/infectious-diseases/erysipelothrix-rhusiopathiae-infection/swine-erysipelas'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Rouget du porc';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun traitement antiviral specifique : rehydratation par electrolytes, acces permanent a l eau, antibiotique (neomycine) pour limiter les infections bacteriennes secondaires, amelioration de l environnement (chaleur, litiere). Vaccins vivants ou inactives existent dans certains pays mais leur efficacite reste limitee, surtout par voie intramusculaire seule.',
  `recommended_products_source_url` = 'https://www.thepigsite.com/disease-guide/transmissible-gastro-enteritis-tge-coronavirus-prcv'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Gastro-entérite transmissible (TGE)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin inactive contre le circovirus porcin type 2 (PCV2), tres largement utilise et efficace pour reduire la circulation virale et la gravite clinique. Pas de traitement antiviral specifique : gestion des infections secondaires (le PCV2 provoque une immunodepression favorisant d autres maladies).',
  `recommended_products_source_url` = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9504358/'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Circovirose porcine';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique actif sur Mycoplasma hyopneumoniae : tetracyclines, macrolides (tulathromycine), lincosamides, ou pleuromutilines sur prescription. Vaccin disponible et couramment utilise, reduit les signes cliniques mais ne previent pas totalement l infection : le combiner a de bonnes conditions de logement et ventilation.',
  `recommended_products_source_url` = 'https://www.thepigsite.com/articles/performance-and-health-improvements-of-pigs-treated-with-draxxin-tulathromycin-injectable-solution-a-mycoplasma-hyopneumoniae-challenge-model'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Pneumonie enzootique';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Pas de traitement medicamenteux specifique. Surveillance de la taille et de l evolution de la hernie : les petites hernies peuvent se resorber, les plus grandes ou etranglees necessitent une intervention chirurgicale par un veterinaire. Pas de vaccin, malformation congenitale ou consecutive a une infection ombilicale du nouveau-ne.',
  `recommended_products_source_url` = 'https://animalgenome.org/edu/PIH/36.html'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Hernie ombilicale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique actif sur Mycoplasma gallisepticum (cause frequente) : doxycycline ou tylosine, souvent combines. Ces molecules ciblent la synthese proteique bacterienne car Mycoplasma n a pas de paroi cellulaire (les beta-lactamines comme la penicilline sont inefficaces). Ameliorer la ventilation en parallele.',
  `recommended_products_source_url` = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8458857/'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Maladie respiratoire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Anticoccidien : amprolium (antagoniste de la thiamine, delai d attente nul sur oeufs et viande), en eau de boisson ou aliment. Vaccin vivant anticoccidien disponible, utilisable en programme combine avec un anticoccidien retarde (bioshuttle). Bonne litiere seche indispensable en prevention.',
  `recommended_products_source_url` = 'https://www.msdvetmanual.com/poultry/coccidiosis-in-poultry/coccidiosis-in-poultry'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Coccidiose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Identifier la cause avant de traiter : bacterienne (E. coli, Salmonella, Clostridium perfringens - antibiotique sur prescription), virale (Gumboro, Marek - pas de traitement specifique, antibiotique seulement pour prevenir une surinfection bacterienne) ou parasitaire (coccidiose - amprolium). Multivitamines et electrolytes en soutien dans tous les cas.',
  `recommended_products_source_url` = 'https://www.cacklehatchery.com/what-causes-diarrhea-in-chickens/'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Diarrhée';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Pas de vaccin ni de medicament : trouble comportemental lie a la densite, la lumiere, ou une carence alimentaire. Corriger la ration (proteines, mineraux), reduire l intensite lumineuse, offrir litiere au sol et materiel a picorer (corde, bloc a picorer). Epointage du bec en dernier recours si les mesures de fond echouent.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/poultry/miscellaneous-conditions-of-poultry/cannibalism-in-poultry'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Picage';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant attenue, souches LaSota ou B1 (les plus utilisees dans le monde depuis des decennies, bonne innocuite). Administration par eau de boisson, spray, ou gouttes oculaires des le premier jour. Pas de traitement antiviral une fois l animal infecte, soins de support uniquement. Maladie a declaration obligatoire dans de nombreux pays.',
  `recommended_products_source_url` = 'https://www.zoetisus.com/products/poultry/newcastle-lasota/'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Maladie de Newcastle';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant attenue (plusieurs niveaux d attenuation selon le risque local) ou vaccin inactive chez les reproducteurs pour transmettre l immunite aux poussins. Vaccins vecteurs HVT egalement disponibles. Pas de traitement antiviral specifique : la maladie affaiblit le systeme immunitaire, surveiller les infections secondaires.',
  `recommended_products_source_url` = 'https://poultrycontent.ceva.com/different-types-of-gumboro-vaccines'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Maladie de Gumboro';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin a base d herpesvirus du dindon (HVT), l un des plus utilises au monde, administre a l eclosion ou in ovo. Aucun traitement disponible une fois la maladie declaree : la vaccination precoce est la seule protection efficace, elle doit etre faite le plus tot possible apres l eclosion.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/poultry/neoplasms-in-poultry/marek-s-disease-in-poultry'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Maladie de Marek';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant attenue, souches de type Massachusetts (H120 attenuee, M41 en inactive) les plus utilisees dans le monde. Attention : les differents types antigeniques ne se protegent pas forcement entre eux, adapter la souche vaccinale a celle circulant localement. Pas de traitement antiviral specifique.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/poultry/infectious-bronchitis/infectious-bronchitis-in-chickens'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Bronchite infectieuse';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant a base de virus de la variole du pigeon (attenue, protege aussi contre la variole aviaire), administre par piqure dans la membrane de l aile. Pas de traitement curatif specifique une fois l infection installee : soins de support pour le confort de l animal, les oiseaux guerris deviennent immunises.',
  `recommended_products_source_url` = 'https://poultry.extension.org/articles/poultry-health/common-poultry-diseases/fowl-pox-in-poultry/'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Variole aviaire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique : enrofloxacine (fluoroquinolone) sur prescription, 5 a 10 jours de traitement. Respecter un delai sans antibiotique avant toute vaccination vivante (au moins 3 jours) car les antibiotiques peuvent nuire a la prise du vaccin. Risque zoonotique important : hygiene stricte, oeufs et viande des animaux traites soumis a un delai d attente.',
  `recommended_products_source_url` = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5601478/'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Salmonellose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique : tetracyclines (oxytetracycline, doxycycline), sulfamides, ou quinolones selon sensibilite locale (resistance croissante rapportee). Vaccin bacterine (protection homologue au serotype) ou vaccin vivant acapsulaire (protection plus large) disponibles en prevention dans les zones a risque.',
  `recommended_products_source_url` = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7368114/'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Choléra aviaire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Pas de traitement medicamenteux ni de vaccin homologue : trouble metabolique non infectieux lie a l altitude, la densite, la ventilation, ou le rythme de croissance rapide. Prevention par amelioration de l environnement (ventilation, temperature, moins de poussiere) et selection genetique. Vitamine C en complement possible en soutien nutritionnel.',
  `recommended_products_source_url` = 'https://www.msdvetmanual.com/poultry/miscellaneous-conditions-of-poultry/ascites-syndrome-in-poultry'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Ascite (syndrome hypertension pulmonaire)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire : praziquantel en bain (7,5 a 10 mg/l, une seule application generalement suffisante) contre douves, plathelminthes, tenias. Ne traite pas les vers ronds. Symptomes a surveiller : frottement contre les surfaces, rougeurs sur les nageoires ou les branchies.',
  `recommended_products_source_url` = 'https://www.fda.gov/media/191395/download'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antifongique : formaline en bain (attention, retire l oxygene de l eau, aerer pendant le traitement) ou bain de sel (0,6 a 1% pendant 30 minutes, non tolere par toutes les especes). Retirer manuellement les filaments fongiques visibles. Ameliorer la qualite de l eau en parallele, facteur de risque principal.',
  `recommended_products_source_url` = 'https://onlinelibrary.wiley.com/doi/10.1002/aff2.200'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Champignons';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antifongique : formaline en bain (attention, retire l oxygene de l eau, aerer pendant le traitement) ou bain de sel (0,6 a 1% pendant 30 minutes, non tolere par les especes sans ecailles comme le poisson-chat). Methylene bleu, permanganate de potassium ou peroxyde d hydrogene en alternative. Retirer manuellement les filaments visibles, ameliorer la qualite de l eau (facteur declenchant principal, souvent sur poisson deja affaibli ou blesse).',
  `recommended_products_source_url` = 'https://www.sciencedirect.com/science/article/abs/pii/S0044848605005296'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Saprolegniose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique large spectre par voie alimentaire (dans la nourriture, pas efficace dans l eau) : oxytetracycline, amoxicilline, ou cephalexine pour les plaies cutanees. Bacteries en cause frequemment de type Aeromonas, Vibrio ou Pseudomonas. Bain de sel en complement. En cas d ulcere avance, avis veterinaire pour injection directe.',
  `recommended_products_source_url` = 'https://mdc.mo.gov/fishing/fish-diseases/fish-ulcers'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Maladie de peau';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun traitement curatif efficace, mortalite elevee. Amelioration de la qualite de l eau pour aider les poissons infectes a developper une immunite naturelle. Recherche en cours sur des vaccins a ADN, aucun vaccin commercial disponible actuellement. Priorite absolue a la biosecurite pour eviter l introduction du virus dans l elevage.',
  `recommended_products_source_url` = 'https://thefishsite.com/disease-guide/viral-haemorrhagic-septicaemia-vhs'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Septicémie hémorragique virale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Sulfate de cuivre en bain (dose selon durete de l eau : 0,25 a 1 mg/l), traitements repetes tous les deux jours, 2 a 4 applications necessaires ; attention a l oxygenation, effet algicide. Alternative : formaline en bain tous les deux jours, 3 traitements. Ne jamais arreter le traitement avant l arret complet de la mortalite.',
  `recommended_products_source_url` = 'https://ask.ifas.ufl.edu/publication/FA006'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Points blancs (Ich)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Amelioration de la qualite de l eau en premiere intention (cause principale). Antibiotique par voie alimentaire (bacteries Gram negatif type columnaris, aeromonas) : oxytetracycline, tetracycline, ou erythromycine. Detecte tot, les nageoires repoussent normalement une fois l infection controlee.',
  `recommended_products_source_url` = 'https://aquariumscience.org/10-3-4-fin-rot/'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Pourriture des nageoires';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Ameliorer d abord les conditions d elevage (densite, proprete de l eau) : cause principale. Permanganate de potassium ou sel en bain pour aider la recuperation. Antibiotique uniquement en cas de surinfection bacterienne confirmee. Si parasites impliques (douves des branchies), praziquantel efficace.',
  `recommended_products_source_url` = 'https://www.petmd.com/fish/infectious-parasitic/c_fi_bacterial_gill_disease'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Infection branchiale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire : ivermectine, albendazole, fenbendazole, ou moxidectine selon la classe autorisee dans le pays. Attention a la resistance croissante et largement rapportee de ces molecules, surtout contre Haemonchus contortus (ver de la caillette) : alterner les classes, ne jamais sous-doser, confirmer par coprologie si possible.',
  `recommended_products_source_url` = 'https://agrilifeextension.tamu.edu/wp-content/uploads/2026/03/Internal-Parasite-Control-in-Sheep-Goat.pdf'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Identifier la cause avant de traiter : bacterienne (antibiotique sur prescription), parasitaire (antiparasitaire type ivermectine/albendazole), ou alimentaire (ajustement de la ration). Rehydratation par electrolytes en soutien dans tous les cas, surtout chez le jeune.',
  `recommended_products_source_url` = 'https://agrilifeextension.tamu.edu/wp-content/uploads/2026/03/Internal-Parasite-Control-in-Sheep-Goat.pdf'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Diarrhée';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Pediluve au sulfate de zinc (10% dans l eau, tous les 14 jours en periode humide) en prevention et soutien. Antibiotique systemique : oxytetracycline longue action (traitement historique de reference), penicilline, erythromycine, ou florfenicol sur prescription. Vaccin (type Footvax) disponible pour accelerer la guerison et proteger le reste du troupeau.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/musculoskeletal-system/lameness-in-sheep/contagious-footrot-in-sheep'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Boiterie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant attenue, souches Sungri 96 ou Nigeria 75/1, tres efficace (immunite des 2 semaines, duree au moins 3 ans, faisable des 4 mois d age). Aucun traitement antiviral specifique une fois l animal infecte : isolement et desinfection de l environnement. Maladie a declaration obligatoire, programme d eradication mondiale en cours (objectif FAO/OMSA 2030).',
  `recommended_products_source_url` = 'https://www.woah.org/fileadmin/Home/eng/Health_standards/tahm/3.07.09_PPR.pdf'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Peste des petits ruminants';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin (vivant attenue ou inactive) disponible dans certains pays mais avec limites (le vivant peut affecter les femelles gestantes). Aucun traitement specifique disponible : soins de support uniquement. Maladie a fort potentiel zoonotique et epidemique, lutte antivectorielle (moustiques) essentielle, declaration obligatoire.',
  `recommended_products_source_url` = 'https://www.who.int/news-room/fact-sheets/detail/rift-valley-fever'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Fièvre de la vallée du Rift';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Maladie generalement benigne et auto-resolutive (regression des lesions en 1 a 2 mois) chez l animal sain : antiseptique et antibiotique local uniquement en cas de surinfection bacterienne. Vaccin vivant disponible (scarification, avant la periode a risque) mais protection partielle. Attention : maladie zoonotique (transmissible a l humain par contact direct).',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/integumentary-system/pox-diseases/contagious-ecthyma-in-sheep-and-goats'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Ecthyma contagieux (orf)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique intramammaire de la famille des beta-lactamines (amoxicilline, cephalosporine) ou lincosamide, meme principe que chez la vache mais adapte au format chevre. Traire frequemment le quartier atteint pour evacuer le lait infecte. Consulter un veterinaire en cas de mammite severe ou de baisse d etat general.',
  `recommended_products_source_url` = 'https://amrls.umn.edu/node/41'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Mammite';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antitoxine Clostridium perfringens type C et D en urgence des les premiers symptomes (protection immediate mais courte, 14-21 jours). Vaccin clostridial (toxoide) en prevention, cornerstone du controle : primo-vaccination puis rappels annuels. Mortalite pouvant atteindre 30% chez les animaux non vaccines : la prevention vaccinale prime sur le traitement curatif, souvent trop tardif.',
  `recommended_products_source_url` = 'https://www.canr.msu.edu/sheep_goats/health/overeating-disease-in-sheep-making-sense-of-vaccination-schedules'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Entérotoxémie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun traitement specifique disponible, antibiotique uniquement pour prevenir une surinfection bacterienne secondaire. Vaccin vivant attenue disponible dans certains pays (non homologue partout, disponibilite variable selon la reglementation locale). Isoler les animaux atteints, lutter contre les insectes vecteurs.',
  `recommended_products_source_url` = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12737374/'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Clavelée (variole ovine)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Pas de traitement specifique : repos, alimentation molle, bonne conduite d elevage. Antibiotique uniquement pour les infections bacteriennes secondaires. Vaccin attenue ou inactive disponible selon les pays mais protection non garantie entre serotypes differents (peu de protection croisee). Lutte antivectorielle (moucherons Culicoides) en complement indispensable.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/generalized-conditions/bluetongue/bluetongue-in-ruminants'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Fièvre catarrhale ovine';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Pediluve au sulfate de zinc en prevention et soutien. Antibiotique systemique : oxytetracycline longue action, penicilline, erythromycine, lincomycine, spectinomycine, ou florfenicol selon disponibilite et prescription veterinaire. Vaccin (type Footvax) recommande en complement pour accelerer la guerison et proteger le troupeau.',
  `recommended_products_source_url` = 'https://www.sheepusa.org/wp-content/uploads/2023/07/2019-06-04_PreventingAndControllingFootrot.pdf'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Piétin';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antitoxine Clostridium perfringens type C et D en urgence des les premiers symptomes. Vaccin clostridial (toxoide) en prevention : c est la mesure la plus efficace, la maladie evoluant souvent trop vite pour un traitement curatif efficace une fois les symptomes installes. Programme de rappel annuel recommande.',
  `recommended_products_source_url` = 'https://www.canr.msu.edu/sheep_goats/health/overeating-disease-in-sheep-making-sense-of-vaccination-schedules'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Entérotoxémie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique intramammaire de la famille des beta-lactamines (amoxicilline, cephalosporine) ou lincosamide. Traire frequemment le quartier atteint pour evacuer le lait infecte, ne pas le consommer. Consulter un veterinaire en cas de mammite severe, de fievre elevee, ou de mamelle dure et violette.',
  `recommended_products_source_url` = 'https://amrls.umn.edu/node/41'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Mammite';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique topique ou systemique selon la gravite : oxytetracycline ou pommade antiseptique/antibiotique locale pour les infections cutanees legeres. Identifier la cause (bacterienne, parasitaire, fongique) avant traitement pour cibler la bonne molecule. Isoler l animal si suspicion de contagiosite.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/integumentary-system/pox-diseases/contagious-ecthyma-in-sheep-and-goats'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Infection peau';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire : ivermectine, albendazole, moxidectine, ou levamisole (classes homologuees chez le mouton). Attention a la resistance largement documentee, notamment contre Haemonchus contortus : alterner les classes de molecules, respecter la dose specifique ovine (metabolisme plus rapide que le bovin, dose superieure necessaire).',
  `recommended_products_source_url` = 'https://www.vet.cornell.edu/animal-health-diagnostic-center/programs/new-york-state-cattle-health-assurance-program/modules-documents/dewormer-chart-goats'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Pediluve au sulfate de zinc (10%, tous les 14 jours en periode humide) en prevention. Antibiotique systemique : oxytetracycline longue action en premiere intention, penicilline, erythromycine, lincomycine, spectinomycine, ou florfenicol selon prescription. Vaccin (type Footvax) recommande en complement pour accelerer la guerison.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/musculoskeletal-system/lameness-in-sheep/contagious-footrot-in-sheep'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Boiterie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Identifier la cause avant traitement : antibiotique-associee (arret de l antibiotique en cause, cas frequent avec penicilline, ampicilline, clindamycine, lincomycine, ou erythromycine qui perturbent la flore intestinale du lapin) ou parasitaire (fenbendazole). Soins de support intensifs : fluides, stimulation de la motilite intestinale. Enrofloxacine et sulfamides consideres plus surs si un antibiotique est necessaire.',
  `recommended_products_source_url` = 'https://www.bunnybunch.org/wp-content/uploads/Antibiotic.pdf'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Diarrhée';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique : enrofloxacine (premier choix), trimethoprime-sulfamide, chloramphenicol, azithromycine, ou penicilline G par injection uniquement (jamais par voie orale chez le lapin, risque de trouble digestif grave). Traitement par Pasteurella pouvant devenir chronique : objectif souvent le controle plus que l elimination totale. Anti-inflammatoire et oxygene en cas de forme severe.',
  `recommended_products_source_url` = 'https://lbah.com/rabbit/pasteurella-rabbit/'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Maladie respiratoire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire specifique : toltrazuril (dose unique orale, tres efficace, cible les stades sexues et asexues du parasite) ou sulfaquinoxaline en eau de boisson pendant plusieurs jours. Hygiene de la cage et des mangeoires essentielle pour eviter la reinfestation (oocystes tres resistants dans l environnement).',
  `recommended_products_source_url` = 'https://pubmed.ncbi.nlm.nih.gov/3788023/'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun traitement antiviral disponible, mortalite proche de 100% chez le lapin domestique. Soins de support et antibiotique pour prevenir les surinfections seulement en soutien, sans effet sur la survie. Vaccin disponible en Europe/Royaume-Uni mais pas partout. Euthanasie souvent recommandee par compassion vu le pronostic. Lutte contre les insectes vecteurs (moustiques, puces) en prevention.',
  `recommended_products_source_url` = 'https://www.petmd.com/rabbit/conditions/systemic/myxomatosis-rabbits'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Myxomatose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun traitement curatif disponible, soins de support uniquement. Vaccin (deux doses a 21 jours d intervalle, immunite complete 14 jours apres la 2e dose) tres efficace en prevention : c est la seule protection fiable contre cette maladie a evolution tres rapide et mortelle.',
  `recommended_products_source_url` = 'https://www.aphis.usda.gov/livestock-poultry-disease/rabbit-hemorrhagic'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Maladie hémorragique virale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire : toltrazuril (dose unique, tres efficace, reduit 73 a 99% du taux d oocystes) ou sulfaquinoxaline en eau de boisson. Nettoyage rigoureux de la cage (oocystes resistants dans l environnement). Traitement precoce important, la coccidiose hepatique peut etre plus grave que la forme intestinale.',
  `recommended_products_source_url` = 'https://toltrazurilshop.com/toltrazuril-for-bunnies/'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Coccidiose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire : ivermectine (injection sous-cutanee, repetee a 15 jours d intervalle) ou selamectin (application locale, repetee a 28 jours). Les deux tuent les acariens vivants mais pas les oeufs : un second traitement est necessaire pour eliminer les larves nouvellement eclos. Nettoyer aussi l environnement (cage, accessoires).',
  `recommended_products_source_url` = 'https://pubmed.ncbi.nlm.nih.gov/12906226/'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Gale des oreilles';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun traitement disponible, les antibiotiques sont inefficaces sur un virus. Vaccin inactive existant dans certains pays (deux injections, 2 a 3 semaines pour l immunite) mais pas partout accessible. Biosecurite stricte (limiter le contact avec la faune sauvage, eau de surface) reste la mesure la plus efficace. Maladie a haut risque zoonotique, declaration obligatoire, alerter immediatement les autorites veterinaires en cas de suspicion.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/poultry/avian-influenza-in-poultry-and-wild-birds/avian-influenza-in-poultry-and-wild-birds'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Grippe aviaire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire : ivermectine (spectre large parasites internes et externes) ou praziquantel selon le parasite identifie. Nettoyage regulier des points d eau et de la litiere, facteur cle car le virus/parasite persiste longtemps dans l environnement humide.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/poultry/avian-influenza-in-poultry-and-wild-birds/avian-influenza-in-poultry-and-wild-birds'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Identifier la cause avant traitement : bacterienne (antibiotique large spectre sur prescription, ex. oxytetracycline) ou virale comme la peste du canard/hepatite virale (pas de traitement specifique, soins de support). Vaccin disponible pour les causes virales connues du troupeau. Isoler les animaux atteints en priorite, forte contagiosite chez le canard.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/poultry/duck-viral-enteritis/duck-viral-enteritis'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Infections';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin vivant attenue disponible dans les pays a risque, administre en injection sous-cutanee des les premiers jours de vie ou chez les reproducteurs pour proteger les canetons via les anticorps maternels. Aucun traitement curatif specifique : soins de support uniquement. Biosecurite stricte pour eviter l introduction dans l elevage, le virus persiste jusqu a 60 jours dans l environnement.',
  `recommended_products_source_url` = 'https://www.woah.org/fileadmin/Home/eng/Health_standards/tahm/2.03.07_DVE.pdf'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Peste du canard';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Vaccin disponible pour canetons de 1 jour ou reproducteurs (immunite active en 3-4 jours chez le caneton vaccine, duree superieure a 1 mois). Anticorps specifiques (IgY d oeufs hyperimmunises) utilisables en traitement de troupeau au moment de l apparition des premieres pertes, reduction significative de la mortalite rapportee. Aucun autre traitement specifique disponible.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/poultry/duck-viral-hepatitis/duck-viral-hepatitis'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Hépatite virale du canard';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Anticoccidien : amprolium en eau de boisson, meme principe que chez la poule. Litiere seche indispensable en prevention (les oocystes se developpent en milieu humide). Vaccin vivant anticoccidien disponible selon les pays.',
  `recommended_products_source_url` = 'https://www.msdvetmanual.com/poultry/coccidiosis-in-poultry/coccidiosis-in-poultry'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Coccidiose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antiparasitaire : ivermectine (spectre large) contre le ver caecal Heterakis gallinarum, vecteur principal de l histomonose (voir maladie separee) ; fenbendazole en alternative. Controler la population de vers caecaux est une mesure de prevention cle pour eviter la transmission d autres maladies.',
  `recommended_products_source_url` = 'https://www.thepoultrysite.com/disease-guide/histamonosis-histomoniasis-blackhead'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique de soutien (traite surtout les infections secondaires, efficacite limitee sur l infection primaire) : tetracycline, erythromycine, oxytetracycline, ou sulfamides (trimethoprime-sulfamethoxazole) sur prescription. Vaccin disponible mais protection partielle et peu fiable chez le jeune dindonneau : la biosecurite stricte reste la mesure la plus efficace.',
  `recommended_products_source_url` = 'https://www.merckvetmanual.com/poultry/infectious-coryza/infectious-coryza'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Maladie respiratoire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique de soutien (efficacite limitee sur l infection primaire, cible surtout les complications secondaires) : sulfamides, tetracycline, ou erythromycine sur prescription. Vaccin existant (souche B. avium attenuee) mais protection moderee et peu fiable chez le jeune : recommande surtout pour les elevages multi-ages ou avec antecedent de foyer, en complement de la biosecurite stricte.',
  `recommended_products_source_url` = 'https://extension.umd.edu/sites/extension.umd.edu/files/publications/Infectious%20Coryza.pdf'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Coryza infectieux';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Aucun medicament homologue disponible actuellement (le nitarsone, seul traitement approuve, a ete retire du marche en 2015 pour raisons de securite ; resistance egalement rapportee). Prevention uniquement : controle du ver caecal Heterakis gallinarum (vecteur principal, antiparasitaire ivermectine/fenbendazole), separation stricte poules/dindes (les poules sont porteuses saines), identification et isolement rapide des sujets malades. Mortalite pouvant atteindre 70-100% dans un troupeau infecte.',
  `recommended_products_source_url` = 'https://www.fda.gov/animal-veterinary/resources-you/blackhead-disease-poultry'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Histomonose (tête noire)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `recommended_products` = 'Antibiotique : tetracyclines (oxytetracycline, doxycycline), sulfamides, ou quinolones selon sensibilite locale. Vaccin bacterine (protection homologue au serotype) ou vaccin vivant acapsulaire (protection plus large) disponibles en prevention. Meme agent (Pasteurella multocida) et memes options que chez la poule.',
  `recommended_products_source_url` = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7368114/'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Choléra aviaire';
--> statement-breakpoint
