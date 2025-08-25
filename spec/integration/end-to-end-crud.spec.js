const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Import the server
const app = require('../../server');

describe('End-to-End CRUD Integration Tests', () => {
  let createdRecipeIds = [];

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
  });

  describe('Complete Recipe Lifecycle', () => {
    it('should create, read, update, and delete a recipe successfully', async () => {
      // 1. CREATE a new recipe
      const newRecipe = {
        title: 'E2E Test Brisket',
        description: 'An end-to-end test brisket recipe',
        ingredients: ['Beef Brisket', 'Salt', 'Black Pepper', 'Brown Sugar'],
        instructions: [
          'Apply dry rub to brisket',
          'Smoke at 225°F for 12-16 hours',
          'Wrap in butcher paper at 160°F',
          'Cook until internal temp reaches 203°F',
          'Rest for 1 hour before slicing'
        ],
        prepTime: 'PT30M',
        cookTime: 'PT16H',
        servings: '12',
        author: 'Test Chef',
        sourceUrl: 'https://example.com/test-recipe'
      };

      console.log('Step 1: Creating recipe...');
      const createResponse = await request(app)
        .post('/api/recipes')
        .send(newRecipe)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.recipe.id).toBeDefined();
      expect(createResponse.body.recipe.filename).toBeDefined();
      expect(createResponse.body.recipe.createdAt).toBeDefined();
      expect(createResponse.body.recipe.title).toBe('E2E Test Brisket');

      const recipeId = createResponse.body.recipe.id;
      const filename = createResponse.body.recipe.filename;
      createdRecipeIds.push(recipeId);

      // Verify file was created
      const recipeFilePath = path.join('recipes', filename);
      expect(fs.existsSync(recipeFilePath)).toBe(true);

      // 2. READ the created recipe
      console.log('Step 2: Reading recipe...');
      const readResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.recipe.id).toBe(recipeId);
      expect(readResponse.body.recipe.title).toBe('E2E Test Brisket');
      expect(readResponse.body.recipe.ingredients).toEqual(newRecipe.ingredients);
      expect(readResponse.body.recipe.instructions).toEqual(newRecipe.instructions);

      // 3. UPDATE the recipe
      console.log('Step 3: Updating recipe...');
      const updates = {
        title: 'Updated E2E Brisket Supreme',
        description: 'An updated and improved brisket recipe',
        cookTime: 'PT18H',
        ingredients: [...newRecipe.ingredients, 'Paprika', 'Garlic Powder']
      };

      const updateResponse = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(updates)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.recipe.title).toBe('Updated E2E Brisket Supreme');
      expect(updateResponse.body.recipe.cookTime).toBe('PT18H');
      expect(updateResponse.body.recipe.ingredients).toHaveSize(6); // Original 4 + 2 new
      expect(updateResponse.body.recipe.instructions).toEqual(newRecipe.instructions); // Unchanged

      // Verify modifiedAt timestamp was updated
      const originalModified = new Date(createResponse.body.recipe.modifiedAt);
      const updatedModified = new Date(updateResponse.body.recipe.modifiedAt);
      expect(updatedModified.getTime()).toBeGreaterThan(originalModified.getTime());

      // 4. SEARCH for the recipe
      console.log('Step 4: Searching for recipe...');
      const searchResponse = await request(app)
        .get('/api/recipes?search=Supreme')
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.recipes).toHaveSize(1);
      expect(searchResponse.body.recipes[0].id).toBe(recipeId);
      expect(searchResponse.body.recipes[0].title).toBe('Updated E2E Brisket Supreme');

      // 5. DELETE the recipe
      console.log('Step 5: Deleting recipe...');
      const deleteResponse = await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toContain('deleted successfully');

      // Verify file was deleted
      expect(fs.existsSync(recipeFilePath)).toBe(false);

      // 6. VERIFY deletion - recipe should no longer exist
      console.log('Step 6: Verifying deletion...');
      await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(404);

      // Search should return empty
      const searchAfterDelete = await request(app)
        .get('/api/recipes?search=Supreme')
        .expect(200);

      expect(searchAfterDelete.body.recipes).toHaveSize(0);

      // Remove from cleanup list since it's already deleted
      createdRecipeIds = createdRecipeIds.filter(id => id !== recipeId);

      console.log('✅ Complete recipe lifecycle test passed!');
    });

    it('should handle multiple recipes and maintain data integrity', async () => {
      // Create multiple recipes
      const recipes = [
        {
          title: 'Multi Test Recipe 1',
          description: 'First test recipe',
          ingredients: ['Ingredient A', 'Ingredient B'],
          instructions: ['Step A', 'Step B'],
          cookTime: 'PT2H'
        },
        {
          title: 'Multi Test Recipe 2',
          description: 'Second test recipe',
          ingredients: ['Ingredient C', 'Ingredient D'],
          instructions: ['Step C', 'Step D'],
          cookTime: 'PT3H'
        },
        {
          title: 'Multi Test Recipe 3',
          description: 'Third test recipe',
          ingredients: ['Ingredient E', 'Ingredient F'],
          instructions: ['Step E', 'Step F'],
          cookTime: 'PT4H'
        }
      ];

      console.log('Creating multiple recipes...');
      const createdRecipes = [];
      for (const recipe of recipes) {
        const response = await request(app)
          .post('/api/recipes')
          .send(recipe)
          .expect(201);

        createdRecipes.push(response.body.recipe);
        createdRecipeIds.push(response.body.recipe.id);
      }

      // Get all recipes
      console.log('Fetching all recipes...');
      const allRecipesResponse = await request(app)
        .get('/api/recipes')
        .expect(200);

      expect(allRecipesResponse.body.success).toBe(true);
      expect(allRecipesResponse.body.recipes.length).toBeGreaterThanOrEqual(3);

      // Update one recipe
      console.log('Updating middle recipe...');
      const middleRecipe = createdRecipes[1];
      const updateResponse = await request(app)
        .put(`/api/recipes/${middleRecipe.id}`)
        .send({ title: 'Updated Middle Recipe', description: 'Updated description' })
        .expect(200);

      expect(updateResponse.body.recipe.title).toBe('Updated Middle Recipe');

      // Delete first recipe
      console.log('Deleting first recipe...');
      await request(app)
        .delete(`/api/recipes/${createdRecipes[0].id}`)
        .expect(200);

      createdRecipeIds = createdRecipeIds.filter(id => id !== createdRecipes[0].id);

      // Verify remaining recipes are intact
      console.log('Verifying remaining recipes...');
      const remainingResponse = await request(app)
        .get('/api/recipes')
        .expect(200);

      const remainingTitles = remainingResponse.body.recipes.map(r => r.title);
      expect(remainingTitles).toContain('Updated Middle Recipe');
      expect(remainingTitles).toContain('Multi Test Recipe 3');
      expect(remainingTitles).not.toContain('Multi Test Recipe 1');

      console.log('✅ Multiple recipes test passed!');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle validation errors gracefully throughout the workflow', async () => {
      // Try to create invalid recipe
      const invalidRecipe = {
        title: '', // Invalid empty title
        ingredients: [], // Invalid empty ingredients
        instructions: [] // Invalid empty instructions
      };

      const createResponse = await request(app)
        .post('/api/recipes')
        .send(invalidRecipe)
        .expect(400);

      expect(createResponse.body.success).toBe(false);
      expect(createResponse.body.errors).toBeDefined();
      expect(createResponse.body.errors.length).toBeGreaterThan(0);

      // Try to update non-existent recipe
      const updateResponse = await request(app)
        .put('/api/recipes/nonexistent-id')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(updateResponse.body.success).toBe(false);

      // Try to delete non-existent recipe
      const deleteResponse = await request(app)
        .delete('/api/recipes/nonexistent-id')
        .expect(404);

      expect(deleteResponse.body.success).toBe(false);

      console.log('✅ Error scenarios test passed!');
    });

    it('should handle concurrent operations safely', async () => {
      // Create a base recipe
      const baseRecipe = {
        title: 'Concurrency Test Recipe',
        description: 'Testing concurrent operations',
        ingredients: ['Base Ingredient'],
        instructions: ['Base Step'],
        cookTime: 'PT1H'
      };

      const createResponse = await request(app)
        .post('/api/recipes')
        .send(baseRecipe)
        .expect(201);

      const recipeId = createResponse.body.recipe.id;
      createdRecipeIds.push(recipeId);

      // Perform concurrent operations
      console.log('Testing concurrent operations...');
      const concurrentPromises = [
        request(app).get(`/api/recipes/${recipeId}`),
        request(app).put(`/api/recipes/${recipeId}`).send({ description: 'Updated by op 1' }),
        request(app).get(`/api/recipes/${recipeId}`),
        request(app).put(`/api/recipes/${recipeId}`).send({ description: 'Updated by op 2' }),
        request(app).get('/api/recipes?search=Concurrency')
      ];

      const results = await Promise.all(concurrentPromises);

      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result.status).toBeLessThan(500); // No server errors
        if (result.status === 200) {
          expect(result.body.success).toBe(true);
        }
      });

      // Final state should be consistent
      const finalResponse = await request(app)
        .get(`/api/recipes/${recipeId}`)
        .expect(200);

      expect(finalResponse.body.success).toBe(true);
      expect(finalResponse.body.recipe.title).toBe('Concurrency Test Recipe');

      console.log('✅ Concurrency test passed!');
    });
  });

  describe('Data Consistency and File System Integration', () => {
    it('should maintain consistency between API and file system', async () => {
      // Create recipe
      const recipe = {
        title: 'Consistency Test Recipe',
        description: 'Testing data consistency',
        ingredients: ['Consistent Ingredient'],
        instructions: ['Consistent Step'],
        cookTime: 'PT2H'
      };

      const createResponse = await request(app)
        .post('/api/recipes')
        .send(recipe)
        .expect(201);

      const recipeId = createResponse.body.recipe.id;
      const filename = createResponse.body.recipe.filename;
      createdRecipeIds.push(recipeId);

      // Verify file exists and contains metadata
      const filePath = path.join('recipes', filename);
      expect(fs.existsSync(filePath)).toBe(true);

      const fileContent = fs.readFileSync(filePath, 'utf8');
      expect(fileContent).toContain('Consistency Test Recipe');
      expect(fileContent).toContain('RECIPE_METADATA_START');
      expect(fileContent).toContain(`"id": "${recipeId}"`);

      // Update recipe
      const updates = { title: 'Updated Consistency Recipe' };
      await request(app)
        .put(`/api/recipes/${recipeId}`)
        .send(updates)
        .expect(200);

      // Verify file was updated
      const updatedContent = fs.readFileSync(filePath, 'utf8');
      expect(updatedContent).toContain('Updated Consistency Recipe');
      expect(updatedContent).not.toContain('Consistency Test Recipe');

      // Delete recipe
      await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .expect(200);

      // Verify file was deleted
      expect(fs.existsSync(filePath)).toBe(false);

      createdRecipeIds = createdRecipeIds.filter(id => id !== recipeId);

      console.log('✅ Data consistency test passed!');
    });
  });
});