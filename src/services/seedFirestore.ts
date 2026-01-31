import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { words as legacyWords } from "../assets/words";

type LegacyEntry = {
  name: string;
  difficulty?: "easy" | "medium" | "hard";
  words: string[];
  region?: string;
};

type SeedWord = {
  word: string;
  category: string;
  difficulty?: "easy" | "medium" | "hard";
  languages?: string[];
  regions?: string[];
};

// Additional multicultural / multi-language sample words (previously in scripts/generateSampleData.ts)
const sampleWords: SeedWord[] = [
  // Punjabi words
  { word: "Roti", category: "Food", languages: ["Punjabi", "Hindi", "Urdu"], regions: ["Punjab", "India"] },
  { word: "Paratha", category: "Food", languages: ["Punjabi", "Hindi"], regions: ["Punjab", "India"] },
  { word: "Lassi", category: "Food", languages: ["Punjabi", "Hindi"], regions: ["Punjab", "India"] },
  { word: "Sarson", category: "Food", languages: ["Punjabi"], regions: ["Punjab", "India"] },

  // Hindi words
  { word: "Namaste", category: "Objects & Things", languages: ["Hindi"], regions: ["India"] },
  { word: "Chai", category: "Food", languages: ["Hindi", "Urdu"], regions: ["India"] },
  { word: "Biryani", category: "Food", languages: ["Hindi", "Urdu"], regions: ["India"] },

  // UK slang
  { word: "Roadman", category: "Jobs & Professions", languages: ["English"], regions: ["UK", "London"] },
  { word: "Bruv", category: "Objects & Things", languages: ["English"], regions: ["UK", "London"] },
  { word: "Crisps", category: "Food", languages: ["English"], regions: ["UK"] },

  // Toronto/Canadian
  { word: "Poutine", category: "Food", languages: ["English", "French"], regions: ["Toronto", "Canada"] },
  { word: "Tim Hortons", category: "Places", languages: ["English"], regions: ["Toronto", "Canada"] },
  { word: "Toque", category: "Objects & Things", languages: ["English", "French"], regions: ["Canada"] },

  // Spanish words
  { word: "Taco", category: "Food", languages: ["Spanish", "English"], regions: ["Mexico"] },
  { word: "Fiesta", category: "Places", languages: ["Spanish"], regions: ["Mexico", "Spain"] },
  { word: "Amigo", category: "Objects & Things", languages: ["Spanish"], regions: ["Mexico", "Spain"] },

  // French words
  { word: "Croissant", category: "Food", languages: ["French", "English"], regions: ["France"] },
  { word: "Bonjour", category: "Objects & Things", languages: ["French"], regions: ["France"] },
  { word: "Baguette", category: "Food", languages: ["French"], regions: ["France"] },

  // Names, Chemicals, Music, Science (English default)
  { word: "Einstein", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Aspirin", category: "Chemicals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Symphony", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Photosynthesis", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  // Basic Words, Colors, Entertainment, Famous People, Geography, Literature, Artists, Technology
  { word: "Serendipity", category: "Basic Words", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Crimson", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Broadway", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Shakespeare", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Himalayas", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Metaphor", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Van Gogh", category: "Artists", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Algorithm", category: "Technology", languages: ["English"], regions: ["US", "UK", "Canada"] },
];

// New category words: 20 per category (10 English, 5 French, 5 Indian) — see scripts/NEW_CATEGORY_WORDS.md
const newCategoryWords: SeedWord[] = [
  // Music (20)
  { word: "Symphony", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Piano", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Guitar", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Jazz", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Orchestra", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Melody", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Concerto", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Sonata", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Rhythm", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Album", category: "Music", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Accordéon", category: "Music", languages: ["French"], regions: ["France"] },
  { word: "Chanson", category: "Music", languages: ["French"], regions: ["France"] },
  { word: "Clarinette", category: "Music", languages: ["French"], regions: ["France"] },
  { word: "Violon", category: "Music", languages: ["French"], regions: ["France"] },
  { word: "Flûte", category: "Music", languages: ["French"], regions: ["France"] },
  { word: "Sitar", category: "Music", languages: ["Hindi", "Punjabi"], regions: ["India", "Punjab"] },
  { word: "Tabla", category: "Music", languages: ["Hindi", "Punjabi"], regions: ["India", "Punjab"] },
  { word: "Raga", category: "Music", languages: ["Hindi"], regions: ["India"] },
  { word: "Bhajan", category: "Music", languages: ["Hindi"], regions: ["India"] },
  { word: "Qawwali", category: "Music", languages: ["Urdu", "Hindi"], regions: ["India"] },
  // Famous People (20)
  { word: "Shakespeare", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Einstein", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Newton", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Mozart", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Cleopatra", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Napoleon", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Beethoven", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Darwin", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Tesla", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Gandhi", category: "Famous People", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Monet", category: "Famous People", languages: ["French"], regions: ["France"] },
  { word: "Descartes", category: "Famous People", languages: ["French"], regions: ["France"] },
  { word: "Hugo", category: "Famous People", languages: ["French"], regions: ["France"] },
  { word: "Piaf", category: "Famous People", languages: ["French"], regions: ["France"] },
  { word: "Cézanne", category: "Famous People", languages: ["French"], regions: ["France"] },
  { word: "Shah Rukh Khan", category: "Famous People", languages: ["Hindi", "English"], regions: ["India"] },
  { word: "Amitabh Bachchan", category: "Famous People", languages: ["Hindi", "English"], regions: ["India"] },
  { word: "Lata Mangeshkar", category: "Famous People", languages: ["Hindi"], regions: ["India"] },
  { word: "Ratan Tata", category: "Famous People", languages: ["Hindi", "English"], regions: ["India"] },
  { word: "Kalpana Chawla", category: "Famous People", languages: ["Hindi", "English"], regions: ["India"] },
  // Entertainment (20)
  { word: "Broadway", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Cinema", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Comedy", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Festival", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Theater", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Concert", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Podcast", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Streaming", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Animation", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Sitcom", category: "Entertainment", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Cinéma", category: "Entertainment", languages: ["French"], regions: ["France"] },
  { word: "Théâtre", category: "Entertainment", languages: ["French"], regions: ["France"] },
  { word: "Comédie", category: "Entertainment", languages: ["French"], regions: ["France"] },
  { word: "Spectacle", category: "Entertainment", languages: ["French"], regions: ["France"] },
  { word: "Divertissement", category: "Entertainment", languages: ["French"], regions: ["France"] },
  { word: "Bollywood", category: "Entertainment", languages: ["Hindi", "English"], regions: ["India"] },
  { word: "Nautanki", category: "Entertainment", languages: ["Hindi"], regions: ["India"] },
  { word: "Tamasha", category: "Entertainment", languages: ["Hindi"], regions: ["India"] },
  { word: "Kathak", category: "Entertainment", languages: ["Hindi"], regions: ["India"] },
  { word: "Diwali", category: "Entertainment", languages: ["Hindi"], regions: ["India"] },
  // Colors & Shades (20)
  { word: "Crimson", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Scarlet", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Turquoise", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Amber", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Violet", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Indigo", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Coral", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Navy", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Maroon", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Beige", category: "Colors & Shades", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Violet", category: "Colors & Shades", languages: ["French"], regions: ["France"] },
  { word: "Rose", category: "Colors & Shades", languages: ["French"], regions: ["France"] },
  { word: "Bleu", category: "Colors & Shades", languages: ["French"], regions: ["France"] },
  { word: "Jaune", category: "Colors & Shades", languages: ["French"], regions: ["France"] },
  { word: "Noir", category: "Colors & Shades", languages: ["French"], regions: ["France"] },
  { word: "Gulabi", category: "Colors & Shades", languages: ["Hindi", "Punjabi", "Urdu"], regions: ["India", "Punjab"] },
  { word: "Neela", category: "Colors & Shades", languages: ["Hindi"], regions: ["India"] },
  { word: "Hara", category: "Colors & Shades", languages: ["Hindi", "Punjabi"], regions: ["India", "Punjab"] },
  { word: "Peela", category: "Colors & Shades", languages: ["Hindi"], regions: ["India"] },
  { word: "Safed", category: "Colors & Shades", languages: ["Hindi", "Punjabi"], regions: ["India", "Punjab"] },
  // Geography (20)
  { word: "Himalayas", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Amazon", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Sahara", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Pacific", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Everest", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Mediterranean", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Peninsula", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Glacier", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Canyon", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Delta", category: "Geography", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Seine", category: "Geography", languages: ["French"], regions: ["France"] },
  { word: "Alpes", category: "Geography", languages: ["French"], regions: ["France"] },
  { word: "Bretagne", category: "Geography", languages: ["French"], regions: ["France"] },
  { word: "Provence", category: "Geography", languages: ["French"], regions: ["France"] },
  { word: "Côte", category: "Geography", languages: ["French"], regions: ["France"] },
  { word: "Ganges", category: "Geography", languages: ["Hindi"], regions: ["India"] },
  { word: "Punjab", category: "Geography", languages: ["Punjabi", "Hindi"], regions: ["Punjab", "India"] },
  { word: "Kashmir", category: "Geography", languages: ["Hindi"], regions: ["India"] },
  { word: "Rajasthan", category: "Geography", languages: ["Hindi"], regions: ["India"] },
  { word: "Kerala", category: "Geography", languages: ["Hindi"], regions: ["India"] },
  // Names (20)
  { word: "Alexander", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Elizabeth", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Christopher", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Victoria", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Benjamin", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Charlotte", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "William", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Catherine", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "James", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Margaret", category: "Names", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "François", category: "Names", languages: ["French"], regions: ["France"] },
  { word: "Marie", category: "Names", languages: ["French"], regions: ["France"] },
  { word: "Jean", category: "Names", languages: ["French"], regions: ["France"] },
  { word: "Sophie", category: "Names", languages: ["French"], regions: ["France"] },
  { word: "Pierre", category: "Names", languages: ["French"], regions: ["France"] },
  { word: "Priya", category: "Names", languages: ["Hindi"], regions: ["India"] },
  { word: "Rahul", category: "Names", languages: ["Hindi"], regions: ["India"] },
  { word: "Ananya", category: "Names", languages: ["Hindi"], regions: ["India"] },
  { word: "Arjun", category: "Names", languages: ["Hindi"], regions: ["India"] },
  { word: "Kavya", category: "Names", languages: ["Hindi"], regions: ["India"] },
  // Science (20)
  { word: "Photosynthesis", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Molecule", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Evolution", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Telescope", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "DNA", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Atom", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Gravity", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Eclipse", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Fossil", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Catalyst", category: "Science", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Chimie", category: "Science", languages: ["French"], regions: ["France"] },
  { word: "Physique", category: "Science", languages: ["French"], regions: ["France"] },
  { word: "Énergie", category: "Science", languages: ["French"], regions: ["France"] },
  { word: "Molécule", category: "Science", languages: ["French"], regions: ["France"] },
  { word: "Atome", category: "Science", languages: ["French"], regions: ["France"] },
  { word: "Vigyan", category: "Science", languages: ["Hindi"], regions: ["India"] },
  { word: "Anu", category: "Science", languages: ["Hindi"], regions: ["India"] },
  { word: "Grahan", category: "Science", languages: ["Hindi"], regions: ["India"] },
  { word: "Dhruv Tara", category: "Science", languages: ["Hindi"], regions: ["India"] },
  { word: "Jal Vidyut", category: "Science", languages: ["Hindi"], regions: ["India"] },
  // Literature (20)
  { word: "Metaphor", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Sonnet", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Epic", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Novel", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Poetry", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Tragedy", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Satire", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Allegory", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Prose", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Fable", category: "Literature", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Roman", category: "Literature", languages: ["French"], regions: ["France"] },
  { word: "Poésie", category: "Literature", languages: ["French"], regions: ["France"] },
  { word: "Théâtre", category: "Literature", languages: ["French"], regions: ["France"] },
  { word: "Conte", category: "Literature", languages: ["French"], regions: ["France"] },
  { word: "Essai", category: "Literature", languages: ["French"], regions: ["France"] },
  { word: "Kavita", category: "Literature", languages: ["Hindi"], regions: ["India"] },
  { word: "Kahani", category: "Literature", languages: ["Hindi"], regions: ["India"] },
  { word: "Upanyas", category: "Literature", languages: ["Hindi"], regions: ["India"] },
  { word: "Natak", category: "Literature", languages: ["Hindi"], regions: ["India"] },
  { word: "Geet", category: "Literature", languages: ["Hindi", "Punjabi"], regions: ["India", "Punjab"] },
];

// Old-category expansion: 30 words per category (Food, Animals, Movies & TV, Sports & Games, Places, Jobs & Professions, Objects & Things)
// Spread across English, French, Spanish (Spain + Argentina), Italian, Japanese, Mandarin, German
const oldCategoryExpansionWords: SeedWord[] = [
  // Food (30)
  { word: "Waffle", category: "Food", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Omelette", category: "Food", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Bagel", category: "Food", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Mango", category: "Food", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Kiwi", category: "Food", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Basil", category: "Food", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Cinnamon", category: "Food", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Honey", category: "Food", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Fromage", category: "Food", languages: ["French"], regions: ["France"] },
  { word: "Soupe", category: "Food", languages: ["French"], regions: ["France"] },
  { word: "Crêpe", category: "Food", languages: ["French"], regions: ["France"] },
  { word: "Vin", category: "Food", languages: ["French"], regions: ["France"] },
  { word: "Paella", category: "Food", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Tapas", category: "Food", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Chorizo", category: "Food", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Asado", category: "Food", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Mate", category: "Food", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Dulce de leche", category: "Food", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Pasta", category: "Food", languages: ["Italian"], regions: ["Italy"] },
  { word: "Risotto", category: "Food", languages: ["Italian"], regions: ["Italy"] },
  { word: "Gelato", category: "Food", languages: ["Italian"], regions: ["Italy"] },
  { word: "Espresso", category: "Food", languages: ["Italian"], regions: ["Italy"] },
  { word: "Ramen", category: "Food", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Miso", category: "Food", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Tempura", category: "Food", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Jiaozi", category: "Food", languages: ["Mandarin"], regions: ["China"] },
  { word: "Baozi", category: "Food", languages: ["Mandarin"], regions: ["China"] },
  { word: "Dim sum", category: "Food", languages: ["Mandarin"], regions: ["China"] },
  { word: "Brezel", category: "Food", languages: ["German"], regions: ["Germany"] },
  { word: "Schnitzel", category: "Food", languages: ["German"], regions: ["Germany"] },
  // Animals (30)
  { word: "Otter", category: "Animals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Beaver", category: "Animals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Falcon", category: "Animals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Swan", category: "Animals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Owl", category: "Animals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Fox", category: "Animals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Deer", category: "Animals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Wolf", category: "Animals", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Oiseau", category: "Animals", languages: ["French"], regions: ["France"] },
  { word: "Lapin", category: "Animals", languages: ["French"], regions: ["France"] },
  { word: "Poisson", category: "Animals", languages: ["French"], regions: ["France"] },
  { word: "Cheval", category: "Animals", languages: ["French"], regions: ["France"] },
  { word: "Perro", category: "Animals", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Gato", category: "Animals", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Caballo", category: "Animals", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Puma", category: "Animals", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Ñandú", category: "Animals", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Guanaco", category: "Animals", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Cane", category: "Animals", languages: ["Italian"], regions: ["Italy"] },
  { word: "Gatto", category: "Animals", languages: ["Italian"], regions: ["Italy"] },
  { word: "Uccello", category: "Animals", languages: ["Italian"], regions: ["Italy"] },
  { word: "Pesce", category: "Animals", languages: ["Italian"], regions: ["Italy"] },
  { word: "Neko", category: "Animals", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Inu", category: "Animals", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Sakana", category: "Animals", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Mao", category: "Animals", languages: ["Mandarin"], regions: ["China"] },
  { word: "Gou", category: "Animals", languages: ["Mandarin"], regions: ["China"] },
  { word: "Niao", category: "Animals", languages: ["Mandarin"], regions: ["China"] },
  { word: "Hund", category: "Animals", languages: ["German"], regions: ["Germany"] },
  { word: "Katze", category: "Animals", languages: ["German"], regions: ["Germany"] },
  // Movies & TV (30)
  { word: "Netflix", category: "Movies & TV", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Documentary", category: "Movies & TV", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Animation", category: "Movies & TV", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Drama", category: "Movies & TV", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Thriller", category: "Movies & TV", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Series", category: "Movies & TV", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Horror", category: "Movies & TV", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Western", category: "Movies & TV", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Film", category: "Movies & TV", languages: ["French"], regions: ["France"] },
  { word: "Série", category: "Movies & TV", languages: ["French"], regions: ["France"] },
  { word: "Cinéma", category: "Movies & TV", languages: ["French"], regions: ["France"] },
  { word: "Documentaire", category: "Movies & TV", languages: ["French"], regions: ["France"] },
  { word: "Película", category: "Movies & TV", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Serie", category: "Movies & TV", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Telenovela", category: "Movies & TV", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Cine", category: "Movies & TV", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Canal", category: "Movies & TV", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Programa", category: "Movies & TV", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Film", category: "Movies & TV", languages: ["Italian"], regions: ["Italy"] },
  { word: "Serie", category: "Movies & TV", languages: ["Italian"], regions: ["Italy"] },
  { word: "Cinema", category: "Movies & TV", languages: ["Italian"], regions: ["Italy"] },
  { word: "Cartone", category: "Movies & TV", languages: ["Italian"], regions: ["Italy"] },
  { word: "Eiga", category: "Movies & TV", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Dorama", category: "Movies & TV", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Anime", category: "Movies & TV", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Dianying", category: "Movies & TV", languages: ["Mandarin"], regions: ["China"] },
  { word: "Dianshi", category: "Movies & TV", languages: ["Mandarin"], regions: ["China"] },
  { word: "Donghua", category: "Movies & TV", languages: ["Mandarin"], regions: ["China"] },
  { word: "Film", category: "Movies & TV", languages: ["German"], regions: ["Germany"] },
  { word: "Serie", category: "Movies & TV", languages: ["German"], regions: ["Germany"] },
  // Sports & Games (30)
  { word: "Volleyball", category: "Sports & Games", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Cricket", category: "Sports & Games", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Marathon", category: "Sports & Games", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Olympics", category: "Sports & Games", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Chess", category: "Sports & Games", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Poker", category: "Sports & Games", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Boxing", category: "Sports & Games", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Wrestling", category: "Sports & Games", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Football", category: "Sports & Games", languages: ["French"], regions: ["France"] },
  { word: "Natation", category: "Sports & Games", languages: ["French"], regions: ["France"] },
  { word: "Cyclisme", category: "Sports & Games", languages: ["French"], regions: ["France"] },
  { word: "Escalade", category: "Sports & Games", languages: ["French"], regions: ["France"] },
  { word: "Fútbol", category: "Sports & Games", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Tenis", category: "Sports & Games", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Natación", category: "Sports & Games", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Pato", category: "Sports & Games", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Pelota", category: "Sports & Games", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Bochas", category: "Sports & Games", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Calcio", category: "Sports & Games", languages: ["Italian"], regions: ["Italy"] },
  { word: "Nuoto", category: "Sports & Games", languages: ["Italian"], regions: ["Italy"] },
  { word: "Ciclismo", category: "Sports & Games", languages: ["Italian"], regions: ["Italy"] },
  { word: "Scacchi", category: "Sports & Games", languages: ["Italian"], regions: ["Italy"] },
  { word: "Yakyuu", category: "Sports & Games", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Sumo", category: "Sports & Games", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Judo", category: "Sports & Games", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Lanqiu", category: "Sports & Games", languages: ["Mandarin"], regions: ["China"] },
  { word: "Zuqiu", category: "Sports & Games", languages: ["Mandarin"], regions: ["China"] },
  { word: "Pingpang", category: "Sports & Games", languages: ["Mandarin"], regions: ["China"] },
  { word: "Fußball", category: "Sports & Games", languages: ["German"], regions: ["Germany"] },
  { word: "Tennis", category: "Sports & Games", languages: ["German"], regions: ["Germany"] },
  // Places (30)
  { word: "Airport", category: "Places", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Stadium", category: "Places", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Museum", category: "Places", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Library", category: "Places", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Hospital", category: "Places", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Church", category: "Places", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Market", category: "Places", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Station", category: "Places", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Paris", category: "Places", languages: ["French"], regions: ["France"] },
  { word: "Lyon", category: "Places", languages: ["French"], regions: ["France"] },
  { word: "Marseille", category: "Places", languages: ["French"], regions: ["France"] },
  { word: "Bordeaux", category: "Places", languages: ["French"], regions: ["France"] },
  { word: "Madrid", category: "Places", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Barcelona", category: "Places", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Sevilla", category: "Places", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Buenos Aires", category: "Places", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Córdoba", category: "Places", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Mendoza", category: "Places", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Roma", category: "Places", languages: ["Italian"], regions: ["Italy"] },
  { word: "Milano", category: "Places", languages: ["Italian"], regions: ["Italy"] },
  { word: "Venezia", category: "Places", languages: ["Italian"], regions: ["Italy"] },
  { word: "Napoli", category: "Places", languages: ["Italian"], regions: ["Italy"] },
  { word: "Tokyo", category: "Places", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Kyoto", category: "Places", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Osaka", category: "Places", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Beijing", category: "Places", languages: ["Mandarin"], regions: ["China"] },
  { word: "Shanghai", category: "Places", languages: ["Mandarin"], regions: ["China"] },
  { word: "Guangzhou", category: "Places", languages: ["Mandarin"], regions: ["China"] },
  { word: "Berlin", category: "Places", languages: ["German"], regions: ["Germany"] },
  { word: "München", category: "Places", languages: ["German"], regions: ["Germany"] },
  // Jobs & Professions (30)
  { word: "Doctor", category: "Jobs & Professions", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Lawyer", category: "Jobs & Professions", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Engineer", category: "Jobs & Professions", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Teacher", category: "Jobs & Professions", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Nurse", category: "Jobs & Professions", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Chef", category: "Jobs & Professions", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Pilot", category: "Jobs & Professions", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Driver", category: "Jobs & Professions", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Médecin", category: "Jobs & Professions", languages: ["French"], regions: ["France"] },
  { word: "Avocat", category: "Jobs & Professions", languages: ["French"], regions: ["France"] },
  { word: "Enseignant", category: "Jobs & Professions", languages: ["French"], regions: ["France"] },
  { word: "Infirmier", category: "Jobs & Professions", languages: ["French"], regions: ["France"] },
  { word: "Médico", category: "Jobs & Professions", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Abogado", category: "Jobs & Professions", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Profesor", category: "Jobs & Professions", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Maestro", category: "Jobs & Professions", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Enfermero", category: "Jobs & Professions", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Ingeniero", category: "Jobs & Professions", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Dottore", category: "Jobs & Professions", languages: ["Italian"], regions: ["Italy"] },
  { word: "Avvocato", category: "Jobs & Professions", languages: ["Italian"], regions: ["Italy"] },
  { word: "Insegnante", category: "Jobs & Professions", languages: ["Italian"], regions: ["Italy"] },
  { word: "Infermiere", category: "Jobs & Professions", languages: ["Italian"], regions: ["Italy"] },
  { word: "Isha", category: "Jobs & Professions", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Bengoshi", category: "Jobs & Professions", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Kyoshi", category: "Jobs & Professions", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Yisheng", category: "Jobs & Professions", languages: ["Mandarin"], regions: ["China"] },
  { word: "Lüshi", category: "Jobs & Professions", languages: ["Mandarin"], regions: ["China"] },
  { word: "Laoshi", category: "Jobs & Professions", languages: ["Mandarin"], regions: ["China"] },
  { word: "Arzt", category: "Jobs & Professions", languages: ["German"], regions: ["Germany"] },
  { word: "Lehrer", category: "Jobs & Professions", languages: ["German"], regions: ["Germany"] },
  // Objects & Things (30)
  { word: "Lamp", category: "Objects & Things", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Mirror", category: "Objects & Things", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Clock", category: "Objects & Things", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Key", category: "Objects & Things", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Lock", category: "Objects & Things", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Bottle", category: "Objects & Things", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Cup", category: "Objects & Things", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Plate", category: "Objects & Things", languages: ["English"], regions: ["US", "UK", "Canada"] },
  { word: "Lampe", category: "Objects & Things", languages: ["French"], regions: ["France"] },
  { word: "Miroir", category: "Objects & Things", languages: ["French"], regions: ["France"] },
  { word: "Horloge", category: "Objects & Things", languages: ["French"], regions: ["France"] },
  { word: "Clé", category: "Objects & Things", languages: ["French"], regions: ["France"] },
  { word: "Lámpara", category: "Objects & Things", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Espejo", category: "Objects & Things", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Reloj", category: "Objects & Things", languages: ["Spanish"], regions: ["Spain"] },
  { word: "Vaso", category: "Objects & Things", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Plato", category: "Objects & Things", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Llave", category: "Objects & Things", languages: ["Spanish"], regions: ["Argentina"] },
  { word: "Lampada", category: "Objects & Things", languages: ["Italian"], regions: ["Italy"] },
  { word: "Specchio", category: "Objects & Things", languages: ["Italian"], regions: ["Italy"] },
  { word: "Orologio", category: "Objects & Things", languages: ["Italian"], regions: ["Italy"] },
  { word: "Chiave", category: "Objects & Things", languages: ["Italian"], regions: ["Italy"] },
  { word: "Denki", category: "Objects & Things", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Kagami", category: "Objects & Things", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Tokei", category: "Objects & Things", languages: ["Japanese"], regions: ["Japan"] },
  { word: "Deng", category: "Objects & Things", languages: ["Mandarin"], regions: ["China"] },
  { word: "Jingzi", category: "Objects & Things", languages: ["Mandarin"], regions: ["China"] },
  { word: "Zhong", category: "Objects & Things", languages: ["Mandarin"], regions: ["China"] },
  { word: "Lampe", category: "Objects & Things", languages: ["German"], regions: ["Germany"] },
  { word: "Spiegel", category: "Objects & Things", languages: ["German"], regions: ["Germany"] },
];

function buildLanguagesAndRegions(entry: LegacyEntry) {
  const languages: string[] = ["English"];
  const regions: string[] = [];

  if (entry.region) regions.push(entry.region);

  if (entry.region === "India" || (entry.name === "Food" && entry.region === "India")) {
    languages.push("Hindi", "Punjabi", "Urdu");
    if (!regions.includes("India")) regions.push("India");
    if (!regions.includes("Punjab")) regions.push("Punjab");
  }

  // Broad defaults so region filtering has matches
  for (const r of ["US", "UK", "Canada"]) {
    if (!regions.includes(r)) regions.push(r);
  }

  return {
    languages: languages.filter(Boolean),
    regions: regions.filter(Boolean),
  };
}

function normalizeTag(s: string) {
  return s.trim();
}

function makeWordId(category: string, word: string) {
  // Stable, idempotent doc id so seeding can be safely re-run/upgraded.
  const raw = `${category}__${word}`.toLowerCase().trim();
  return raw
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 180);
}

/**
 * SEED — Definition
 * ----------------
 * "Seed" means: one-time (or versioned upgrade) population of the `words`
 * collection in Firestore from in-app data (legacy words, sample words,
 * new category words). It does NOT run every time the app loads; it runs
 * only when VITE_ENABLE_FIREBASE_SEED === "true" and the stored seed
 * version is less than the target version.
 *
 * What it does:
 * - Reads version from Firestore `meta/seed`. If version < target (e.g. 3),
 *   it runs the missing version steps (v1, v2, v3).
 * - Each word is written with a STABLE document ID: makeWordId(category, word).
 *   So the same (category, word) always maps to one document — no duplicates.
 * - Uses merge: true, so existing documents are updated, not duplicated.
 *
 * It only ADDS new words (or updates existing docs by ID). v3 explicitly
 * skips any word+category that already exists in sampleWords so we don't
 * re-write earlier words — only truly new ones get written.
 *
 * Guardrails:
 * - Only runs if VITE_ENABLE_FIREBASE_SEED === "true"
 * - Versioned: v1 = legacyWords, v2 = sampleWords, v3 = newCategoryWords (new only), v4 = oldCategoryExpansionWords (new only)
 *
 * IMPORTANT: Firestore rules must allow write to `words/*` and `meta/seed`
 * for this to work. After seeding, lock rules back down.
 */
export async function seedFirestoreIfNeeded() {
  const enabled = import.meta.env.VITE_ENABLE_FIREBASE_SEED === "true";
  if (!enabled) return;

  const markerRef = doc(db, "meta", "seed");
  const markerSnap = await getDoc(markerRef);
  const currentVersion = markerSnap.exists()
    ? (markerSnap.data()?.version as number | undefined) ?? 1
    : 0;

  // v1 = legacyWords only
  // v2 = legacyWords + sampleWords (multicultural)
  // v3 = + newCategoryWords (20 per category: Music, Famous People, etc.)
  // v4 = + oldCategoryExpansionWords (30 per old category: Food, Animals, Movies & TV, Sports & Games, Places, Jobs & Professions, Objects & Things; multi-language/region)
  const TARGET_VERSION = 4;
  if (currentVersion >= TARGET_VERSION) return;

  const entries = legacyWords as unknown as LegacyEntry[];
  const wordsCol = collection(db, "words");

  let batch = writeBatch(db);
  let ops = 0;
  const BATCH_LIMIT = 400; // Firestore limit is 500

  // Seed legacy words only if upgrading from < v1
  if (currentVersion < 1) {
    for (const entry of entries) {
      const category = String(entry.name ?? "").trim();
      if (!category) continue;

      const { languages, regions } = buildLanguagesAndRegions(entry);

      for (const w of entry.words ?? []) {
        const word = typeof w === "string" ? w.trim() : "";
        if (!word) continue;

        const payload: Record<string, unknown> = {
          word,
          category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (entry.difficulty) payload.difficulty = entry.difficulty;
        if (languages.length) payload.languages = languages.map(normalizeTag);
        if (regions.length) payload.regions = regions.map(normalizeTag);

        batch.set(doc(wordsCol, makeWordId(category, word)), payload, { merge: true });
        ops++;

        if (ops >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }
    }
  }

  // Seed multicultural sample words if upgrading from < v2
  if (currentVersion < 2) {
    for (const sw of sampleWords) {
      const category = String(sw.category ?? "").trim();
      const word = String(sw.word ?? "").trim();
      if (!category || !word) continue;

      const payload: Record<string, unknown> = {
        word,
        category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      payload.difficulty = sw.difficulty ?? "medium";
      if (sw.languages?.length) payload.languages = sw.languages.map(normalizeTag);
      if (sw.regions?.length) payload.regions = sw.regions.map(normalizeTag);

      batch.set(doc(wordsCol, makeWordId(category, word)), payload, { merge: true });
      ops++;

      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
  }

  // Seed new category words if upgrading from < v3 (only words not already in sampleWords)
  const existingKeySetV3 = new Set(
    sampleWords.map((sw) => makeWordId(String(sw.category).trim(), String(sw.word).trim()))
  );
  if (currentVersion < 3) {
    for (const sw of newCategoryWords) {
      const category = String(sw.category ?? "").trim();
      const word = String(sw.word ?? "").trim();
      if (!category || !word) continue;
      if (existingKeySetV3.has(makeWordId(category, word))) continue;

      const payload: Record<string, unknown> = {
        word,
        category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      payload.difficulty = sw.difficulty ?? "medium";
      if (sw.languages?.length) payload.languages = sw.languages.map(normalizeTag);
      if (sw.regions?.length) payload.regions = sw.regions.map(normalizeTag);

      batch.set(doc(wordsCol, makeWordId(category, word)), payload, { merge: true });
      ops++;

      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
  }

  // Seed old-category expansion (v4): only words not already in sampleWords or newCategoryWords
  const existingKeySetV4 = new Set([
    ...sampleWords.map((sw) => makeWordId(String(sw.category).trim(), String(sw.word).trim())),
    ...newCategoryWords.map((sw) => makeWordId(String(sw.category).trim(), String(sw.word).trim())),
  ]);
  if (currentVersion < 4) {
    for (const sw of oldCategoryExpansionWords) {
      const category = String(sw.category ?? "").trim();
      const word = String(sw.word ?? "").trim();
      if (!category || !word) continue;
      if (existingKeySetV4.has(makeWordId(category, word))) continue;

      const payload: Record<string, unknown> = {
        word,
        category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      payload.difficulty = sw.difficulty ?? "medium";
      if (sw.languages?.length) payload.languages = sw.languages.map(normalizeTag);
      if (sw.regions?.length) payload.regions = sw.regions.map(normalizeTag);

      batch.set(doc(wordsCol, makeWordId(category, word)), payload, { merge: true });
      ops++;

      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  // Mark seed complete / upgraded
  await writeBatch(db)
    .set(
      markerRef,
      {
        seededAt: serverTimestamp(),
        seededBy: "client",
        version: TARGET_VERSION,
      },
      { merge: true }
    )
    .commit();
}
