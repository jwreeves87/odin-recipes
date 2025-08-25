class RecipeFormValidator {
  constructor() {
    this.validationRules = {
      maxTitleLength: 200,
      maxDescriptionLength: 1000,
      maxIngredients: 100,
      maxInstructions: 50,
      maxIngredientLength: 500,
      maxInstructionLength: 1000,
      requiredFields: ['title', 'ingredients', 'instructions']
    };
    
    this.errorContainer = null;
  }

  validateForm(formData) {
    const errors = [];

    // Validate required fields
    this.validationRules.requiredFields.forEach(field => {
      if (!formData[field] || 
          (Array.isArray(formData[field]) && formData[field].length === 0) ||
          (typeof formData[field] === 'string' && formData[field].trim() === '')) {
        errors.push(this.getFieldDisplayName(field) + ' is required');
      }
    });

    // Validate title
    if (formData.title) {
      if (formData.title.length > this.validationRules.maxTitleLength) {
        errors.push(`Title must be ${this.validationRules.maxTitleLength} characters or less`);
      }
    }

    // Validate description
    if (formData.description && formData.description.length > this.validationRules.maxDescriptionLength) {
      errors.push(`Description must be ${this.validationRules.maxDescriptionLength} characters or less`);
    }

    // Validate ingredients
    if (formData.ingredients && Array.isArray(formData.ingredients)) {
      if (formData.ingredients.length > this.validationRules.maxIngredients) {
        errors.push(`Cannot have more than ${this.validationRules.maxIngredients} ingredients`);
      }
      
      formData.ingredients.forEach((ingredient, index) => {
        if (ingredient && ingredient.length > this.validationRules.maxIngredientLength) {
          errors.push(`Ingredient ${index + 1} is too long (max ${this.validationRules.maxIngredientLength} characters)`);
        }
      });
    }

    // Validate instructions
    if (formData.instructions && Array.isArray(formData.instructions)) {
      if (formData.instructions.length > this.validationRules.maxInstructions) {
        errors.push(`Cannot have more than ${this.validationRules.maxInstructions} instructions`);
      }
      
      formData.instructions.forEach((instruction, index) => {
        if (instruction && instruction.length > this.validationRules.maxInstructionLength) {
          errors.push(`Instruction ${index + 1} is too long (max ${this.validationRules.maxInstructionLength} characters)`);
        }
      });
    }

    // Validate URLs
    if (formData.sourceUrl && formData.sourceUrl.trim() && !this.isValidUrl(formData.sourceUrl)) {
      errors.push('Source URL must be a valid URL');
    }

    if (formData.image && formData.image.trim() && !this.isValidUrl(formData.image)) {
      errors.push('Image URL must be a valid URL');
    }

    // Validate servings
    if (formData.servings && !this.validateServings(formData.servings)) {
      errors.push('Servings must be a valid number or range (e.g., "4" or "6-8")');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  validateServings(servings) {
    if (!servings || !servings.trim()) return true; // Optional field
    
    const servingPattern = /^([1-9]\d?(?:\s*[-to]\s*[1-9]\d?)?(?:\s*servings?)?|([1-9]\d?)\s+to\s+([1-9]\d?))$/i;
    return servingPattern.test(servings.toString().trim());
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  getFieldDisplayName(fieldName) {
    const displayNames = {
      title: 'Title',
      description: 'Description',
      ingredients: 'Ingredients',
      instructions: 'Instructions',
      prepTime: 'Prep Time',
      cookTime: 'Cook Time',
      servings: 'Servings',
      author: 'Author',
      sourceUrl: 'Source URL',
      image: 'Image URL'
    };
    
    return displayNames[fieldName] || fieldName;
  }

  showErrors(errors) {
    this.clearErrors();
    
    if (!errors || errors.length === 0) {
      return;
    }

    // Find or create error container
    this.errorContainer = document.getElementById('error-messages') || this.createErrorContainer();
    
    // Create error list
    const errorList = document.createElement('ul');
    errorList.style.margin = '0';
    errorList.style.paddingLeft = '1.5rem';
    
    errors.forEach(error => {
      const listItem = document.createElement('li');
      listItem.textContent = error;
      listItem.style.marginBottom = '0.25rem';
      errorList.appendChild(listItem);
    });
    
    this.errorContainer.innerHTML = '<strong>Please correct the following errors:</strong>';
    this.errorContainer.appendChild(errorList);
    this.errorContainer.style.display = 'block';
    
    // Scroll to error messages
    this.errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Add visual indicators to form fields
    this.highlightErrorFields(errors);
  }

  clearErrors() {
    // Clear error container
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
      this.errorContainer.innerHTML = '';
    }
    
    // Remove field highlighting
    this.clearFieldHighlighting();
  }

  highlightErrorFields(errors) {
    const fieldMapping = {
      'Title': 'recipe-title',
      'Description': 'recipe-description',
      'Ingredients': 'recipe-ingredients',
      'Instructions': 'recipe-instructions',
      'Prep Time': 'recipe-prep-time',
      'Cook Time': 'recipe-cook-time',
      'Servings': 'recipe-servings',
      'Author': 'recipe-author',
      'Source URL': 'recipe-source-url',
      'Image URL': 'recipe-image'
    };
    
    errors.forEach(error => {
      for (const [fieldName, elementId] of Object.entries(fieldMapping)) {
        if (error.includes(fieldName)) {
          const element = document.getElementById(elementId);
          if (element) {
            element.style.borderColor = '#dc3545';
            element.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
          }
          break;
        }
      }
    });
  }

  clearFieldHighlighting() {
    const form = document.getElementById('recipe-form');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.style.borderColor = '';
      input.style.boxShadow = '';
    });
  }

  createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'error-messages';
    container.className = 'message';
    container.style.background = '#f8d7da';
    container.style.color = '#721c24';
    container.style.border = '1px solid #f5c6cb';
    container.style.padding = '1rem';
    container.style.borderRadius = 'var(--sl-border-radius-medium)';
    container.style.marginBottom = '1rem';
    container.style.display = 'none';
    
    // Insert before form
    const form = document.getElementById('recipe-form');
    if (form) {
      form.parentNode.insertBefore(container, form);
    }
    
    return container;
  }

  // Real-time validation for individual fields
  validateField(fieldName, value) {
    const errors = [];
    
    switch (fieldName) {
      case 'title':
        if (!value || value.trim() === '') {
          errors.push('Title is required');
        } else if (value.length > this.validationRules.maxTitleLength) {
          errors.push(`Title must be ${this.validationRules.maxTitleLength} characters or less`);
        }
        break;
        
      case 'description':
        if (value && value.length > this.validationRules.maxDescriptionLength) {
          errors.push(`Description must be ${this.validationRules.maxDescriptionLength} characters or less`);
        }
        break;
        
      case 'ingredients':
        const ingredients = Array.isArray(value) ? value : value.split('\n').filter(line => line.trim());
        if (ingredients.length === 0) {
          errors.push('At least one ingredient is required');
        } else if (ingredients.length > this.validationRules.maxIngredients) {
          errors.push(`Cannot have more than ${this.validationRules.maxIngredients} ingredients`);
        }
        break;
        
      case 'instructions':
        const instructions = Array.isArray(value) ? value : value.split('\n').filter(line => line.trim());
        if (instructions.length === 0) {
          errors.push('At least one instruction is required');
        } else if (instructions.length > this.validationRules.maxInstructions) {
          errors.push(`Cannot have more than ${this.validationRules.maxInstructions} instructions`);
        }
        break;
        
      case 'sourceUrl':
      case 'image':
        if (value && value.trim() && !this.isValidUrl(value)) {
          errors.push(`${this.getFieldDisplayName(fieldName)} must be a valid URL`);
        }
        break;
        
      case 'servings':
        if (value && !this.validateServings(value)) {
          errors.push('Servings must be a valid number or range');
        }
        break;
    }
    
    return errors;
  }

  // Setup real-time validation on form fields
  setupRealTimeValidation(form) {
    if (!form) return;
    
    const fields = form.querySelectorAll('input, textarea');
    
    fields.forEach(field => {
      field.addEventListener('blur', () => {
        const fieldName = field.name;
        const value = field.value;
        const errors = this.validateField(fieldName, value);
        
        // Clear previous highlighting for this field
        field.style.borderColor = '';
        field.style.boxShadow = '';
        
        // Apply highlighting if errors exist
        if (errors.length > 0) {
          field.style.borderColor = '#dc3545';
          field.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
        }
      });
      
      field.addEventListener('input', () => {
        // Clear error highlighting on input
        field.style.borderColor = '';
        field.style.boxShadow = '';
      });
    });
  }
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.RecipeFormValidator = RecipeFormValidator;
}

// Make available for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecipeFormValidator;
}