const IngredientProcessor = require('./IngredientProcessor');

class ShoppingListGenerator {
  constructor() {
    this.processor = new IngredientProcessor();
  }

  generateFromRecipe(recipe) {
    // Validate recipe
    if (!recipe || typeof recipe !== 'object') {
      return { success: false, error: 'Invalid recipe object' };
    }

    if (!recipe.title) {
      return { success: false, error: 'Recipe must have a title' };
    }

    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
      return { success: false, error: 'Invalid recipe ingredients' };
    }

    if (recipe.ingredients.length === 0) {
      return { success: false, error: 'Recipe has no ingredients' };
    }

    try {
      // Process ingredients
      const processedIngredients = recipe.ingredients
        .map(ingredient => this.processor.parseIngredient(ingredient))
        .filter(ingredient => ingredient !== null);

      const title = `${recipe.title} - Shopping List`;
      const recipeIds = [recipe.id];

      const shoppingList = this.createShoppingListObject(processedIngredients, title, recipeIds);

      return {
        success: true,
        shoppingList
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate shopping list: ${error.message}`
      };
    }
  }

  generateFromMultipleRecipes(recipes, customTitle = null) {
    // Validate input
    if (!Array.isArray(recipes)) {
      return { success: false, error: 'Recipes must be an array' };
    }

    if (recipes.length === 0) {
      return { success: false, error: 'No recipes provided' };
    }

    try {
      // Collect all ingredients from all recipes
      const allIngredients = [];
      const recipeIds = [];

      for (const recipe of recipes) {
        if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
          continue; // Skip invalid recipes
        }

        recipeIds.push(recipe.id);

        const processedIngredients = recipe.ingredients
          .map(ingredient => this.processor.parseIngredient(ingredient))
          .filter(ingredient => ingredient !== null);

        allIngredients.push(...processedIngredients);
      }

      if (allIngredients.length === 0) {
        return { success: false, error: 'No valid ingredients found in recipes' };
      }

      // Consolidate duplicate ingredients
      const consolidatedIngredients = this.processor.consolidateIngredients(allIngredients);

      const title = customTitle || 'Combined Recipes - Shopping List';
      const shoppingList = this.createShoppingListObject(consolidatedIngredients, title, recipeIds);

      return {
        success: true,
        shoppingList
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate shopping list: ${error.message}`
      };
    }
  }

  organizeByCategory(items) {
    if (!Array.isArray(items)) {
      return {};
    }

    const organized = {};

    items.forEach(item => {
      const category = item.category || 'pantry';
      
      if (!organized[category]) {
        organized[category] = [];
      }
      
      organized[category].push(item);
    });

    return organized;
  }

  formatForDisplay(shoppingList, options = {}) {
    if (!shoppingList || !shoppingList.title) {
      return 'Invalid shopping list';
    }

    let output = `${shoppingList.title}\n`;
    output += '='.repeat(shoppingList.title.length) + '\n\n';

    if (options.organizeByCategory && shoppingList.organized) {
      // Format by categories
      const categories = Object.keys(shoppingList.organized);
      
      categories.forEach(category => {
        output += `${category.toUpperCase()}:\n`;
        
        shoppingList.organized[category].forEach(item => {
          output += `• ${this.formatItem(item)}\n`;
        });
        
        output += '\n';
      });
    } else if (shoppingList.items) {
      // Format as simple list
      shoppingList.items.forEach(item => {
        output += `• ${this.formatItem(item)}\n`;
      });
    }

    if (shoppingList.recipes && shoppingList.recipes.length > 0) {
      output += `\nFrom ${shoppingList.recipes.length} recipe(s)`;
    }

    return output;
  }

  formatItem(item) {
    if (!item || !item.item) {
      return 'Unknown item';
    }

    let formatted = '';

    if (item.quantity !== null) {
      formatted += item.quantity;
      
      if (item.unit) {
        formatted += ` ${item.unit}`;
      }
      
      formatted += ' ';
    }

    formatted += item.item;

    return formatted;
  }

  createShoppingListObject(items, title, recipeIds) {
    const organized = this.organizeByCategory(items);

    return {
      title,
      items,
      organized,
      recipes: recipeIds,
      itemCount: items.length,
      createdAt: new Date()
    };
  }

  // Validation helper methods
  validateRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object') {
      return { isValid: false, error: 'Invalid recipe object' };
    }

    if (!recipe.title || typeof recipe.title !== 'string') {
      return { isValid: false, error: 'Recipe must have a valid title' };
    }

    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
      return { isValid: false, error: 'Recipe must have ingredients array' };
    }

    if (recipe.ingredients.length === 0) {
      return { isValid: false, error: 'Recipe must have at least one ingredient' };
    }

    return { isValid: true };
  }
}

module.exports = ShoppingListGenerator;