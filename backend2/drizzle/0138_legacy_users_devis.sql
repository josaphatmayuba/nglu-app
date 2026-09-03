-- ============================================================
-- Migration users + Devis legacy -> nglu-app (GENERE)
-- Statements AUTONOMES (--> statement-breakpoint, pas de @var). Users NON fusionnes.
-- Recablage par cle naturelle : username (partie locale de l'email genere, unique).
-- ============================================================
CREATE TABLE IF NOT EXISTS legacy_user_map (legacy_uuid VARCHAR(64) PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
-- === users (31 actifs) migres en NOUVEAUX users (seeds 1-6 intacts) ===
-- email = prenom.nom@ongdngolu.org genere (on ignore l'email source, souvent invalide).
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'josaphat.mayubandele', 'josaphat', 'mayuba ndele', 'josaphat.mayubandele@ongdngolu.org', '+243841362858', '$2b$10$1UxMVJ9UfrmTw3eTYg6J5.KRgCpCc6YTTN2MZMtZW0c4.1.40fOtq', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='josaphat.mayubandele');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '8a78a8ef-7598-4cfc-96da-3e13a12586ae', id FROM users WHERE username='josaphat.mayubandele' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'jemima.kasa', 'jemima', 'kasa', 'jemima.kasa@ongdngolu.org', '+243822206349', '$2b$10$L4y9.AtqeUMI7q5NEY6gVe3yyruEWr1r5HAr.aLOfBUKcjG55Fc8.', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='jemima.kasa');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'ca05b54f-946d-4fbd-8690-3fa8155b7342', id FROM users WHERE username='jemima.kasa' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'herve.mulela', 'hervé', 'mulela', 'herve.mulela@ongdngolu.org', '+243992800936', '$2b$10$AOysKJGxdrCrMdexFCA6y.MBbRs26gZ8GDfqb4pI6l4W1JJCzhWEC', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='herve.mulela');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'e0d325eb-08f7-448f-aba4-15ca75aa5bac', id FROM users WHERE username='herve.mulela' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'support.admin', 'support', 'admin', 'support.admin@ongdngolu.org', NULL, '$2b$10$mRkOhTJPYlEQjmZYU.SYvuznFqd62CA0Hi.x7FETh13yqUQ80peze', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='support.admin');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'be57e056-06a0-42aa-b1a8-71ff5e255edb', id FROM users WHERE username='support.admin' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'gregloire.kasele', 'gregloire', 'kasele', 'gregloire.kasele@ongdngolu.org', '+243817015333', '$2b$10$dnIUPUXqtMkx3p8a3yzWJOOsF5IlW78NVuYQ8sIwZMMAnhVwJa6Na', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='gregloire.kasele');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'ae9b569d-51a5-4774-b594-9dbe5edb2f51', id FROM users WHERE username='gregloire.kasele' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'esther.mutendo', 'esther', 'mutendo', 'esther.mutendo@ongdngolu.org', '+243824340035', '$2b$10$4tPs/Nyobmp/uWPydWroHOyi/D69Xd5kiewMJ2M30M4eaZnmsHgnu', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='esther.mutendo');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '28f019f7-64f7-4f15-a46e-ca005c476126', id FROM users WHERE username='esther.mutendo' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'patrice.nzamba', 'patrice', 'nzamba', 'patrice.nzamba@ongdngolu.org', '+243893199930', '$2b$10$M.C52Lmunq2y1XtNZEp/E.vRCz9z7.FeTQ3QMgxq3CjefIb29fnT.', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='patrice.nzamba');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '154a4a23-4715-4902-8c06-2f14bf2af797', id FROM users WHERE username='patrice.nzamba' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'fatima.lumande', 'fatima', 'lumande', 'fatima.lumande@ongdngolu.org', '+243812672176', '$2b$10$cijAdjfFFyGvQyhlotAOsuENKsmtA0xUcsyv0lEtXrY4fqqFkAX9y', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='fatima.lumande');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'a222fc5e-da2e-42f4-9e8a-98095946ccb1', id FROM users WHERE username='fatima.lumande' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'diamengo.tshimba', 'diamengo', 'tshimba', 'diamengo.tshimba@ongdngolu.org', '+243844288284', '$2b$10$CTEz4ZEXi.5cWCNsElO1Q.yYlVf1eqEjO4ZBWCcfYAPeucZfoq2p.', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='diamengo.tshimba');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '72c1298d-69dc-47b9-82c4-0011ac1127c7', id FROM users WHERE username='diamengo.tshimba' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'christian.batuemi', 'christian', 'batuemi', 'christian.batuemi@ongdngolu.org', '+243815026051', '$2b$10$3XK4qN7hDmVh3/CKpjQAJeSKIZ63kCeZWQygz/aJgeSUBME1n7nse', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='christian.batuemi');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'ec7e8cc1-61d7-4c3c-a480-d9df646abcc6', id FROM users WHERE username='christian.batuemi' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'didier.kimasi', 'didier', 'kimasi', 'didier.kimasi@ongdngolu.org', '+243893820668', '$2b$10$9ptd4O9vAWzYVzpNqA6p6eXDuQQE127AZZxI3hOy6SjBCnsvSuuli', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='didier.kimasi');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'e92ac7fa-3f3b-4083-8ced-5910f615a20d', id FROM users WHERE username='didier.kimasi' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'riguene.bavu', 'riguene', 'bavu', 'riguene.bavu@ongdngolu.org', '+243810218323/0851134257', '$2b$10$QmxcNZAbXxj.qeafuJP67.rObRsuBEU6ajCH3aDAuXAGCdDp90ID2', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='riguene.bavu');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'd9064505-7d27-4245-9e04-32c49bbd41a7', id FROM users WHERE username='riguene.bavu' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'anselme.mbuingavubu', 'ANSELME', 'MBUINGA VUBU', 'anselme.mbuingavubu@ongdngolu.org', '+243854127335', '$2b$10$qRbo37b/PkB/KsHvj0CVuO8N2iQdIH43/tyw2rCckozOTXK32H.eu', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='anselme.mbuingavubu');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'af1974e7-db55-434b-9fd5-f6efc79493b5', id FROM users WHERE username='anselme.mbuingavubu' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'tresor.mabibi', 'tresor', 'MABIBI', 'tresor.mabibi@ongdngolu.org', '+243895750786', '$2b$10$9qZEI2bdsHbB6CtaSTOJSekyUnu.0.pPXv0EAWuV5WPIAjAI75OTi', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='tresor.mabibi');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'e422987a-7b83-4cbb-a76f-27c696aea1eb', id FROM users WHERE username='tresor.mabibi' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'eden.konga', 'eden', 'konga', 'eden.konga@ongdngolu.org', '+243828010303', '$2b$10$5yxh5VbmLjJwWcADRR4buuqAaE.1J.h7DT1NLVqq42qXKh8ICWa9u', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='eden.konga');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'fe9cf6a1-21b7-4adc-a797-561a26fcc534', id FROM users WHERE username='eden.konga' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'prisca.ngoyi', 'prisca', 'ngoyi', 'prisca.ngoyi@ongdngolu.org', '+243811559627', '$2b$10$GHHNBc8G/fcyvlE2mvCTfumSEd34vfxIH02jx56peGkuDAipHWCR2', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='prisca.ngoyi');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'd48fa340-428d-4113-9bc0-8920becad928', id FROM users WHERE username='prisca.ngoyi' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'jonathan.mbiaka', 'jonathan', 'mbiaka', 'jonathan.mbiaka@ongdngolu.org', '+243903364875', '$2b$10$95fCInRxL0fE5ISP0uDlTOOGwvTte63DVVROh9YJRLiBE2paC2VKW', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='jonathan.mbiaka');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '18b1f2fb-d188-4d1e-8545-2e04d0bab6b3', id FROM users WHERE username='jonathan.mbiaka' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'gaston.diamonika', 'gaston', 'diamonika', 'gaston.diamonika@ongdngolu.org', '+243665896232', '$2b$10$P8FhUWfL28DDpsj8ESjg5OVb8FZQNya0IhrfDrTugCymAGTG/BHzK', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='gaston.diamonika');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '0d8e3003-4b9d-461b-9c52-ae20ea22156c', id FROM users WHERE username='gaston.diamonika' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'simon.mamputa', 'simon', 'mamputa', 'simon.mamputa@ongdngolu.org', '+243900874209', '$2b$10$hcdhPKZ9BKP0jzHtQWD.B.okegqEmm87mwJ8EBBkuCo695iRYG5gC', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='simon.mamputa');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '0a1565dc-24c7-49ea-b086-86e364894a34', id FROM users WHERE username='simon.mamputa' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'kennedy.matumona', 'kennedy', 'matumona', 'kennedy.matumona@ongdngolu.org', '+243899938727', '$2b$10$UPlscyEaOdKX.SVv4bcTj.PSzNRemfYljFqKBHTKlQCszGeULstOa', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='kennedy.matumona');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'b991d708-2cd8-40da-839d-1d9f04a6ea63', id FROM users WHERE username='kennedy.matumona' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'didier.kabeya', 'didier', 'KABEYA', 'didier.kabeya@ongdngolu.org', '+243901785425', '$2b$10$8dVJ2lKzLMdWR52Bz2GRje0yyDrR.lHl1IQ8R6EOoIiMPn4cLBVaa', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='didier.kabeya');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'ec97d4b7-44b9-41da-82de-e7e44adbb176', id FROM users WHERE username='didier.kabeya' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'dona.senga', 'dona', 'senga', 'dona.senga@ongdngolu.org', '+243568953256', '$2b$10$RyEbse14511FjsGBRpaHPuZmqAj764JZwIuJPHM.fBvpR0I14aaQq', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='dona.senga');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '8d26d54e-38f1-4fa6-b5d2-9dad41fe02d9', id FROM users WHERE username='dona.senga' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'cedrick.buala', 'cedrick', 'buala', 'cedrick.buala@ongdngolu.org', '+243904084441', '$2b$10$JgOvGOFBI6GDO63DKNn/.OftXYJQYTfROwTL80ZSSpXnghdgIdnlK', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='cedrick.buala');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '5f19ba6f-6719-4667-a2f8-fe55dc5b2165', id FROM users WHERE username='cedrick.buala' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'paul.bitukaikalaba', 'paul', 'bituka ikalaba', 'paul.bitukaikalaba@ongdngolu.org', '+243852397017', '$2b$10$49cA55Uxd3WvIv7rCP8h.eGzwl3nsGO53bhf5pi9HROqsc5CpDGUu', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='paul.bitukaikalaba');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '947703c6-c140-4773-aab7-f5e4802995b2', id FROM users WHERE username='paul.bitukaikalaba' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'pululu.mbiaka', 'pululu', 'mbiaka', 'pululu.mbiaka@ongdngolu.org', '+243851056914', '$2b$10$Sz4nLySv4rOGWmZeHkSoRe2BpfTc3zDue4xRbjQiT5aOp26mqAFu.', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='pululu.mbiaka');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'dcbde2dc-f77b-401e-91b2-221442ae9e60', id FROM users WHERE username='pululu.mbiaka' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'thola.ngoma', 'thola', 'ngoma', 'thola.ngoma@ongdngolu.org', '+12265803024', '$2b$10$3jLomQVd/gxCFvIxRi6q8e8jEUx6MY.iZMgX0OSM9S8eNoIwCX8vO', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='thola.ngoma');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '2f79c412-7f92-45b4-83c4-c5a398aca10e', id FROM users WHERE username='thola.ngoma' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'asa.balombendele', 'asa', 'balombe ndele', 'asa.balombendele@ongdngolu.org', '+243818447149', '$2b$10$sAIhehIA5lxxAcMSJS2xs.VDTZ.53YOZOBrb37Kn/0iVaZZwgJLh2', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='asa.balombendele');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '52a0626e-1949-4e94-a346-ea16b5c45685', id FROM users WHERE username='asa.balombendele' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'jean.muke', 'jean', 'muke', 'jean.muke@ongdngolu.org', '+243810191558', '$2b$10$koq8HD5EO8nL2GGmCY.N5uCwKo9duyp.V/Z3KtAJ9XwNtd/uU99OW', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='jean.muke');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '6da8248e-0a49-4816-a7c1-4dac280ad190', id FROM users WHERE username='jean.muke' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'chadrack.lumengo', 'chadrack', 'lumengo', 'chadrack.lumengo@ongdngolu.org', '+243', '$2b$10$5QbfAFglVfnZO4ImGC5la.c8bpo3e4EAOCi0Z2rs5zZlB2Ig.I9cm', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='chadrack.lumengo');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT 'd490eab7-8047-42fe-9098-ca93049e7854', id FROM users WHERE username='chadrack.lumengo' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'patrick.pesamanga', 'patrick', 'pesa manga', 'patrick.pesamanga@ongdngolu.org', '+243896800960', '$2b$10$7/ypTozyQPtqg1xfVvnSiuyhOp4yi3Ch.ALQAYalSeoSzcm18YqAS', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='patrick.pesamanga');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '90acc023-8d8b-4038-baed-54e8fd5842ca', id FROM users WHERE username='patrick.pesamanga' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) SELECT 1, 'kenedi.matumona', 'kenedi', 'matumona', 'kenedi.matumona@ongdngolu.org', '+2430', '$2b$10$nuBA3.eakQWWiYX/LuYT3O7C5zrhsu14YM6dJ3KwByEI6K90WLG9O', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='kenedi.matumona');
--> statement-breakpoint
INSERT INTO legacy_user_map (legacy_uuid, new_id) SELECT '15903dc5-91b4-435b-8e1e-300a83b7eddd', id FROM users WHERE username='kenedi.matumona' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint

-- === quote (38 Devis actifs) ===
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Problème avec le radiateur Land Cruiser', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='8a78a8ef-7598-4cfc-96da-3e13a12586ae'), NULL, 0, '[LEG-DEVIS-1] <p>Radiateur de Land Cruiser est troué </p><p>la réparation coûte 20000 FC</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-1]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Cout de depliant pour emballage vente porc', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='8a78a8ef-7598-4cfc-96da-3e13a12586ae'), NULL, 0, '[LEG-DEVIS-2] <p>pour imprimer le depliant à mettre dans l''emballage de vente de porc,</p><p>l''impression coute 2500 FC.par papier autocolant</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-2]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme du 27/07/2023/ dejà executé', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-3] <p>Transport mr christian : 15000fc</p><p>Unités bureau 5$</p><p>Acompte canon rapide 500$</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-3]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme du 28/07/ dejà payé', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-4] <p>frais agent mont fleury (electricien;ajusteur); 70$</p><p>Avance salaire gregoire; soins médicaux 250 000fc</p><p>Facture tracteur 2400$</p><p>carburant canon rapide 60$</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-4]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Tickets du 2/08/2023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-6] <p>-25 000fc :transport fatima et prisca pour chercher des clients</p><p><br></p><p>-51$ : électricien grand car</p><p>-80$ : réparations</p><p>-45/ achat produit vet kasangulu</p><p>50 $: électricien et ajuster grand car</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-6]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Ticket du 5 AOUT', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-8] <p>-Mont reçu: 934 500fc</p><p>USD: 60$</p><p>20 000fc : ration ma campagne</p><p>17 500fc ration papa mulela et fatima déménagement</p><p>897 000fc: achat carburant grand car</p><p>60$: entretien split, fréon, démontage 2 split I.G</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-8]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'dépenses hilux du  7/08', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-10] <p>1 Pneu 205R/16: 40$</p><p>5L huile moteur: 60 000fc</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-10]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'transfert ingénieur Racky', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-16] <p>1 260 000fc</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-16]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme du 8/08/023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-11] <p>3 Sac maïs : 480 000fc</p><p>5 Sacs tourteau: 100 000fc</p><p>10 sacs son de blé: 60$</p><p>5 Sacs farine de pain: 62.5$</p><p>Machine: 60.000fc</p><p>Manutention: 30 000fc</p><p>accessoire porcherie : 50 000fc</p><p>Aliment croissance ( 20 sacs): 290$</p><p><br></p><p>2eme, ticket</p><p><br></p><p>loyer marinel: 400$</p><p><br></p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-11]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'non résolus', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-12] <p>frais de bureau et autre 30$</p><p>cartouche imprimante 40$</p><p><br></p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-12]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'devis pour traitement bétails/kiloso', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-17] <p>les détails de la demande dans l''annexe.</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-17]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'pneus land cruiser ', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='8a78a8ef-7598-4cfc-96da-3e13a12586ae'), NULL, 0, '[LEG-DEVIS-5] <p>Nous avons besoin 2 pneus pour land cruiser: 1 pneu coute 60 dollars</p>', 'rejected', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-5]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'ticket du 3/Aout aout', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-7] <p>montant reçu 1000$</p><p>520$: deux pneus</p><p>200 $ main d''œuvre</p><p>140$: TOLS</p><p>20$; montage pneus et tige</p><p>20$: achats</p><p>22500fc : achats clous</p><p>10$: carburant</p><p>10 000fc  transport chauffeur</p><p>75$: divers</p><p><br></p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-7]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'ticket du 5/08', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-9] <p>Frais de voyage 50 000fc</p><p>carburant pickup 100 000fc</p><p>carburant groupe électrogène 30 000fc</p><p>imprévue 20 000fc</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-9]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Ticket du 12 Réparation véhicule', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-13] <p>1 Filtre : 10 $</p><p>1 Filtre A: 25 $</p><p>1 plaquette AV : 25$</p><p>1 Plaquette AR: 20$</p><p>1 filtre à gazoil : 15$</p><p><br></p><p>Totale 95$</p><p><br></p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-13]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Ticket pour entretien hilux et land cruiser', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-14] <p>SAE¨MOTEUR</p><p>12 litre: 85$</p><p>Sae: 90 Boite + pompe</p><p>10 Litre 40$</p><p><br></p><p>Total : 125$</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-14]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Facture achats plomberie pour appart/Betito', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-15] <p>les détails dans la facture annexé </p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-15]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme plateau de bateke', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-18] <p>frais voyage : 70 000fc</p><p>carburant pickup: 50 000fc</p><p>imprévues et autres : 30 000fc</p><p><br></p><p>Total : 150 000fc</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-18]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Envoi par demande/Mr josaphat', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-19] <p>-Plombier Patrick : 70$</p><p>-carreleur jérémié: 15$</p><p><br></p><p>-Jardinier Jean : 50$</p><p>-l''entretien parcelle : 70 000fc</p><p>-</p>', 'draft', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-19]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'programme dépannage grand car/24 Aout', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-22] <p>1 pneu : 260$</p><p>carburant pickup: 100 000 fc</p><p>Paillage et autres : 40 000 fc</p><p>Montage pneu et location crique : 30 000fc</p><p>imprévues  10 000fc</p><p>cartouche importante 40$</p><p><br></p><p>Total : 300$ et 180 000fc</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-22]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'travaux de plomberie mont- feury et betito le 23 Aout', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-21] <ul><li>une boite colle : 10$</li><li>un robinet 4$</li><li>un clapet 9 $</li><li>un flexible 3 $</li><li>transport 5$</li></ul><p>Totale : 31$</p><p>Montant envoyé 29$</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-21]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme CIMKO', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-20] <p>Carburant grand car (300L); 900 000fc</p><p>Paillage ( aller - retour) : 160 $</p><p>Frais voyage: 80 000fc</p><p>manutention et imprévue: 200 000fc</p><p><br></p><p>                        Total: 1 180 000fc + 160$</p><p><br></p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-20]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme du 25 /08/Course matete', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-23] <p>carburants 50 000	fc</p><p>manutention et imprévue 50 000	fc</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-23]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme maccampagne/ le 25/Aout', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-24] <p>-Déchargement ciment 300 fc /sac (400 sac): 120 000fc</p><p>-Transport et ration : 25 000fc</p><p>Total : 145 000fc</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-24]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme du 26/Aout', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-25] <p>Frais de nettoyage de 3 Maisons 1000$</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-25]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Demande vétérinaires /Pa muke', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-26] <p>Vaccin contre rouge du porcs</p><p>vaccin sota 104 Dose</p><p>total porc 104</p><p>Total 300$</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-26]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme 28/08/ 023/ Voyage plateau', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-27] <ul><li>300 L Carburant : 900.000fc</li><li>Paillage : 65 000 fc</li><li>Ration : 150 000 fc</li><li>1 matelas: 80 000 fc</li><li>imprévues : 100 000 fc</li></ul><p>Total : 1.  295 000 fc</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-27]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme ma campagne / 28/08', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-28] <p>Mazout : 100$</p><p>Transfert machine: 60$</p><p>Acompte location bétonnière : 300$</p><p>Acompte manutention : 150$</p><p>chevron (7pièces) : 35$</p><p>6kg  clou ordinaire: 15$</p><p>M.O échafaudage : 30$</p><p>Ration : 200 000 fc</p><p><br></p><p>Total: 690 $ + 200 000fc</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-28]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme /Soin médicaux pour fatima', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-29] <ul><li>Anti-tétanos : 10$</li><li>Antibiotiques et autres : 10$</li></ul>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-29]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme bureau /Septembre/06/09/2023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-31] <p>-loyer bureau : 400$</p><p>-Unité bureau : 5$</p><p>-internet : 20$</p><p>-Accessoires et support : 20$</p><p><br></p><p>Total : 445$</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-31]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme kongo  centrale /6/09/023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-33] <p>-Paiement des agents  6.680 000fc</p><p>-Ration kongo central : 700 000fc</p><p>-carburant porcherie : 30 000fc</p><p>-aliments pour poissons: 157 5$</p><p>-carburant pickup : 100 000fc</p><p>-Frais de voyage : 50 000fc</p><p>-Imprévue et autres : 20 000fc</p><p><br></p><p>Total : 7.580 000fc</p><p>157?5$</p>', 'rejected', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-33]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme ma campagne/ Le 13/09/ 2023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-34] <p>30 T Sable: 150 000fc</p><p>30T Caillasse : 750$</p><p>Carburant grand car : 300 000fc</p><p>Imprévue et autres : 30 000fc</p><p><br></p><p>TOTAL : 480 000fc + 750$</p>', 'draft', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-34]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Etat de besoin land cruiser', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-30] <ul><li>4 roulement : 2 X 15= 30$/ 2X10$= 20$</li><li>2 Litres pétrol : 10 000fc</li><li>1 Kg Gresse : 10$</li><li>Coupel : 5 $</li><li>Huile de frein : 17 500fc</li><li>M.O : 50$</li></ul><p>TOTAL : 115 $ + 27 500fc</p><p><br></p>', 'draft', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-30]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme du 06/09/2023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-32] <p>Paiement agents de sécurité de kasangulu : 400$</p>', 'approved', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-32]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme  ma campagne le 16/09/2023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-35] <ul><li>60 T Caillasse: 1560$</li><li>30 T Sable : 150 00 fc</li><li>Carburant grand car ( 200L): 600 000 FC </li><li>Imprévue et autres : 50 000fc</li></ul><p>TOTAL: 1.560$ et 800 000fc</p><p><br></p><p><br></p><p><br></p><p><br></p><p>Deuxième Ticket du 16/09/2023</p><p><br></p><ul><li>20L Huile Hydraulique: 170 000fc</li><li>M.O Ajusteur : 40$</li><li>Tuyau central: 100$</li><li>Imprévue : 20 000fc</li></ul><p>TOTAL: 190 000fc + 140$</p><p><br></p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-35]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme du 15/09/2023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-36] <ul><li>Solde bétonnière: 240$</li><li>Solde manutention: 150$</li><li>Transport groupe électrique: 10$</li><li>Carburant groupe: 30 000fc</li><li>Imprévue et autres: 20 000fc</li><li>Accident grand car : 100 000fc</li></ul><p>Total:  400$ et 150 000fc</p><p><br></p><p><br></p><p>Deuxième Ticket</p><p><br></p><ul><li>Ampoule 12 000fc X 4= 48 000fc</li><li>1 Rouleau 2/1/2= 40$</li><li>Soke 1000fc X 4= 4000fc</li><li>Transport : 15 000fc</li><li>Allonge: 5000fc</li><li>Huile moteur groupe : 10 000fc</li><li>25L Mazout: 75 000fc</li><li>M.O groupe electrogène + électricité: 40$</li><li>sourdire et motivation : 25 000fc</li></ul><p>TOTAL: 182 000fc +80$</p><p><br></p><p><br></p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-36]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Programme 17/09/2023', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-37] <p>Programme plateau</p><ul><li>carburant grand car (400L): 1200 000fc</li><li>Frais de voyage: 150 000fc</li><li>Imprévue : 100 000fc</li></ul><p><br></p><p>TOTAL: 1 450 000fc</p><p><br></p><p>Programme ma campagne</p><p><br></p><ul><li>M.O 17 ouvrier: 285$</li><li>Pénalité machine: 100$</li><li>Motivation: 50 000fc</li></ul><p><br></p><p>TOTAL 355$ + 50 000fc</p><p><br></p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-37]%');
--> statement-breakpoint
INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) SELECT 'Pogramme du 22/09/023 Aliment porc', NOW(), (SELECT new_id FROM legacy_user_map WHERE legacy_uuid='fe9cf6a1-21b7-4adc-a797-561a26fcc534'), NULL, 0, '[LEG-DEVIS-38] <p>6sacs son de blé : 100 000fc</p><p>transport et autres 30 000fc</p><p>total 130 000fc</p>', 'sent', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE '[LEG-DEVIS-38]%');
--> statement-breakpoint

-- === (OPTIONNEL) recablage saleInvoice.userId depuis creator_id legacy ===
-- A activer apres validation. Resout le creator_id de chaque saleInvoice legacy.
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S1';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S2';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S6';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S7';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S8';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S9';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S10';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S11';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S12';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S13';
-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid='28f019f7-64f7-4f15-a46e-ca005c476126') WHERE id='LEG-S14';

