const ShoppingListGenerator = require('../js/ShoppingListGenerator');

describe('ShoppingListGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ShoppingListGenerator();
  });

  describe('generateFromRecipe', () => {
    it('should generate shopping list from single recipe', () => {
      const recipe = {
        id: 'test-recipe-1',
        title: 'Test BBQ Recipe',
        ingredients: [
          '2 lbs beef brisket',
          '1 tbsp brown sugar',
          '1 tsp salt',
          '1/2 cup BBQ sauce'
        ]
      };

      const result = generator.generateFromRecipe(recipe);

      expect(result.success).toBe(true);
      expect(result.shoppingList).toBeDefined();
      expect(result.shoppingList.items).toHaveSize(4);
      expect(result.shoppingList.title).toBe('Test BBQ Recipe - Shopping List');
      expect(result.shoppingList.recipes).toEqual([recipe.id]);
    });

    it('should handle recipe with no ingredients', () => {
      const recipe = {
        id: 'empty-recipe',
        title: 'Empty Recipe',
        ingredients: []
      };

      const result = generator.generateFromRecipe(recipe);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipe has no ingredients');
    });

    it('should handle recipe with invalid ingredients', () => {
      const recipe = {
        id: 'invalid-recipe',
        title: 'Invalid Recipe',
        ingredients: null
      };

      const result = generator.generateFromRecipe(recipe);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipe ingredients');
    });
  });

  describe('generateFromMultipleRecipes', () => {
    it('should generate consolidated shopping list from multiple recipes', () => {
      const recipes = [
        {
          id: 'recipe-1',
          title: 'BBQ Ribs',
          ingredients: ['2 lbs baby back ribs', '1 cup brown sugar', '1 tbsp salt']
        },
        {
          id: 'recipe-2', 
          title: 'BBQ Sauce',
          ingredients: ['1/2 cup brown sugar', '1 tsp salt', '1 cup ketchup']
        }
      ];

      const result = generator.generateFromMultipleRecipes(recipes);

      expect(result.success).toBe(true);
      expect(result.shoppingList).toBeDefined();
      expect(result.shoppingList.title).toBe('Combined Recipes - Shopping List');
      expect(result.shoppingList.recipes).toEqual(['recipe-1', 'recipe-2']);
      
      // Should consolidate brown sugar: 1 cup + 1/2 cup = 1.5 cups
      const brownSugar = result.shoppingList.items.find(item => item.item === 'brown sugar');
      expect(brownSugar.quantity).toBe(1.5);
      expect(brownSugar.unit).toBe('cup');
      expect(brownSugar.consolidated).toBe(true);
    });

    it('should handle empty recipe array', () => {
      const result = generator.generateFromMultipleRecipes([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No recipes provided');
    });

    it('should allow custom list name', () => {
      const recipes = [
        {
          id: 'recipe-1',
          title: 'Test Recipe',
          ingredients: ['1 cup flour']
        }
      ];

      const result = generator.generateFromMultipleRecipes(recipes, 'My BBQ Shopping List');

      expect(result.success).toBe(true);
      expect(result.shoppingList.title).toBe('My BBQ Shopping List');
    });
  });

  describe('organizeByCategory', () => {
    it('should organize ingredients by category', () => {
      const items = [
        { item: 'beef brisket', category: 'meat', quantity: 2, unit: 'lbs' },
        { item: 'onion', category: 'vegetables', quantity: 1, unit: null },
        { item: 'salt', category: 'spices', quantity: 1, unit: 'tbsp' },
        { item: 'flour', category: 'pantry', quantity: 2, unit: 'cups' },
        { item: 'milk', category: 'dairy', quantity: 1, unit: 'cup' }
      ];

      const result = generator.organizeByCategory(items);

      expect(result).toEqual({
        meat: [{ item: 'beef brisket', category: 'meat', quantity: 2, unit: 'lbs' }],
        vegetables: [{ item: 'onion', category: 'vegetables', quantity: 1, unit: null }],
        spices: [{ item: 'salt', category: 'spices', quantity: 1, unit: 'tbsp' }],
        pantry: [{ item: 'flour', category: 'pantry', quantity: 2, unit: 'cups' }],
        dairy: [{ item: 'milk', category: 'dairy', quantity: 1, unit: 'cup' }]
      });
    });

    it('should handle empty items array', () => {
      const result = generator.organizeByCategory([]);
      expect(result).toEqual({});
    });
  });

  describe('formatForDisplay', () => {
    it('should format shopping list items for display', () => {
      const shoppingList = {
        title: 'Test Shopping List',
        items: [
          { quantity: 2, unit: 'lbs', item: 'beef brisket', category: 'meat' },
          { quantity: 1, unit: 'cup', item: 'brown sugar', category: 'pantry' },
          { quantity: null, unit: null, item: 'salt to taste', category: 'spices' }
        ],
        recipes: ['recipe-1'],
        createdAt: new Date('2023-01-01')
      };

      const result = generator.formatForDisplay(shoppingList);

      expect(result).toContain('Test Shopping List');
      expect(result).toContain('2 lbs beef brisket');
      expect(result).toContain('1 cup brown sugar');
      expect(result).toContain('salt to taste');
    });

    it('should handle organized categories', () => {
      const shoppingList = {
        title: 'Categorized List',
        organized: {
          meat: [{ quantity: 2, unit: 'lbs', item: 'brisket' }],
          spices: [{ quantity: 1, unit: 'tsp', item: 'salt' }]
        },
        recipes: ['recipe-1']
      };

      const result = generator.formatForDisplay(shoppingList, { organizeByCategory: true });

      expect(result).toContain('MEAT:');
      expect(result).toContain('2 lbs brisket');
      expect(result).toContain('SPICES:');
      expect(result).toContain('1 tsp salt');
    });
  });

  describe('createShoppingListObject', () => {
    it('should create properly structured shopping list object', () => {
      const items = [
        { quantity: 1, unit: 'cup', item: 'flour', category: 'pantry' }
      ];
      const title = 'Test List';
      const recipeIds = ['recipe-1', 'recipe-2'];

      const result = generator.createShoppingListObject(items, title, recipeIds);

      expect(result.title).toBe('Test List');
      expect(result.items).toEqual(items);
      expect(result.recipes).toEqual(recipeIds);
      expect(result.organized).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.itemCount).toBe(1);
    });

    it('should include organized categories', () => {
      const items = [
        { quantity: 1, unit: 'cup', item: 'flour', category: 'pantry' },
        { quantity: 2, unit: 'lbs', item: 'beef', category: 'meat' }
      ];

      const result = generator.createShoppingListObject(items, 'Test', ['recipe-1']);

      expect(result.organized.pantry).toHaveSize(1);
      expect(result.organized.meat).toHaveSize(1);
    });
  });

  describe('validation', () => {
    it('should validate recipe has required fields', () => {
      const invalidRecipes = [
        null,
        undefined,
        {},
        { title: 'No ingredients' },
        { ingredients: ['flour'] } // no title
      ];

      invalidRecipes.forEach(recipe => {
        const result = generator.generateFromRecipe(recipe);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should require non-empty ingredients array', () => {
      const recipe = {
        id: 'test',
        title: 'Test Recipe',
        ingredients: []
      };

      const result = generator.generateFromRecipe(recipe);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipe has no ingredients');
    });
  });
});