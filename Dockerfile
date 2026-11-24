FROM nginx:1.27.5-alpine

ENV BACKEND_URL=http://backend:8080 \
    KEYCLOAK_URL=http://keycloak:8080

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY index.html app.js styles.css logo.png /usr/share/nginx/html/

EXPOSE 80
