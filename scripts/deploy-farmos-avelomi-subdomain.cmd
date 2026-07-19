@echo off
REM Deploiement one-shot : farmos.avelomi.com (build base:/ + conf nginx sous-domaines)
REM Prerequis (deja faits par Claude) : /tmp/farmos-avelomi.tar.gz et /tmp/nginx.avelomi.conf uploades sur le serveur.
set KEY=C:\Users\pauln\Downloads\LightsailDefaultKey-us-east-2-3.128.45.29.pem
ssh -i "%KEY%" admin@3.128.45.29 "mkdir -p /tmp/favp && tar -xzf /tmp/farmos-avelomi.tar.gz -C /tmp/favp && sudo docker exec nglu_prod_frontend mkdir -p /usr/share/nginx/html-farmos-avelomi-prod /usr/share/nginx/html-farmos-avelomi-dev && sudo docker cp /tmp/favp/. nglu_prod_frontend:/usr/share/nginx/html-farmos-avelomi-prod/ && sudo docker cp /tmp/favp/. nglu_prod_frontend:/usr/share/nginx/html-farmos-avelomi-dev/ && sudo cp /opt/nglu-app/nginx/nginx.frontend.conf /opt/nglu-app/nginx/nginx.frontend.conf.bak-subdomains && sudo cp /tmp/nginx.avelomi.conf /opt/nglu-app/nginx/nginx.frontend.conf && sudo docker exec nglu_prod_frontend nginx -t && sudo docker exec nglu_prod_frontend nginx -s reload && echo DEPLOY_OK"
pause
