export type Unit = 'g' | 'ml' | 'pc' | 'cs' | 'cc' | 'tr';
export interface Ingredient { n: string; u: Unit; r: string; c: string; e: string }

export const RAYONS = ['Viandes & poissons', 'Œufs & produits laitiers', 'Féculents & légumineuses', 'Fruits & légumes', 'Épicerie'];
const VP = RAYONS[0], OL = RAYONS[1], FL = RAYONS[2], FV = RAYONS[3], EP = RAYONS[4];

// c = couleur de l'illustration, e = pictogramme
export const ING: Record<string, Ingredient> = {
  poulet: { n: 'Blanc de poulet', u: 'g', r: VP, c: '#D9A066', e: '🍗' },
  dinde: { n: 'Escalope de dinde', u: 'g', r: VP, c: '#CFA07A', e: '🍖' },
  saumon: { n: 'Pavé de saumon', u: 'g', r: VP, c: '#F28C6F', e: '🐟' },
  thon: { n: 'Thon au naturel (égoutté)', u: 'g', r: VP, c: '#C98F86', e: '🐟' },
  oeuf: { n: 'Œufs', u: 'pc', r: OL, c: '#F4D35E', e: '🥚' },
  fromageBlanc: { n: 'Fromage blanc', u: 'g', r: OL, c: '#F3EFE6', e: '🥛' },
  yaourt: { n: 'Yaourt nature', u: 'pc', r: OL, c: '#EFEBDF', e: '🥛' },
  lait: { n: 'Lait (ou boisson végétale)', u: 'ml', r: OL, c: '#EDEAE2', e: '🥛' },
  riz: { n: 'Riz (poids cru)', u: 'g', r: FL, c: '#EFE8D8', e: '🍚' },
  pates: { n: 'Pâtes (poids cru)', u: 'g', r: FL, c: '#E8C87A', e: '🍝' },
  pdt: { n: 'Pommes de terre', u: 'g', r: FL, c: '#D8B56A', e: '🥔' },
  avoine: { n: "Flocons d'avoine", u: 'g', r: FL, c: '#D9C29A', e: '🌾' },
  lentilles: { n: 'Lentilles (poids sec)', u: 'g', r: FL, c: '#B5763A', e: '🫘' },
  poisChiches: { n: 'Pois chiches (égouttés)', u: 'g', r: FL, c: '#D6B37A', e: '🫘' },
  pain: { n: 'Pain complet', u: 'tr', r: FL, c: '#B98850', e: '🍞' },
  haricots: { n: 'Haricots verts', u: 'g', r: FV, c: '#5BA868', e: '🫛' },
  brocoli: { n: 'Brocolis', u: 'g', r: FV, c: '#3F9B57', e: '🥦' },
  carotte: { n: 'Carottes', u: 'g', r: FV, c: '#F08A3C', e: '🥕' },
  banane: { n: 'Bananes', u: 'pc', r: FV, c: '#F3D45B', e: '🍌' },
  pomme: { n: 'Pommes', u: 'pc', r: FV, c: '#D9534F', e: '🍎' },
  fruitsRouges: { n: 'Fruits rouges (frais ou surgelés)', u: 'g', r: FV, c: '#B8324F', e: '🫐' },
  fruit: { n: 'Fruit de saison', u: 'pc', r: FV, c: '#F2A541', e: '🍊' },
  oignon: { n: 'Oignon', u: 'pc', r: FV, c: '#D8C3A5', e: '🧅' },
  citron: { n: 'Citron', u: 'pc', r: FV, c: '#F1E05A', e: '🍋' },
  tomate: { n: 'Tomates concassées', u: 'g', r: EP, c: '#D8432F', e: '🍅' },
  huile: { n: "Huile d'olive", u: 'cs', r: EP, c: '#B7B04A', e: '🫒' },
  fruitsSecs: { n: 'Fruits secs (amandes, noix, raisins)', u: 'g', r: EP, c: '#9C6B3F', e: '🥜' },
  miel: { n: 'Miel', u: 'cc', r: EP, c: '#E3A63B', e: '🍯' },
  epices: { n: 'Épices (curry, paprika, cannelle)', u: 'cc', r: EP, c: '#C96A2B', e: '🧂' },
  compote: { n: 'Compote sans sucre ajouté', u: 'pc', r: EP, c: '#E0B25C', e: '🍏' },
};

export type Dish = 'assiette' | 'bol' | 'boite' | 'verre';
export interface Recipe {
  id: string;
  name: string;
  tags: string[]; // pdj, pdjLeger, col, box, repas, pre, leger
  prep: number; // minutes
  dish: Dish;
  ing: [string, number][];
  steps: string[];
  swaps: string[];
}

const r = (id: string, name: string, tags: string[], prep: number, dish: Dish, ing: [string, number][], steps: string[], swaps: string[]): Recipe =>
  ({ id, name, tags, prep, dish, ing, steps, swaps });

export const RECIPES: Recipe[] = [
  // ——— Petits-déjeuners ———
  r('porridge', 'Porridge avoine, banane et fruits secs', ['pdj'], 7, 'bol',
    [['avoine', 70], ['lait', 250], ['banane', 1], ['fruitsSecs', 20], ['miel', 1]],
    ["Verse les flocons et le lait dans une casserole.", "Cuis 4 à 5 minutes à feu moyen en remuant.", "Ajoute la banane en rondelles, les fruits secs et le miel."],
    ["Lait → eau ou boisson végétale", "Banane → pomme râpée", "À préparer la veille pour le poste du matin : micro-ondes 2 minutes"]),
  r('omelette-pain', 'Omelette 3 œufs, pain complet et fruit', ['pdj'], 8, 'assiette',
    [['oeuf', 3], ['pain', 2], ['fruit', 1], ['huile', 0.5]],
    ["Bats les œufs avec une pincée de sel.", "Cuis l'omelette 3 minutes dans une poêle huilée.", "Sers avec le pain grillé et le fruit."],
    ["Pain → flocons d'avoine (50 g) dans les œufs pour une omelette épaisse", "Fruit → compote"]),
  r('bowl-fromage-blanc', 'Bol fromage blanc, avoine et fruits rouges', ['pdj'], 4, 'bol',
    [['fromageBlanc', 250], ['avoine', 50], ['fruitsRouges', 100], ['miel', 1], ['fruitsSecs', 15]],
    ["Verse le fromage blanc dans un bol.", "Ajoute les flocons, les fruits rouges et les fruits secs.", "Termine avec le miel."],
    ["Fromage blanc → 2 yaourts nature", "Fruits rouges → banane ou pomme"]),
  r('pancakes', 'Pancakes avoine-banane', ['pdj'], 12, 'assiette',
    [['avoine', 60], ['oeuf', 2], ['banane', 1], ['yaourt', 1], ['miel', 1]],
    ["Mixe les flocons, les œufs et la banane.", "Cuis des petits pancakes 2 minutes par face.", "Sers avec le yaourt et le miel."],
    ["À cuire en avance : se gardent 2 jours au frais", "Yaourt → fromage blanc"]),
  r('oeufs-brouilles', 'Tartines aux œufs brouillés', ['pdj'], 7, 'assiette',
    [['oeuf', 3], ['pain', 2], ['huile', 0.5], ['pomme', 1]],
    ["Fais griller le pain.", "Brouille les œufs à feu doux 2 à 3 minutes.", "Dépose sur les tartines, sers avec la pomme."],
    ["Pomme → banane", "Ajoute une tranche de saumon si tu as très faim"]),
  r('overnight-oats', 'Overnight oats yaourt, pomme et cannelle', ['pdj'], 5, 'bol',
    [['avoine', 70], ['yaourt', 1], ['lait', 120], ['pomme', 1], ['epices', 0.5], ['fruitsSecs', 15]],
    ["La veille, mélange flocons, yaourt, lait et cannelle.", "Laisse au frais toute la nuit.", "Au réveil, ajoute la pomme en dés et les fruits secs."],
    ["Prêt en sortant du lit : idéal pour le réveil de 04h15", "Pomme → fruits rouges"]),
  // ——— Petits-déjeuners légers (retour de nuit) ———
  r('yaourt-banane', 'Yaourt nature, banane et amandes', ['pdjLeger', 'col'], 2, 'bol',
    [['yaourt', 1], ['banane', 1], ['fruitsSecs', 15]],
    ["Coupe la banane dans le yaourt.", "Ajoute les amandes."],
    ["Banane → compote", "Yaourt → fromage blanc"]),
  r('fromage-blanc-compote', 'Fromage blanc, compote et miel', ['pdjLeger', 'col', 'leger'], 2, 'bol',
    [['fromageBlanc', 200], ['compote', 1], ['miel', 1]],
    ["Mélange le fromage blanc et la compote.", "Ajoute un filet de miel."],
    ["Compote → fruit frais", "Très digeste avant de dormir"]),
  r('tartine-oeuf-dur', 'Tartine, œuf dur et fruit', ['pdjLeger', 'col'], 3, 'assiette',
    [['pain', 1], ['oeuf', 1], ['fruit', 1]],
    ["Écale l'œuf dur (cuit 9 minutes, à préparer d'avance).", "Sers avec la tartine et le fruit."],
    ["Cuis 6 œufs durs d'un coup : ils se gardent 5 jours", "Pain → 30 g de flocons dans un yaourt"]),
  // ——— Collations ———
  r('fromage-blanc-fruits-secs', 'Fromage blanc et fruits secs', ['col'], 2, 'bol',
    [['fromageBlanc', 200], ['fruitsSecs', 25]],
    ["Verse le fromage blanc dans un bol ou une boîte.", "Ajoute les fruits secs."],
    ["Fromage blanc → yaourt nature", "Se transporte dans un petit pot fermé"]),
  r('yaourt-fruit-avoine', 'Yaourt, fruit et flocons', ['col'], 2, 'bol',
    [['yaourt', 1], ['fruit', 1], ['avoine', 30]],
    ["Mélange le yaourt et les flocons.", "Ajoute le fruit coupé."],
    ["Fruit → compote", "Flocons → fruits secs"]),
  r('banane-amandes', 'Banane et poignée d’amandes', ['col'], 1, 'assiette',
    [['banane', 1], ['fruitsSecs', 30]],
    ["Rien à préparer : glisse-les dans ton sac."],
    ["Banane → pomme", "Parfait 45 à 60 minutes avant un entraînement"]),
  r('oeufs-durs-fruit', 'Œufs durs et fruit', ['col'], 2, 'assiette',
    [['oeuf', 2], ['fruit', 1]],
    ["Écale les œufs durs préparés d'avance.", "Mange avec le fruit."],
    ["Œufs → 100 g de thon sur une tartine", "Se garde sans souci dans un casier"]),
  r('tartine-thon', 'Tartines au thon et fromage blanc', ['col'], 4, 'assiette',
    [['pain', 2], ['thon', 70], ['fromageBlanc', 40], ['citron', 0.25]],
    ["Écrase le thon avec le fromage blanc et un peu de citron.", "Tartine sur le pain."],
    ["Thon → œuf dur écrasé", "À préparer le jour même"]),
  r('pomme-fruits-secs', 'Pomme, yaourt et fruits secs', ['col'], 2, 'bol',
    [['pomme', 1], ['yaourt', 1], ['fruitsSecs', 20]],
    ["Coupe la pomme en quartiers.", "Accompagne du yaourt et des fruits secs."],
    ["Pomme → fruit de saison", "Yaourt → fromage blanc"]),
  r('smoothie', 'Smoothie banane, avoine et lait', ['col', 'pre'], 4, 'verre',
    [['banane', 1], ['avoine', 40], ['lait', 300], ['miel', 1]],
    ["Mixe tous les ingrédients 30 secondes.", "Bois frais, ou emporte-le dans une gourde."],
    ["Lait → yaourt + eau", "Ajoute 100 g de fromage blanc pour plus de protéines"]),
  r('houmous-carottes', 'Houmous maison et bâtonnets de carotte', ['col'], 8, 'bol',
    [['poisChiches', 120], ['carotte', 150], ['huile', 1], ['citron', 0.5]],
    ["Mixe les pois chiches avec l'huile, le citron et un peu d'eau.", "Coupe les carottes en bâtonnets.", "Trempe et croque."],
    ["Houmous maison → houmous du commerce", "Ajoute une tranche de pain si tu as faim"]),
  // ——— Repas transportables (boîte) ———
  r('poulet-riz-brocoli', 'Poulet, riz et brocolis', ['box', 'repas'], 25, 'boite',
    [['poulet', 160], ['riz', 90], ['brocoli', 200], ['huile', 1]],
    ["Cuis le riz 10 à 12 minutes.", "Fais dorer le poulet en morceaux 8 minutes à la poêle.", "Cuis les brocolis 5 minutes à la vapeur ou à l'eau.", "Assemble, ajoute l'huile d'olive, sale et poivre."],
    ["Poulet → dinde", "Brocolis → haricots verts", "Cuisine 3 portions d'un coup pour les postes suivants"]),
  r('dinde-pates-haricots', 'Dinde, pâtes complètes et haricots verts', ['box', 'repas'], 20, 'boite',
    [['dinde', 160], ['pates', 100], ['haricots', 200], ['huile', 1]],
    ["Cuis les pâtes selon le paquet.", "Saisis la dinde en lamelles 6 à 7 minutes.", "Réchauffe ou cuis les haricots verts.", "Mélange le tout avec l'huile d'olive."],
    ["Dinde → poulet ou thon", "Haricots → brocolis"]),
  r('salade-riz-thon', 'Salade de riz au thon, œuf et carottes', ['box', 'repas'], 20, 'boite',
    [['riz', 90], ['thon', 120], ['oeuf', 1], ['carotte', 120], ['huile', 1], ['citron', 0.5]],
    ["Cuis le riz et laisse-le refroidir.", "Râpe les carottes, coupe l'œuf dur.", "Mélange avec le thon, l'huile et le citron."],
    ["Se mange froid : pas besoin de micro-ondes", "Thon → poulet froid"]),
  r('saumon-pdt-haricots', 'Saumon, pommes de terre et haricots verts', ['box', 'repas'], 25, 'boite',
    [['saumon', 140], ['pdt', 300], ['haricots', 200], ['huile', 0.5], ['citron', 0.5]],
    ["Cuis les pommes de terre en morceaux 15 minutes à l'eau.", "Cuis le saumon 4 minutes par face à la poêle.", "Ajoute les haricots verts 5 minutes en fin de cuisson des pommes de terre.", "Arrose de citron."],
    ["Saumon → thon ou œufs", "Pommes de terre → riz"]),
  r('dahl-lentilles', 'Dahl de lentilles et riz', ['box', 'repas'], 30, 'bol',
    [['lentilles', 90], ['riz', 70], ['tomate', 150], ['oignon', 0.5], ['carotte', 100], ['epices', 1], ['huile', 1]],
    ["Fais revenir l'oignon et la carotte en dés avec le curry.", "Ajoute les lentilles, la tomate et 300 ml d'eau.", "Laisse mijoter 20 minutes.", "Sers avec le riz."],
    ["Plat végétarien très économique", "Ajoute un œuf dur pour plus de protéines", "Se congèle très bien"]),
  r('salade-pates-poulet', 'Salade de pâtes, poulet et brocolis', ['box', 'repas'], 20, 'boite',
    [['pates', 100], ['poulet', 150], ['brocoli', 150], ['huile', 1], ['citron', 0.5]],
    ["Cuis les pâtes, ajoute les brocolis les 4 dernières minutes.", "Fais dorer le poulet en dés.", "Mélange, assaisonne d'huile et de citron."],
    ["Bon chaud comme froid", "Poulet → thon"]),
  r('bowl-pois-chiches', 'Bol pois chiches rôtis, carottes, riz et œuf', ['box', 'repas'], 25, 'bol',
    [['poisChiches', 200], ['carotte', 150], ['riz', 80], ['oeuf', 1], ['huile', 1], ['epices', 1]],
    ["Rôtis pois chiches et carottes 15 minutes à la poêle avec le paprika.", "Cuis le riz.", "Ajoute un œuf dur ou au plat."],
    ["Œuf → 100 g de thon", "Riz → pommes de terre"]),
  r('dinde-pdt-carottes', 'Émincé de dinde, pommes de terre et carottes', ['box', 'repas'], 25, 'boite',
    [['dinde', 160], ['pdt', 300], ['carotte', 150], ['huile', 1]],
    ["Coupe pommes de terre et carottes en dés, cuis 15 minutes à l'eau.", "Saisis la dinde 6 minutes.", "Fais sauter le tout 2 minutes avec l'huile."],
    ["Dinde → poulet", "Carottes → haricots verts"]),
  r('salade-lentilles-thon', 'Salade de lentilles, thon et œuf', ['box', 'repas', 'leger'], 25, 'boite',
    [['lentilles', 80], ['thon', 120], ['oeuf', 1], ['carotte', 80], ['huile', 1], ['citron', 0.5]],
    ["Cuis les lentilles 20 minutes, égoutte et refroidis.", "Ajoute le thon, l'œuf dur et la carotte râpée.", "Assaisonne."],
    ["Lentilles en conserve → prêt en 5 minutes", "Thon → saumon cuit émietté"]),
  r('curry-poulet-pois-chiches', 'Curry de poulet aux pois chiches et riz', ['box', 'repas'], 25, 'bol',
    [['poulet', 150], ['poisChiches', 100], ['riz', 80], ['tomate', 150], ['oignon', 0.5], ['epices', 1], ['huile', 1]],
    ["Fais revenir l'oignon et le poulet avec le curry.", "Ajoute tomate et pois chiches, mijote 10 minutes.", "Sers avec le riz."],
    ["Poulet → dinde", "Version végétarienne : double les pois chiches"]),
  // ——— Repas à la maison ———
  r('saumon-riz-brocoli', 'Saumon au four, riz et brocolis', ['repas'], 25, 'assiette',
    [['saumon', 150], ['riz', 90], ['brocoli', 200], ['huile', 0.5], ['citron', 0.5]],
    ["Enfourne le saumon 12 minutes à 200 °C.", "Cuis le riz.", "Cuis les brocolis 5 minutes à la vapeur.", "Arrose de citron."],
    ["Saumon → 3 œufs au plat", "Riz → pommes de terre"]),
  r('tortilla', 'Tortilla aux pommes de terre et haricots verts', ['repas'], 25, 'assiette',
    [['oeuf', 3], ['pdt', 300], ['oignon', 0.5], ['haricots', 150], ['huile', 1]],
    ["Fais dorer pommes de terre en fines tranches et oignon 12 minutes.", "Verse les œufs battus, cuis 5 minutes à couvert.", "Sers avec les haricots verts."],
    ["Se mange froide le lendemain", "Haricots → carottes râpées"]),
  r('pates-thon-tomate', 'Pâtes au thon et à la tomate', ['repas', 'pre'], 15, 'assiette',
    [['pates', 110], ['thon', 120], ['tomate', 150], ['huile', 1]],
    ["Cuis les pâtes.", "Réchauffe la tomate avec le thon 5 minutes.", "Mélange et ajoute l'huile d'olive."],
    ["Thon → dinde hachée", "Prêt en 15 minutes : parfait un soir de fatigue"]),
  r('poulet-pdt-carottes', 'Poulet poêlé, pommes de terre au four et carottes', ['repas'], 35, 'assiette',
    [['poulet', 170], ['pdt', 350], ['carotte', 150], ['huile', 1], ['epices', 0.5]],
    ["Enfourne pommes de terre et carottes en quartiers 30 minutes à 200 °C avec l'huile.", "Poêle le poulet 8 minutes avec le paprika.", "Sers ensemble."],
    ["Poulet → dinde", "Double la plaque : les restes font une boîte pour le travail"]),
  r('dinde-puree-haricots', 'Dinde, purée pomme de terre-carotte et haricots verts', ['repas'], 30, 'assiette',
    [['dinde', 170], ['pdt', 300], ['carotte', 100], ['haricots', 150], ['lait', 50], ['huile', 0.5]],
    ["Cuis pommes de terre et carottes 18 minutes, écrase avec le lait.", "Poêle la dinde 6 minutes.", "Réchauffe les haricots verts."],
    ["Dinde → saumon", "Lait → un filet d'huile d'olive"]),
  r('riz-saute', 'Riz sauté au poulet, œuf et légumes', ['repas', 'box'], 20, 'bol',
    [['riz', 90], ['poulet', 120], ['oeuf', 1], ['carotte', 100], ['haricots', 100], ['huile', 1]],
    ["Fais sauter le poulet et les légumes en dés 6 minutes.", "Ajoute le riz cuit (idéalement de la veille).", "Casse l'œuf, mélange 2 minutes."],
    ["Idéal pour finir les restes de riz", "Poulet → dinde ou thon"]),
  // ——— Avant l'entraînement (digeste) ———
  r('riz-thon-express', 'Petit bol riz-thon express', ['pre'], 12, 'bol',
    [['riz', 70], ['thon', 80], ['huile', 0.5], ['fruit', 1]],
    ["Cuis le riz (ou réchauffe un reste).", "Ajoute le thon et un filet d'huile.", "Termine par le fruit."],
    ["Portion volontairement modérée : tu t'entraînes dans l'heure", "Thon → dinde froide"]),
  r('pates-dinde-leger', 'Pâtes à l’huile d’olive et dinde', ['pre'], 15, 'assiette',
    [['pates', 80], ['dinde', 100], ['huile', 1], ['banane', 1]],
    ["Cuis les pâtes.", "Poêle la dinde en lamelles.", "Mélange avec l'huile. Banane en dessert."],
    ["Pâtes → riz", "Si tu as peu faim : la banane et un yaourt suffisent"]),
  r('tartines-banane-miel', 'Tartines banane-miel et yaourt', ['pre', 'col'], 4, 'assiette',
    [['pain', 2], ['banane', 1], ['miel', 1], ['yaourt', 1]],
    ["Écrase la banane sur le pain.", "Ajoute le miel.", "Accompagne du yaourt."],
    ["Très digeste, passe bien même à 30 minutes du tapis", "Pain → 50 g de flocons dans le yaourt"]),
  r('avoine-fromage-blanc-banane', 'Avoine, fromage blanc et banane', ['pre', 'col'], 3, 'bol',
    [['avoine', 50], ['fromageBlanc', 150], ['banane', 1]],
    ["Mélange les flocons et le fromage blanc.", "Ajoute la banane en rondelles."],
    ["Banane → compote", "Fromage blanc → yaourt"]),
  // ——— Repas légers (fin de poste, avant de dormir) ———
  r('veloute-carottes-lentilles', 'Velouté carottes-lentilles', ['leger'], 25, 'bol',
    [['carotte', 250], ['lentilles', 50], ['oignon', 0.5], ['huile', 0.5], ['epices', 0.5]],
    ["Fais revenir l'oignon, ajoute carottes et lentilles.", "Couvre d'eau, cuis 20 minutes.", "Mixe."],
    ["À préparer en grande quantité et à congeler en portions", "Ajoute une tartine si tu as faim"]),
  r('omelette-haricots', 'Omelette 2 œufs et haricots verts', ['leger'], 8, 'assiette',
    [['oeuf', 2], ['haricots', 150], ['huile', 0.5]],
    ["Réchauffe les haricots verts à la poêle.", "Verse les œufs battus, cuis 3 minutes."],
    ["Haricots → brocolis", "Léger et rapide en rentrant à 23h"]),
  r('fromage-blanc-fruits-noix', 'Fromage blanc, fruit et noix', ['leger', 'col'], 2, 'bol',
    [['fromageBlanc', 200], ['fruit', 1], ['fruitsSecs', 15]],
    ["Coupe le fruit dans le fromage blanc.", "Ajoute les noix."],
    ["Fruit → compote", "À sauter sans problème si tu n'as pas faim"]),
  r('salade-pdt-thon', 'Petite salade pommes de terre-thon', ['leger'], 15, 'assiette',
    [['pdt', 200], ['thon', 80], ['haricots', 100], ['huile', 0.5]],
    ["Cuis les pommes de terre en dés 12 minutes (ou utilise un reste).", "Ajoute le thon et les haricots verts.", "Assaisonne."],
    ["Thon → œuf dur", "Se prépare avant de partir au poste"]),
];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((x) => [x.id, x]));

export function recipesFor(tags: string[]): Recipe[] {
  // Respecte l'ordre de priorité des tags (ex. ['repas','box'] → d'abord les « repas » purs)
  const out: Recipe[] = [];
  for (const t of tags) for (const x of RECIPES) if (x.tags[0] === t && !out.includes(x)) out.push(x);
  for (const t of tags) for (const x of RECIPES) if (x.tags.includes(t) && !out.includes(x)) out.push(x);
  return out;
}

const UNIT_LABEL: Record<Unit, [string, string]> = {
  g: ['g', 'g'], ml: ['ml', 'ml'], pc: ['', ''], cs: ['c. à soupe', 'c. à soupe'], cc: ['c. à café', 'c. à café'], tr: ['tranche', 'tranches'],
};

/** Quantité lisible : 0.5 → « ½ », 1250 g → « 1,25 kg » */
export function fmtQty(q: number, u: Unit): string {
  let v = q;
  if (u === 'g' || u === 'ml') {
    v = Math.round(q / 5) * 5;
    if (v >= 1000) return `${String(Math.round(v / 10) / 100).replace('.', ',')} ${u === 'g' ? 'kg' : 'l'}`;
    return `${v} ${u}`;
  }
  v = Math.round(q * 4) / 4;
  const whole = Math.floor(v);
  const frac = v - whole;
  const f = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  const num = whole === 0 ? f || '0' : `${whole}${f ? ' ' + f : ''}`;
  const lab = UNIT_LABEL[u][v > 1 ? 1 : 0];
  return lab ? `${num} ${lab}` : num;
}
