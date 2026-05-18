# Installation de NgluERP - Statut de Configuration

**Date:** 7 mai 2026  
**Statut:** ✅ **INSTALLATION COMPLÈTE**

---

## 1. Configuration Docker

### Services Lancés ✅
- **MySQL Database**: Port 3306 - ✅ En cours d'exécution
- **Backend API (Laravel)**: Port 8000 - ⚠️ **DÉPRÉCIÉ** - N'est plus utilisé en production (migration NestJS terminée)
- **Backend2 API (NestJS)**: Port 8001 - ✅ En cours d'exécution (API active)
- **Frontend (React + Vite)**: Port 3000 - ✅ En cours d'exécution
- **Mailpit (Test Email)**: Port 8025 - ✅ En cours d'exécution (sain)

### Commande Exécutée
```bash
docker-compose up -d
```

---

## 2. Configuration Base de Données

### Informations de Connexion
- **Host**: `mysql` (ou `localhost:3306` depuis l'hôte)
- **Database**: `nglu_db`
- **Username**: `nglu_user`
- **Password**: `password`

### Tables Créées ✅
**67 tables** ont été créées avec succès via les migrations Laravel.

---

## 3. Fichiers de Configuration Mis à Jour

### Backend Laravel (.env) ⚠️ DÉPRÉCIÉ
✅ **Fichier**: `backend/.env`
- ✅ `APP_KEY`: Généré automatiquement
- ✅ `DB_HOST`: `mysql` (pour Docker)
- ✅ `DB_PORT`: `3306`
- ✅ `DB_DATABASE`: `nglu_db`
- ✅ `DB_USERNAME`: `nglu_user`
- ✅ `DB_PASSWORD`: `password`
- ✅ `MAIL_HOST`: `mailpit` (pour les tests d'email)
- ⚠️ **Note**: Ce backend n'est plus utilisé en production. Gardé pour référence historique.

### Backend2 NestJS (.env) ✅ ACTIF
✅ **Fichier**: `backend2/.env`
- ✅ `PORT`: `8001`
- ✅ `DB_HOST`: `mysql`
- ✅ `DB_PORT`: `3306`
- ✅ `DB_DATABASE`: `nglu_db`
- ✅ `DB_USERNAME`: `nglu_user`
- ✅ `DB_PASSWORD`: `password`

### Frontend (.env)
✅ **Fichier**: `frontend/.env`
- ✅ `VITE_APP_API`: `http://localhost:8001` (pointe vers NestJS)
- ✅ `VITE_API_URL`: `http://localhost:8000` (Laravel - déprécié)

---

## 4. Migrations Exécutées ✅

Les migrations Laravel suivantes ont été appliquées avec succès:

```
✅ create_personal_access_tokens_table
✅ create_employment_status_table
✅ create_department_table
✅ create_role_table
✅ create_shift_table
✅ create_users_table
✅ create_education_table
✅ create_permission_table
✅ create_role_permission_table
✅ create_designation_table
✅ create_designation_history_table
✅ create_salary_history_table
✅ create_currency_table
✅ create_app_setting_table
✅ create_account_table
✅ create_sub_account_table
✅ create_transaction_table
✅ create_announcement_table
✅ create_award_table
✅ create_award_history_table
✅ create_customer_table
✅ create_quote_table
✅ create_email_config_table
✅ create_email_table
✅ ... et 42 autres tables
```

---

## 5. Accès aux Services

### Backend2 API (NestJS) ✅ API ACTIVE
- **URL**: `http://localhost:8001`
- **Statut**: ✅ En cours d'exécution (API de production)
- **Documentation API (Swagger)**: `http://localhost:8001/api-docs`
- **Health Check**: `http://localhost:8001/health`

### Backend API (Laravel) ⚠️ DÉPRÉCIÉ
- **URL**: `http://localhost:8000`
- **Statut**: ⚠️ N'est plus utilisé en production
- **Documentation API**: `http://localhost:8000/api/documentation`
- **Note**: Migration vers NestJS terminée. Ce service peut être arrêté.

### Frontend Application
- **URL**: `http://localhost:3000`
- **Statut**: ✅ En cours d'exécution

### Test d'Email (Mailpit)
- **URL**: `http://localhost:8025`
- **Statut**: ✅ Sain
- **Usage**: Capturer les emails envoyés par l'application

### Base de Données MySQL
- **Host**: `localhost:3306`
- **Database**: `nglu_db`
- **Outils recommandés**: 
  - MySQL Workbench
  - TablePlus
  - DBeaver

---

## 6. Commandes Utiles

### Arrêter les services
```bash
docker-compose down
```

### Redémarrer les services
```bash
docker-compose restart
```

### Voir les logs
```bash
# Tous les services
docker-compose logs -f

# Backend uniquement
docker-compose logs -f backend

# Frontend uniquement
docker-compose logs -f frontend
```

### Réinitialiser la base de données
```bash
docker-compose exec backend php artisan migrate:fresh --seed
```

### Accéder au shell du backend
```bash
docker-compose exec backend bash
```

### Accéder au shell du frontend
```bash
docker-compose exec frontend sh
```

### Sauvegarder la base de données
```bash
docker-compose exec mysql mysqldump -u nglu_user -ppassword nglu_db > backup.sql
```

---

## 7. Prochaines Étapes

### ✅ Étapes Complétées
1. ✅ Installation des dépendances Composer
2. ✅ Génération de la clé Laravel
3. ✅ Création de la base de données
4. ✅ Exécution des migrations (67 tables)
5. ✅ Démarrage des services Docker
6. ✅ **Migration NestJS terminée** - Le backend2 est maintenant l'API de production

### ⚠️ Important - Migration Backend
- **Backend Laravel (port 8000)**: N'est plus utilisé en production
- **Backend NestJS (port 8001)**: Est l'API active pour toutes les nouvelles fonctionnalités
- **Base de données**: Le schéma Laravel (67 tables) est toujours utilisé par NestJS via Drizzle ORM

### 📋 Étapes Suggérées
1. **Vérifier l'API NestJS**: Accéder à `http://localhost:8001/api-docs` (Swagger)
2. **Accéder au Frontend**: Accéder à `http://localhost:3000`
3. **Configuration initiale**: Ajouter les utilisateurs administrateur
4. **Seeders NestJS (optionnel)**: Remplir la base de données avec des données de test
   ```bash
   docker-compose exec backend2 npm run db:seed
   ```
5. **Tests**: Lancer les tests automatisés si disponibles
6. **Nettoyage (optionnel)**: Arrêter le backend Laravel s'il n'est plus nécessaire
   ```bash
   docker stop nglu_backend
   ```

---

## 8. Support & Documentation

- **Installation Guide PDF**: `Documentation/OS-PRO-Local-Installation-Guide.pdf`
- **Docker Setup Guide**: `DOCKER_SETUP.md`
- **Makefile Commands**: Consultez `Makefile` pour les commandes rapides

---

**Installation réussie! 🎉**  
Tous les services sont prêts à l'emploi.

---

## 9. ⚠️ Note Importante - Migration Backend

**Statut de la migration Laravel → NestJS:**
- ✅ **Migration terminée** - Le backend NestJS (port 8001) est maintenant l'API de production
- ⚠️ **Backend Laravel (port 8000)** - N'est plus utilisé pour les nouvelles fonctionnalités
- ✅ **Base de données** - Le schéma Laravel (67 tables) est préservé et utilisé par NestJS

**Pour les développeurs:**
- Toutes les nouvelles API doivent être développées dans `backend2/` (NestJS)
- Le frontend pointe vers `http://localhost:8001` (NestJS) par défaut
- Consulter `backend2/README.md` pour la liste complète des endpoints NestJS

**Pour plus de détails, voir:**
- `backend2/README.md` - Documentation complète du backend NestJS
- `DEPLOY.md` - Guide de déploiement avec les deux backends
