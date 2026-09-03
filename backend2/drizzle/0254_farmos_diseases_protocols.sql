-- SCRUM-192/193 -- Contenu veterinaire (symptomes, prevention, protocole) pour le catalogue global de maladies FarmOS.
-- UPDATE idempotent : peut etre rejoue sans effet de bord (matching sur organization_id NULL + species + name_fr).
-- Contenu generique/educatif, pas de posologie precise -- toujours orienter vers un veterinaire pour les cas graves.

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Mamelle chaude, gonflee, douloureuse ; lait anormal (grumeaux, sang, couleur jaunatre) ; parfois fievre et baisse de production.',
  `prevention` = 'Hygiene stricte de traite, desinfection des trayons avant/apres traite, litiere propre et seche, controle regulier de l etat des mamelles.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler la vache du reste du troupeau si etat general altere.\n2. Traire frequemment le quartier atteint pour evacuer le lait infecte (ne pas consommer ce lait).\n3. Nettoyer et desinfecter la mamelle avant/apres chaque traite.\n4. Contacter un veterinaire pour antibiotherapie intramammaire adaptee sur prescription.\n5. Respecter le delai d attente avant remise du lait a la consommation/vente.\n6. Surveiller la temperature et l etat general 48-72h.\n7. Consulter un veterinaire immediatement si fievre elevee, mamelle dure/violette (mammite gangreneuse) ou animal abattu.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Mammite';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Difficulte a se deplacer, boiterie visible, refus d appui sur un membre, pied chaud ou gonfle, baisse d appetit.',
  `prevention` = 'Sols propres et non glissants, parage regulier des onglons, pediluve desinfectant, litiere seche, alimentation equilibree pour eviter les fourbures.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Examiner le pied atteint (corps etranger, plaie, abces, surchauffe).\n2. Isoler l animal dans un enclos propre et sec pour limiter les deplacements.\n3. Nettoyer et desinfecter toute plaie visible.\n4. Faire realiser un parage par un professionnel si necessaire.\n5. Consulter un veterinaire pour anti-inflammatoire/antibiotique si infection ou boiterie severe.\n6. Surveiller l evolution sur 5-7 jours ; si aggravation, consulter en urgence.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Boiterie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Ecoulement vaginal fetide (souvent rougeatre a brunatre), fievre, abattement, baisse de production laitiere apres mise-bas.',
  `prevention` = 'Hygiene lors du velage, assistance propre en cas de dystocie, delivrance complete du placenta surveillee, environnement de mise-bas propre et sec.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler la vache et observer la temperature corporelle.\n2. Nettoyer la zone perineale et surveiller l ecoulement (couleur, odeur, quantite).\n3. Contacter un veterinaire pour traitement (antibiotique systemique/intra-uterin selon prescription).\n4. Assurer une alimentation et hydratation suffisantes.\n5. Surveiller le retour en chaleur et la fertilite ulterieure.\n6. Consulter en urgence si fievre elevee, etat septique ou refus total de s alimenter.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Métrite';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Temperature corporelle elevee, abattement, perte d appetit, museau sec, respiration accelaree.',
  `prevention` = 'Surveillance reguliere de la temperature des animaux a risque, bonne ventilation des batiments, quarantaine des nouveaux arrivants, hygiene generale.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Mesurer et noter la temperature de l animal.\n2. Isoler l animal fievreux du reste du troupeau.\n3. Assurer un acces permanent a l eau fraiche et a l ombre/abri.\n4. Rechercher une cause sous-jacente (infection, mammite, metrite, plaie).\n5. Contacter un veterinaire si fievre persiste plus de 24h ou depasse un seuil eleve.\n6. Ne jamais administrer d antipyretique sans avis veterinaire, la fievre masque le diagnostic.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Fièvre';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Amaigrissement progressif malgre appetit conserve, poil terne, diarrhee intermittente, baisse de production, anemie possible (muqueuses pales).',
  `prevention` = 'Vermifugation reguliere selon plan sanitaire, rotation des paturages, gestion du fumier, controle coprologique periodique.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Realiser une coprologie pour identifier le parasite en cause si possible.\n2. Administrer un antiparasitaire adapte sur prescription/conseil veterinaire.\n3. Ameliorer l alimentation pour soutenir la reprise d etat.\n4. Mettre en place une rotation des paturages pour limiter la reinfestation.\n5. Traiter l ensemble du lot si l infestation est collective.\n6. Consulter un veterinaire si amaigrissement severe ou anemie marquee.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Parasites internes';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Diarrhee aqueuse abondante chez le porcelet nouveau-ne, deshydratation rapide, faiblesse, mortalite possible en quelques heures a jours.',
  `prevention` = 'Colostrum dans les 6h suivant la naissance, hygiene stricte de la maternite, temperature adequate pour les porcelets, vide sanitaire entre bandes.',
  `vaccine_available` = 0,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler la portee atteinte si possible.\n2. Rehydrater les porcelets par voie orale (solution de rehydratation).\n3. Maintenir une temperature ambiante adequate (source de chaleur).\n4. Contacter un veterinaire rapidement pour traitement antibiotique si infection bacterienne suspectee.\n5. Nettoyer et desinfecter la maternite entre chaque bande.\n6. Verifier la prise de colostrum des porcelets restants de la portee.\n7. Consulter en urgence si mortalite rapide ou extension a plusieurs portees.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Diarrhée néonatale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Toux seche ou grasse, parfois eternuements, respiration plus rapide, baisse d appetit dans les cas avances.',
  `prevention` = 'Bonne ventilation du batiment, densite d elevage adaptee, reduction de la poussiere et de l ammoniac, quarantaine des nouveaux animaux.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Observer la frequence et le type de toux (seche/grasse) et le nombre d animaux touches.\n2. Ameliorer immediatement la ventilation et reduire la poussiere.\n3. Isoler les animaux les plus affectes si possible.\n4. Contacter un veterinaire si la toux persiste plus de quelques jours ou s accompagne de fievre.\n5. Traiter selon prescription (antibiotique si infection bacterienne confirmee).\n6. Surveiller l evolution vers une pneumonie (respiration abdominale, essoufflement).'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Toux';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Troubles respiratoires (toux, dyspnee), troubles de la reproduction (avortements, mise-bas prematurees, porcelets faibles), fievre, cyanose des oreilles possible.',
  `prevention` = 'Vaccination selon protocole du cheptel, quarantaine stricte des nouveaux animaux, biosecurite renforcee, gestion des mouvements d animaux entre sites.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler immediatement les animaux suspects et les truies gestantes a risque.\n2. Renforcer la biosecurite (desinfection, limitation des visites).\n3. Contacter un veterinaire pour confirmation diagnostique (analyse de laboratoire).\n4. Assurer un soutien symptomatique (antibiotique contre infections secondaires sur prescription).\n5. Adapter le protocole vaccinal du cheptel avec le veterinaire.\n6. Surveiller la reproduction (avortements, porcelets nes faibles) et signaler tout episode.\n7. Consulter en urgence en cas de suspicion, maladie a fort impact economique.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'PRRS';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Lesions et morsures sur la queue d autres porcs, sang visible, animaux agites ou stresses, queues partiellement ou totalement sectionnees.',
  `prevention` = 'Densite d elevage adaptee, enrichissement du milieu (jouets, materiaux a mordiller), ventilation et temperature confortables, alimentation adequate en fibres.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Retirer et isoler les porcs mordeurs et les porcs blesses du groupe.\n2. Desinfecter et traiter les plaies pour eviter les infections secondaires.\n3. Identifier et corriger la cause (surpopulation, ennui, chaleur, manque de fibres).\n4. Ajouter des elements d enrichissement dans l enclos.\n5. Contacter un veterinaire si les plaies s infectent ou si le comportement persiste.\n6. Surveiller le groupe apres correction des conditions d elevage.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Morsure de queue';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Difficulte a se deplacer, refus d appui sur un membre, gonflement d une articulation, animal couche plus que la normale.',
  `prevention` = 'Sols non glissants et propres, litiere adequate, alimentation equilibree en mineraux, controle des blessures precoces.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Examiner le membre atteint (plaie, gonflement, chaleur).\n2. Isoler l animal dans un enclos avec litiere confortable.\n3. Limiter les deplacements et assurer un acces facile a l eau/aliment.\n4. Contacter un veterinaire pour anti-inflammatoire/antibiotique si infection articulaire suspectee.\n5. Surveiller l evolution sur plusieurs jours.\n6. Consulter en urgence si gonflement articulaire important (arthrite septique possible).'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Boiterie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Toux, eternuements, ecoulement nasal/oculaire, respiration difficile, baisse d activite et de ponte.',
  `prevention` = 'Vaccination selon protocole, ventilation adequate, densite d elevage controlee, quarantaine des nouveaux sujets, desinfection reguliere du batiment.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les sujets malades du reste de la bande.\n2. Ameliorer la ventilation et reduire la densite si possible.\n3. Contacter un veterinaire pour identifier l agent en cause (viral/bacterien).\n4. Traiter selon prescription (antibiotique si surinfection bacterienne).\n5. Renforcer la vaccination du cheptel selon le calendrier recommande.\n6. Desinfecter le materiel et le batiment.\n7. Consulter en urgence si mortalite en hausse ou signes nerveux associes.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Maladie respiratoire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Diarrhee sanglante, abattement, plumes ebouriffees, baisse d appetit et de croissance, mortalite chez les jeunes sujets.',
  `prevention` = 'Litiere seche et propre, anticoccidiens preventifs si recommande, vide sanitaire entre bandes, densite adaptee, eau propre.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les sujets atteints si possible.\n2. Assecher et renouveler la litiere immediatement.\n3. Contacter un veterinaire pour traitement anticoccidien adapte.\n4. Assurer une hydratation et une alimentation de soutien.\n5. Nettoyer et desinfecter le batiment entre les bandes.\n6. Surveiller la croissance et la mortalite du lot.\n7. Consulter en urgence si mortalite elevee ou diarrhee tres sanglante generalisee.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Coccidiose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Selles molles a liquides, litiere humide, baisse d appetit possible, plumes souillees autour du cloaque.',
  `prevention` = 'Eau propre et renouvelee, alimentation de qualite, hygiene du batiment, eviter les changements alimentaires brusques.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Verifier la qualite de l eau et de l aliment distribues.\n2. Isoler les sujets les plus affectes.\n3. Assurer une hydratation suffisante (solution de rehydratation si besoin).\n4. Nettoyer la litiere et le materiel d abreuvement.\n5. Contacter un veterinaire si la diarrhee persiste plus de 48h ou touche plusieurs sujets.\n6. Surveiller l evolution et la reprise d appetit.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Diarrhée';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Plumes arrachees ou abimees, zones denudees sur le dos/la queue, agressivite entre sujets, parfois plaies cutanees.',
  `prevention` = 'Densite d elevage adaptee, luminosite controlee, enrichissement du milieu, alimentation equilibree en proteines et mineraux.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Identifier et isoler les sujets agresseurs et les victimes blessees.\n2. Traiter les plaies cutanees pour eviter les infections.\n3. Reduire la densite et ajuster l intensite lumineuse du batiment.\n4. Verifier l equilibre de la ration alimentaire.\n5. Ajouter des elements d enrichissement dans l enclos.\n6. Contacter un veterinaire si les plaies s infectent ou si le comportement s aggrave.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Picage';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Frottements contre les surfaces, nage anormale, points blancs ou lesions visibles sur la peau/nageoires, letargie.',
  `prevention` = 'Qualite d eau surveillee (oxygene, temperature, ammoniac), quarantaine des nouveaux poissons, densite adaptee, nettoyage regulier du bassin.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Verifier immediatement les parametres d eau (oxygene, temperature, pH, ammoniac).\n2. Isoler les poissons atteints dans un bassin de quarantaine si possible.\n3. Traiter l eau selon le parasite identifie (traitement adapte sur conseil specialise).\n4. Ameliorer la filtration et l aeration du bassin.\n5. Contacter un veterinaire ou technicien aquacole pour confirmation et traitement.\n6. Surveiller la mortalite et l appetit sur plusieurs jours.'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Depots cotonneux blanc-grisatre sur la peau, les nageoires ou les branchies, letargie, perte d appetit.',
  `prevention` = 'Bonne qualite d eau, eviter les blessures cutanees, densite adaptee, retrait rapide des poissons morts/mourants.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les poissons atteints dans un bassin de quarantaine.\n2. Ameliorer la qualite de l eau (renouvellement, filtration).\n3. Traiter avec un produit antifongique adapte selon conseil specialise/veterinaire.\n4. Retirer immediatement tout poisson mort pour limiter la propagation.\n5. Surveiller l apparition de nouveaux cas dans le bassin.\n6. Consulter un veterinaire aquacole si l infection s etend.'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Champignons';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Rougeurs, ulceres, ecailles decollees, mucus excessif ou zones decolorees sur la peau.',
  `prevention` = 'Qualite d eau stable, manipulation douce des poissons, densite adaptee, quarantaine des nouveaux arrivants.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les poissons atteints.\n2. Verifier et corriger les parametres d eau.\n3. Nettoyer le bassin et retirer les debris organiques.\n4. Contacter un veterinaire/technicien aquacole pour identifier la cause (bacterienne/parasitaire) et le traitement adapte.\n5. Surveiller l evolution des lesions sur plusieurs jours.\n6. Consulter en urgence si extension rapide a plusieurs poissons.'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Maladie de peau';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Amaigrissement, poil terne, diarrhee intermittente, anemie (muqueuses pales), baisse de production.',
  `prevention` = 'Vermifugation reguliere, rotation des paturages, gestion du fumier, controle coprologique periodique.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Realiser une coprologie si possible pour identifier le parasite.\n2. Administrer un antiparasitaire adapte sur conseil veterinaire.\n3. Ameliorer l alimentation pour soutenir la reprise d etat.\n4. Alterner les paturages pour limiter la reinfestation.\n5. Traiter le troupeau entier si infestation collective.\n6. Consulter un veterinaire si amaigrissement severe ou anemie marquee.'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Selles molles a liquides, deshydratation possible chez les jeunes, baisse d appetit.',
  `prevention` = 'Eau propre, alimentation de qualite constante, hygiene de la chevrerie, transition alimentaire progressive.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Verifier la qualite de l eau et de l alimentation.\n2. Isoler l animal atteint.\n3. Assurer une rehydratation orale si signes de deshydratation.\n4. Nettoyer la litiere et le materiel d abreuvement.\n5. Contacter un veterinaire si la diarrhee persiste plus de 48h, surtout chez les jeunes.\n6. Surveiller l etat general et la reprise d appetit.'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Diarrhée';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Difficulte a se deplacer, refus d appui sur un membre, sabot chaud ou gonfle.',
  `prevention` = 'Parage regulier des onglons, sols secs et propres, pediluve desinfectant si necessaire, litiere adequate.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Examiner le sabot atteint (corps etranger, plaie, infection).\n2. Isoler l animal dans un enclos sec et propre.\n3. Nettoyer et parer le sabot si necessaire.\n4. Contacter un veterinaire pour traitement anti-inflammatoire/antibiotique si infection.\n5. Surveiller l evolution sur 5-7 jours.\n6. Consulter en urgence si boiterie severe ou extension a plusieurs animaux (piétin).'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Boiterie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Amaigrissement, poil terne, diarrhee intermittente, anemie, baisse de production de laine/viande.',
  `prevention` = 'Vermifugation reguliere, rotation des paturages, gestion du fumier, controle coprologique periodique.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Realiser une coprologie si possible.\n2. Administrer un antiparasitaire adapte sur conseil veterinaire.\n3. Ameliorer l alimentation pour soutenir la reprise d etat.\n4. Alterner les paturages.\n5. Traiter le troupeau entier si infestation collective.\n6. Consulter un veterinaire si amaigrissement severe ou anemie marquee.'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Difficulte a se deplacer, refus d appui sur un membre, sabot chaud, odeur caracteristique si infection.',
  `prevention` = 'Parage regulier des onglons, sols secs, pediluve desinfectant, quarantaine des nouveaux animaux.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Examiner le sabot atteint.\n2. Isoler l animal dans un enclos sec.\n3. Nettoyer et parer le sabot.\n4. Contacter un veterinaire pour traitement antibiotique/anti-inflammatoire si infection.\n5. Surveiller l evolution.\n6. Consulter en urgence si extension a plusieurs animaux (suspicion de piétin contagieux).'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Boiterie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Rougeurs, croutes ou lesions cutanees, demangeaisons, perte de laine localisee.',
  `prevention` = 'Hygiene de la bergerie, controle des parasites externes, quarantaine des nouveaux animaux, tonte reguliere.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler l animal atteint.\n2. Nettoyer et desinfecter les lesions.\n3. Contacter un veterinaire pour identifier la cause (bacterienne, fongique, parasitaire) et le traitement adapte.\n4. Traiter le reste du troupeau si origine parasitaire confirmee.\n5. Surveiller l evolution sur plusieurs jours.\n6. Consulter en urgence si extension rapide ou lesions tres etendues.'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Infection peau';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Selles molles a liquides, deshydratation possible, baisse d appetit, letargie.',
  `prevention` = 'Alimentation de qualite et transition progressive, eau propre, hygiene des cages/clapiers, eviter les stress alimentaires.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Retirer tout aliment suspect ou frais en exces.\n2. Isoler le lapin atteint.\n3. Assurer une rehydratation et privilegier le fourrage fibreux (foin).\n4. Nettoyer la cage/le clapier.\n5. Contacter un veterinaire si la diarrhee persiste plus de 24-48h, le lapin est fragile a la deshydratation.\n6. Consulter en urgence si abattement severe ou absence totale d appetit.'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Diarrhée';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Eternuements, ecoulement nasal, respiration bruyante, pattes avant souillees (le lapin se frotte le nez).',
  `prevention` = 'Bonne ventilation sans courant d air, hygiene du clapier, densite adaptee, quarantaine des nouveaux animaux.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler le lapin atteint du reste du groupe.\n2. Ameliorer la ventilation et reduire l humidite du clapier.\n3. Contacter un veterinaire pour traitement antibiotique adapte si infection bacterienne (pasteurellose frequente).\n4. Nettoyer et desinfecter le materiel et les surfaces.\n5. Surveiller la respiration et l appetit quotidiennement.\n6. Consulter en urgence si respiration difficile ou torticolis (signe neurologique).'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Maladie respiratoire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Grattage frequent, perte de poils localisee, croutes sur les oreilles/peau, agitation.',
  `prevention` = 'Hygiene du clapier, controle des acariens/puces, quarantaine des nouveaux animaux, inspection reguliere du pelage.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler le lapin atteint.\n2. Nettoyer et desinfecter la cage et le materiel.\n3. Contacter un veterinaire pour traitement antiparasitaire adapte.\n4. Traiter les autres lapins en contact si necessaire.\n5. Surveiller la disparition des lesions sur plusieurs semaines.\n6. Consulter en cas de lesions tres etendues ou surinfection.'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Mortalite brutale et elevee, troubles respiratoires et nerveux, oedemes de la tete, baisse severe de ponte, diarrhee.',
  `prevention` = 'Vaccination selon protocole national, biosecurite stricte, limitation des contacts avec oiseaux sauvages, declaration obligatoire aux autorites veterinaires.',
  `vaccine_available` = 1,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Suspecter immediatement en cas de mortalite massive et rapide.\n2. Isoler le site et limiter tout mouvement d animaux, de materiel et de personnes.\n3. Alerter immediatement un veterinaire et les autorites veterinaires competentes (maladie a declaration obligatoire).\n4. Ne pas vendre ni deplacer les animaux du site.\n5. Suivre strictement les consignes officielles (abattage sanitaire eventuel, zones de protection).\n6. Renforcer la biosecurite sur l ensemble de l exploitation.\n7. Ne jamais tenter d auto-traiter, situation d urgence sanitaire nationale.'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Grippe aviaire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Grattage, perte de plumes localisee, agitation, baisse de croissance ou de ponte.',
  `prevention` = 'Hygiene du batiment, controle des acariens/poux, quarantaine des nouveaux animaux, nettoyage regulier du parcours.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les sujets atteints.\n2. Nettoyer et desinfecter le batiment et le materiel.\n3. Contacter un veterinaire pour traitement antiparasitaire adapte.\n4. Traiter l ensemble du lot si infestation generalisee.\n5. Surveiller la reprise de croissance/ponte.\n6. Consulter si lesions cutanees importantes ou surinfection.'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Abattement, ecoulements, diarrhee, baisse d appetit et de ponte, parfois mortalite chez les jeunes canetons.',
  `prevention` = 'Hygiene de l elevage, eau propre, quarantaine des nouveaux animaux, densite adaptee, gestion du parcours exterieur.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les sujets malades.\n2. Contacter un veterinaire pour identifier l infection et prescrire un traitement adapte.\n3. Assurer hydratation et alimentation de soutien.\n4. Nettoyer et desinfecter le batiment et les points d eau.\n5. Surveiller la mortalite, particulierement chez les canetons.\n6. Consulter en urgence si mortalite en hausse rapide.'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Infections';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Amaigrissement, plumage terne, diarrhee intermittente, baisse de croissance.',
  `prevention` = 'Hygiene du batiment et du parcours, controle des vers/acariens, quarantaine des nouveaux animaux, gestion du fumier.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Identifier le parasite si possible (analyse fecale).\n2. Administrer un antiparasitaire adapte sur conseil veterinaire.\n3. Nettoyer et assecher la litiere.\n4. Traiter le lot entier si infestation collective.\n5. Surveiller la reprise de croissance.\n6. Consulter un veterinaire si amaigrissement severe.'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Parasites';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Toux, eternuements, ecoulement nasal/oculaire, respiration difficile, baisse d appetit et de croissance.',
  `prevention` = 'Vaccination selon protocole, ventilation adequate, densite controlee, quarantaine des nouveaux sujets, desinfection reguliere.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les sujets malades.\n2. Ameliorer la ventilation du batiment.\n3. Contacter un veterinaire pour diagnostic et traitement (antibiotique si surinfection bacterienne).\n4. Renforcer le protocole vaccinal du cheptel.\n5. Desinfecter le materiel et le batiment.\n6. Surveiller la mortalite et l evolution des signes respiratoires.\n7. Consulter en urgence si mortalite en hausse.'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Maladie respiratoire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Fievre elevee, vesicules et ulceres sur le mufle, la bouche, les onglons et les mamelles, boiterie, salivation excessive, chute brutale de production.',
  `prevention` = 'Vaccination selon protocole national la ou disponible, biosecurite stricte, controle des mouvements d animaux, declaration obligatoire aux autorites veterinaires.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Suspecter immediatement devant vesicules buccales/podales et forte contagiosite.\n2. Isoler le troupeau et arreter tout mouvement d animaux.\n3. Alerter immediatement un veterinaire et les autorites veterinaires (maladie a declaration obligatoire).\n4. Ne pas deplacer ni vendre les animaux du site.\n5. Renforcer la biosecurite (desinfection des acces, limitation des visiteurs).\n6. Suivre les consignes officielles de gestion de foyer.\n7. Ne jamais auto-traiter, situation d urgence sanitaire reglementaire.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Fièvre aphteuse';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Fievre, diarrhee, ulceres buccaux, ecoulement nasal/oculaire, avortements chez les femelles gestantes, baisse de production.',
  `prevention` = 'Vaccination selon protocole du cheptel, quarantaine des nouveaux animaux, controle des reproducteurs, biosecurite renforcee.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les animaux suspects, particulierement les femelles gestantes.\n2. Contacter un veterinaire pour confirmation diagnostique (analyse de laboratoire).\n3. Assurer un soutien symptomatique (hydratation, soins des ulceres).\n4. Adapter le protocole vaccinal du cheptel avec le veterinaire.\n5. Surveiller la reproduction (avortements) et signaler tout episode.\n6. Renforcer la biosecurite et limiter l introduction de nouveaux animaux non testes.\n7. Consulter en urgence en cas d avortements groupes.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Diarrhée virale bovine (BVD)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Toux chronique, amaigrissement progressif, faiblesse, ganglions parfois palpables, souvent asymptomatique en phase initiale.',
  `prevention` = 'Tests de depistage reguliers selon programme national, quarantaine des nouveaux animaux, controle sanitaire officiel, declaration obligatoire.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Suspecter en cas de toux chronique et amaigrissement inexplique.\n2. Isoler l animal suspect.\n3. Alerter immediatement un veterinaire et les autorites sanitaires (maladie a declaration obligatoire, zoonose).\n4. Ne pas consommer ni vendre le lait ou la viande d animaux suspects.\n5. Suivre les procedures officielles de depistage du cheptel.\n6. Ne jamais auto-traiter, gestion reglementaire obligatoire.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Tuberculose bovine';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Avortements tardifs, retention placentaire, baisse de fertilite, parfois arthrite ; souvent asymptomatique en dehors de la gestation.',
  `prevention` = 'Vaccination selon programme national ou le disponible, tests de depistage reguliers, quarantaine des nouveaux animaux, hygiene lors des mise-bas.',
  `vaccine_available` = 1,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler immediatement toute femelle ayant avorte et le produit d avortement (manipuler avec protection, zoonose).\n2. Alerter un veterinaire et les autorites sanitaires (maladie a declaration obligatoire, zoonose grave pour l Homme).\n3. Ne pas consommer le lait cru d animaux suspects.\n4. Nettoyer et desinfecter la zone de mise-bas.\n5. Suivre le programme officiel de depistage/vaccination du cheptel.\n6. Ne jamais manipuler sans protection (gants, lavage des mains).'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Brucellose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Larmoiement excessif, rougeur et opacite de la cornee, ulcere oculaire, photophobie, baisse d appetit due a la gene visuelle.',
  `prevention` = 'Controle des mouches (vecteurs), pas de surpopulation, quarantaine des nouveaux animaux, elimination des irritants (poussiere, herbes hautes).',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler l animal atteint pour limiter la propagation (tres contagieux).\n2. Proteger l oeil de la lumiere vive et des mouches.\n3. Contacter un veterinaire pour traitement (antibiotique ophtalmique/systemique sur prescription).\n4. Nettoyer doucement les secretions oculaires.\n5. Controler les mouches dans l elevage.\n6. Consulter en urgence si ulcere corneen severe ou risque de cecite.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Kératoconjonctivite infectieuse';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Faiblesse musculaire soudaine, incapacite a se lever, temperature corporelle basse, extremites froides, survient generalement autour du velage.',
  `prevention` = 'Alimentation equilibree en calcium/mineraux en fin de gestation, gestion nutritionnelle pre-velage adaptee, surveillance renforcee des vaches a haut risque.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Reconnaitre les signes precoces (faiblesse, incapacite a se lever) autour du velage.\n2. Garder l animal au chaud et confortable, eviter les efforts.\n3. Contacter un veterinaire en urgence pour supplementation calcique appropriee (voie intraveineuse/sous-cutanee sur prescription).\n4. Surveiller la reponse au traitement (l animal doit se relever rapidement si pris a temps).\n5. Prevenir les recidives par ajustement nutritionnel avant le prochain velage.\n6. Situation urgente : consulter un veterinaire des les premiers signes, evolution rapide possible.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Fièvre de lait (hypocalcémie)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Baisse d appetit, perte de poids, production laitiere en baisse, odeur acetonique de l haleine/lait, apathie.',
  `prevention` = 'Gestion nutritionnelle en periode de transition (avant/apres velage), eviter le surpoids en fin de gestation, transition alimentaire progressive.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Verifier l alimentation et l etat corporel de la vache.\n2. Assurer un apport energetique adapte (aliments concentres selon conseil).\n3. Contacter un veterinaire pour traitement (glucose/propylene glycol sur prescription).\n4. Surveiller l appetit et la production laitiere quotidiennement.\n5. Ajuster la ration de transition pour les prochaines vaches a risque.\n6. Consulter en urgence si aggravation ou signes nerveux associes.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Cétose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Mort subite frequente, fievre elevee, tremblements, ecoulements sanglants par les orifices naturels, gonflement rapide de la carcasse.',
  `prevention` = 'Vaccination selon protocole en zone a risque, eviter de manipuler les carcasses, declaration obligatoire aux autorites, enfouissement/incineration reglementaire des cadavres.',
  `vaccine_available` = 1,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Ne jamais ouvrir ni manipuler une carcasse suspecte (zoonose grave, spores tres resistantes).\n2. Isoler la zone et alerter immediatement un veterinaire et les autorites sanitaires (declaration obligatoire).\n3. Ne pas deplacer les autres animaux du site.\n4. Suivre strictement les consignes officielles d elimination des cadavres.\n5. Vacciner le reste du cheptel selon recommandation veterinaire en zone a risque.\n6. Ne jamais consommer ni vendre viande/lait d animaux suspects.\n7. Urgence sanitaire absolue, intervention veterinaire et administrative immediate.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Charbon bactéridien';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Nodules cutanes fermes sur tout le corps, fievre, ganglions enfles, baisse de production laitiere, amaigrissement.',
  `prevention` = 'Vaccination selon protocole en zone a risque, lutte contre les insectes vecteurs, quarantaine des nouveaux animaux, controle des mouvements de betail.',
  `vaccine_available` = 1,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les animaux atteints (transmission par insectes piqueurs).\n2. Alerter un veterinaire, maladie a declaration obligatoire dans de nombreux pays.\n3. Traiter les nodules et prevenir les surinfections cutanees.\n4. Renforcer la lutte contre les insectes (mouches, moustiques, tiques).\n5. Vacciner le reste du cheptel selon recommandation.\n6. Surveiller la production laitiere et l etat general.\n7. Suivre les consignes officielles si zone reglementee.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Dermatose nodulaire contagieuse';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Fievre intermittente, anemie progressive, amaigrissement, ganglions enfles, baisse de production, avortements possibles.',
  `prevention` = 'Lutte contre les mouches tsetse et tiques vectrices, controle des mouvements d animaux, traitement preventif en zone endemique sur conseil veterinaire.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler l animal atteint pour surveillance.\n2. Contacter un veterinaire pour confirmation (analyse sanguine) et traitement trypanocide adapte.\n3. Renforcer la lutte anti-vectorielle (mouches tsetse, tiques) sur l exploitation.\n4. Assurer un soutien nutritionnel pour l anemie.\n5. Surveiller la reponse au traitement et les rechutes possibles.\n6. Consulter en urgence si anemie severe ou amaigrissement rapide.'
WHERE `organization_id` IS NULL AND `species` = 'cow' AND `name_fr` = 'Trypanosomiase';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Fievre elevee, rougeurs cutanees puis lesions hemorragiques, perte d appetit brutale, mort rapide en quelques jours, forte mortalite dans l elevage.',
  `prevention` = 'Biosecurite tres stricte (pas de vaccin disponible), quarantaine des nouveaux animaux, controle des tiques vectrices, declaration obligatoire, ne pas introduire d aliments contenant des produits porcins non controles.',
  `vaccine_available` = 0,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Suspecter immediatement en cas de mortalite brutale et elevee.\n2. Isoler completement le site, arreter tout mouvement d animaux, materiel et personnes.\n3. Alerter immediatement un veterinaire et les autorites veterinaires (maladie a declaration obligatoire, aucun vaccin ni traitement curatif).\n4. Ne jamais deplacer ni vendre les animaux du site.\n5. Suivre strictement les consignes officielles (abattage sanitaire, zones de protection).\n6. Renforcer durablement la biosecurite (desinfection, controle des visiteurs, gestion des dechets alimentaires).\n7. Urgence sanitaire absolue, ne jamais tenter d auto-traiter.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Peste porcine africaine';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Fievre elevee, abattement, troubles nerveux (tremblements, incoordination), taches cutanees hemorragiques, avortements, forte mortalite.',
  `prevention` = 'Vaccination selon protocole national la ou disponible, biosecurite stricte, controle des mouvements d animaux, declaration obligatoire.',
  `vaccine_available` = 1,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Suspecter en cas de fievre elevee associee a des signes nerveux et forte mortalite.\n2. Isoler completement le site et arreter tout mouvement d animaux.\n3. Alerter immediatement un veterinaire et les autorites veterinaires (maladie a declaration obligatoire).\n4. Ne pas deplacer ni vendre les animaux du site.\n5. Suivre les consignes officielles (abattage sanitaire, zones de protection, vaccination d urgence si autorisee).\n6. Renforcer la biosecurite de l exploitation.\n7. Urgence sanitaire, ne jamais auto-traiter.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Peste porcine classique';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Troubles nerveux (tremblements, paralysie progressive, incoordination), fievre, refus de se lever, souvent mortelle chez les jeunes.',
  `prevention` = 'Biosecurite stricte, quarantaine des nouveaux animaux, controle sanitaire des reproducteurs, declaration selon reglementation locale.',
  `vaccine_available` = 0,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler immediatement les animaux presentant des signes nerveux.\n2. Alerter un veterinaire en urgence pour confirmation diagnostique.\n3. Assurer confort et soins de support (litiere epaisse, hydratation).\n4. Renforcer la biosecurite pour eviter la propagation.\n5. Suivre les consignes officielles si maladie a declaration obligatoire localement.\n6. Consulter en urgence, pronostic reserve pour les cas avec paralysie.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Maladie de Teschen';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Fievre elevee, taches cutanees rouge-violace en forme de losange, boiterie, abattement, forme chronique avec arthrite et lesions cardiaques.',
  `prevention` = 'Vaccination selon protocole du cheptel, hygiene des batiments, controle des rongeurs (vecteurs), quarantaine des nouveaux animaux.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les animaux atteints (transmissible a l Homme par contact, zoonose).\n2. Se proteger lors de la manipulation (gants, lavage des mains).\n3. Contacter un veterinaire pour traitement antibiotique adapte, generalement efficace si traite tot.\n4. Vacciner le reste du cheptel selon recommandation.\n5. Controler les rongeurs sur l exploitation.\n6. Surveiller les sequelles chroniques (boiterie, cardiopathie) sur les animaux traites.\n7. Consulter en urgence en cas de fievre elevee et lesions cutanees typiques.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Rouget du porc';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Diarrhee aqueuse profuse et vomissements chez porcelets et adultes, deshydratation rapide, forte mortalite chez les porcelets non immunises.',
  `prevention` = 'Biosecurite stricte, quarantaine des nouveaux animaux, vide sanitaire entre bandes, hygiene renforcee de la maternite.',
  `vaccine_available` = 0,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler la bande atteinte immediatement (tres contagieux).\n2. Rehydrater les porcelets par voie orale et maintenir une temperature adequate.\n3. Contacter un veterinaire pour confirmation et soins de support.\n4. Renforcer la biosecurite (desinfection, limitation des mouvements).\n5. Assurer une prise de colostrum maximale pour les portees a naitre.\n6. Nettoyer et vide sanitaire complet entre bandes.\n7. Consulter en urgence, mortalite pouvant etre tres elevee chez les jeunes porcelets.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Gastro-entérite transmissible (TGE)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Amaigrissement, retard de croissance, ganglions enfles, peau palee, parfois troubles respiratoires associes.',
  `prevention` = 'Vaccination selon protocole du cheptel, hygiene de la maternite et du sevrage, densite d elevage adaptee, gestion du stress au sevrage.',
  `vaccine_available` = 1,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les animaux les plus affectes du groupe.\n2. Contacter un veterinaire pour confirmation et gestion des infections secondaires.\n3. Ameliorer les conditions d elevage (hygiene, densite, ventilation).\n4. Vacciner selon protocole recommande pour le cheptel.\n5. Surveiller la croissance et le poids des animaux affectes.\n6. Consulter si retard de croissance important ou mortalite en hausse.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Circovirose porcine';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Toux chronique seche, retard de croissance, respiration laborieuse en cas de surinfection, faible mortalite mais fort impact sur la croissance.',
  `prevention` = 'Bonne ventilation, densite adaptee, vide sanitaire entre bandes, vaccination selon protocole, reduction du stress et de la poussiere.',
  `vaccine_available` = 1,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Ameliorer immediatement la ventilation et reduire la densite.\n2. Isoler les animaux les plus toussants si possible.\n3. Contacter un veterinaire pour traitement antibiotique en cas de surinfection bacterienne.\n4. Vacciner selon protocole recommande pour le cheptel.\n5. Surveiller la croissance des animaux atteints.\n6. Consulter si aggravation respiratoire ou mortalite associee.'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Pneumonie enzootique';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Renflement mou et reductible au niveau du nombril, generalement visible des la naissance ou le jeune age, sans douleur si non compliquee.',
  `prevention` = 'Hygiene de la section du cordon ombilical a la naissance, selection genetique des reproducteurs, surveillance des portees a risque.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Observer la taille et la reductibilite de la hernie regulierement.\n2. Eviter tout traumatisme sur la zone (manipulation douce).\n3. Contacter un veterinaire pour evaluation, notamment si la hernie grossit ou devient dure/chaude (etranglement).\n4. Une correction chirurgicale peut etre necessaire sur avis veterinaire selon la taille.\n5. Surveiller l animal jusqu a la reforme ou l intervention.\n6. Consulter en urgence si la hernie devient dure, chaude et douloureuse (urgence chirurgicale possible).'
WHERE `organization_id` IS NULL AND `species` = 'pig' AND `name_fr` = 'Hernie ombilicale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Troubles respiratoires et nerveux (torticolis, paralysie), diarrhee verdatre, chute brutale de ponte, mortalite elevee et rapide.',
  `prevention` = 'Vaccination selon protocole (tres efficace et recommandee), biosecurite stricte, quarantaine des nouveaux animaux, declaration selon reglementation locale.',
  `vaccine_available` = 1,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Suspecter en cas de mortalite brutale avec signes nerveux et respiratoires combines.\n2. Isoler completement le lot et arreter tout mouvement.\n3. Alerter immediatement un veterinaire et les autorites competentes si requis localement.\n4. Ne pas vendre ni deplacer les animaux du site.\n5. Renforcer la vaccination du reste du cheptel selon calendrier recommande.\n6. Nettoyer et desinfecter completement apres l episode (vide sanitaire).\n7. Urgence sanitaire, forte contagiosite et mortalite potentiellement tres elevee.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Maladie de Newcastle';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Abattement, plumes ebouriffees, tremblements, diarrhee blanchatre, gonflement de la bourse de Fabricius, mortalite chez les jeunes sujets (3-6 semaines).',
  `prevention` = 'Vaccination selon protocole (essentielle chez les jeunes), biosecurite stricte, vide sanitaire entre bandes, desinfection renforcee (virus tres resistant).',
  `vaccine_available` = 1,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler le lot atteint immediatement.\n2. Contacter un veterinaire pour confirmation diagnostique.\n3. Assurer un soutien symptomatique (hydratation, vitamines sur conseil).\n4. Renforcer la vaccination des futures bandes selon calendrier recommande.\n5. Desinfecter tres soigneusement le batiment (virus resistant aux desinfectants courants).\n6. Surveiller la mortalite et l immunodepression associee (sensibilite accrue a d autres maladies).\n7. Consulter en urgence si mortalite elevee chez les jeunes.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Maladie de Gumboro';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Paralysie progressive des pattes/ailes, torticolis, tumeurs internes possibles, amaigrissement, mortalite variable selon la souche.',
  `prevention` = 'Vaccination au couvoir des le premier jour (essentielle, pas de traitement curatif), biosecurite stricte, vide sanitaire, desinfection renforcee.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les sujets paralyses du reste du lot.\n2. Il n existe pas de traitement curatif, la vaccination preventive au couvoir est la seule protection efficace.\n3. Contacter un veterinaire pour confirmation et gestion du lot.\n4. Reformer les sujets tres affectes selon les pratiques d elevage (euthanasie sur avis veterinaire si souffrance).\n5. Assurer une vaccination systematique des prochaines bandes des le premier jour.\n6. Desinfecter soigneusement entre les bandes (virus tres resistant dans l environnement).\n7. Consulter un veterinaire pour adapter le protocole vaccinal du couvoir.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Maladie de Marek';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Toux, eternuements, ecoulement nasal, respiration bruyante, baisse de ponte, oeufs a coquille deformee.',
  `prevention` = 'Vaccination selon protocole, ventilation adequate, densite controlee, biosecurite, quarantaine des nouveaux sujets.',
  `vaccine_available` = 1,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les sujets malades si possible.\n2. Ameliorer la ventilation du batiment.\n3. Contacter un veterinaire pour confirmation et traitement des surinfections bacteriennes.\n4. Vacciner selon protocole recommande.\n5. Surveiller la qualite et la quantite de ponte.\n6. Consulter si aggravation respiratoire ou mortalite en hausse.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Bronchite infectieuse';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Lesions crouteuses sur la crete, les barbillons et le pourtour des yeux, difficulte a manger si lesions buccales, baisse de croissance/ponte.',
  `prevention` = 'Vaccination selon protocole, lutte contre les moustiques (vecteurs), quarantaine des nouveaux animaux, hygiene du batiment.',
  `vaccine_available` = 1,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les sujets atteints.\n2. Nettoyer doucement les lesions cutanees.\n3. Contacter un veterinaire pour traitement de soutien et gestion des surinfections.\n4. Faciliter l acces a l eau et l aliment si lesions buccales genent l alimentation.\n5. Renforcer la lutte contre les moustiques vecteurs.\n6. Vacciner le reste du lot selon recommandation.\n7. Consulter en cas de forme respiratoire severe associee.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Variole aviaire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Diarrhee, abattement, baisse de ponte, parfois septicemie et mortalite soudaine ; zoonose transmissible a l Homme via oeufs/viande contamines.',
  `prevention` = 'Hygiene stricte de l elevage, controle des rongeurs et nuisibles, eau et aliment propres, quarantaine des nouveaux animaux.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les sujets atteints.\n2. Se proteger lors de la manipulation (zoonose, lavage des mains, hygiene des oeufs).\n3. Contacter un veterinaire pour confirmation et traitement antibiotique adapte.\n4. Renforcer l hygiene generale de l elevage et le controle des nuisibles.\n5. Ne pas consommer d oeufs/viande d animaux suspects sans cuisson complete.\n6. Surveiller la mortalite et la ponte.\n7. Consulter en urgence si mortalite en hausse ou suspicion de contamination humaine.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Salmonellose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Fievre, abattement soudain, ecoulement nasal/oral, diarrhee, cyanose de la crete/barbillons, mortalite rapide possible.',
  `prevention` = 'Vaccination selon protocole en zone a risque, controle des rongeurs, biosecurite stricte, quarantaine des nouveaux animaux.',
  `vaccine_available` = 1,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler immediatement les sujets suspects.\n2. Contacter un veterinaire en urgence, evolution pouvant etre tres rapide.\n3. Traiter selon prescription (antibiotique specifique).\n4. Renforcer la biosecurite et le controle des rongeurs.\n5. Vacciner le reste du cheptel en zone a risque selon recommandation.\n6. Nettoyer et desinfecter apres l episode.\n7. Consulter en urgence, mortalite pouvant survenir en 24-48h.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Choléra aviaire';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Difficulte respiratoire, abdomen gonfle, cyanose (peau bleutee), croissance ralentie, mortalite subite chez sujets a croissance rapide.',
  `prevention` = 'Ventilation adequate en altitude/temperature elevee, croissance progressive (limiter la vitesse de prise de poids), densite adaptee, qualite de l air controlee.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Ameliorer immediatement la ventilation et la qualite de l air du batiment.\n2. Reduire le rythme de croissance si alimentation trop energetique (programme alimentaire adapte).\n3. Isoler les sujets les plus affectes.\n4. Contacter un veterinaire pour evaluation nutritionnelle et sanitaire du lot.\n5. Reduire la densite d elevage.\n6. Surveiller la mortalite subite, frequente dans les lots a forte croissance.\n7. Pas de traitement curatif, la prevention par la gestion d elevage est essentielle.'
WHERE `organization_id` IS NULL AND `species` = 'chicken' AND `name_fr` = 'Ascite (syndrome hypertension pulmonaire)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Depots cotonneux blanc-grisatre sur peau, nageoires ou oeufs, letargie, perte d appetit.',
  `prevention` = 'Bonne qualite d eau, eviter les blessures cutanees, densite adaptee, retrait rapide des poissons/oeufs morts.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les poissons atteints en bassin de quarantaine.\n2. Ameliorer la qualite de l eau (renouvellement, filtration, oxygenation).\n3. Traiter avec un produit antifongique adapte selon conseil specialise.\n4. Retirer immediatement poissons morts et oeufs infectes.\n5. Surveiller l apparition de nouveaux cas.\n6. Consulter un veterinaire/technicien aquacole si extension.'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Saprolegniose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Hemorragies cutanees et internes, nage erratique ou letargie extreme, mortalite massive et rapide, yeux exorbites possibles.',
  `prevention` = 'Biosecurite stricte du site aquacole (pas de vaccin largement disponible), quarantaine des nouveaux poissons, controle de la temperature de l eau, declaration selon reglementation locale.',
  `vaccine_available` = 0,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Suspecter en cas de mortalite massive et brutale avec hemorragies visibles.\n2. Isoler immediatement le bassin/site et arreter tout transfert de poissons ou d eau.\n3. Alerter un veterinaire ou service aquacole competent (maladie a declaration obligatoire dans plusieurs pays).\n4. Ne pas deplacer ni vendre les poissons du site.\n5. Suivre les consignes officielles (destruction sanitaire eventuelle).\n6. Renforcer la biosecurite (desinfection materiel, filtration).\n7. Urgence sanitaire, pas de traitement curatif disponible.'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Septicémie hémorragique virale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Petits points blancs sur la peau, les nageoires et les branchies, frottements contre les surfaces, respiration acceleree, letargie.',
  `prevention` = 'Qualite d eau stable, quarantaine des nouveaux poissons (14 jours minimum), eviter les variations brutales de temperature, densite adaptee.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les poissons atteints en quarantaine.\n2. Augmenter progressivement la temperature de l eau si tolere par l espece (accelere le cycle du parasite).\n3. Traiter l eau avec un produit adapte selon conseil specialise/veterinaire aquacole.\n4. Ameliorer la filtration et l oxygenation.\n5. Traiter l ensemble du bassin, le parasite se propage rapidement.\n6. Surveiller la mortalite sur plusieurs jours.\n7. Consulter un specialiste aquacole si mortalite en hausse.'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Points blancs (Ich)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Effilochage et decoloration des bords des nageoires, nageoires raccourcies, parfois rougeurs a la base.',
  `prevention` = 'Bonne qualite d eau, densite adaptee, eviter le stress et les blessures, nettoyage regulier du bassin.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Verifier et ameliorer la qualite de l eau (cause frequente).\n2. Isoler les poissons atteints si agression d autres poissons suspectee.\n3. Nettoyer le bassin et retirer les debris organiques.\n4. Contacter un veterinaire/technicien aquacole pour traitement antibacterien si infection avancee.\n5. Surveiller la repousse des nageoires.\n6. Consulter si extension a la base du corps (risque de septicemie).'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Pourriture des nageoires';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Respiration acceleree, poissons a la surface cherchant de l oxygene, branchies pales ou couvertes de mucus, letargie.',
  `prevention` = 'Surveillance reguliere de l oxygene dissous et de l ammoniac, densite adaptee, filtration efficace, quarantaine des nouveaux poissons.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Verifier immediatement l oxygenation et les parametres d eau (ammoniac, nitrites).\n2. Augmenter l aeration/oxygenation du bassin en urgence si besoin.\n3. Isoler les poissons atteints si possible.\n4. Contacter un veterinaire/technicien aquacole pour identifier la cause (parasitaire/bacterienne) et le traitement.\n5. Reduire la densite si surpopulation.\n6. Surveiller la mortalite, risque d asphyxie rapide en cas d atteinte severe.'
WHERE `organization_id` IS NULL AND `species` = 'fish' AND `name_fr` = 'Infection branchiale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Fievre, ecoulement nasal/oculaire, ulceres buccaux, diarrhee, pneumonie, forte mortalite chez les jeunes, avortements.',
  `prevention` = 'Vaccination selon protocole national la ou disponible, biosecurite stricte, controle des mouvements d animaux, declaration obligatoire.',
  `vaccine_available` = 1,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Suspecter en cas de mortalite elevee avec signes respiratoires et digestifs combines.\n2. Isoler completement le troupeau et arreter tout mouvement.\n3. Alerter immediatement un veterinaire et les autorites veterinaires (maladie a declaration obligatoire).\n4. Ne pas deplacer ni vendre les animaux du site.\n5. Suivre les consignes officielles (vaccination d urgence si autorisee, zones de protection).\n6. Renforcer la biosecurite de l exploitation.\n7. Urgence sanitaire, forte contagiosite et mortalite potentiellement elevee chez les jeunes.'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Peste des petits ruminants';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Fievre elevee, avortements massifs, mortalite chez les jeunes animaux, ictere possible ; zoonose transmissible a l Homme.',
  `prevention` = 'Vaccination selon protocole en zone endemique, lutte contre les moustiques vecteurs, controle des mouvements d animaux, declaration obligatoire.',
  `vaccine_available` = 1,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler les animaux suspects, particulierement en cas d avortements groupes.\n2. Se proteger lors de la manipulation des avortons/placentas (zoonose grave).\n3. Alerter immediatement un veterinaire et les autorites sanitaires (maladie a declaration obligatoire).\n4. Renforcer la lutte contre les moustiques vecteurs.\n5. Suivre les consignes officielles de vaccination en zone a risque.\n6. Ne pas consommer viande/lait d animaux suspects.\n7. Urgence sanitaire et zoonose, intervention veterinaire immediate necessaire.'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Fièvre de la vallée du Rift';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Croutes et lesions autour de la bouche, des levres et parfois des mamelles, difficulte a teter chez les jeunes, zoonose legere possible chez l Homme (contact direct).',
  `prevention` = 'Vaccination selon protocole en zone a risque, quarantaine des nouveaux animaux, hygiene generale, eviter le contact direct sans protection.',
  `vaccine_available` = 1,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les animaux atteints, particulierement les jeunes ayant du mal a teter.\n2. Se proteger lors de la manipulation (gants, zoonose possible par contact direct).\n3. Contacter un veterinaire pour soins des lesions et traitement des surinfections.\n4. Assurer une alimentation assistee si le jeune ne peut pas teter normalement.\n5. Vacciner le reste du troupeau en zone a risque selon recommandation.\n6. Surveiller la guerison, generalement en 3-4 semaines.\n7. Consulter en cas de surinfection ou de refus prolonge de teter.'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Ecthyma contagieux (orf)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Mamelle chaude, gonflee, douloureuse, lait anormal (grumeaux, couleur), baisse de production, parfois fievre.',
  `prevention` = 'Hygiene stricte de traite, desinfection des trayons, litiere propre et seche, controle regulier de l etat des mamelles.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler l animal du reste du troupeau si etat general altere.\n2. Traire frequemment le quartier atteint (ne pas consommer ce lait).\n3. Nettoyer et desinfecter la mamelle avant/apres traite.\n4. Contacter un veterinaire pour antibiotherapie intramammaire adaptee.\n5. Respecter le delai d attente avant remise du lait a la consommation/vente.\n6. Surveiller la temperature et l etat general 48-72h.\n7. Consulter en urgence si mammite severe (mamelle dure/violette).'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Mammite';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Douleur abdominale, convulsions, mort subite frequente chez les jeunes en bonne condition corporelle, parfois diarrhee et incoordination.',
  `prevention` = 'Vaccination selon protocole du cheptel, gestion progressive des changements alimentaires, eviter les exces alimentaires soudains (riches en glucides).',
  `vaccine_available` = 1,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Retirer immediatement tout aliment riche en glucides suspecte d avoir declenche l episode.\n2. Isoler les animaux a risque du groupe.\n3. Contacter un veterinaire en urgence, evolution pouvant etre foudroyante.\n4. Vacciner le troupeau selon protocole recommande (tres efficace en prevention).\n5. Introduire progressivement tout changement alimentaire a l avenir.\n6. Surveiller les jeunes en bonne condition corporelle, population la plus a risque.\n7. Urgence veterinaire, mort subite possible sans signes prealables.'
WHERE `organization_id` IS NULL AND `species` = 'goat' AND `name_fr` = 'Entérotoxémie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Nodules et croutes cutanees sur tout le corps, fievre, ecoulement nasal/oculaire, lesions pouvant s etendre aux poumons, mortalite chez les jeunes.',
  `prevention` = 'Vaccination selon protocole national la ou disponible, biosecurite stricte, quarantaine des nouveaux animaux, declaration obligatoire.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les animaux atteints immediatement (tres contagieux).\n2. Alerter un veterinaire et les autorites veterinaires (maladie a declaration obligatoire dans de nombreux pays).\n3. Traiter les lesions cutanees et prevenir les surinfections.\n4. Renforcer la biosecurite (desinfection, controle des mouvements).\n5. Vacciner le reste du troupeau selon recommandation.\n6. Surveiller les complications respiratoires chez les animaux atteints.\n7. Suivre les consignes officielles si zone reglementee.'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Clavelée (variole ovine)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Fievre, gonflement et cyanose de la langue (langue bleue), boiterie, ulceres buccaux, amaigrissement, mortalite variable selon la souche.',
  `prevention` = 'Vaccination selon protocole en zone a risque, lutte contre les moucherons vecteurs (Culicoides), controle des mouvements d animaux.',
  `vaccine_available` = 1,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les animaux atteints pour surveillance.\n2. Alerter un veterinaire, maladie a declaration obligatoire dans plusieurs pays.\n3. Assurer des soins de support (hydratation, soins des ulceres buccaux, facilite d acces a l aliment mou).\n4. Renforcer la lutte anti-vectorielle (moucherons) sur l exploitation.\n5. Vacciner le troupeau en zone a risque selon recommandation.\n6. Surveiller la boiterie et les complications.\n7. Consulter en urgence en cas de forme severe.'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Fièvre catarrhale ovine';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Boiterie severe, separation de la corne du sabot, odeur nauseabonde caracteristique, animal couche frequemment, refus de se deplacer.',
  `prevention` = 'Parage regulier des onglons, pediluve desinfectant, sols secs, quarantaine et controle des pieds des nouveaux animaux.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les animaux atteints, tres contagieux entre onglons.\n2. Parer et nettoyer soigneusement le sabot atteint.\n3. Utiliser un pediluve desinfectant pour l ensemble du troupeau.\n4. Contacter un veterinaire pour traitement antibiotique local/systemique si necessaire.\n5. Assecher les zones de stationnement des animaux.\n6. Surveiller l ensemble du troupeau, forte contagiosite.\n7. Consulter en cas de non-amelioration apres traitement local.'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Piétin';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Douleur abdominale, convulsions, mort subite frequente chez les jeunes en bonne condition corporelle, parfois diarrhee et incoordination.',
  `prevention` = 'Vaccination selon protocole du cheptel, gestion progressive des changements alimentaires, eviter les exces de concentres.',
  `vaccine_available` = 1,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Retirer tout aliment riche en glucides suspecte.\n2. Isoler les animaux a risque.\n3. Contacter un veterinaire en urgence, evolution pouvant etre foudroyante.\n4. Vacciner le troupeau selon protocole recommande.\n5. Introduire progressivement tout changement alimentaire.\n6. Surveiller les jeunes en bonne condition corporelle, population la plus a risque.\n7. Urgence veterinaire, mort subite possible sans signes prealables.'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Entérotoxémie';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Mamelle chaude, gonflee, douloureuse, lait anormal, baisse de production, parfois fievre chez la brebis.',
  `prevention` = 'Hygiene stricte de traite/allaitement, desinfection des trayons, litiere propre, controle regulier des mamelles.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler l animal si etat general altere.\n2. Traire ou faire teter frequemment le quartier atteint si possible.\n3. Nettoyer et desinfecter la mamelle.\n4. Contacter un veterinaire pour antibiotherapie adaptee.\n5. Surveiller la temperature et l etat general.\n6. Consulter en urgence si mammite severe (mamelle dure/violette, gangrene).'
WHERE `organization_id` IS NULL AND `species` = 'sheep' AND `name_fr` = 'Mammite';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Gonflement de la tete, du cou et des organes genitaux, letargie severe, perte d appetit, forte mortalite en 1-2 semaines.',
  `prevention` = 'Vaccination selon protocole (essentielle), controle des insectes vecteurs, quarantaine des nouveaux animaux, biosecurite stricte.',
  `vaccine_available` = 1,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Isoler immediatement les lapins atteints, tres contagieux.\n2. Alerter un veterinaire en urgence, pas de traitement curatif efficace.\n3. Renforcer la lutte contre les insectes vecteurs (moustiques, puces).\n4. Vacciner le reste du cheptel selon protocole recommande.\n5. Desinfecter completement les cages et le materiel.\n6. Euthanasier les sujets en souffrance severe sur avis veterinaire.\n7. Urgence sanitaire, forte mortalite attendue sans vaccination.'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Myxomatose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Mort subite frequente sans signes prealables, parfois saignement au niveau du nez/anus juste avant la mort, forte mortalite en quelques jours.',
  `prevention` = 'Vaccination selon protocole (essentielle et tres efficace), biosecurite stricte, quarantaine des nouveaux animaux, desinfection renforcee.',
  `vaccine_available` = 1,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Isoler immediatement tout le groupe en cas de mort subite inexpliquee.\n2. Alerter un veterinaire en urgence, pas de traitement curatif.\n3. Vacciner le reste du cheptel des que possible selon protocole recommande.\n4. Desinfecter tres soigneusement les cages et le materiel (virus tres resistant).\n5. Eliminer les cadavres selon les regles sanitaires (risque de contamination environnementale).\n6. Renforcer durablement la biosecurite de l elevage.\n7. Urgence sanitaire, mortalite pouvant depasser 80% sans vaccination.'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Maladie hémorragique virale';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Diarrhee parfois sanglante, abattement, retard de croissance, ballonnement abdominal, mortalite chez les jeunes lapins.',
  `prevention` = 'Litiere seche et propre, hygiene stricte des cages, vide sanitaire entre bandes, eau propre.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les sujets atteints.\n2. Assecher et renouveler la litiere.\n3. Contacter un veterinaire pour traitement anticoccidien adapte.\n4. Assurer hydratation et alimentation de soutien (fourrage fibreux).\n5. Nettoyer et desinfecter les cages entre les bandes.\n6. Surveiller la croissance et la mortalite du lot.\n7. Consulter en urgence si mortalite elevee chez les jeunes.'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Coccidiose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'low',
  `symptoms` = 'Croutes epaisses et grisatres dans le conduit auditif, grattage frequent des oreilles, secouement de tete, inconfort marque.',
  `prevention` = 'Inspection reguliere des oreilles, hygiene des cages, quarantaine des nouveaux animaux, controle des acariens.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler le lapin atteint.\n2. Ne pas arracher les croutes brutalement (douloureux, risque de saignement).\n3. Contacter un veterinaire pour traitement antiparasitaire adapte.\n4. Nettoyer et desinfecter la cage et le materiel.\n5. Traiter les autres lapins en contact si necessaire.\n6. Surveiller la guerison sur plusieurs semaines.\n7. Consulter si surinfection ou extension au conduit auditif profond.'
WHERE `organization_id` IS NULL AND `species` = 'rabbit' AND `name_fr` = 'Gale des oreilles';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'critical',
  `symptoms` = 'Mort subite en tres grand nombre, diarrhee verdatre profuse, ecoulement nasal, prolapsus du penis chez le male, chute brutale de ponte.',
  `prevention` = 'Vaccination selon protocole en zone a risque, biosecurite stricte, quarantaine des nouveaux animaux, declaration obligatoire.',
  `vaccine_available` = 1,
  `mortality_risk` = 'critical',
  `recommended_protocol` = '1. Suspecter en cas de mortalite massive et rapide.\n2. Isoler completement le site et arreter tout mouvement d animaux.\n3. Alerter immediatement un veterinaire et les autorites veterinaires (maladie a declaration obligatoire).\n4. Ne pas deplacer ni vendre les animaux du site.\n5. Suivre strictement les consignes officielles.\n6. Renforcer durablement la biosecurite.\n7. Urgence sanitaire absolue, ne jamais auto-traiter.'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Peste du canard';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Mortalite elevee et rapide chez les canetons (moins de 3 semaines), incoordination, position en opisthotonos (tete rejetee en arriere), foie hemorragique a l autopsie.',
  `prevention` = 'Vaccination des reproducteurs et/ou canetons selon protocole, hygiene stricte de la couvoiree/nurserie, quarantaine des nouveaux animaux.',
  `vaccine_available` = 1,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler immediatement les canetons atteints.\n2. Alerter un veterinaire en urgence, mortalite pouvant depasser 90% chez les tres jeunes.\n3. Vacciner les reproducteurs et/ou canetons selon protocole recommande.\n4. Renforcer l hygiene de la nurserie et de la couvoiree.\n5. Nettoyer et desinfecter completement apres l episode.\n6. Surveiller etroitement les prochaines eclosions.\n7. Urgence sanitaire chez les jeunes canetons, evolution tres rapide.'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Hépatite virale du canard';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Diarrhee parfois sanglante, abattement, retard de croissance, mortalite chez les jeunes canetons.',
  `prevention` = 'Litiere seche et propre, hygiene stricte de l elevage, vide sanitaire entre bandes, eau propre.',
  `vaccine_available` = 0,
  `mortality_risk` = 'medium',
  `recommended_protocol` = '1. Isoler les sujets atteints.\n2. Assecher et renouveler la litiere.\n3. Contacter un veterinaire pour traitement anticoccidien adapte.\n4. Assurer hydratation et alimentation de soutien.\n5. Nettoyer et desinfecter le batiment entre les bandes.\n6. Surveiller la croissance et la mortalite du lot.\n7. Consulter en urgence si mortalite elevee chez les jeunes.'
WHERE `organization_id` IS NULL AND `species` = 'duck' AND `name_fr` = 'Coccidiose';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'medium',
  `symptoms` = 'Gonflement de la face et des sinus, ecoulement nasal purulent, yeux colles, difficulte respiratoire, baisse d appetit.',
  `prevention` = 'Biosecurite stricte, ventilation adequate, quarantaine des nouveaux animaux, hygiene du batiment, controle de la densite.',
  `vaccine_available` = 0,
  `mortality_risk` = 'low',
  `recommended_protocol` = '1. Isoler les sujets atteints du reste du lot.\n2. Nettoyer les ecoulements nasaux/oculaires.\n3. Contacter un veterinaire pour traitement antibiotique adapte.\n4. Ameliorer la ventilation et reduire la densite.\n5. Desinfecter le materiel et le batiment.\n6. Surveiller l evolution respiratoire sur plusieurs jours.\n7. Consulter en urgence si difficulte respiratoire severe.'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Coryza infectieux';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Abattement, plumage terne, tete cyanosee/noircie dans les cas avances, diarrhee soufree caracteristique, mortalite notable chez les dindons.',
  `prevention` = 'Eviter l elevage mixte avec des poules (portage sans symptomes chez la poule), controle des parasites intestinaux (vecteurs), hygiene du sol/litiere.',
  `vaccine_available` = 0,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler les dindons atteints immediatement.\n2. Separer strictement l elevage de dindons de tout contact avec des poules.\n3. Contacter un veterinaire pour traitement adapte et confirmation diagnostique.\n4. Assecher et assainir la litiere/le sol.\n5. Controler les parasites intestinaux (vers) qui transmettent l agent pathogene.\n6. Surveiller la mortalite, pouvant etre elevee chez les jeunes dindons.\n7. Consulter en urgence si mortalite en hausse ou signes tres avances.'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Histomonose (tête noire)';
--> statement-breakpoint

UPDATE `farmos_diseases` SET
  `urgency_level` = 'high',
  `symptoms` = 'Fievre, abattement soudain, ecoulement nasal/oral, diarrhee, cyanose de la tete, mortalite rapide possible chez les dindons.',
  `prevention` = 'Vaccination selon protocole en zone a risque, controle des rongeurs, biosecurite stricte, quarantaine des nouveaux animaux.',
  `vaccine_available` = 1,
  `mortality_risk` = 'high',
  `recommended_protocol` = '1. Isoler immediatement les sujets suspects.\n2. Contacter un veterinaire en urgence, evolution pouvant etre tres rapide chez le dindon.\n3. Traiter selon prescription (antibiotique specifique).\n4. Renforcer la biosecurite et le controle des rongeurs.\n5. Vacciner le reste du cheptel en zone a risque selon recommandation.\n6. Nettoyer et desinfecter apres l episode.\n7. Consulter en urgence, mortalite pouvant survenir en 24-48h chez le dindon, plus sensible que la poule.'
WHERE `organization_id` IS NULL AND `species` = 'turkey' AND `name_fr` = 'Choléra aviaire';
--> statement-breakpoint
