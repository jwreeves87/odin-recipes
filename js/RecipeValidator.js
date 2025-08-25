class RecipeValidator {
  constructor() {
    this.validationRules = {
      maxTitleLength: 200,
      maxDescriptionLength: 1000,
      maxIngredients: 100,
      maxInstructions: 50,
      maxIngredientLength: 500,
      maxInstructionLength: 1000,
      protectedFields: ['id', 'filename', 'createdAt'],
      requiredFields: ['title', 'ingredients', 'instructions']
    };
  }

  validateForCreate(recipeData) {
    const errors = [];
    const sanitized = this.sanitizeInput(recipeData);

    // Validate title first
    if (!sanitized.title || typeof sanitized.title !== 'string' || sanitized.title.trim() === '') {
      errors.push('Title is required');
    } else if (sanitized.title.length > this.validationRules.maxTitleLength) {
      errors.push(`Title must be ${this.validationRules.maxTitleLength} characters or less`);
    }

    // Check for empty title specifically
    if (sanitized.title === '') {
      errors.push('Title cannot be empty');
    }

    // Validate description
    if (sanitized.description && sanitized.description.length > this.validationRules.maxDescriptionLength) {
      errors.push(`Description must be ${this.validationRules.maxDescriptionLength} characters or less`);
    }

    // Validate ingredients
    if (!sanitized.ingredients || !Array.isArray(sanitized.ingredients) || sanitized.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    } else if (sanitized.ingredients.length > this.validationRules.maxIngredients) {
      errors.push(`Cannot have more than ${this.validationRules.maxIngredients} ingredients`);
    } else {
      sanitized.ingredients.forEach((ingredient, index) => {
        if (ingredient && ingredient.length > this.validationRules.maxIngredientLength) {
          errors.push(`Ingredient ${index + 1} is too long (max ${this.validationRules.maxIngredientLength} characters)`);
        }
      });
    }

    // Validate instructions
    if (!sanitized.instructions || !Array.isArray(sanitized.instructions) || sanitized.instructions.length === 0) {
      errors.push('At least one instruction is required');
    } else if (sanitized.instructions.length > this.validationRules.maxInstructions) {
      errors.push(`Cannot have more than ${this.validationRules.maxInstructions} instructions`);
    } else {
      sanitized.instructions.forEach((instruction, index) => {
        if (instruction && instruction.length > this.validationRules.maxInstructionLength) {
          errors.push(`Instruction ${index + 1} is too long (max ${this.validationRules.maxInstructionLength} characters)`);
        }
      });
    }

    // Validate URL if provided
    if (sanitized.sourceUrl && !this.isValidUrl(sanitized.sourceUrl)) {
      errors.push('Source URL must be a valid URL');
    }

    // Validate servings if provided
    if (sanitized.servings && !this.validateServings(sanitized.servings)) {
      errors.push('Servings must be a valid number or range');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      sanitizedData: sanitized
    };
  }

  validateForUpdate(updates) {
    const errors = [];
    const sanitized = this.sanitizeInput(updates);

    // Check for protected fields
    this.validationRules.protectedFields.forEach(field => {
      if (updates.hasOwnProperty(field)) {
        errors.push(`Cannot update protected field: ${field}`);
      }
    });

    // Validate fields that are being updated (skip empty/undefined values)
    if (sanitized.hasOwnProperty('title') && sanitized.title !== undefined) {
      if (sanitized.title === '' || (typeof sanitized.title === 'string' && sanitized.title.trim() === '')) {
        errors.push('Title cannot be empty');
      } else if (sanitized.title.length > this.validationRules.maxTitleLength) {
        errors.push(`Title must be ${this.validationRules.maxTitleLength} characters or less`);
      }
    }

    if (sanitized.hasOwnProperty('description') && sanitized.description && 
        sanitized.description.length > this.validationRules.maxDescriptionLength) {
      errors.push(`Description must be ${this.validationRules.maxDescriptionLength} characters or less`);
    }

    if (sanitized.hasOwnProperty('ingredients') && sanitized.ingredients !== undefined) {
      if (!Array.isArray(sanitized.ingredients) || sanitized.ingredients.length === 0) {
        errors.push('At least one ingredient is required');
      } else if (sanitized.ingredients.length > this.validationRules.maxIngredients) {
        errors.push(`Cannot have more than ${this.validationRules.maxIngredients} ingredients`);
      }
    }

    if (sanitized.hasOwnProperty('instructions') && sanitized.instructions !== undefined) {
      if (!Array.isArray(sanitized.instructions) || sanitized.instructions.length === 0) {
        errors.push('At least one instruction is required');
      } else if (sanitized.instructions.length > this.validationRules.maxInstructions) {
        errors.push(`Cannot have more than ${this.validationRules.maxInstructions} instructions`);
      }
    }

    if (sanitized.hasOwnProperty('sourceUrl') && sanitized.sourceUrl && !this.isValidUrl(sanitized.sourceUrl)) {
      errors.push('Source URL must be a valid URL');
    }

    if (sanitized.hasOwnProperty('servings') && sanitized.servings && !this.validateServings(sanitized.servings)) {
      errors.push('Servings must be a valid number or range');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      sanitizedData: sanitized
    };
  }

  validateServings(servings) {
    if (!servings) return true; // Optional field
    
    const servingPattern = /^([1-9]\d?(?:\s*[-to]\s*[1-9]\d?)?(?:\s*servings?)?|([1-9]\d?)\s+to\s+([1-9]\d?))$/i;
    return servingPattern.test(servings.toString().trim());
  }

  sanitizeInput(input) {
    if (!input || typeof input !== 'object') {
      return {};
    }

    const sanitized = { ...input };

    // Sanitize string fields
    ['title', 'description', 'author', 'prepTime', 'cookTime', 'servings', 'sourceUrl', 'image'].forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = this.sanitizeString(sanitized[field]);
      }
    });

    // Sanitize array fields
    if (sanitized.ingredients && Array.isArray(sanitized.ingredients)) {
      sanitized.ingredients = sanitized.ingredients
        .map(ingredient => this.sanitizeString(ingredient))
        .filter(ingredient => ingredient && ingredient.trim() !== '');
    }

    if (sanitized.instructions && Array.isArray(sanitized.instructions)) {
      sanitized.instructions = sanitized.instructions
        .map(instruction => this.sanitizeString(instruction))
        .filter(instruction => instruction && instruction.trim() !== '');
    }

    return sanitized;
  }

  sanitizeString(str) {
    if (!str) return '';
    
    // Convert to string and trim whitespace
    let sanitized = str.toString().trim();
    
    // Remove HTML tags (basic XSS protection) - more thorough removal
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    return sanitized;
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getValidationRules() {
    return { ...this.validationRules };
  }
}

module.exports = RecipeValidator;