# Front statique HTML/CSS/JS : servi directement par nginx
FROM nginx:alpine

# Le contexte de build est le dossier public/ : on copie tout son contenu
COPY . /usr/share/nginx/html

# nginx écoute sur le port 80 dans le conteneur
EXPOSE 80
