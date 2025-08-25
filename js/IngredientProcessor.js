class IngredientProcessor {
  constructor() {
    this.unitMap = {
      // Volume
      'tbsp': 'tablespoon',
      'tablespoons': 'tablespoon',
      'tsp': 'teaspoon',
      'teaspoons': 'teaspoon',
      'cup': 'cup',
      'cups': 'cup',
      'pt': 'pint',
      'pint': 'pint',
      'pints': 'pint',
      'qt': 'quart',
      'quart': 'quart',
      'quarts': 'quart',
      'gal': 'gallon',
      'gallon': 'gallon',
      'gallons': 'gallon',
      
      // Weight
      'oz': 'ounce',
      'ounce': 'ounce',
      'ounces': 'ounce',
      'lb': 'pound',
      'lbs': 'pound',
      'pound': 'pound',
      'pounds': 'pound',
      
      // Length
      'in': 'inch',
      'inch': 'inch',
      'inches': 'inch'
    };

    this.categoryMap = {
      // Meat & Protein
      meat: ['beef', 'pork', 'chicken', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 
             'brisket', 'ribs', 'steak', 'ground beef', 'ground pork', 'bacon', 'sausage'],
      
      // Vegetables
      vegetables: ['onion', 'onions', 'carrot', 'carrots', 'celery', 'bell pepper', 'peppers',
                  'mushroom', 'mushrooms', 'tomato', 'tomatoes', 'potato', 'potatoes', 
                  'ginger', 'jalapeño', 'jalapeños'],
      
      // Spices & Seasonings
      spices: ['salt', 'pepper', 'paprika', 'cumin', 'chili powder', 'garlic powder', 
               'onion powder', 'oregano', 'thyme', 'rosemary', 'bay leaves', 'cayenne',
               'black pepper', 'white pepper', 'red pepper flakes', 'vanilla'],
      
      // Dairy
      dairy: ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'sour cream', 'cream cheese'],
      
      // Pantry staples (default category)
      pantry: ['flour', 'sugar', 'brown sugar', 'honey', 'oil', 'olive oil', 'vinegar',
               'soy sauce', 'worcestershire', 'ketchup', 'mustard', 'bbq sauce', 'sauce']
    };
  }

  parseIngredient(ingredientText) {
    if (!ingredientText || typeof ingredientText !== 'string') {
      return null;
    }

    const original = ingredientText.trim();
    let remaining = original.toLowerCase();

    // Try to extract quantity (handles fractions and mixed numbers)
    const quantityMatch = remaining.match(/^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)/);
    let quantity = null;
    
    if (quantityMatch) {
      quantity = this.parseFraction(quantityMatch[1]);
      remaining = remaining.substring(quantityMatch[0].length).trim();
    }

    // Try to extract unit
    const unitMatch = remaining.match(/^(\w+)/);
    let unit = null;

    if (unitMatch && quantity !== null) {
      const potentialUnit = unitMatch[1];
      const normalizedUnit = this.normalizeUnit(potentialUnit);
      
      // Only treat as unit if it's in our unit map
      if (this.unitMap[potentialUnit.toLowerCase()]) {
        unit = normalizedUnit; // Use normalized form
        remaining = remaining.substring(unitMatch[0].length).trim();
      }
    }

    // Remaining text is the ingredient item
    const item = remaining || original;
    const category = this.categorizeIngredient(item);

    return {
      quantity,
      unit,
      item,
      originalText: original,
      category
    };
  }

  consolidateIngredients(ingredients) {
    if (!Array.isArray(ingredients)) {
      return [];
    }

    const consolidated = new Map();

    ingredients.forEach(ingredient => {
      if (!ingredient || !ingredient.item) {
        return;
      }

      const key = `${ingredient.item}-${ingredient.unit || 'no-unit'}`;
      
      if (consolidated.has(key)) {
        const existing = consolidated.get(key);
        
        // Only consolidate if both have quantities
        if (existing.quantity !== null && ingredient.quantity !== null) {
          existing.quantity += ingredient.quantity;
          existing.consolidated = true;
        }
      } else {
        consolidated.set(key, { ...ingredient });
      }
    });

    return Array.from(consolidated.values());
  }

  normalizeUnit(unit) {
    if (!unit) return null;
    
    const normalized = this.unitMap[unit.toLowerCase()];
    return normalized || unit;
  }

  categorizeIngredient(item) {
    if (!item) return 'pantry';
    
    const lowerItem = item.toLowerCase();
    
    for (const [category, items] of Object.entries(this.categoryMap)) {
      for (const categoryItem of items) {
        if (lowerItem.includes(categoryItem)) {
          return category;
        }
      }
    }
    
    return 'pantry'; // Default category
  }

  parseFraction(fractionStr) {
    if (!fractionStr) return null;
    
    const str = fractionStr.toString().trim();
    
    // Handle mixed numbers (e.g., "2 1/2")
    const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const numerator = parseInt(mixedMatch[2]);
      const denominator = parseInt(mixedMatch[3]);
      return whole + (numerator / denominator);
    }
    
    // Handle simple fractions (e.g., "1/2")
    const fractionMatch = str.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1]);
      const denominator = parseInt(fractionMatch[2]);
      return numerator / denominator;
    }
    
    // Handle regular numbers (including decimals)
    const number = parseFloat(str);
    return isNaN(number) ? null : number;
  }
}

module.exports = IngredientProcessor;