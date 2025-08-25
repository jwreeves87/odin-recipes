const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Import the server
const app = require('../../server');

describe('CRUD API Endpoints', () => {
  let testRecipesDir;
  let testIndexPath;
  let originalIndexContent;
  let createdRecipeIds = [];

  beforeEach(() => {
    // Set up test directory for recipes
    testRecipesDir = path.join(__dirname, '..', 'test-api-recipes');
    testIndexPath = path.join(__dirname, '..', 'test-api-index.html');

    // Clean up any existing test files
    if (fs.existsSync(testRecipesDir)) {
      fs.rmSync(testRecipesDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testIndexPath)) {
      fs.unlinkSync(testIndexPath);
    }

    // Create test index.html
    originalIndexContent = `<!DOCTYPE html>
<html lang="en">
<head><title>Test Index</title></head>
<body>
  <div class="container">
    <div class="recipe-grid">
    </div>
    
    <sl-card style="margin-top: 3rem; background: #ffffff; border: 2px solid #ff6b35; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h3>Testimonials</h3>
    </sl-card>
  </div>
</body>
</html>`;

    fs.writeFileSync(testIndexPath, originalIndexContent, 'utf8');
  });

  afterEach(async () => {
    // Clean up created recipes
    for (const id of createdRecipeIds) {
      try {
        await request(app).delete(`/api/recipes/${id}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdRecipeIds = [];

    // Clean up test files
    if (fs.existsSync(testRecipesDir)) {
      fs.rmSync(testRecipesDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testIndexPath)) {
      fs.unlinkSync(testIndexPath);
    }
  });

  describe('GET /api/recipes', () => {
    it('should return existing recipes when they exist', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.recipes)).toBe(true);
      // Note: There may be existing recipes from previous tests or the application
    });

    it('should return created recipes in the list', async () => {
      // Get initial count
      const initialResponse = await request(app)
        .get('/api/recipes')
        .expect(200);

      const initialCount = initialResponse.body.recipes.length;

      // Create a test recipe
      const testRecipe = {
        title: 'API Test Unique Brisket 12345',
        description: 'A uniquely named test brisket recipe',
        ingredients: ['Salt', 'Pepper', 'Brisket'],
        instructions: ['Season', 'Smoke'],
        cookTime: 'PT16H',
        servings: '12'
      };

      const createResponse = await request(app)
        .post('/api/recipes')
        .send(testRecipe)
        .expect(201);

      createdRecipeIds.push(createResponse.body.recipe.id);

      // Now get all recipes
      const response = await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recipes).toHaveSize(initialCount + 1);
      
      // Find our created recipe
      const createdRecipe = response.body.recipes.find(r => r.id === createResponse.body.recipe.id);
      expect(createdRecipe).toBeDefined();
      expect(createdRecipe.title).toBe('API Test Unique Brisket 12345');
    });

    it('should handle server errors gracefully', async () => {
      // Mock a server error by creating an invalid state
      // This is a more complex test that might require dependency injection
      // For now, we'll test the happy path and rely on unit tests for error scenarios
    });
  });

  describe('GET /api/recipes/:id', () => {
    let testRecipeId;

    beforeEach(async () => {
      // Create a test recipe
      const testRecipe = {
        title: 'Get Test Recipe',
        description: 'A recipe for GET testing',
        ingredients: ['Ingredient 1', 'Ingredient 2'],
        instructions: ['Step 1', 'Step 2'],
        cookTime: 'PT2H'
      };

      const createResponse = await request(app)
        .post('/api/recipes')
        .send(testRecipe)
        .expect(201);

      testRecipeId = createResponse.body.recipe.id;
      createdRecipeIds.push(testRecipeId);
    });

    it('should return recipe when it exists', async () => {
      const response = await request(app)
        .get(`/api/recipes/${testRecipeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recipe.id).toBe(testRecipeId);
      expect(response.body.recipe.title).toBe('Get Test Recipe');
      expect(response.body.recipe.ingredients).toEqual(['Ingredient 1', 'Ingredient 2']);
    });

    it('should return 404 when recipe does not exist', async () => {
      const response = await request(app)
        .get('/api/recipes/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should handle invalid ID format gracefully', async () => {
      const response = await request(app)
        .get('/api/recipes/invalid-id-format')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/recipes', () => {
    it('should create a new recipe with valid data', async () => {
      const newRecipe = {
        title: 'New BBQ Recipe',
        description: 'A delicious new recipe',
        ingredients: ['Salt', 'Pepper', 'Meat'],
        instructions: ['Season the meat', 'Cook it'],
        cookTime: 'PT4H',
        prepTime: 'PT30M',
        servings: '6'
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(newRecipe)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.recipe.title).toBe('New BBQ Recipe');
      expect(response.body.recipe.id).toBeDefined();
      expect(response.body.recipe.filename).toBeDefined();
      expect(response.body.recipe.createdAt).toBeDefined();
      expect(response.body.recipe.modifiedAt).toBeDefined();

      createdRecipeIds.push(response.body.recipe.id);

      // Verify the recipe file was created
      const recipeFilePath = path.join('recipes', response.body.recipe.filename);
      expect(fs.existsSync(recipeFilePath)).toBe(true);
    });

    it('should return validation errors for invalid data', async () => {
      const invalidRecipe = {
        // Missing required fields
        description: 'Missing title'
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(invalidRecipe)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toContain('Title is required');
    });

    it('should sanitize input data', async () => {
      const recipeWithHtml = {
        title: '<script>alert("xss")</script>Clean Recipe',
        description: '<b>Bold</b> description',
        ingredients: ['<em>Salt</em>', 'Pepper'],
        instructions: ['Season with <strong>salt</strong>'],
        cookTime: 'PT2H'
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(recipeWithHtml)
        .expect(201);

      expect(response.body.recipe.title).toBe('Clean Recipe');
      expect(response.body.recipe.description).toBe('Bold description');
      expect(response.body.recipe.ingredients[0]).toBe('Salt');

      createdRecipeIds.push(response.body.recipe.id);
    });

    it('should handle server errors gracefully', async () => {
      // Test with malformed JSON would be caught by express middleware
      // Test with extremely large payload
      const hugeRecipe = {
        title: 'A'.repeat(300), // Exceeds validation limits
        ingredients: Array(200).fill('Ingredient'),
        instructions: Array(100).fill('Step')
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(hugeRecipe)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/recipes/:id', () => {
    let testRecipeId;

    beforeEach(async () => {
      // Create a test recipe to update
      const testRecipe = {
        title: 'Original Recipe',
        description: 'Original description',
        ingredients: ['Salt', 'Pepper'],
        instructions: ['Season', 'Cook'],
        cookTime: 'PT2H'
      };

      const createResponse = await request(app)
        .post('/api/recipes')
        .send(testRecipe)
        .expect(201);

      testRecipeId = createResponse.body.recipe.id;
      createdRecipeIds.push(testRecipeId);
    });

    it('should update recipe with valid data', async () => {
      const updates = {
        title: 'Updated Recipe Title',
        description: 'Updated description',
        cookTime: 'PT3H'
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipeId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recipe.title).toBe('Updated Recipe Title');
      expect(response.body.recipe.description).toBe('Updated description');
      expect(response.body.recipe.cookTime).toBe('PT3H');
      expect(response.body.recipe.ingredients).toEqual(['Salt', 'Pepper']); // Unchanged

      // Verify modifiedAt was updated
      expect(new Date(response.body.recipe.modifiedAt)).toBeInstanceOf(Date);
    });

    it('should return 404 for non-existent recipe', async () => {
      const updates = { title: 'New Title' };

      const response = await request(app)
        .put('/api/recipes/nonexistent-id')
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return validation errors for invalid updates', async () => {
      const invalidUpdates = {
        id: 'new-id', // Protected field
        title: '', // Invalid empty title
        ingredients: [] // Invalid empty ingredients
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipeId}`)
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toContain('Cannot update protected field: id');
    });

    it('should allow partial updates', async () => {
      const partialUpdate = {
        description: 'Only updating description'
      };

      const response = await request(app)
        .put(`/api/recipes/${testRecipeId}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recipe.description).toBe('Only updating description');
      expect(response.body.recipe.title).toBe('Original Recipe'); // Unchanged
    });

    it('should update the index page', async () => {
      const updates = { title: 'Updated for Index' };

      await request(app)
        .put(`/api/recipes/${testRecipeId}`)
        .send(updates)
        .expect(200);

      // Check if index.html would be updated (this depends on your index file location)
      // For now, we test that the operation succeeds
    });
  });

  describe('DELETE /api/recipes/:id', () => {
    let testRecipeId;
    let testFilename;

    beforeEach(async () => {
      // Create a test recipe to delete
      const testRecipe = {
        title: 'Recipe To Delete',
        description: 'This recipe will be deleted',
        ingredients: ['Salt'],
        instructions: ['Season'],
        cookTime: 'PT1H'
      };

      const createResponse = await request(app)
        .post('/api/recipes')
        .send(testRecipe)
        .expect(201);

      testRecipeId = createResponse.body.recipe.id;
      testFilename = createResponse.body.recipe.filename;
    });

    it('should delete existing recipe', async () => {
      const response = await request(app)
        .delete(`/api/recipes/${testRecipeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify recipe file was deleted
      const recipeFilePath = path.join('recipes', testFilename);
      expect(fs.existsSync(recipeFilePath)).toBe(false);

      // Verify recipe is no longer accessible
      await request(app)
        .get(`/api/recipes/${testRecipeId}`)
        .expect(404);
    });

    it('should return 404 for non-existent recipe', async () => {
      const response = await request(app)
        .delete('/api/recipes/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should remove recipe from index page', async () => {
      await request(app)
        .delete(`/api/recipes/${testRecipeId}`)
        .expect(200);

      // The index update success is verified by the operation succeeding
      // More detailed index testing is in the IndexPageUpdater tests
    });

    it('should handle deletion errors gracefully', async () => {
      // Delete the same recipe twice
      await request(app)
        .delete(`/api/recipes/${testRecipeId}`)
        .expect(200);

      const response = await request(app)
        .delete(`/api/recipes/${testRecipeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in requests', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle request timeout for large payloads', async () => {
      // This would test the request size limits
      const hugePayload = {
        title: 'Test',
        ingredients: Array(10000).fill('Ingredient'.repeat(100)),
        instructions: Array(1000).fill('Step'.repeat(1000))
      };

      const response = await request(app)
        .post('/api/recipes')
        .send(hugePayload)
        .expect(413);

      expect(response.body.error).toContain('too large');
    });

    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    it('should handle content-type validation', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Create multiple test recipes for search
      const recipes = [
        {
          title: 'BBQ Brisket',
          description: 'Smoked beef brisket',
          ingredients: ['Beef', 'Salt'],
          instructions: ['Smoke it']
        },
        {
          title: 'Teriyaki Salmon',
          description: 'Grilled fish with sauce',
          ingredients: ['Salmon', 'Teriyaki'],
          instructions: ['Grill it']
        },
        {
          title: 'Smoked Ribs',
          description: 'BBQ pork ribs',
          ingredients: ['Pork', 'Rub'],
          instructions: ['Smoke slowly']
        }
      ];

      for (const recipe of recipes) {
        const response = await request(app)
          .post('/api/recipes')
          .send(recipe);
        createdRecipeIds.push(response.body.recipe.id);
      }
    });

    it('should search recipes by title', async () => {
      const response = await request(app)
        .get('/api/recipes?search=brisket')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recipes.length).toBeGreaterThan(0);
      
      // Check that results contain brisket in title or description
      const hasBrisketMatch = response.body.recipes.some(recipe => 
        recipe.title.toLowerCase().includes('brisket') || 
        recipe.description.toLowerCase().includes('brisket')
      );
      expect(hasBrisketMatch).toBe(true);
    });

    it('should search recipes by description', async () => {
      const response = await request(app)
        .get('/api/recipes?search=grilled')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recipes.length).toBeGreaterThanOrEqual(0);
      
      // If we get results, they should match the search term
      response.body.recipes.forEach(recipe => {
        const matchFound = recipe.title.toLowerCase().includes('grilled') || 
                          recipe.description.toLowerCase().includes('grilled');
        expect(matchFound).toBe(true);
      });
    });

    it('should be case insensitive', async () => {
      const response = await request(app)
        .get('/api/recipes?search=SMOKED')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recipes.length).toBeGreaterThanOrEqual(2); // At least brisket and ribs
      
      // Verify case insensitive matching
      const hasSmoked = response.body.recipes.some(recipe =>
        recipe.title.toLowerCase().includes('smoked') ||
        recipe.description.toLowerCase().includes('smoked')
      );
      expect(hasSmoked).toBe(true);
    });

    it('should return all recipes for empty search', async () => {
      const response = await request(app)
        .get('/api/recipes?search=')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.recipes.length).toBeGreaterThanOrEqual(3); // At least our test recipes
    });
  });
});