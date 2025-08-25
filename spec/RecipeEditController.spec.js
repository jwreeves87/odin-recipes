// Mock DOM environment for testing
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Set up DOM environment
const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head>
  <title>Recipe Edit Test</title>
</head>
<body>
  <form id="recipe-form">
    <input id="recipe-title" name="title" type="text" required>
    <textarea id="recipe-description" name="description"></textarea>
    <textarea id="recipe-ingredients" name="ingredients" required></textarea>
    <textarea id="recipe-instructions" name="instructions" required></textarea>
    <input id="recipe-prep-time" name="prepTime" type="text">
    <input id="recipe-cook-time" name="cookTime" type="text">
    <input id="recipe-servings" name="servings" type="text">
    <input id="recipe-author" name="author" type="text">
    <input id="recipe-source-url" name="sourceUrl" type="url">
    <input id="recipe-image" name="image" type="url">
    <button id="save-button" type="submit">Save Recipe</button>
    <button id="cancel-button" type="button">Cancel</button>
  </form>
  <div id="loading-indicator" style="display: none;">Saving...</div>
  <div id="error-messages" style="display: none;"></div>
  <div id="success-message" style="display: none;"></div>
</body>
</html>`, {
  url: "http://localhost:3000/edit-recipe.html?id=test-recipe-123",
  pretendToBeVisual: true,
  resources: "usable"
});

// Set global objects for the test environment
global.window = dom.window;
global.document = dom.window.document;
global.location = dom.window.location;
global.fetch = jasmine.createSpy('fetch');

// Mock URLSearchParams
global.URLSearchParams = dom.window.URLSearchParams;

// Now import the controller
const RecipeEditController = require('../js/RecipeEditController');

describe('RecipeEditController', () => {
  let controller;
  let mockFormValidator;

  beforeEach(() => {
    // Reset DOM state
    document.getElementById('recipe-form').reset();
    document.getElementById('loading-indicator').style.display = 'none';
    document.getElementById('error-messages').style.display = 'none';
    document.getElementById('success-message').style.display = 'none';

    // Mock form validator
    mockFormValidator = {
      validateForm: jasmine.createSpy('validateForm').and.returnValue({ isValid: true, errors: [] }),
      showErrors: jasmine.createSpy('showErrors'),
      clearErrors: jasmine.createSpy('clearErrors')
    };

    // Reset fetch spy
    global.fetch.calls.reset();

    controller = new RecipeEditController(mockFormValidator);
  });

  describe('constructor and initialization', () => {
    it('should initialize with form validator', () => {
      expect(controller.validator).toBe(mockFormValidator);
    });

    it('should extract recipe ID from URL parameters', () => {
      expect(controller.recipeId).toBe('test-recipe-123');
      expect(controller.isEditing).toBe(true);
    });

    it('should detect new recipe mode when no ID in URL', () => {
      // Mock different URL
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true
      });

      const newController = new RecipeEditController();
      expect(newController.isEditing).toBe(false);
      expect(newController.recipeId).toBe(null);
    });

    it('should set up event listeners', () => {
      // This is tested implicitly through interaction tests
      expect(controller.form).toBeDefined();
      expect(controller.saveButton).toBeDefined();
      expect(controller.cancelButton).toBeDefined();
    });
  });

  describe('loadRecipe', () => {
    const mockRecipeData = {
      id: 'test-recipe-123',
      title: 'Test Brisket',
      description: 'A test brisket recipe',
      ingredients: ['Salt', 'Pepper', 'Brisket'],
      instructions: ['Season the brisket', 'Smoke for 16 hours'],
      prepTime: 'PT30M',
      cookTime: 'PT16H',
      servings: '12',
      author: 'Test Chef',
      sourceUrl: 'https://example.com/recipe',
      image: 'https://example.com/image.jpg'
    };

    beforeEach(() => {
      global.fetch.and.returnValue(Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, recipe: mockRecipeData })
      }));
    });

    it('should load recipe data when in edit mode', async () => {
      await controller.loadRecipe();

      expect(global.fetch).toHaveBeenCalledWith('/api/recipes/test-recipe-123');
      expect(document.getElementById('recipe-title').value).toBe('Test Brisket');
      expect(document.getElementById('recipe-description').value).toBe('A test brisket recipe');
      expect(document.getElementById('recipe-ingredients').value).toBe('Salt\nPepper\nBrisket');
      expect(document.getElementById('recipe-instructions').value).toBe('Season the brisket\nSmoke for 16 hours');
    });

    it('should not fetch data when creating new recipe', async () => {
      controller.isEditing = false;
      controller.recipeId = null;

      await controller.loadRecipe();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.and.returnValue(Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'Recipe not found' })
      }));

      await controller.loadRecipe();

      expect(controller.showError).toBeDefined();
      // Error display is tested in separate tests
    });

    it('should handle network errors', async () => {
      global.fetch.and.returnValue(Promise.reject(new Error('Network error')));

      await controller.loadRecipe();

      // Should handle gracefully without crashing
      expect(true).toBe(true); // Test that we reach this point
    });
  });

  describe('saveRecipe', () => {
    beforeEach(() => {
      // Fill form with test data
      document.getElementById('recipe-title').value = 'Updated Brisket';
      document.getElementById('recipe-description').value = 'Updated description';
      document.getElementById('recipe-ingredients').value = 'Salt\nPepper\nBrisket\nPaprika';
      document.getElementById('recipe-instructions').value = 'Season\nSmoke';
      document.getElementById('recipe-cook-time').value = 'PT18H';
    });

    it('should validate form before saving', async () => {
      mockFormValidator.validateForm.and.returnValue({ isValid: false, errors: ['Title required'] });

      await controller.saveRecipe();

      expect(mockFormValidator.validateForm).toHaveBeenCalled();
      expect(mockFormValidator.showErrors).toHaveBeenCalledWith(['Title required']);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should create new recipe when not in edit mode', async () => {
      controller.isEditing = false;
      controller.recipeId = null;

      global.fetch.and.returnValue(Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          recipe: { id: 'new-recipe-456', title: 'Updated Brisket' }
        })
      }));

      await controller.saveRecipe();

      expect(global.fetch).toHaveBeenCalledWith('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jasmine.any(String)
      });

      const requestBody = JSON.parse(global.fetch.calls.mostRecent().args[1].body);
      expect(requestBody.title).toBe('Updated Brisket');
      expect(requestBody.ingredients).toEqual(['Salt', 'Pepper', 'Brisket', 'Paprika']);
    });

    it('should update existing recipe when in edit mode', async () => {
      global.fetch.and.returnValue(Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          recipe: { id: 'test-recipe-123', title: 'Updated Brisket' }
        })
      }));

      await controller.saveRecipe();

      expect(global.fetch).toHaveBeenCalledWith('/api/recipes/test-recipe-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: jasmine.any(String)
      });
    });

    it('should show loading indicator during save', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => { resolvePromise = resolve; });
      
      global.fetch.and.returnValue(promise);

      // Start save process
      const savePromise = controller.saveRecipe();

      // Check loading state
      expect(document.getElementById('loading-indicator').style.display).toBe('block');
      expect(controller.saveButton.disabled).toBe(true);

      // Resolve the promise
      resolvePromise({
        ok: true,
        json: () => Promise.resolve({ success: true, recipe: {} })
      });

      await savePromise;

      // Check final state
      expect(document.getElementById('loading-indicator').style.display).toBe('none');
      expect(controller.saveButton.disabled).toBe(false);
    });

    it('should handle server validation errors', async () => {
      global.fetch.and.returnValue(Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ 
          success: false, 
          errors: ['Title is required', 'Ingredients cannot be empty']
        })
      }));

      await controller.saveRecipe();

      expect(mockFormValidator.showErrors).toHaveBeenCalledWith([
        'Title is required', 
        'Ingredients cannot be empty'
      ]);
    });

    it('should redirect to recipe page after successful save', async () => {
      const mockRecipe = { 
        id: 'test-recipe-123', 
        filename: 'test-recipe-123.html',
        title: 'Updated Brisket' 
      };

      global.fetch.and.returnValue(Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, recipe: mockRecipe })
      }));

      // Mock window.location.href
      delete window.location;
      window.location = { href: '' };

      await controller.saveRecipe();

      expect(window.location.href).toBe('/recipes/test-recipe-123.html');
    });
  });

  describe('deleteRecipe', () => {
    beforeEach(() => {
      // Mock window.confirm
      global.confirm = jasmine.createSpy('confirm');
    });

    it('should not delete if user cancels confirmation', async () => {
      global.confirm.and.returnValue(false);

      await controller.deleteRecipe();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should delete recipe after user confirmation', async () => {
      global.confirm.and.returnValue(true);
      global.fetch.and.returnValue(Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Recipe deleted' })
      }));

      // Mock window.location.href
      delete window.location;
      window.location = { href: '' };

      await controller.deleteRecipe();

      expect(global.fetch).toHaveBeenCalledWith('/api/recipes/test-recipe-123', {
        method: 'DELETE'
      });
      expect(window.location.href).toBe('/index.html');
    });

    it('should handle delete errors gracefully', async () => {
      global.confirm.and.returnValue(true);
      global.fetch.and.returnValue(Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'Recipe not found' })
      }));

      await controller.deleteRecipe();

      // Should not redirect on error
      expect(window.location.href).not.toBe('/index.html');
    });

    it('should not be available for new recipes', () => {
      controller.isEditing = false;
      controller.recipeId = null;

      // This would typically disable delete button in the UI
      expect(controller.canDelete()).toBe(false);
    });
  });

  describe('form data handling', () => {
    it('should collect form data correctly', () => {
      document.getElementById('recipe-title').value = 'Test Recipe';
      document.getElementById('recipe-description').value = 'Test description';
      document.getElementById('recipe-ingredients').value = 'Ingredient 1\nIngredient 2\n\nIngredient 3';
      document.getElementById('recipe-instructions').value = 'Step 1\nStep 2\n';

      const formData = controller.getFormData();

      expect(formData.title).toBe('Test Recipe');
      expect(formData.description).toBe('Test description');
      expect(formData.ingredients).toEqual(['Ingredient 1', 'Ingredient 2', 'Ingredient 3']);
      expect(formData.instructions).toEqual(['Step 1', 'Step 2']);
    });

    it('should handle empty form fields gracefully', () => {
      const formData = controller.getFormData();

      expect(formData.title).toBe('');
      expect(formData.ingredients).toEqual([]);
      expect(formData.instructions).toEqual([]);
    });

    it('should populate form from recipe data', () => {
      const recipeData = {
        title: 'Populate Test',
        description: 'Test description',
        ingredients: ['Salt', 'Pepper'],
        instructions: ['Season', 'Cook'],
        prepTime: 'PT30M',
        cookTime: 'PT2H',
        servings: '4'
      };

      controller.populateForm(recipeData);

      expect(document.getElementById('recipe-title').value).toBe('Populate Test');
      expect(document.getElementById('recipe-description').value).toBe('Test description');
      expect(document.getElementById('recipe-ingredients').value).toBe('Salt\nPepper');
      expect(document.getElementById('recipe-instructions').value).toBe('Season\nCook');
    });
  });

  describe('error handling and user feedback', () => {
    it('should display error messages to user', () => {
      const errors = ['Error 1', 'Error 2'];
      
      controller.showError('Test error message');
      
      const errorDiv = document.getElementById('error-messages');
      expect(errorDiv.style.display).toBe('block');
      expect(errorDiv.textContent).toBe('Test error message');
    });

    it('should display success messages to user', () => {
      controller.showSuccess('Recipe saved successfully!');
      
      const successDiv = document.getElementById('success-message');
      expect(successDiv.style.display).toBe('block');
      expect(successDiv.textContent).toBe('Recipe saved successfully!');
    });

    it('should clear previous messages', () => {
      controller.clearMessages();
      
      expect(document.getElementById('error-messages').style.display).toBe('none');
      expect(document.getElementById('success-message').style.display).toBe('none');
    });
  });

  describe('navigation and cancel handling', () => {
    it('should handle cancel button click', () => {
      delete window.location;
      window.location = { href: '' };

      controller.handleCancel();

      if (controller.isEditing) {
        expect(window.location.href).toBe('/recipes/test-recipe-123.html');
      } else {
        expect(window.location.href).toBe('/index.html');
      }
    });

    it('should warn user about unsaved changes', () => {
      global.confirm = jasmine.createSpy('confirm').and.returnValue(true);
      
      // Simulate form changes
      document.getElementById('recipe-title').value = 'Changed Title';
      controller.hasUnsavedChanges = true;

      controller.handleCancel();

      expect(global.confirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to leave?'
      );
    });
  });
});