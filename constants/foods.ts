// Velox bundled food catalog — the offline baseline for nutrition logging.
// Mirrors constants/exercises.ts: a flat, typed array that ships in the app so
// food search works with zero network on first launch. Per-user custom foods
// can be merged on top later (see isCustom) without an app update.
//
// All macro numbers are per ONE serving (servingSize + servingUnit). The food
// picker multiplies them by a user-chosen `servings` value, so a whole food can
// use servingSize:100/servingUnit:"g" and a packaged one "1 / scoop".

export type FoodCategory =
  | "Protein"
  | "Dairy"
  | "Grains"
  | "Fruit"
  | "Vegetables"
  | "Nuts & Seeds"
  | "Fats & Oils"
  | "Beverages"
  | "Snacks"
  | "Prepared"
  | "Condiments"
  | "Other";

export type Food = {
  id: string;
  name: string;
  // Empty / undefined for generic whole foods; set for packaged/branded items.
  brand?: string;
  // The amount that makes up ONE serving, e.g. 100 (g) or 1 (slice).
  servingSize: number;
  servingUnit: string; // "g" | "ml" | "oz" | "cup" | "slice" | "piece" | "scoop" | "tbsp"
  // Per ONE serving:
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber?: number; // grams (optional)
  category: FoodCategory;
  // True for user-created foods (per-user). Not used by the bundled catalog;
  // enables edit/delete in the UI once custom foods land.
  isCustom?: boolean;
};

// Order used for the picker's category filter chips.
export const FOOD_CATEGORIES: FoodCategory[] = [
  "Protein",
  "Dairy",
  "Grains",
  "Fruit",
  "Vegetables",
  "Nuts & Seeds",
  "Fats & Oils",
  "Beverages",
  "Snacks",
  "Prepared",
  "Condiments",
  "Other",
];

export const FOODS: Food[] = [
  // ── PROTEIN ───────────────────────────────────────────────────────────
  { id: "egg_large", name: "Egg, Large", servingSize: 1, servingUnit: "piece", calories: 72, protein: 6.3, carbs: 0.4, fat: 5, category: "Protein" },
  { id: "egg_white", name: "Egg White", servingSize: 1, servingUnit: "piece", calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1, category: "Protein" },
  { id: "chicken_breast", name: "Chicken Breast, Cooked", servingSize: 100, servingUnit: "g", calories: 165, protein: 31, carbs: 0, fat: 3.6, category: "Protein" },
  { id: "chicken_thigh", name: "Chicken Thigh, Cooked", servingSize: 100, servingUnit: "g", calories: 209, protein: 26, carbs: 0, fat: 11, category: "Protein" },
  { id: "ground_beef_85", name: "Ground Beef 85/15, Cooked", servingSize: 100, servingUnit: "g", calories: 250, protein: 26, carbs: 0, fat: 15, category: "Protein" },
  { id: "salmon", name: "Salmon, Cooked", servingSize: 100, servingUnit: "g", calories: 206, protein: 22, carbs: 0, fat: 13, category: "Protein" },
  { id: "tuna_canned", name: "Tuna, Canned in Water", servingSize: 100, servingUnit: "g", calories: 116, protein: 26, carbs: 0, fat: 0.8, category: "Protein" },
  { id: "shrimp", name: "Shrimp, Cooked", servingSize: 100, servingUnit: "g", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, category: "Protein" },
  { id: "pork_chop", name: "Pork Chop, Cooked", servingSize: 100, servingUnit: "g", calories: 231, protein: 26, carbs: 0, fat: 14, category: "Protein" },
  { id: "tofu_firm", name: "Tofu, Firm", servingSize: 100, servingUnit: "g", calories: 144, protein: 17, carbs: 3, fat: 9, fiber: 2, category: "Protein" },
  { id: "whey_scoop", name: "Whey Protein", brand: "Generic", servingSize: 1, servingUnit: "scoop", calories: 120, protein: 24, carbs: 3, fat: 1.5, category: "Protein" },
  { id: "turkey_breast_deli", name: "Turkey Breast, Deli", servingSize: 100, servingUnit: "g", calories: 104, protein: 17, carbs: 4, fat: 1.7, category: "Protein" },

  // ── DAIRY ─────────────────────────────────────────────────────────────
  { id: "milk_whole", name: "Milk, Whole", servingSize: 240, servingUnit: "ml", calories: 149, protein: 8, carbs: 12, fat: 8, category: "Dairy" },
  { id: "milk_skim", name: "Milk, Skim", servingSize: 240, servingUnit: "ml", calories: 83, protein: 8, carbs: 12, fat: 0.2, category: "Dairy" },
  { id: "greek_yogurt_plain", name: "Greek Yogurt, Plain Nonfat", servingSize: 170, servingUnit: "g", calories: 100, protein: 17, carbs: 6, fat: 0.7, category: "Dairy" },
  { id: "cottage_cheese", name: "Cottage Cheese, Low-Fat", servingSize: 100, servingUnit: "g", calories: 72, protein: 12, carbs: 4.3, fat: 1, category: "Dairy" },
  { id: "cheddar_cheese", name: "Cheddar Cheese", servingSize: 28, servingUnit: "g", calories: 113, protein: 7, carbs: 0.4, fat: 9, category: "Dairy" },
  { id: "mozzarella", name: "Mozzarella, Part-Skim", servingSize: 28, servingUnit: "g", calories: 72, protein: 7, carbs: 0.8, fat: 4.5, category: "Dairy" },
  { id: "butter", name: "Butter", servingSize: 1, servingUnit: "tbsp", calories: 102, protein: 0.1, carbs: 0, fat: 12, category: "Dairy" },

  // ── GRAINS ────────────────────────────────────────────────────────────
  { id: "white_rice_cooked", name: "White Rice, Cooked", servingSize: 100, servingUnit: "g", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, category: "Grains" },
  { id: "brown_rice_cooked", name: "Brown Rice, Cooked", servingSize: 100, servingUnit: "g", calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.6, category: "Grains" },
  { id: "oats_dry", name: "Rolled Oats, Dry", servingSize: 40, servingUnit: "g", calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4, category: "Grains" },
  { id: "bread_whole_wheat", name: "Whole Wheat Bread", servingSize: 1, servingUnit: "slice", calories: 81, protein: 4, carbs: 14, fat: 1.1, fiber: 2, category: "Grains" },
  { id: "pasta_cooked", name: "Pasta, Cooked", servingSize: 100, servingUnit: "g", calories: 158, protein: 6, carbs: 31, fat: 0.9, fiber: 1.8, category: "Grains" },
  { id: "quinoa_cooked", name: "Quinoa, Cooked", servingSize: 100, servingUnit: "g", calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, category: "Grains" },
  { id: "bagel_plain", name: "Bagel, Plain", servingSize: 1, servingUnit: "piece", calories: 245, protein: 10, carbs: 48, fat: 1.5, fiber: 2, category: "Grains" },
  { id: "tortilla_flour", name: "Flour Tortilla", servingSize: 1, servingUnit: "piece", calories: 138, protein: 4, carbs: 22, fat: 4, fiber: 1.3, category: "Grains" },

  // ── FRUIT ─────────────────────────────────────────────────────────────
  { id: "banana_medium", name: "Banana, Medium", servingSize: 1, servingUnit: "piece", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, category: "Fruit" },
  { id: "apple_medium", name: "Apple, Medium", servingSize: 1, servingUnit: "piece", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, category: "Fruit" },
  { id: "blueberries", name: "Blueberries", servingSize: 100, servingUnit: "g", calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, category: "Fruit" },
  { id: "strawberries", name: "Strawberries", servingSize: 100, servingUnit: "g", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, category: "Fruit" },
  { id: "orange_medium", name: "Orange, Medium", servingSize: 1, servingUnit: "piece", calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, category: "Fruit" },
  { id: "grapes", name: "Grapes", servingSize: 100, servingUnit: "g", calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9, category: "Fruit" },

  // ── VEGETABLES ────────────────────────────────────────────────────────
  { id: "broccoli", name: "Broccoli, Cooked", servingSize: 100, servingUnit: "g", calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3, category: "Vegetables" },
  { id: "spinach_raw", name: "Spinach, Raw", servingSize: 100, servingUnit: "g", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, category: "Vegetables" },
  { id: "sweet_potato", name: "Sweet Potato, Baked", servingSize: 100, servingUnit: "g", calories: 90, protein: 2, carbs: 21, fat: 0.2, fiber: 3.3, category: "Vegetables" },
  { id: "potato_baked", name: "Potato, Baked", servingSize: 100, servingUnit: "g", calories: 93, protein: 2.5, carbs: 21, fat: 0.1, fiber: 2.2, category: "Vegetables" },
  { id: "carrot", name: "Carrot, Raw", servingSize: 100, servingUnit: "g", calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, category: "Vegetables" },
  { id: "avocado", name: "Avocado", servingSize: 100, servingUnit: "g", calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, category: "Vegetables" },

  // ── NUTS & SEEDS ──────────────────────────────────────────────────────
  { id: "almonds", name: "Almonds", servingSize: 28, servingUnit: "g", calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, category: "Nuts & Seeds" },
  { id: "peanut_butter", name: "Peanut Butter", servingSize: 1, servingUnit: "tbsp", calories: 94, protein: 4, carbs: 3, fat: 8, fiber: 1, category: "Nuts & Seeds" },
  { id: "walnuts", name: "Walnuts", servingSize: 28, servingUnit: "g", calories: 185, protein: 4.3, carbs: 3.9, fat: 18, fiber: 1.9, category: "Nuts & Seeds" },
  { id: "chia_seeds", name: "Chia Seeds", servingSize: 28, servingUnit: "g", calories: 138, protein: 4.7, carbs: 12, fat: 8.7, fiber: 9.8, category: "Nuts & Seeds" },

  // ── FATS & OILS ───────────────────────────────────────────────────────
  { id: "olive_oil", name: "Olive Oil", servingSize: 1, servingUnit: "tbsp", calories: 119, protein: 0, carbs: 0, fat: 14, category: "Fats & Oils" },
  { id: "coconut_oil", name: "Coconut Oil", servingSize: 1, servingUnit: "tbsp", calories: 117, protein: 0, carbs: 0, fat: 14, category: "Fats & Oils" },

  // ── BEVERAGES ─────────────────────────────────────────────────────────
  { id: "orange_juice", name: "Orange Juice", servingSize: 240, servingUnit: "ml", calories: 112, protein: 1.7, carbs: 26, fat: 0.5, fiber: 0.5, category: "Beverages" },
  { id: "black_coffee", name: "Coffee, Black", servingSize: 240, servingUnit: "ml", calories: 2, protein: 0.3, carbs: 0, fat: 0, category: "Beverages" },
  { id: "cola", name: "Cola", servingSize: 355, servingUnit: "ml", calories: 140, protein: 0, carbs: 39, fat: 0, category: "Beverages" },

  // ── SNACKS ────────────────────────────────────────────────────────────
  { id: "protein_bar", name: "Protein Bar", brand: "Generic", servingSize: 1, servingUnit: "piece", calories: 210, protein: 20, carbs: 22, fat: 7, fiber: 6, category: "Snacks" },
  { id: "dark_chocolate", name: "Dark Chocolate 70%", servingSize: 28, servingUnit: "g", calories: 170, protein: 2.2, carbs: 13, fat: 12, fiber: 3, category: "Snacks" },
  { id: "potato_chips", name: "Potato Chips", servingSize: 28, servingUnit: "g", calories: 152, protein: 2, carbs: 15, fat: 10, fiber: 1.2, category: "Snacks" },

  // ── PREPARED ──────────────────────────────────────────────────────────
  { id: "cheese_pizza_slice", name: "Cheese Pizza", servingSize: 1, servingUnit: "slice", calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2.5, category: "Prepared" },
  { id: "hamburger", name: "Hamburger", servingSize: 1, servingUnit: "piece", calories: 354, protein: 20, carbs: 29, fat: 17, fiber: 1.5, category: "Prepared" },
  { id: "caesar_salad", name: "Caesar Salad w/ Chicken", servingSize: 1, servingUnit: "cup", calories: 190, protein: 14, carbs: 7, fat: 12, fiber: 2, category: "Prepared" },

  // ── CONDIMENTS ────────────────────────────────────────────────────────
  { id: "ketchup", name: "Ketchup", servingSize: 1, servingUnit: "tbsp", calories: 17, protein: 0.2, carbs: 4.5, fat: 0, category: "Condiments" },
  { id: "mayonnaise", name: "Mayonnaise", servingSize: 1, servingUnit: "tbsp", calories: 94, protein: 0.1, carbs: 0.1, fat: 10, category: "Condiments" },
  { id: "soy_sauce", name: "Soy Sauce", servingSize: 1, servingUnit: "tbsp", calories: 9, protein: 1.3, carbs: 0.8, fat: 0, category: "Condiments" },
  { id: "honey", name: "Honey", servingSize: 1, servingUnit: "tbsp", calories: 64, protein: 0.1, carbs: 17, fat: 0, category: "Condiments" },
];

// Pure search/filter over a catalog (defaults to the bundled FOODS). Matches the
// query against name + brand, and optionally narrows to a single category.
export const searchFoods = (
  query: string,
  category: FoodCategory | "All",
  catalog: Food[] = FOODS
): Food[] => {
  const q = query.trim().toLowerCase();
  return catalog.filter((f) => {
    const matchText =
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.brand?.toLowerCase().includes(q) ?? false);
    const matchCat = category === "All" || f.category === category;
    return matchText && matchCat;
  });
};
