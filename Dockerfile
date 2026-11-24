# keycloak-js (the official Keycloak browser adapter) from the npm registry, pinned and
# checked against its published sha512, so the page needs no CDN at runtime.
FROM nginx:1.27.5-alpine AS vendor

ARG KEYCLOAK_JS_VERSION=26.2.5
ARG KEYCLOAK_JS_SHA512=89347786661794665b053b2482bd8fac621f2332ebb6cf27c236b6f83d605ba43f4bcdc2e3ceeb84cf96bcf57d771a97bfcd4dd10c0d1bd04900ceb478343563
RUN wget -q -O /tmp/keycloak-js.tgz \
        "https://registry.npmjs.org/keycloak-js/-/keycloak-js-${KEYCLOAK_JS_VERSION}.tgz" \
    && echo "${KEYCLOAK_JS_SHA512}  /tmp/keycloak-js.tgz" | sha512sum -c - \
    && tar -xzf /tmp/keycloak-js.tgz -C /tmp

FROM nginx:1.27.5-alpine

ENV BACKEND_URL=http://backend:8080 \
    KEYCLOAK_URL=http://keycloak:8080

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY *.html *.js *.css *.png /usr/share/nginx/html/
# The whole lib folder: keycloak.js imports its sibling modules (e.g. deprecations.js).
COPY --from=vendor /tmp/package/lib/ /usr/share/nginx/html/vendor/

EXPOSE 80
