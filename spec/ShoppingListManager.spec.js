const ShoppingListManager = require('../js/ShoppingListManager');

describe('ShoppingListManager', () => {
  let manager;
  let mockRecipeRepository;
  let mockValidator;

  beforeEach(() => {
    // Mock dependencies
    mockRecipeRepository = {
      findById: jasmine.createSpy('findById'),
      findAll: jasmine.createSpy('findAll')
    };

    mockValidator = {
      validateShoppingListRequest: jasmine.createSpy('validateShoppingListRequest'),
      validateRecipe: jasmine.createSpy('validateRecipe').and.returnValue({ isValid: true })
    };

    manager = new ShoppingListManager(mockRecipeRepository, mockValidator);
  });

  describe('generateFromSingleRecipe', () => {
    it('should generate shopping list from a single recipe by ID', async () => {
      const recipe = {
        id: 'recipe-1',
        title: 'Test BBQ Recipe',
        ingredients: [
          '2 lbs beef brisket',
          '1 tbsp brown sugar',
          '1 tsp salt'
        ]
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(recipe));

      const result = await manager.generateFromSingleRecipe('recipe-1');

      expect(result.success).toBe(true);
      expect(result.shoppingList).toBeDefined();
      expect(result.shoppingList.title).toBe('Test BBQ Recipe - Shopping List');
      expect(result.shoppingList.items).toHaveSize(3);
      expect(mockRecipeRepository.findById).toHaveBeenCalledWith('recipe-1');
    });

    it('should handle recipe not found', async () => {
      mockRecipeRepository.findById.and.returnValue(Promise.resolve(null));

      const result = await manager.generateFromSingleRecipe('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipe not found');
      expect(mockRecipeRepository.findById).toHaveBeenCalledWith('nonexistent-id');
    });

    it('should handle repository errors', async () => {
      mockRecipeRepository.findById.and.returnValue(Promise.reject(new Error('Database error')));

      const result = await manager.generateFromSingleRecipe('recipe-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve recipe');
    });

    it('should allow custom list name', async () => {
      const recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        ingredients: ['1 cup flour']
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(recipe));

      const result = await manager.generateFromSingleRecipe('recipe-1', {
        listName: 'My Custom Shopping List'
      });

      expect(result.success).toBe(true);
      expect(result.shoppingList.title).toBe('My Custom Shopping List');
    });
  });

  describe('generateFromMultipleRecipes', () => {
    it('should generate consolidated shopping list from multiple recipes', async () => {
      mockValidator.validateShoppingListRequest.and.returnValue({ isValid: true });
      const recipes = [
        {
          id: 'recipe-1',
          title: 'BBQ Ribs',
          ingredients: ['2 lbs baby back ribs', '1 cup brown sugar']
        },
        {
          id: 'recipe-2', 
          title: 'BBQ Sauce',
          ingredients: ['1/2 cup brown sugar', '1 cup ketchup']
        }
      ];

      mockRecipeRepository.findById.and.callFake(id => {
        const recipe = recipes.find(r => r.id === id);
        return Promise.resolve(recipe || null);
      });

      const result = await manager.generateFromMultipleRecipes(['recipe-1', 'recipe-2']);

      expect(result.success).toBe(true);
      expect(result.shoppingList).toBeDefined();
      expect(result.shoppingList.title).toBe('Combined Recipes - Shopping List');
      expect(result.shoppingList.recipes).toEqual(['recipe-1', 'recipe-2']);

      // Should consolidate brown sugar: 1 cup + 1/2 cup = 1.5 cups
      const brownSugar = result.shoppingList.items.find(item => item.item === 'brown sugar');
      expect(brownSugar.quantity).toBe(1.5);
      expect(brownSugar.consolidated).toBe(true);
    });

    it('should validate recipe IDs before processing', async () => {
      mockValidator.validateShoppingListRequest.and.returnValue({
        isValid: false,
        errors: ['Invalid recipe IDs']
      });

      const result = await manager.generateFromMultipleRecipes(['invalid-id']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipe IDs');
      expect(mockValidator.validateShoppingListRequest).toHaveBeenCalled();
    });

    it('should handle some recipes not found', async () => {
      const recipe1 = {
        id: 'recipe-1',
        title: 'Found Recipe',
        ingredients: ['1 cup flour']
      };

      mockValidator.validateShoppingListRequest.and.returnValue({ isValid: true });
      mockRecipeRepository.findById.and.callFake(id => {
        if (id === 'recipe-1') return Promise.resolve(recipe1);
        return Promise.resolve(null);
      });

      const result = await manager.generateFromMultipleRecipes(['recipe-1', 'recipe-not-found']);

      expect(result.success).toBe(true);
      expect(result.shoppingList.recipes).toEqual(['recipe-1']);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Recipe not found: recipe-not-found');
    });

    it('should handle empty recipe list', async () => {
      mockValidator.validateShoppingListRequest.and.returnValue({ isValid: true });

      const result = await manager.generateFromMultipleRecipes([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No recipe IDs provided');
    });
  });

  describe('generateFromAllRecipes', () => {
    it('should generate shopping list from all available recipes', async () => {
      const allRecipes = [
        {
          id: 'recipe-1',
          title: 'Recipe 1',
          ingredients: ['1 cup flour', '2 eggs']
        },
        {
          id: 'recipe-2',
          title: 'Recipe 2', 
          ingredients: ['1/2 cup flour', '1 cup milk']
        }
      ];

      mockRecipeRepository.findAll.and.returnValue(Promise.resolve(allRecipes));
      mockRecipeRepository.findById.and.callFake(id => {
        const recipe = allRecipes.find(r => r.id === id);
        return Promise.resolve(recipe || null);
      });

      const result = await manager.generateFromAllRecipes({
        listName: 'Master Shopping List'
      });

      expect(result.success).toBe(true);
      expect(result.shoppingList.title).toBe('Master Shopping List');
      expect(result.shoppingList.recipes).toEqual(['recipe-1', 'recipe-2']);

      // Should consolidate flour: 1 cup + 1/2 cup = 1.5 cups
      const flour = result.shoppingList.items.find(item => item.item === 'flour');
      expect(flour.quantity).toBe(1.5);
      expect(flour.consolidated).toBe(true);
    });

    it('should handle no recipes found', async () => {
      mockRecipeRepository.findAll.and.returnValue(Promise.resolve([]));

      const result = await manager.generateFromAllRecipes();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No recipes available');
    });
  });

  describe('generateReminderUrl', () => {
    it('should generate Reminders app URL from shopping list', () => {
      const shoppingList = {
        title: 'Test Shopping List',
        items: [
          { quantity: 2, unit: 'cup', item: 'flour' },
          { quantity: 1, unit: 'tsp', item: 'salt' }
        ]
      };

      const result = manager.generateReminderUrl(shoppingList);

      expect(result.success).toBe(true);
      expect(result.url).toContain('x-apple-reminderkit://');
      expect(result.url).toContain(encodeURIComponent('Test Shopping List'));
      expect(result.url).toContain(encodeURIComponent('2 cup flour'));
    });

    it('should handle empty shopping list', () => {
      const emptyList = { title: 'Empty', items: [] };

      const result = manager.generateReminderUrl(emptyList);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shopping list is empty');
    });

    it('should support custom formatting options', () => {
      const shoppingList = {
        title: 'Organized List',
        items: [{ quantity: 1, unit: 'lb', item: 'beef', category: 'meat' }],
        organized: {
          meat: [{ quantity: 1, unit: 'lb', item: 'beef' }]
        }
      };

      const result = manager.generateReminderUrl(shoppingList, {
        organizeByCategory: true,
        listName: 'Custom List Name'
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain(encodeURIComponent('Custom List Name'));
      expect(result.url).toContain(encodeURIComponent('MEAT:'));
    });
  });

  describe('addIngredientsToExistingList', () => {
    it('should add new ingredients to existing shopping list', () => {
      const existingList = {
        title: 'Existing List',
        items: [
          { quantity: 1, unit: 'cup', item: 'flour', category: 'pantry' }
        ]
      };

      const newRecipe = {
        id: 'new-recipe',
        title: 'New Recipe',
        ingredients: ['1/2 cup flour', '2 eggs']
      };

      const result = manager.addIngredientsToExistingList(existingList, newRecipe);

      expect(result.success).toBe(true);
      expect(result.shoppingList.items).toHaveSize(2);
      
      const flour = result.shoppingList.items.find(item => item.item === 'flour');
      expect(flour.quantity).toBe(1.5); // 1 + 0.5
      expect(flour.consolidated).toBe(true);
    });

    it('should validate inputs', () => {
      const invalidResult = manager.addIngredientsToExistingList(null, {});
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Invalid shopping list');
    });
  });

  describe('filterByCategory', () => {
    it('should filter shopping list items by category', () => {
      const shoppingList = {
        title: 'Full List',
        items: [
          { item: 'beef', category: 'meat' },
          { item: 'onion', category: 'vegetables' },
          { item: 'flour', category: 'pantry' },
          { item: 'salt', category: 'spices' }
        ]
      };

      const result = manager.filterByCategory(shoppingList, ['meat', 'vegetables']);

      expect(result.success).toBe(true);
      expect(result.shoppingList.items).toHaveSize(2);
      expect(result.shoppingList.items[0].item).toBe('beef');
      expect(result.shoppingList.items[1].item).toBe('onion');
    });

    it('should handle empty category list', () => {
      const shoppingList = { items: [{ item: 'test' }] };

      const result = manager.filterByCategory(shoppingList, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No categories specified');
    });
  });

  describe('scaleQuantities', () => {
    it('should scale ingredient quantities by multiplier', () => {
      const shoppingList = {
        title: 'Original List',
        items: [
          { quantity: 2, unit: 'cup', item: 'flour' },
          { quantity: 1, unit: 'tsp', item: 'salt' },
          { quantity: null, unit: null, item: 'pepper to taste' }
        ]
      };

      const result = manager.scaleQuantities(shoppingList, 1.5);

      expect(result.success).toBe(true);
      expect(result.shoppingList.title).toContain('(scaled 1.5x)');
      
      const flour = result.shoppingList.items.find(item => item.item === 'flour');
      expect(flour.quantity).toBe(3); // 2 * 1.5

      const salt = result.shoppingList.items.find(item => item.item === 'salt');
      expect(salt.quantity).toBe(1.5); // 1 * 1.5

      // Items without quantity should remain unchanged
      const pepper = result.shoppingList.items.find(item => item.item === 'pepper to taste');
      expect(pepper.quantity).toBe(null);
    });

    it('should validate multiplier', () => {
      const shoppingList = { items: [{ item: 'test' }] };

      const invalidResult = manager.scaleQuantities(shoppingList, 0);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBe('Scale multiplier must be greater than 0');

      const negativeResult = manager.scaleQuantities(shoppingList, -1);
      expect(negativeResult.success).toBe(false);
      expect(negativeResult.error).toBe('Scale multiplier must be greater than 0');
    });
  });

  describe('saveShoppingList', () => {
    it('should save shopping list for later retrieval', () => {
      const shoppingList = {
        title: 'Test List',
        items: [{ quantity: 1, unit: 'cup', item: 'flour' }]
      };

      const result = manager.saveShoppingList(shoppingList, 'my-saved-list');

      expect(result.success).toBe(true);
      expect(result.listId).toBe('my-saved-list');
      expect(result.savedAt).toBeInstanceOf(Date);
    });

    it('should generate ID if not provided', () => {
      const shoppingList = { title: 'Test', items: [] };

      const result = manager.saveShoppingList(shoppingList);

      expect(result.success).toBe(true);
      expect(result.listId).toBeDefined();
      expect(typeof result.listId).toBe('string');
    });
  });

  describe('getSavedLists', () => {
    it('should return list of saved shopping lists', () => {
      // Save some lists first
      const list1 = { title: 'List 1', items: [] };
      const list2 = { title: 'List 2', items: [] };

      manager.saveShoppingList(list1, 'list-1');
      manager.saveShoppingList(list2, 'list-2');

      const result = manager.getSavedLists();

      expect(result.success).toBe(true);
      expect(result.lists).toHaveSize(2);
      expect(result.lists[0].listId).toBe('list-1');
      expect(result.lists[1].listId).toBe('list-2');
    });
  });

  describe('error handling and validation', () => {
    it('should handle malformed recipes gracefully', async () => {
      const malformedRecipe = {
        id: 'malformed',
        // missing title and ingredients
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(malformedRecipe));

      const result = await manager.generateFromSingleRecipe('malformed');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipe must have');
    });

    it('should validate recipe objects before processing', () => {
      const invalidRecipes = [
        null,
        undefined,
        {},
        { title: 'No ingredients' },
        { ingredients: [] }, // no title
        { title: 'Test', ingredients: null }
      ];

      invalidRecipes.forEach(recipe => {
        // Reset the validator mock to return invalid for these tests
        mockValidator.validateRecipe.and.returnValue({ isValid: false, error: 'Invalid recipe' });
        const result = manager.validateRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should handle network/database errors gracefully', async () => {
      mockRecipeRepository.findById.and.returnValue(Promise.reject(new Error('Network timeout')));

      const result = await manager.generateFromSingleRecipe('recipe-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve recipe');
      expect(result.details).toContain('Network timeout');
    });
  });
});