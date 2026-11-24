# Framingham frontend

Statikus, magyar nyelvű oldal, amit Nginx szolgál ki. Az Nginx az `/api/` hívásokat a
backendnek, az `/auth/` hívásokat a Keycloaknak továbbítja, így a böngésző egyetlen címmel beszél.

- index.html – oldalváz: Egyéni becslés, Modelleredmények, Naplóm
- styles.css – reszponzív sötét megjelenés
- app.js – űrlap, nézetek, fejléc (belépés), becslés
- auth.js – bejelentkezés Keycloakkal (keycloak-js, PKCE); ha a Keycloak nem érhető el, vendégként működik tovább
- journal.js – Naplóm: kockázati trend, változás az előző bejegyzéshez, bejegyzések megnyitása és törlése
- fields.js – az űrlap mezői és az értékek megjelenítése
- ui.js – közös segédfüggvények (formázás, modellnevek)
- silent-check-sso.html – a keycloak-js átirányítás nélküli belépés-ellenőrzéséhez
- nginx.conf.template, Dockerfile – Nginx-image; a keycloak-js 26.2.5 a buildben töltődik le az npm-ről (sha512-vel ellenőrizve)

## Futtatás

A backend repó `compose.yaml`-ja építi és indítja (`frontend` szolgáltatás): `http://localhost:8090`.
Módosítás után: `docker compose up -d --build --no-deps frontend`.

## Működés

- **Vendég:** becsülhet, de semmi nem mentődik. A „Példa megtekintése” backend nélkül mutat egy szemléltető eredményt.
- **Bejelentkezve:** minden becslés a naplóba kerül, az űrlap a legutóbbi bejegyzés adataival töltődik ki,
  és a Naplóm fülön látszik a kockázat alakulása és az előző bejegyzéshez mért változás.
- Hibák: `400` → a hibás mezők listája, `401` → lejárt bejelentkezés, hálózati hiba → „A szerver nem érhető el”.
