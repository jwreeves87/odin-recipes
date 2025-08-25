class ShoppingListValidator {
  constructor() {
    this.validCategories = ['meat', 'vegetables', 'pantry', 'spices', 'dairy'];
    this.validUnits = [
      'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'tsp', 'teaspoon', 'teaspoons',
      'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz',
      'gram', 'grams', 'g', 'kilogram', 'kilograms', 'kg',
      'pint', 'pints', 'pt', 'quart', 'quarts', 'qt',
      'gallon', 'gallons', 'gal', 'liter', 'liters', 'l',
      'inch', 'inches', 'in'
    ];
    this.maxListNameLength = 200;
    this.maxRecipeIds = 50;
  }

  validateShoppingListRequest(request) {
    const errors = [];
    const warnings = [];

    if (!request || typeof request !== 'object') {
      return { isValid: false, errors: ['Invalid request object'] };
    }

    // Validate recipe IDs
    if (!request.recipeIds) {
      errors.push('Recipe IDs are required');
    } else if (!Array.isArray(request.recipeIds)) {
      errors.push('Recipe IDs must be an array');
    } else if (request.recipeIds.length === 0) {
      errors.push('At least one recipe ID is required');
    } else if (request.recipeIds.length > this.maxRecipeIds) {
      errors.push(`Cannot process more than ${this.maxRecipeIds} recipes at once`);
    } else {
      // Validate individual recipe IDs
      const invalidIds = request.recipeIds.filter(id => !this.validateRecipeId(id).isValid);
      if (invalidIds.length > 0) {
        errors.push('All recipe IDs must be non-empty strings');
      }
    }

    // Validate list name
    let sanitizedListName = '';
    if (request.listName) {
      sanitizedListName = this.sanitizeHtml(request.listName).trim();
      if (sanitizedListName.length > this.maxListNameLength) {
        errors.push(`List name must be ${this.maxListNameLength} characters or less`);
      }
    }

    // Validate options
    const sanitizedOptions = {};
    if (request.options && typeof request.options === 'object') {
      // Validate scale multiplier
      if (request.options.scaleMultiplier !== undefined) {
        if (typeof request.options.scaleMultiplier !== 'number' || 
            request.options.scaleMultiplier <= 0 || 
            !isFinite(request.options.scaleMultiplier)) {
          errors.push('Scale multiplier must be a positive number');
        } else {
          sanitizedOptions.scaleMultiplier = request.options.scaleMultiplier;
        }
      }

      // Validate category filter
      if (request.options.categoryFilter !== undefined) {
        if (!Array.isArray(request.options.categoryFilter)) {
          errors.push('Category filter must be an array');
        } else if (request.options.categoryFilter.length === 0) {
          errors.push('Category filter cannot be empty');
        } else {
          const invalidCategories = request.options.categoryFilter.filter(cat => 
            typeof cat !== 'string' || cat.trim() === '' || !this.validCategories.includes(cat)
          );
          if (invalidCategories.length > 0) {
            errors.push(`Invalid categories: ${invalidCategories.join(', ')}`);
          } else {
            sanitizedOptions.categoryFilter = request.options.categoryFilter;
          }
        }
      }

      // Copy other boolean options
      ['organizeByCategory', 'includeMetadata'].forEach(option => {
        if (request.options[option] !== undefined) {
          sanitizedOptions[option] = Boolean(request.options[option]);
        }
      });
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (result.isValid) {
      result.sanitizedData = {
        recipeIds: request.recipeIds.filter(id => this.validateRecipeId(id).isValid),
        listName: sanitizedListName || undefined,
        options: sanitizedOptions
      };
    }

    if (errors.length > 0) {
      result.details = 'Request validation failed';
    }

    return result;
  }

  validateShoppingList(shoppingList) {
    const errors = [];
    const warnings = [];

    if (!shoppingList || typeof shoppingList !== 'object') {
      return { isValid: false, errors: ['Invalid shopping list object'] };
    }

    // Validate title
    if (!shoppingList.title || typeof shoppingList.title !== 'string') {
      errors.push('Shopping list must have a title');
    }

    // Validate items
    if (!shoppingList.items) {
      errors.push('Shopping list must have items');
    } else if (!Array.isArray(shoppingList.items)) {
      errors.push('Shopping list items must be an array');
    } else if (shoppingList.items.length === 0) {
      errors.push('Shopping list must have at least one item');
    } else {
      // Validate individual items
      shoppingList.items.forEach((item, index) => {
        const itemErrors = this.validateShoppingListItem(item, index + 1);
        errors.push(...itemErrors);
      });
    }

    if (errors.length === 0) {
      // Create sanitized version
      const sanitizedList = {
        title: this.sanitizeHtml(shoppingList.title),
        items: shoppingList.items.map(item => this.sanitizeShoppingListItem(item)),
        recipes: shoppingList.recipes || [],
        organized: shoppingList.organized || {},
        itemCount: shoppingList.items.length,
        createdAt: shoppingList.createdAt || new Date()
      };

      return {
        isValid: true,
        sanitizedList,
        warnings
      };
    }

    return {
      isValid: false,
      errors,
      warnings
    };
  }

  validateShoppingListItem(item, itemNumber) {
    const errors = [];

    if (!item || typeof item !== 'object') {
      errors.push(`Item ${itemNumber}: must be an object`);
      return errors;
    }

    // Validate item name (required)
    if (!item.item || typeof item.item !== 'string' || item.item.trim() === '') {
      errors.push(`Item ${itemNumber}: item name is required`);
    }

    // Validate quantity (optional, but must be number or null if present)
    if (item.quantity !== null && item.quantity !== undefined) {
      if (typeof item.quantity !== 'number' || !isFinite(item.quantity) || item.quantity < 0) {
        errors.push(`Item ${itemNumber}: quantity must be a number or null`);
      }
    }

    // Validate unit (optional, but must be string or null if present)
    if (item.unit !== null && item.unit !== undefined) {
      if (typeof item.unit !== 'string') {
        errors.push(`Item ${itemNumber}: unit must be a string or null`);
      }
    }

    return errors;
  }

  sanitizeShoppingListItem(item) {
    return {
      quantity: item.quantity,
      unit: item.unit ? item.unit.trim() : null,
      item: this.sanitizeHtml(item.item),
      category: item.category ? item.category.trim() : 'pantry',
      originalText: item.originalText || undefined,
      consolidated: item.consolidated || false
    };
  }

  validateRecipeId(id) {
    if (!id || typeof id !== 'string') {
      return { isValid: false, error: 'Recipe ID must be a non-empty string' };
    }

    const trimmedId = id.trim();
    if (trimmedId.length < 2) {
      return { isValid: false, error: 'Recipe ID must be at least 2 characters' };
    }

    if (trimmedId.length > 100) {
      return { isValid: false, error: 'Recipe ID must be 100 characters or less' };
    }

    // Allow alphanumeric, dashes, underscores, and dots
    const validIdPattern = /^[a-zA-Z0-9._-]+$/;
    if (!validIdPattern.test(trimmedId)) {
      return { isValid: false, error: 'Recipe ID contains invalid characters' };
    }

    return { isValid: true, sanitizedId: trimmedId };
  }

  sanitizeHtml(input) {
    if (!input) return '';
    
    return input.toString()
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags and content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, '') // Remove HTML entities
      .trim();
  }

  validateQuantity(quantity) {
    if (quantity === null || quantity === undefined) {
      return { isValid: true, sanitizedQuantity: null };
    }

    if (typeof quantity !== 'number' || !isFinite(quantity) || quantity < 0) {
      return { 
        isValid: false, 
        error: 'Quantity must be a positive number or null' 
      };
    }

    return { isValid: true, sanitizedQuantity: quantity };
  }

  validateUnit(unit) {
    if (unit === null || unit === undefined) {
      return { isValid: true, sanitizedUnit: null };
    }

    if (typeof unit !== 'string') {
      return { isValid: false, error: 'Unit must be a string or null' };
    }

    const trimmedUnit = unit.trim().toLowerCase();
    if (trimmedUnit === '') {
      return { isValid: false, error: 'Unit cannot be empty string' };
    }

    // Check if it's a known unit
    if (this.validUnits.includes(trimmedUnit)) {
      return { isValid: true, sanitizedUnit: trimmedUnit };
    }

    // Allow custom units with warning
    return { 
      isValid: true, 
      sanitizedUnit: trimmedUnit,
      warning: `Unknown unit: ${unit}. Using as-is.`
    };
  }

  validateCategory(category) {
    if (!category) {
      return { isValid: true, sanitizedCategory: 'pantry' };
    }

    if (typeof category !== 'string') {
      return { isValid: true, sanitizedCategory: 'pantry' };
    }

    const trimmedCategory = category.trim().toLowerCase();
    
    if (this.validCategories.includes(trimmedCategory)) {
      return { isValid: true, sanitizedCategory: trimmedCategory };
    }

    // Default to pantry for unknown categories
    return { 
      isValid: true, 
      sanitizedCategory: 'pantry',
      warning: `Unknown category: ${category}. Defaulting to pantry.`
    };
  }

  // Utility method to validate entire recipe object
  validateRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object') {
      return { isValid: false, error: 'Recipe must be an object' };
    }

    if (!recipe.title || typeof recipe.title !== 'string' || recipe.title.trim() === '') {
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

module.exports = ShoppingListValidator;