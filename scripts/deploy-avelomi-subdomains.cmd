@echo off
REM Deploiement sous-domaines Avelomi — 4 apps restantes (compta/domus/batipro/rh)
REM Prerequis (deja faits par Claude) : /tmp/<app>-avelomi.tar.gz + /tmp/nginx.avelomi.conf uploades.
REM FarmOS est deja deploye (script deploy-farmos-avelomi-subdomain.cmd).
set KEY=C:\Users\pauln\Downloads\LightsailDefaultKey-us-east-2-3.128.45.29.pem
ssh -i "%KEY%" admin@3.128.45.29 "set -e; for a in comptabilite domus batipro hr; do mkdir -p /tmp/avp-$a && rm -rf /tmp/avp-$a/* && tar -xzf /tmp/$a-avelomi.tar.gz -C /tmp/avp-$a && sudo docker exec nglu_prod_frontend mkdir -p /usr/share/nginx/html-$a-avelomi-prod /usr/share/nginx/html-$a-avelomi-dev && sudo docker cp /tmp/avp-$a/. nglu_prod_frontend:/usr/share/nginx/html-$a-avelomi-prod/ && sudo docker cp /tmp/avp-$a/. nglu_prod_frontend:/usr/share/nginx/html-$a-avelomi-dev/ && echo app $a OK; done && sudo cp /opt/nglu-app/nginx/nginx.frontend.conf /opt/nglu-app/nginx/nginx.frontend.conf.bak-subdomains4 && sudo cp /tmp/nginx.avelomi.conf /opt/nglu-app/nginx/nginx.frontend.conf && sudo docker exec nglu_prod_frontend nginx -t && sudo docker exec nglu_prod_frontend nginx -s reload && echo DEPLOY_OK"
pause
