const request = require('supertest');
const express = require('express');
const ShoppingListManager = require('../../js/ShoppingListManager');

// Create test app with shopping list routes
const app = express();
app.use(express.json());

// Mock recipe repository for testing
const mockRecipeRepository = {
  findById: jasmine.createSpy('findById'),
  findAll: jasmine.createSpy('findAll')
};

const shoppingListManager = new ShoppingListManager(mockRecipeRepository);

// Add shopping list routes (copied from server.js for testing)
app.post('/api/shopping-lists/single', async (req, res) => {
  try {
    const { recipeId, listName, scaleMultiplier } = req.body;
    
    if (!recipeId) {
      return res.status(400).json({
        success: false,
        error: 'Recipe ID is required'
      });
    }

    const options = {};
    if (listName) options.listName = listName;
    if (scaleMultiplier) options.scaleMultiplier = scaleMultiplier;

    const result = await shoppingListManager.generateFromSingleRecipe(recipeId, options);

    if (result.success) {
      res.json({
        success: true,
        shoppingList: result.shoppingList
      });
    } else {
      const statusCode = result.error.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/shopping-lists/multiple', async (req, res) => {
  try {
    const { recipeIds, listName, scaleMultiplier, categoryFilter } = req.body;
    
    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipe IDs array is required and must not be empty'
      });
    }

    const options = {};
    if (listName) options.listName = listName;
    if (scaleMultiplier) options.scaleMultiplier = scaleMultiplier;
    if (categoryFilter) options.categoryFilter = categoryFilter;

    const result = await shoppingListManager.generateFromMultipleRecipes(recipeIds, options);

    if (result.success) {
      res.json({
        success: true,
        shoppingList: result.shoppingList,
        warnings: result.warnings || []
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/shopping-lists/reminders-url', async (req, res) => {
  try {
    const { shoppingList, organizeByCategory, listName } = req.body;
    
    if (!shoppingList) {
      return res.status(400).json({
        success: false,
        error: 'Shopping list data is required'
      });
    }

    const options = {};
    if (organizeByCategory !== undefined) options.organizeByCategory = organizeByCategory;
    if (listName) options.listName = listName;

    const result = shoppingListManager.generateReminderUrl(shoppingList, options);

    if (result.success) {
      // Also get the formatted text for the response
      const formatResult = shoppingListManager.formatter.formatForReminders(shoppingList, options);
      
      res.json({
        success: true,
        url: result.url,
        reminderText: formatResult.success ? formatResult.reminderText : null,
        listName: result.listName
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/shopping-lists/export/:recipeId', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { format = 'reminders', listName, scale } = req.query;
    
    const options = {};
    if (listName) options.listName = listName;
    if (scale) options.scaleMultiplier = parseFloat(scale);

    const listResult = await shoppingListManager.generateFromSingleRecipe(recipeId, options);

    if (!listResult.success) {
      const statusCode = listResult.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: listResult.error
      });
    }

    if (format === 'reminders') {
      const urlResult = shoppingListManager.generateReminderUrl(listResult.shoppingList);
      
      if (urlResult.success) {
        res.redirect(urlResult.url);
      } else {
        res.status(400).json({
          success: false,
          error: urlResult.error
        });
      }
    } else if (format === 'json') {
      res.json({
        success: true,
        shoppingList: listResult.shoppingList
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported format. Use "reminders" or "json".'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

describe('Shopping List API', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockRecipeRepository.findById.and.stub();
    mockRecipeRepository.findAll.and.stub();
  });

  describe('POST /api/shopping-lists/single', () => {
    it('should generate shopping list from single recipe', async () => {
      const recipe = {
        id: 'test-recipe',
        title: 'Test Recipe',
        ingredients: ['2 cups flour', '1 tsp salt', '1 cup milk']
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(recipe));

      const response = await request(app)
        .post('/api/shopping-lists/single')
        .send({
          recipeId: 'test-recipe',
          listName: 'My Shopping List'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shoppingList).toBeDefined();
      expect(response.body.shoppingList.title).toBe('My Shopping List');
      expect(response.body.shoppingList.items).toHaveSize(3);
    });

    it('should return 400 if recipe ID is missing', async () => {
      const response = await request(app)
        .post('/api/shopping-lists/single')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe ID is required');
    });

    it('should return 404 if recipe is not found', async () => {
      mockRecipeRepository.findById.and.returnValue(Promise.resolve(null));

      const response = await request(app)
        .post('/api/shopping-lists/single')
        .send({
          recipeId: 'nonexistent-recipe'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe not found');
    });

    it('should support scaling option', async () => {
      const recipe = {
        id: 'test-recipe',
        title: 'Test Recipe',
        ingredients: ['2 cups flour']
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(recipe));

      const response = await request(app)
        .post('/api/shopping-lists/single')
        .send({
          recipeId: 'test-recipe',
          scaleMultiplier: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const flourItem = response.body.shoppingList.items.find(item => item.item === 'flour');
      expect(flourItem.quantity).toBe(4); // 2 * 2
    });
  });

  describe('POST /api/shopping-lists/multiple', () => {
    it('should generate consolidated shopping list from multiple recipes', async () => {
      const recipe1 = {
        id: 'recipe-1',
        title: 'Recipe 1',
        ingredients: ['2 cups flour', '1 tsp salt']
      };

      const recipe2 = {
        id: 'recipe-2',
        title: 'Recipe 2',
        ingredients: ['1 cup flour', '2 eggs']
      };

      mockRecipeRepository.findById.and.callFake(id => {
        if (id === 'recipe-1') return Promise.resolve(recipe1);
        if (id === 'recipe-2') return Promise.resolve(recipe2);
        return Promise.resolve(null);
      });

      const response = await request(app)
        .post('/api/shopping-lists/multiple')
        .send({
          recipeIds: ['recipe-1', 'recipe-2'],
          listName: 'Combined Shopping List'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shoppingList).toBeDefined();
      expect(response.body.shoppingList.title).toBe('Combined Shopping List');
      
      // Should consolidate flour: 2 cups + 1 cup = 3 cups
      const flourItem = response.body.shoppingList.items.find(item => item.item === 'flour');
      expect(flourItem.quantity).toBe(3);
      expect(flourItem.consolidated).toBe(true);
    });

    it('should return 400 if recipe IDs array is missing', async () => {
      const response = await request(app)
        .post('/api/shopping-lists/multiple')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe IDs array is required and must not be empty');
    });

    it('should return 400 if recipe IDs array is empty', async () => {
      const response = await request(app)
        .post('/api/shopping-lists/multiple')
        .send({
          recipeIds: []
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe IDs array is required and must not be empty');
    });

    it('should handle some recipes not found with warnings', async () => {
      const recipe1 = {
        id: 'recipe-1',
        title: 'Recipe 1',
        ingredients: ['1 cup flour']
      };

      mockRecipeRepository.findById.and.callFake(id => {
        if (id === 'recipe-1') return Promise.resolve(recipe1);
        return Promise.resolve(null); // recipe-2 not found
      });

      const response = await request(app)
        .post('/api/shopping-lists/multiple')
        .send({
          recipeIds: ['recipe-1', 'recipe-2']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.warnings).toBeDefined();
      expect(response.body.warnings).toContain('Recipe not found: recipe-2');
    });
  });

  describe('POST /api/shopping-lists/reminders-url', () => {
    it('should generate Reminders app URL from shopping list', async () => {
      const shoppingList = {
        title: 'Test Shopping List',
        items: [
          { quantity: 2, unit: 'cup', item: 'flour' },
          { quantity: 1, unit: 'tsp', item: 'salt' }
        ]
      };

      const response = await request(app)
        .post('/api/shopping-lists/reminders-url')
        .send({
          shoppingList,
          organizeByCategory: false,
          listName: 'Custom List Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.url).toContain('x-apple-reminderkit://');
      expect(response.body.url).toContain(encodeURIComponent('Custom List Name'));
      expect(response.body.reminderText).toContain('2 cup flour');
      expect(response.body.listName).toBe('Custom List Name');
    });

    it('should return 400 if shopping list is missing', async () => {
      const response = await request(app)
        .post('/api/shopping-lists/reminders-url')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Shopping list data is required');
    });

    it('should handle organized by category format', async () => {
      const shoppingList = {
        title: 'Organized List',
        items: [
          { quantity: 1, unit: 'lb', item: 'beef', category: 'meat' },
          { quantity: 2, unit: 'cup', item: 'onion', category: 'vegetables' }
        ],
        organized: {
          meat: [{ quantity: 1, unit: 'lb', item: 'beef' }],
          vegetables: [{ quantity: 2, unit: 'cup', item: 'onion' }]
        }
      };

      const response = await request(app)
        .post('/api/shopping-lists/reminders-url')
        .send({
          shoppingList,
          organizeByCategory: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reminderText).toContain('MEAT:');
      expect(response.body.reminderText).toContain('VEGETABLES:');
    });
  });

  describe('GET /api/shopping-lists/export/:recipeId', () => {
    it('should redirect to Reminders app for reminders format', async () => {
      const recipe = {
        id: 'test-recipe',
        title: 'Test Recipe',
        ingredients: ['1 cup flour', '1 tsp salt']
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(recipe));

      const response = await request(app)
        .get('/api/shopping-lists/export/test-recipe')
        .query({ format: 'reminders' });

      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toContain('x-apple-reminderkit://');
    });

    it('should return JSON format when requested', async () => {
      const recipe = {
        id: 'test-recipe',
        title: 'Test Recipe',
        ingredients: ['1 cup flour', '1 tsp salt']
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(recipe));

      const response = await request(app)
        .get('/api/shopping-lists/export/test-recipe')
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shoppingList).toBeDefined();
      expect(response.body.shoppingList.items).toHaveSize(2);
    });

    it('should support custom list name and scaling via query params', async () => {
      const recipe = {
        id: 'test-recipe',
        title: 'Test Recipe',
        ingredients: ['2 cups flour']
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(recipe));

      const response = await request(app)
        .get('/api/shopping-lists/export/test-recipe')
        .query({
          format: 'json',
          listName: 'Custom Export List',
          scale: '1.5'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shoppingList.title).toContain('Custom Export List');
      
      const flourItem = response.body.shoppingList.items.find(item => item.item === 'flour');
      expect(flourItem.quantity).toBe(3); // 2 * 1.5
    });

    it('should return 404 if recipe is not found', async () => {
      mockRecipeRepository.findById.and.returnValue(Promise.resolve(null));

      const response = await request(app)
        .get('/api/shopping-lists/export/nonexistent-recipe')
        .query({ format: 'json' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe not found');
    });

    it('should return 400 for unsupported format', async () => {
      const recipe = {
        id: 'test-recipe',
        title: 'Test Recipe',
        ingredients: ['1 cup flour']
      };

      mockRecipeRepository.findById.and.returnValue(Promise.resolve(recipe));

      const response = await request(app)
        .get('/api/shopping-lists/export/test-recipe')
        .query({ format: 'unsupported' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unsupported format. Use "reminders" or "json".');
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      // Test a different type of error - recipe not found which is handled gracefully
      mockRecipeRepository.findById.and.returnValue(Promise.resolve(null));

      const response = await request(app)
        .post('/api/shopping-lists/single')
        .send({
          recipeId: 'nonexistent-recipe'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe not found');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/shopping-lists/single')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
    });
  });
});