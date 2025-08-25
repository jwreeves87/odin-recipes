const ShoppingListGenerator = require('./ShoppingListGenerator');
const ReminderFormatter = require('./ReminderFormatter');
const ShoppingListValidator = require('./ShoppingListValidator');

class ShoppingListManager {
  constructor(recipeRepository, validator = null) {
    this.recipeRepository = recipeRepository;
    this.generator = new ShoppingListGenerator();
    this.formatter = new ReminderFormatter();
    this.validator = validator || new ShoppingListValidator();
    this.savedLists = new Map(); // In-memory storage for saved lists
  }

  async generateFromSingleRecipe(recipeId, options = {}) {
    try {
      // Retrieve recipe from repository
      const recipe = await this.recipeRepository.findById(recipeId);
      
      if (!recipe) {
        return { success: false, error: 'Recipe not found' };
      }

      // Validate recipe data
      const recipeValidation = this.validateRecipe(recipe);
      if (!recipeValidation.isValid) {
        return { success: false, error: `Invalid recipe data: ${recipeValidation.error}` };
      }

      // Generate shopping list
      const listResult = this.generator.generateFromRecipe(recipe);
      
      if (!listResult.success) {
        return listResult;
      }

      // Apply custom list name if provided
      if (options.listName) {
        listResult.shoppingList.title = options.listName;
      }

      // Apply scaling if requested
      if (options.scaleMultiplier && options.scaleMultiplier !== 1) {
        const scaledResult = this.scaleQuantities(listResult.shoppingList, options.scaleMultiplier);
        if (!scaledResult.success) {
          return scaledResult;
        }
        listResult.shoppingList = scaledResult.shoppingList;
      }

      return {
        success: true,
        shoppingList: listResult.shoppingList
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve recipe',
        details: error.message
      };
    }
  }

  async generateFromMultipleRecipes(recipeIds, options = {}) {
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return { success: false, error: 'No recipe IDs provided' };
    }

    // Validate request if validator is available
    if (this.validator) {
      const validation = this.validator.validateShoppingListRequest({
        recipeIds,
        listName: options.listName,
        options
      });

      if (!validation.isValid) {
        return { success: false, error: validation.errors[0] };
      }
    }

    try {
      const recipes = [];
      const warnings = [];

      // Retrieve all recipes
      for (const recipeId of recipeIds) {
        const recipe = await this.recipeRepository.findById(recipeId);
        
        if (recipe) {
          const recipeValidation = this.validateRecipe(recipe);
          if (recipeValidation.isValid) {
            recipes.push(recipe);
          } else {
            warnings.push(`Invalid recipe data for ${recipeId}: ${recipeValidation.error}`);
          }
        } else {
          warnings.push(`Recipe not found: ${recipeId}`);
        }
      }

      if (recipes.length === 0) {
        return { success: false, error: 'No valid recipes found' };
      }

      // Generate consolidated shopping list
      const listName = options.listName || 'Combined Recipes - Shopping List';
      const listResult = this.generator.generateFromMultipleRecipes(recipes, listName);

      if (!listResult.success) {
        return listResult;
      }

      // Apply scaling if requested
      if (options.scaleMultiplier && options.scaleMultiplier !== 1) {
        const scaledResult = this.scaleQuantities(listResult.shoppingList, options.scaleMultiplier);
        if (!scaledResult.success) {
          return scaledResult;
        }
        listResult.shoppingList = scaledResult.shoppingList;
      }

      // Apply category filter if requested
      if (options.categoryFilter && Array.isArray(options.categoryFilter)) {
        const filteredResult = this.filterByCategory(listResult.shoppingList, options.categoryFilter);
        if (!filteredResult.success) {
          return filteredResult;
        }
        listResult.shoppingList = filteredResult.shoppingList;
      }

      const result = {
        success: true,
        shoppingList: listResult.shoppingList
      };

      if (warnings.length > 0) {
        result.warnings = warnings;
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate shopping list',
        details: error.message
      };
    }
  }

  async generateFromAllRecipes(options = {}) {
    try {
      const allRecipes = await this.recipeRepository.findAll();

      if (!allRecipes || allRecipes.length === 0) {
        return { success: false, error: 'No recipes available' };
      }

      const recipeIds = allRecipes.map(recipe => recipe.id);
      const listName = options.listName || 'All Recipes - Shopping List';

      return await this.generateFromMultipleRecipes(recipeIds, {
        ...options,
        listName
      });

    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve recipes',
        details: error.message
      };
    }
  }

  generateReminderUrl(shoppingList, options = {}) {
    return this.formatter.generateReminderUrl(shoppingList, options);
  }

  addIngredientsToExistingList(existingList, newRecipe) {
    if (!existingList || !existingList.items) {
      return { success: false, error: 'Invalid shopping list' };
    }

    if (!newRecipe || !newRecipe.ingredients) {
      return { success: false, error: 'Invalid recipe' };
    }

    try {
      // Generate list from new recipe
      const newListResult = this.generator.generateFromRecipe(newRecipe);
      
      if (!newListResult.success) {
        return newListResult;
      }

      // Combine items from both lists
      const allItems = [...existingList.items, ...newListResult.shoppingList.items];

      // Consolidate duplicate ingredients
      const consolidatedItems = this.generator.processor.consolidateIngredients(allItems);

      // Create updated shopping list
      const updatedList = {
        ...existingList,
        items: consolidatedItems,
        itemCount: consolidatedItems.length,
        recipes: [...(existingList.recipes || []), newRecipe.id],
        modifiedAt: new Date()
      };

      // Re-organize by category
      updatedList.organized = this.generator.organizeByCategory(consolidatedItems);

      return {
        success: true,
        shoppingList: updatedList
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to add ingredients',
        details: error.message
      };
    }
  }

  filterByCategory(shoppingList, categories) {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return { success: false, error: 'No categories specified' };
    }

    if (!shoppingList || !shoppingList.items) {
      return { success: false, error: 'Invalid shopping list' };
    }

    try {
      const filteredItems = shoppingList.items.filter(item => 
        categories.includes(item.category)
      );

      const filteredList = {
        ...shoppingList,
        title: `${shoppingList.title} (${categories.join(', ')})`,
        items: filteredItems,
        itemCount: filteredItems.length,
        organized: this.generator.organizeByCategory(filteredItems),
        filteredCategories: categories
      };

      return {
        success: true,
        shoppingList: filteredList
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to filter by category',
        details: error.message
      };
    }
  }

  scaleQuantities(shoppingList, multiplier) {
    if (typeof multiplier !== 'number' || multiplier <= 0) {
      return { success: false, error: 'Scale multiplier must be greater than 0' };
    }

    if (!shoppingList || !shoppingList.items) {
      return { success: false, error: 'Invalid shopping list' };
    }

    try {
      const scaledItems = shoppingList.items.map(item => ({
        ...item,
        quantity: item.quantity !== null ? item.quantity * multiplier : null,
        scaled: true,
        originalQuantity: item.quantity
      }));

      const scaledList = {
        ...shoppingList,
        title: `${shoppingList.title} (scaled ${multiplier}x)`,
        items: scaledItems,
        organized: this.generator.organizeByCategory(scaledItems),
        scaleMultiplier: multiplier,
        scaledAt: new Date()
      };

      return {
        success: true,
        shoppingList: scaledList
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to scale quantities',
        details: error.message
      };
    }
  }

  saveShoppingList(shoppingList, listId = null) {
    try {
      const id = listId || this.generateListId();
      const savedList = {
        listId: id,
        shoppingList,
        savedAt: new Date(),
        version: 1
      };

      this.savedLists.set(id, savedList);

      return {
        success: true,
        listId: id,
        savedAt: savedList.savedAt
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to save shopping list',
        details: error.message
      };
    }
  }

  getSavedLists() {
    try {
      const lists = Array.from(this.savedLists.values())
        .sort((a, b) => b.savedAt - a.savedAt);

      return {
        success: true,
        lists
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve saved lists',
        details: error.message
      };
    }
  }

  getSavedList(listId) {
    const savedList = this.savedLists.get(listId);
    
    if (!savedList) {
      return { success: false, error: 'Saved list not found' };
    }

    return {
      success: true,
      savedList
    };
  }

  deleteSavedList(listId) {
    const existed = this.savedLists.delete(listId);
    
    return {
      success: true,
      deleted: existed
    };
  }

  // Utility methods
  validateRecipe(recipe) {
    if (this.validator && typeof this.validator.validateRecipe === 'function') {
      return this.validator.validateRecipe(recipe);
    }
    
    // Basic validation fallback
    if (!recipe || typeof recipe !== 'object') {
      return { isValid: false, error: 'Recipe must be an object' };
    }
    if (!recipe.title || typeof recipe.title !== 'string' || recipe.title.trim() === '') {
      return { isValid: false, error: 'Recipe must have a valid title' };
    }
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      return { isValid: false, error: 'Recipe must have ingredients array' };
    }
    return { isValid: true };
  }

  generateListId() {
    return `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get statistics about shopping list generation
  getStatistics() {
    return {
      savedListsCount: this.savedLists.size,
      availableCategories: this.validator ? this.validator.validCategories : [],
      supportedUnits: this.validator ? this.validator.validUnits : []
    };
  }

  // Clear all saved lists (useful for testing)
  clearSavedLists() {
    this.savedLists.clear();
    return { success: true, message: 'All saved lists cleared' };
  }
}

module.exports = ShoppingListManager;