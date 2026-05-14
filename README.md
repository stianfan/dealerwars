# Loddefjord Dealer

> *Dopewars. But make it Loddefjord.*

A browser-based drug empire simulator set in the mean streets of Loddefjord and greater Bergen municipality. You have 30 days, 2 000 kroner, a debt to a man named Svein, and absolutely zero legitimate career prospects. Good luck.

Built with vanilla HTML, CSS, and JavaScript. No framework. No bundler. No excuses.

---

## [Spill her](https://loddefjord.stian.fan)
http://loddefjord.stian.fan


## Kjør spillet sjøl

Ingen byggsteg. Bare start en lokal server og åpne nettleseren:

```bash
python3 -m http.server 8000
# åpne http://localhost:8000
```

ES-moduler krever HTTP — de nekter å laste fra `file://` som om det var 2003.

---

## Hva er dette egentlig

Du spiller en liten dealer med store drømmer i Loddefjord. Svein har lånt deg 5 500 kr og renten løper 10 % om dagen. Betjent Hardnes er ute etter deg. Du har 30 dager på å bli rik nok til å se ned på folk i Fyllingsdalen.

Kjøp billig. Selg dyrt. Stikk unna politiet.

---

## Nabolag

| Sted | Stemning |
|------|----------|
| **Loddefjord** | Hjemsted. Svein bor her. Banken også. |
| **Laksevåg** | Havnefolk. Billig speed. |
| **Fyllingsdalen** | Kjøpesenter og innbilske priser. |
| **Sentrum** | Dyre saker, fint utvalg, masse politi. |
| **Åsane** | Nordlige forsteder. Gress i overflod. |
| **Nesttun** | Sørlige forsteder. Rabattopioider siden 1987. |

---

## Rusmidler

Tolv varer på markedet. Alt fra hasj til kokain, priset i norske kroner fordi vi er stolt av valutaen vår.

Hash er veldig Bergen. Det er bare slik det er.

---

## Hendelser underveis

Livet som dealer er ikke enkelt. Mellom hvert bytte kan følgende skje:

- **Politirazzia** — prisene på ett stoff skyter i været
- **Flom på markedet** — en leverandør ble litt for ivrig, prisene stuper
- **Betjent Hardnes dukker opp** — kampmodus, lykkelig slutt ikke garantert
- **To gutter med hettegensere** — de vil ha lommeboken din
- **En narkoman fant lageret ditt** — du får narkotika du ikke visste du hadde
- **Billigkupp** — en fyr selger noe til 20 % av normalpris, ingen spørsmål
- **Politiet fryser banken din** — dette er grunnen til at folk ikke stoler på systemet

---

## Kampsystem

Tekstbasert og rettferdig (nei). Velg **Slåss** eller **Stikk** hver runde.

Bevæpnet med en Beretta går det litt bedre. Bevæpnet med ingenting og 40 % treffsikkerhet... vel.

Betjent Hardnes har 70 % treffsikkerhet og ingen medfølelse.

---

## Poengsum og æresbevisninger

```
poeng = kontanter + bank − (gjeld × 2)
```

| Poeng | Tittel |
|-------|--------|
| 250 000+ | Vestkantens verste |
| 100 000–249 999 | Loddefjord-kongen |
| 50 000–99 999 | Lokal legende |
| 10 000–49 999 | Gateselger |
| 0–9 999 | Amatør |
| Under 0 | Gjeld og skam |

De fleste ender med gjeld og skam. Det er OK.

---

## Teknisk

```
dealersim/
├── index.html
├── css/style.css
├── js/
│   ├── data.js     ← alt av tekst og konstantar
│   ├── game.js     ← ren spillogikk
│   ├── ui.js       ← HTML-strenger, ingen logikk
│   ├── sound.js    ← Web Audio API, ingen lydfiler
│   └── main.js     ← G, dispatch(), render()
```

Enkelt dataflytsystem: `klikk → dispatch() → ny G → lagre → render()`. Tilstand lever i `localStorage`. Ingen server, ingen backend, ingen nonsens.

Lyd er prosedyrelt generert med Web Audio API. Det høres ut som det.

---

## Disclaimer

Dette er et spill. Svein er ikke en ekte person. Betjent Hardnes ønsker deg alt godt.
