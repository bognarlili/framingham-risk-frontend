# Framingham frontend

Bontsd ki a ZIP-et, és nyisd meg az index.html fájlt. A Példapáciens betöltése, majd a Kockázat becslése gomb mutatja be az eredménynézetet.

- index.html – magyar nyelvű oldalváz
- styles.css – reszponzív sötét megjelenés
- app.js – űrlap, navigáció és eredménymegjelenítés

## Spring Boot integráció

Az űrlap 15 mezője a Framingham változóneveit használja. Ellenőrizd az iskolázottság és a bináris mezők kódolását a betanított pipeline alapján. A két laborérték mmol/L-ben szerepel. Az API dokumentálja az egységet, és a backend a modell tanítási egységére váltson, ha szükséges.

A submit esemény bemutató ágát váltsa fel a predikciós végpont hívása. A renderResult megjelenítő model, probability (0–1), summary, contributions (mezőnév → előjeles érték), illetve opcionális interpretations mezőket fogad. Ha az EBM interakciós tagokat is visszaad, azok megjelenítését a tényleges modellválasz alapján kell hozzáadni. A magyarázatot a backend generálhatja a modell tényleges hozzájárulásaiból. LLM-integráció esetén a backend hívja a szolgáltatót.

A becslés és a hozzájárulások szemléltető értékek. A Modelleredmények fül a tényleges teszteredmények bekötésére vár.
