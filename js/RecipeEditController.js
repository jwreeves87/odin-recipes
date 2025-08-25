class RecipeEditController {
  constructor(formValidator = null) {
    this.validator = formValidator || new RecipeFormValidator();
    this.originalData = null;
    this.hasUnsavedChanges = false;
    
    // Get recipe ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    this.recipeId = urlParams.get('id');
    this.isEditing = !!this.recipeId;
    
    // Get DOM elements
    this.form = document.getElementById('recipe-form');
    this.saveButton = document.getElementById('save-button');
    this.cancelButton = document.getElementById('cancel-button');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.errorMessages = document.getElementById('error-messages');
    this.successMessage = document.getElementById('success-message');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadRecipe();
  }

  setupEventListeners() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveRecipe();
      });
    }

    if (this.cancelButton) {
      this.cancelButton.addEventListener('click', () => {
        this.handleCancel();
      });
    }

    // Track form changes for unsaved changes warning
    if (this.form) {
      this.form.addEventListener('input', () => {
        this.hasUnsavedChanges = true;
      });
    }

    // Warn about unsaved changes on page unload
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Delete button (if present)
    const deleteButton = document.getElementById('delete-button');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        this.deleteRecipe();
      });
    }
  }

  async loadRecipe() {
    if (!this.isEditing) {
      // New recipe mode - just set up empty form
      this.setupNewRecipeForm();
      return;
    }

    try {
      this.showLoading(true);
      
      const response = await fetch(`/api/recipes/${this.recipeId}`);
      const data = await response.json();

      if (data.success) {
        this.originalData = data.recipe;
        this.populateForm(data.recipe);
        this.hasUnsavedChanges = false;
      } else {
        this.showError('Failed to load recipe: ' + data.error);
      }
    } catch (error) {
      this.showError('Network error: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async saveRecipe() {
    try {
      this.clearMessages();
      
      // Validate form
      const formData = this.getFormData();
      const validation = this.validator.validateForm(formData);
      
      if (!validation.isValid) {
        this.validator.showErrors(validation.errors);
        return;
      }

      this.showLoading(true);

      // Determine API endpoint and method
      const url = this.isEditing ? `/api/recipes/${this.recipeId}` : '/api/recipes';
      const method = this.isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        this.hasUnsavedChanges = false;
        this.showSuccess(this.isEditing ? 'Recipe updated successfully!' : 'Recipe created successfully!');
        
        // Redirect to recipe page after short delay
        setTimeout(() => {
          window.location.href = `/recipes/${data.recipe.filename}`;
        }, 1500);
      } else {
        if (data.errors) {
          this.validator.showErrors(data.errors);
        } else {
          this.showError('Failed to save recipe: ' + (data.error || 'Unknown error'));
        }
      }
    } catch (error) {
      this.showError('Network error: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async deleteRecipe() {
    if (!this.isEditing) {
      return; // Cannot delete new recipe
    }

    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      return;
    }

    try {
      this.showLoading(true);
      
      const response = await fetch(`/api/recipes/${this.recipeId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Recipe deleted successfully!');
        this.hasUnsavedChanges = false;
        
        // Redirect to home page after short delay
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1500);
      } else {
        this.showError('Failed to delete recipe: ' + data.error);
      }
    } catch (error) {
      this.showError('Network error: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  getFormData() {
    const formData = {};
    
    // Get all form inputs
    const inputs = this.form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      const name = input.name;
      if (!name) return;
      
      let value = input.value.trim();
      
      // Special handling for arrays (ingredients and instructions)
      if (name === 'ingredients' || name === 'instructions') {
        value = value.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }
      
      formData[name] = value;
    });

    return formData;
  }

  populateForm(recipeData) {
    // Populate text inputs
    const textFields = ['title', 'description', 'prepTime', 'cookTime', 'servings', 'author', 'sourceUrl', 'image'];
    
    textFields.forEach(field => {
      const element = document.getElementById(`recipe-${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
      if (element && recipeData[field]) {
        element.value = recipeData[field];
      }
    });

    // Populate arrays (ingredients and instructions)
    const ingredientsElement = document.getElementById('recipe-ingredients');
    if (ingredientsElement && recipeData.ingredients) {
      ingredientsElement.value = recipeData.ingredients.join('\n');
    }

    const instructionsElement = document.getElementById('recipe-instructions');
    if (instructionsElement && recipeData.instructions) {
      instructionsElement.value = recipeData.instructions.join('\n');
    }
  }

  setupNewRecipeForm() {
    // Set page title for new recipe
    document.title = 'Create New Recipe - Reeves BBQ Co.';
    
    // Update button text
    if (this.saveButton) {
      this.saveButton.textContent = 'Create Recipe';
    }

    // Hide delete button for new recipes
    const deleteButton = document.getElementById('delete-button');
    if (deleteButton) {
      deleteButton.style.display = 'none';
    }
  }

  handleCancel() {
    if (this.hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }

    // Navigate back
    if (this.isEditing && this.originalData) {
      window.location.href = `/recipes/${this.originalData.filename}`;
    } else {
      window.location.href = '/index.html';
    }
  }

  canDelete() {
    return this.isEditing && this.recipeId;
  }

  showLoading(show) {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = show ? 'block' : 'none';
    }
    
    if (this.saveButton) {
      this.saveButton.disabled = show;
    }
  }

  showError(message) {
    this.clearMessages();
    if (this.errorMessages) {
      this.errorMessages.textContent = message;
      this.errorMessages.style.display = 'block';
    }
  }

  showSuccess(message) {
    this.clearMessages();
    if (this.successMessage) {
      this.successMessage.textContent = message;
      this.successMessage.style.display = 'block';
    }
  }

  clearMessages() {
    if (this.errorMessages) {
      this.errorMessages.style.display = 'none';
      this.errorMessages.textContent = '';
    }
    
    if (this.successMessage) {
      this.successMessage.style.display = 'none';
      this.successMessage.textContent = '';
    }
    
    // Clear validator errors too
    if (this.validator) {
      this.validator.clearErrors();
    }
  }
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.RecipeEditController = RecipeEditController;
}

// Make available for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecipeEditController;
}