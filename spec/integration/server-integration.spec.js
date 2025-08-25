const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Note: These tests require the actual server to be running separately
// They test the real integration with the file system and existing recipes

describe('Shopping List Server Integration', () => {
  const baseURL = 'http://localhost:3000';
  
  beforeAll(async () => {
    // Check if server is running by making a simple request
    try {
      const response = await request(baseURL).get('/');
      if (response.status !== 200) {
        fail('Server is not running. Please start the server with "npm start" in a separate terminal.');
      }
    } catch (error) {
      pending('Server is not running. Please start the server with "npm start" in a separate terminal.');
    }
  });

  describe('Integration with Real Recipe Data', () => {
    let existingRecipeId = null;

    beforeAll(async () => {
      // Try to get existing recipes to test with
      try {
        const response = await request(baseURL).get('/api/recipes');
        if (response.status === 200 && response.body.recipes && response.body.recipes.length > 0) {
          existingRecipeId = response.body.recipes[0].id;
        }
      } catch (error) {
        // Will skip tests that require existing recipes
      }
    });

    it('should generate shopping list from existing recipe if available', async () => {
      if (!existingRecipeId) {
        pending('No existing recipes found to test with');
        return;
      }

      const response = await request(baseURL)
        .post('/api/shopping-lists/single')
        .send({
          recipeId: existingRecipeId,
          listName: 'Integration Test Shopping List'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shoppingList).toBeDefined();
      expect(response.body.shoppingList.title).toBe('Integration Test Shopping List');
      expect(response.body.shoppingList.items).toBeInstanceOf(Array);
      expect(response.body.shoppingList.items.length).toBeGreaterThan(0);

      // Verify item structure
      const firstItem = response.body.shoppingList.items[0];
      expect(firstItem).toHaveProperty('item');
      expect(firstItem).toHaveProperty('category');
      expect(typeof firstItem.item).toBe('string');
      expect(typeof firstItem.category).toBe('string');
    }, 10000);

    it('should generate Reminders URL from real shopping list', async () => {
      if (!existingRecipeId) {
        pending('No existing recipes found to test with');
        return;
      }

      // First generate a shopping list
      const listResponse = await request(baseURL)
        .post('/api/shopping-lists/single')
        .send({
          recipeId: existingRecipeId
        });

      expect(listResponse.status).toBe(200);

      // Then generate Reminders URL
      const urlResponse = await request(baseURL)
        .post('/api/shopping-lists/reminders-url')
        .send({
          shoppingList: listResponse.body.shoppingList,
          organizeByCategory: true,
          listName: 'Real Recipe Shopping List'
        });

      expect(urlResponse.status).toBe(200);
      expect(urlResponse.body.success).toBe(true);
      expect(urlResponse.body.url).toContain('x-apple-reminderkit://');
      expect(urlResponse.body.url).toContain(encodeURIComponent('Real Recipe Shopping List'));
      expect(urlResponse.body.reminderText).toBeDefined();
      expect(urlResponse.body.reminderText.length).toBeGreaterThan(0);

      // Should contain category headers when organized
      expect(urlResponse.body.reminderText).toMatch(/[A-Z]+:/); // Should have category headers
    }, 10000);

    it('should export directly to Reminders via GET endpoint', async () => {
      if (!existingRecipeId) {
        pending('No existing recipes found to test with');
        return;
      }

      const response = await request(baseURL)
        .get(`/api/shopping-lists/export/${existingRecipeId}`)
        .query({
          format: 'reminders',
          listName: 'Direct Export Test',
          scale: '1.5'
        })
        .redirects(0); // Don't follow redirects, just check the redirect

      expect(response.status).toBe(302); // Redirect status
      expect(response.headers.location).toContain('x-apple-reminderkit://');
      expect(response.headers.location).toContain(encodeURIComponent('Direct Export Test'));
    }, 10000);

    it('should return JSON format when requested', async () => {
      if (!existingRecipeId) {
        pending('No existing recipes found to test with');
        return;
      }

      const response = await request(baseURL)
        .get(`/api/shopping-lists/export/${existingRecipeId}`)
        .query({
          format: 'json',
          scale: '2'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shoppingList).toBeDefined();
      expect(response.body.shoppingList.title).toContain('(scaled 2x)');

      // Verify scaling worked
      const items = response.body.shoppingList.items;
      const scaledItems = items.filter(item => item.quantity !== null && item.scaled === true);
      expect(scaledItems.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Multiple Recipes Integration', () => {
    it('should handle multiple existing recipes if available', async () => {
      // Get list of recipes
      const recipesResponse = await request(baseURL).get('/api/recipes');
      
      if (recipesResponse.status !== 200 || !recipesResponse.body.recipes || recipesResponse.body.recipes.length < 2) {
        pending('Need at least 2 existing recipes for this test');
        return;
      }

      const recipeIds = recipesResponse.body.recipes.slice(0, 2).map(r => r.id);

      const response = await request(baseURL)
        .post('/api/shopping-lists/multiple')
        .send({
          recipeIds,
          listName: 'Multi-Recipe Integration Test',
          categoryFilter: ['meat', 'vegetables', 'pantry']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shoppingList).toBeDefined();
      expect(response.body.shoppingList.title).toBe('Multi-Recipe Integration Test');
      expect(response.body.shoppingList.recipes).toEqual(recipeIds);

      // Check that consolidation occurred
      const consolidatedItems = response.body.shoppingList.items.filter(item => item.consolidated === true);
      if (consolidatedItems.length > 0) {
        expect(consolidatedItems[0].quantity).toBeGreaterThan(0);
      }

      // Should be organized by category
      expect(response.body.shoppingList.organized).toBeDefined();
    }, 15000);
  });

  describe('Error Scenarios', () => {
    it('should handle nonexistent recipe gracefully', async () => {
      const response = await request(baseURL)
        .post('/api/shopping-lists/single')
        .send({
          recipeId: 'definitely-does-not-exist-recipe-id-12345'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe not found');
    });

    it('should validate required fields', async () => {
      const response = await request(baseURL)
        .post('/api/shopping-lists/single')
        .send({}); // Missing recipeId

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe ID is required');
    });

    it('should validate array requirements for multiple recipes', async () => {
      const response = await request(baseURL)
        .post('/api/shopping-lists/multiple')
        .send({
          recipeIds: 'not-an-array' // Should be array
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recipe IDs array is required and must not be empty');
    });
  });
});