// S1.9: the French (Canada) wording of src/lib (see words.ts). JP reviews the French.
import type { DescribeWords, LibWords } from "./words";

const plural = (n: number, one: string, many: string) => `${n} ${n <= 1 ? one : many}`;
// durations arrive already written the French way: « 1,5 » on screen, « 1,5 h » in sentences

const DESCRIBE_FR: DescribeWords = {
  lang: "fr",
  noTicks: (n) => `Aucun bloc ${n} coché.`,
  floorMet: (n, d, min) => `${n} : au moins ${min} atteintes (${d}).`,
  floorShort: (n, d, min) => `${n} : sous les ${min} visées (${d}).`,
  ceilingWithin: (n, d, max) => `${n} : dans la limite de ${max} (${d}).`,
  ceilingOver: (n, o, d, max) => `${n} : ${o} au-delà de ${max} (${d}).`,
  rangeIn: (n, d, min, max) => `${n} : entre ${min} et ${max} (${d}).`,
  rangeShort: (n, d, min, max) => `${n} : sous les ${min} à ${max} visées (${d}).`,
  rangeOver: (n, o, d, max) => `${n} : ${o} au-delà de ${max} (${d}).`,
};

/** « 0,5 bloc », « 1 bloc », « 1,5 bloc », « 2 blocs » (decimal comma, like the hours) */

export const LIB_FR: LibWords = {
  lang: "fr",
  days: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."],
  limit: {
    floor: (h) => `Au moins ${h}`,
    ceiling: (h) => `Au plus ${h}`,
    range: (lo, hi) => `Entre ${lo} et ${hi}`,
  },
  describe: DESCRIBE_FR,
  summary: {
    categories: (n) => plural(n, "domaine", "domaines"),
    blocks: (n) => `${plural(n, "bloc", "blocs")} sur les deux semaines`,
    templates: (n) => plural(n, "modèle", "modèles"),
    sessions: (n) => plural(n, "séance notée", "séances notées"),
    streaks: (n) => plural(n, "série", "séries"),
    tasks: (n) => plural(n, "tâche", "tâches"),
    dropped: (n) => `${plural(n, "entrée ignorée", "entrées ignorées")} : elles ne semblaient pas valides.`,
  },
  sync: {
    badge: { synced: "synchronisé", syncing: "synchro…", offline: "hors ligne", error: "erreur de synchro" },
    sentence: {
      synced: "Tout est synchronisé.",
      syncing: "Enregistrement des changements…",
      offline: "Hors ligne. Les changements sont gardés sur cet appareil et se synchroniseront plus tard.",
      error:
        "Impossible de joindre votre compte. Les changements sont gardés sur cet appareil et se synchroniseront plus tard.",
    },
    auth: {
      invalid_code: "Ce code n'a pas fonctionné. Réessayez ou demandez-en un nouveau.",
      rate_limited: "Trop de courriels pour l'instant. Réessayez dans une heure.",
      offline: "Vous êtes hors ligne. Connectez-vous et réessayez.",
      failed: "Quelque chose n'a pas fonctionné. Réessayez.",
    },
  },
  count: {
    toGo: (d) => `encore ${d}`,
    room: (d) => `reste ${d}`,
    over: (d) => `${d} de trop`,
    short: (d) => `il manque ${d}`,
    above: (d) => `${d} de plus`,
    atLimit: "à la limite",
    reached: "atteint",
    inRange: "entre les deux",
  },
  now: {
    left: (d) => `encore ${d}`,
  },
  panel: { untitled: "Sans nom", buffer: "Tampon", nextWeek: "semaine prochaine", backFrom: (d) => `revenue de ${d}` },
  welcome: {
    replaces: (n) => `Cela remplace ${n === 1 ? "le bloc" : `les ${n} blocs`} de la semaine 1.`,
  },
  starters: {
    added: (list) => `Ajoute ${list} à vos domaines.`,
    and: "et",
    names: {
      "starter-work": {
        name: "Semaine chargée au travail",
        blurb: "Une pleine semaine de travail qui protège quand même les soirées et un après-midi de fin de semaine.",
      },
      "starter-family": {
        name: "Semaine en famille",
        blurb: "Des journées de travail plus courtes, du temps avec vos proches après l'école et la fin de semaine.",
      },
      "starter-recovery": {
        name: "Semaine de récupération",
        blurb:
          "Une semaine plus légère pour refaire le plein : moins de travail, plus de repos, du mouvement en douceur.",
      },
    },
    areas: { work: "Travail", rest: "Repos", people: "Proches", exercise: "Exercice" },
    labels: { windDown: "Décompresser", walk: "Marche" },
  },
};
