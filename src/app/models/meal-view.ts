export interface FoodInfo {
  weight?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  allergens?: string;
  infoRU?: string;
  infoRS?: string;
  vegeterian?: boolean;
  price?: number;
  shelfLife?: string | number;
}

export interface MealView {
  index: number;
  icon: string;
  name: string;
  primary: string;
  secondary: string;
  info?: FoodInfo;
  checked: boolean;
  nutrition: string[];
  hasNutrition: boolean;
}

export function mealNames(name: string): { primary: string; secondary: string } {
  const names = name.split(/(?<=[\s+\p{Script=Cyrillic}])[\/\\](?=[\s+\p{Script=Latin}])/u);
  return { primary: names[1] || names[0], secondary: names[1] ? names[0] : '' };
}
