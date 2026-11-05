// S1.9: the French (Canada) wording of src/lib (see words.ts). JP reviews the French.
import type { DescribeWords, LibWords } from "./words";

const plural = (n: number, one: string, many: string) => `${n} ${n <= 1 ? one : many}`;
// hours arrive as "2.5" (fmtH); French writes a decimal comma: "2,5"
const c = (h: string) => h.replace(".", ",");

const DESCRIBE_FR: DescribeWords = {
  noTicks: (n) => `Aucun bloc ${n} coché.`,
  floorMet: (n, d, min) => `${n} a atteint votre plancher (${c(d)} h sur ${c(min)} h).`,
  floorShort: (n, d, min) => `${n} était sous votre plancher (${c(d)} h sur ${c(min)} h).`,
  ceilingWithin: (n, d, max) => `${n} est resté sous votre plafond (${c(d)} h sur ${c(max)} h).`,
  ceilingOver: (n, o, d, max) => `${n} a dépassé votre plafond de ${c(o)} h (${c(d)} h sur ${c(max)} h).`,
  rangeIn: (n, d, min, max) => `${n} est dans votre fourchette (${c(d)} h, ${c(min)} à ${c(max)} h).`,
  rangeShort: (n, d, min, max) => `${n} était sous votre fourchette (${c(d)} h, ${c(min)} à ${c(max)} h).`,
  rangeOver: (n, o, d, max) => `${n} a dépassé votre fourchette de ${c(o)} h (${c(d)} h sur ${c(max)} h).`,
};

export const LIB_FR: LibWords = {
  lang: "fr",
  days: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."],
  limit: {
    floor: (h) => `Plancher ${c(h)} h`,
    ceiling: (h) => `Plafond ${c(h)} h`,
    range: (lo, hi) => `Fourchette ${c(lo)} à ${c(hi)} h`,
  },
  balance: {
    floor: (p, min) => `${c(p)} h sur ${c(min)} h`,
    ceiling: (p, max) => `${c(p)} h sur ${c(max)} h max.`,
    inRange: (p) => `${c(p)} h, dans la fourchette`,
    rangeShort: (p, lo, hi) => `${c(p)} h sur ${c(lo)} à ${c(hi)} h`,
    rangeOver: (p, hi) => `${c(p)} h, au-delà de ${c(hi)} h`,
  },
  note: {
    thisArea: "Ce domaine",
    short: (who, range) => `${who} est sous votre ${range ? "fourchette" : "plancher"} cette semaine.`,
    over: (who, h, range) => `${who} dépasse votre ${range ? "fourchette" : "plafond"} de ${c(h)} h cette semaine.`,
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
  now: {
    left: (h, m) => (!h ? `encore ${m} min` : m ? `encore ${h} h ${String(m).padStart(2, "0")}` : `encore ${h} h`),
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
